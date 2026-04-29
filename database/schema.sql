-- =============================================
-- FIELDFORCE CRM — Schema completo
-- =============================================
-- Ejecutar en Supabase Dashboard → SQL Editor → New Query
-- Este script crea todas las tablas, índices, RLS policies,
-- funciones y triggers necesarios para la Fase 1.
-- =============================================

-- =============================================
-- 1. TABLAS
-- =============================================

-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('kam', 'coordinator', 'manager', 'director', 'admin')),
  reports_to UUID REFERENCES profiles(id),
  zone TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Canales / Colaboradores
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  contact_name TEXT,
  channel_type TEXT NOT NULL DEFAULT 'other'
    CHECK (channel_type IN ('distributor', 'installer', 'reseller', 'commercial', 'other')),
  status TEXT NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'developing', 'active', 'inactive')),
  pipeline_stage TEXT DEFAULT 'lead'
    CHECK (pipeline_stage IN ('lead', 'first_contact', 'proposal', 'negotiation', 'onboarding', 'active')),
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Visitas registradas
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  kam_id UUID NOT NULL REFERENCES profiles(id),
  -- Check-in
  checkin_at TIMESTAMPTZ NOT NULL,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkin_accuracy INTEGER, -- metros
  -- Check-out
  checkout_at TIMESTAMPTZ,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  -- Ficha de visita
  objective TEXT CHECK (objective IN (
    'commercial_proposal', 'follow_up', 'first_contact',
    'plan_review', 'issue_resolution', 'development', 'other'
  )),
  result TEXT CHECK (result IN ('positive', 'neutral', 'negative')),
  result_notes TEXT,
  next_steps TEXT,
  next_action_date DATE,
  photos TEXT[], -- URLs en Supabase Storage
  -- Metadata
  is_gps_verified BOOLEAN DEFAULT true,
  is_offline_sync BOOLEAN DEFAULT false, -- true si se creó offline
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN checkout_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (checkout_at - checkin_at))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Visitas planificadas (agenda)
CREATE TABLE planned_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  kam_id UUID NOT NULL REFERENCES profiles(id),
  planned_date DATE NOT NULL,
  planned_time TIME,
  notes TEXT,
  visit_id UUID REFERENCES visits(id), -- se vincula al hacer check-in
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas y tareas
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  channel_id UUID REFERENCES channels(id),
  visit_id UUID REFERENCES visits(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'task', 'followup_overdue', 'pipeline_stalled',
    'channel_inactive', 'plan_review', 'system'
  )),
  title TEXT NOT NULL,
  detail TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- 2. ÍNDICES
-- =============================================

CREATE INDEX idx_profiles_reports_to ON profiles(reports_to);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_channels_assigned ON channels(assigned_to);
CREATE INDEX idx_channels_status ON channels(status);
CREATE INDEX idx_channels_pipeline ON channels(pipeline_stage);
CREATE INDEX idx_visits_kam_date ON visits(kam_id, checkin_at DESC);
CREATE INDEX idx_visits_channel_date ON visits(channel_id, checkin_at DESC);
CREATE INDEX idx_planned_visits_kam_date ON planned_visits(kam_id, planned_date);
CREATE INDEX idx_planned_visits_completed ON planned_visits(is_completed);
CREATE INDEX idx_alerts_user_active ON alerts(user_id, is_dismissed, created_at DESC);
CREATE INDEX idx_alerts_due ON alerts(due_date) WHERE is_dismissed = false;


-- =============================================
-- 3. FUNCIONES HELPER
-- =============================================

-- Función recursiva: obtener todos los IDs del equipo de un manager
CREATE OR REPLACE FUNCTION get_team_ids(manager_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  WITH RECURSIVE team AS (
    SELECT id FROM profiles WHERE reports_to = manager_uuid AND is_active = true
    UNION ALL
    SELECT p.id FROM profiles p JOIN team t ON p.reports_to = t.id WHERE p.is_active = true
  )
  SELECT id FROM team;
$$;

-- Función: comprobar si un usuario puede ver datos de otro (es su jefe directo o indirecto)
CREATE OR REPLACE FUNCTION can_see_user(viewer_uuid UUID, target_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 WHERE target_uuid IN (SELECT get_team_ids(viewer_uuid))
  ) OR viewer_uuid = target_uuid;
$$;

-- Trigger: actualizar campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: crear alerta automática cuando una visita tiene next_action_date
CREATE OR REPLACE FUNCTION create_visit_followup_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.next_action_date IS NOT NULL AND NEW.next_steps IS NOT NULL THEN
    INSERT INTO alerts (user_id, channel_id, visit_id, alert_type, title, detail, due_date, priority)
    VALUES (
      NEW.kam_id,
      NEW.channel_id,
      NEW.id,
      'task',
      'Seguimiento: ' || COALESCE(
        (SELECT name FROM channels WHERE id = NEW.channel_id),
        'Canal'
      ),
      NEW.next_steps,
      NEW.next_action_date,
      CASE
        WHEN NEW.next_action_date <= CURRENT_DATE THEN 'high'
        WHEN NEW.next_action_date <= CURRENT_DATE + 2 THEN 'medium'
        ELSE 'low'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER visit_followup_alert
  AFTER UPDATE ON visits
  FOR EACH ROW
  WHEN (NEW.checkout_at IS NOT NULL AND OLD.checkout_at IS NULL)
  EXECUTE FUNCTION create_visit_followup_alert();


-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ---------- PROFILES ----------

-- Todos pueden ver perfiles (necesario para listados de equipo)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (true);

-- Solo puedes editar tu propio perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ---------- CHANNELS ----------

-- Ver: tus canales + los de tu equipo
CREATE POLICY "channels_select"
  ON channels FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR assigned_to IN (SELECT get_team_ids(auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insertar: solo canales asignados a ti
CREATE POLICY "channels_insert"
  ON channels FOR INSERT
  WITH CHECK (assigned_to = auth.uid());

-- Actualizar: solo tus canales (o admin)
CREATE POLICY "channels_update"
  ON channels FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------- VISITS ----------

CREATE POLICY "visits_select"
  ON visits FOR SELECT
  USING (
    kam_id = auth.uid()
    OR kam_id IN (SELECT get_team_ids(auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "visits_insert"
  ON visits FOR INSERT
  WITH CHECK (kam_id = auth.uid());

CREATE POLICY "visits_update"
  ON visits FOR UPDATE
  USING (kam_id = auth.uid());

-- ---------- PLANNED_VISITS ----------

CREATE POLICY "planned_visits_select"
  ON planned_visits FOR SELECT
  USING (
    kam_id = auth.uid()
    OR kam_id IN (SELECT get_team_ids(auth.uid()))
  );

CREATE POLICY "planned_visits_insert"
  ON planned_visits FOR INSERT
  WITH CHECK (kam_id = auth.uid());

CREATE POLICY "planned_visits_update"
  ON planned_visits FOR UPDATE
  USING (kam_id = auth.uid());

CREATE POLICY "planned_visits_delete"
  ON planned_visits FOR DELETE
  USING (kam_id = auth.uid());

-- ---------- ALERTS ----------

CREATE POLICY "alerts_select"
  ON alerts FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (SELECT get_team_ids(auth.uid()))
  );

CREATE POLICY "alerts_insert"
  ON alerts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "alerts_update"
  ON alerts FOR UPDATE
  USING (user_id = auth.uid());


-- =============================================
-- 5. STORAGE (bucket para fotos de visitas)
-- =============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('visit-photos', 'visit-photos', true);

-- Policy: solo usuarios autenticados pueden subir
CREATE POLICY "visit_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'visit-photos');

-- Policy: las fotos son legibles por cualquier autenticado
CREATE POLICY "visit_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'visit-photos');


-- =============================================
-- 6. SEED DATA (datos de prueba para el piloto)
-- =============================================
-- NOTA: Ejecutar DESPUÉS de crear los usuarios en Supabase Auth.
-- Los UUIDs de abajo son placeholders — reemplázalos con los IDs
-- reales de auth.users tras crear las cuentas.
-- =============================================

/*
-- Ejemplo de seed (descomenta y adapta con UUIDs reales):

-- Perfiles
INSERT INTO profiles (id, full_name, email, role, zone) VALUES
  ('UUID_MANAGER_1', 'Director Ejemplo', 'director@empresa.com', 'director', NULL),
  ('UUID_MANAGER_2', 'Manager Norte', 'manager.norte@empresa.com', 'manager', 'Norte'),
  ('UUID_KAM_1', 'María López', 'maria@empresa.com', 'kam', 'Norte'),
  ('UUID_KAM_2', 'Carlos Ruiz', 'carlos@empresa.com', 'kam', 'Norte');

-- Jerarquía
UPDATE profiles SET reports_to = 'UUID_MANAGER_1' WHERE id = 'UUID_MANAGER_2';
UPDATE profiles SET reports_to = 'UUID_MANAGER_2' WHERE id IN ('UUID_KAM_1', 'UUID_KAM_2');

-- Canales de ejemplo
INSERT INTO channels (name, address, city, channel_type, status, pipeline_stage, assigned_to, contact_name, phone) VALUES
  ('Distribuciones García', 'C/ Gran Vía 42', 'Madrid', 'distributor', 'active', 'active', 'UUID_KAM_1', 'Antonio García', '+34 612 345 678'),
  ('Electro Norte S.L.', 'Av. de América 15', 'Madrid', 'installer', 'developing', 'proposal', 'UUID_KAM_1', 'Laura Electro', '+34 623 456 789'),
  ('Canal Sur Energía', 'C/ Alcalá 200', 'Madrid', 'commercial', 'active', 'active', 'UUID_KAM_1', 'Pedro Sur', '+34 634 567 890'),
  ('SolarTech Ibérica', 'Paseo de la Castellana 89', 'Madrid', 'distributor', 'prospect', 'lead', 'UUID_KAM_2', 'Elena Tech', '+34 645 678 901');
*/


-- =============================================
-- ✅ Schema listo. Siguiente paso: crear usuarios en
--    Supabase Auth y ejecutar el seed con UUIDs reales.
-- =============================================
