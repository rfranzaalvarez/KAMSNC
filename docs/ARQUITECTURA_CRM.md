# CRM para KAMs — Documentación de arquitectura y traspaso

> Última actualización: 19 de junio de 2026.
> Este documento describe el estado **real** del sistema en producción, verificado directamente contra el código de los repositorios y la base de datos de Supabase — no es una memoria de diseño original, sino un inventario actual.

---

## 1. Visión general

Es un CRM interno de Naturgy para el equipo de KAMs (Key Account Managers) que gestionan canales de venta en el área de CAEs (Certificados de Ahorro Energético), Energía y Solar. Permite:

- Gestionar canales (empresas/contactos comerciales) a través de un pipeline de ventas
- Registrar visitas, llamadas e interacciones con cada canal
- Planificar agenda y seguimiento
- Ver paneles de manager/director con visibilidad sobre el equipo
- Gamificación (ranking, insignias) entre KAMs
- Funciona como PWA (instalable en móvil) con cola de sincronización si no hay conexión

El nombre interno de la PWA en el código sigue siendo `FieldForce CRM` — es el nombre del proyecto original del que evolucionó este CRM; no afecta a nada funcional, pero puede generar confusión si alguien lo ve en el manifest del navegador.

### Jerarquía de roles

Hay 4 roles, definidos en `profiles.role`: `kam` → `coordinator` → `manager` → `director`. Un director ve y gestiona **todo** el sistema (todos los KAMs, sin excepción, sea cual sea la jerarquía de `reports_to`). Los demás roles ven su propia jerarquía descendente, calculada de forma recursiva.

---

## 2. Arquitectura técnica

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   FRONTEND       │      │     BACKEND       │      │    SUPABASE      │
│   React + Vite   │─────▶│  Python / Flask    │─────▶│  Postgres + Auth  │
│   (Netlify)       │      │   (Railway)       │      │  + Edge Functions │
└─────────────────┘      └──────────────────┘      └─────────────────┘
   kamsnc.netlify.app      web-production-08c73.       gjnhyesrqhizdekljzhm
                            up.railway.app              .supabase.co
```

| Pieza | Repositorio GitHub | Dónde vive |
|---|---|---|
| Frontend | `rfranzaalvarez/KAMSNC` | Netlify (`kamsnc.netlify.app`) |
| Backend | `rfranzaalvarez/KAMAPP` | Railway, plan **Hobby** |
| Base de datos | (no tiene repo propio; se gestiona desde el panel de Supabase) | Supabase (proyecto `gjnhyesrqhizdekljzhm`) |

El frontend habla **directamente** con Supabase (Postgres + Auth) para casi todo: leer/escribir canales, visitas, perfiles, etc. El backend Flask en Railway solo se usa para un puñado de tareas concretas que no pueden hacerse desde el navegador (ver sección 5).

### Por qué casi todo el frontend habla directo con Supabase

El patrón habitual en este proyecto es: el componente React llama a `supabase.from('tabla').select()/.insert()/.update()` directamente, usando la **clave anon** (pública, segura de exponer en el navegador) y confiando en las **políticas RLS** de Postgres para decidir qué puede ver o modificar cada usuario según su rol. Esto significa que la seguridad real del sistema no está en el código de React, sino en las políticas de la base de datos (sección 4).

---

## 3. Esquema real de la base de datos (18 tablas)

**Importante:** existe un archivo `database/schema.sql` en el repositorio `KAMSNC` que está **desactualizado** — solo define 5 tablas (`profiles`, `channels`, `visits`, `planned_visits`, `alerts`). La base de datos real en Supabase tiene **18 tablas**. No uses ese archivo como referencia; este documento refleja el estado verificado en producción a fecha de hoy. Si quieres mantener ese archivo al día en el futuro, lo más fiable es regenerarlo directamente desde Supabase (ver sección 8.3) en vez de editarlo a mano.

| Tabla | Para qué sirve |
|---|---|
| `profiles` | Usuarios del CRM (espejo de `auth.users` + campos propios: rol, zona, `reports_to`, `is_active`) |
| `channels` | Los canales/empresas gestionados por los KAMs — la entidad central del CRM |
| `channel_classification` | Catálogo de clasificaciones posibles (Energía, Solar, CAEs + subcanales) |
| `channel_classifications` | Tabla puente: qué clasificación(es) tiene cada canal |
| `channel_notes` | Notas de texto libre sobre un canal |
| `channel_interactions` | Registro de llamadas, emails, reuniones, etc. con un canal |
| `channel_pipeline_history` | Historial de cambios de fase del pipeline de cada canal |
| `channel_contact_prep` | Notas de preparación antes de contactar/visitar un canal |
| `visits` | Visitas físicas registradas (check-in) |
| `planned_visits` | Visitas/citas planificadas en agenda |
| `account_plans` | Planes de cuenta anuales por canal |
| `account_plan_actions` | Acciones concretas dentro de un plan de cuenta |
| `account_plan_documents` | Documentos adjuntos a un plan de cuenta |
| `alerts` | Notificaciones internas del CRM (la "campanita") |
| `badges` | Insignias de gamificación ganadas por un usuario |
| `leaderboard_weekly` / `leaderboard_monthly` | Rankings de gamificación |
| `kam_playbook` | Contenido de referencia/formación para KAMs |

### Tablas clave en detalle

**`profiles`** — espejo de `auth.users`, se crea automáticamente vía el trigger `handle_new_user` (sección 4.3) cuando alguien se registra. Columnas relevantes: `role` (`kam`/`coordinator`/`manager`/`director`), `reports_to` (uuid, jerarquía), `is_active` (boolean — usado para el sistema de "baja de usuario", ver sección 6.1), `zone`.

**`channels`** — entidad central. Columnas relevantes: `assigned_to` (uuid → qué KAM lleva este canal), `pipeline_stage` (fase interna: `lead`/`first_contact`/`proposal`/`negotiation`/`onboarding`/`active`/`closed_no_deal`), `status` (estado visible al usuario, **derivado** de `pipeline_stage` vía la función `stageToStatus()` en `crmConstants.js` — son dos campos relacionados pero no idénticos, ver sección 7.1).

**`alerts`** — sistema de notificaciones internas. `alert_type` está limitado por un `CHECK constraint` a estos 6 valores exactos: `task`, `followup_overdue`, `pipeline_stalled`, `channel_inactive`, `plan_review`, `system`. Si en el futuro se necesita un tipo nuevo, hay que ampliar este constraint en Supabase antes de poder insertarlo.

### Foreign keys hacia `profiles` (importante para bajas/borrados)

10 tablas distintas tienen una FK con `ON DELETE NO ACTION` apuntando a `profiles.id`: `channels.assigned_to`, `visits.kam_id`, `planned_visits.kam_id`, `alerts.user_id`, `account_plans.kam_id`, `account_plan_documents.uploaded_by`, `channel_notes.user_id`, `channel_interactions.user_id`, `channel_pipeline_history.changed_by`, `profiles.reports_to`. Esto significa que **nunca se puede borrar físicamente un usuario** que tenga cualquier dato relacionado en estas tablas — la base de datos lo bloqueará. Por este motivo, el sistema usa **baja lógica** (`is_active = false`) en vez de borrado real (ver sección 6.1).

---

## 4. Autenticación y seguridad

### 4.1 Cómo funciona el login

Email + contraseña vía Supabase Auth (`supabase.auth.signInWithPassword`). No hay 2FA implementado actualmente (se diseñó un enfoque con Email OTP nativo de Supabase, pero quedó pausado — ver sección 9).

### 4.2 RLS (Row Level Security) — la seguridad real del sistema

Cada tabla tiene políticas que filtran qué filas puede ver/editar cada usuario según su `auth.uid()`. El patrón repetido en casi todas las tablas es:

```sql
assigned_to = auth.uid()                          -- es suyo
OR assigned_to IN (SELECT get_team_ids(auth.uid())) -- o de su equipo
OR EXISTS (... role = 'admin')                      -- o es admin
```

**Bug recurrente a tener en cuenta:** cuando una operación de `UPDATE` no cumple la política RLS, Postgres/Supabase **no lanza un error** — el `UPDATE` simplemente afecta a 0 filas, y el código en React, si no comprueba explícitamente cuántas filas se actualizaron, asume que todo fue bien. Esto ya ha causado al menos un bug real en producción (la edición de usuarios en el panel de administración no se guardaba, sin ningún error visible, porque la política `profiles_update_own` no incluía la condición para directores). **Si algo "no se guarda" sin dar ningún error, sospecha primero de RLS**, no de un fallo del código React.

### 4.3 Funciones de Postgres (lógica de servidor)

| Función | Qué hace |
|---|---|
| `get_team_ids(manager_uuid)` | Devuelve los IDs de todo el equipo de un manager, calculado recursivamente vía `reports_to`. **Caso especial:** si `manager_uuid` tiene `role = 'director'`, devuelve **todos** los perfiles activos del sistema, ignorando la jerarquía — los directores ven todo. |
| `can_see_user(viewer_uuid, target_uuid)` | Helper booleano: ¿puede `viewer` ver a `target`? Se apoya en `get_team_ids`. |
| `handle_new_user()` | Trigger en `auth.users` (INSERT): crea automáticamente la fila correspondiente en `profiles` al registrarse alguien. **El rol por defecto es siempre `'kam'`** — si necesitas crear un manager/director, hay que cambiar el rol manualmente después desde el panel de administración. |
| `create_visit_followup_alert()` | Trigger en `visits` (INSERT/UPDATE): si una visita tiene `next_action_date` y `next_steps`, crea automáticamente una alerta de seguimiento (`alert_type = 'task'`) con prioridad calculada según cuán próxima sea la fecha. |
| `update_updated_at()` | Trigger genérico: actualiza el campo `updated_at` en cada UPDATE. |

### 4.4 El "bug del lock" de Supabase Auth (ya mitigado)

Supabase Auth usa un sistema de "lock" entre pestañas del navegador para coordinar el refresco del token de sesión. Cuando el navegador suspende una pestaña en background (móvil sobre todo: minimizar la app, bloquear pantalla), ese lock puede quedar "huérfano", y al volver al foco, `getSession()` se bloquea indefinidamente — causando un spinner infinito en toda la app.

Esto está mitigado en **dos capas**:
1. `frontend/src/lib/supabase.js` — el lock se desactiva explícitamente (`lock: (_name, _acquireTimeout, fn) => fn()`), para que cada pestaña gestione su token sin coordinación entre pestañas.
2. `frontend/src/hooks/useAuth.js` — lógica extensa de recuperación: timeout de seguridad en `getSession()`, lectura directa del token desde `localStorage` como respaldo, listener de `visibilitychange` para reintentar al volver al foco, y detección de "SIGNED_OUT falsos" (cuando el listener dispara un cierre de sesión que en realidad es ese bug, no un logout real).

**Si tocas `useAuth.js` en el futuro, hazlo con mucho cuidado** — cada pieza de ese archivo está ahí para resolver un síntoma específico de este bug, documentado en comentarios extensos dentro del propio archivo.

---

## 5. El backend Flask (Railway) — para qué sirve exactamente

El backend es deliberadamente pequeño (4 archivos Python, ~670 líneas en total) porque solo existe para lo que el frontend **no puede** hacer de forma segura por sí mismo (operaciones que requieren una clave secreta que nunca debe estar en el navegador).

| Endpoint | Para qué |
|---|---|
| `POST /api/assistant` | Proxy hacia la API de Claude (Anthropic) — esconde la API key, que nunca debe estar en el frontend |
| `POST /api/calendar-invite` | Envía invitaciones de calendario por email (SMTP) |
| `POST /api/reports/weekly` y la función interna `run_weekly_reports()` | Genera y envía el informe semanal a los managers (vía APScheduler, programado) |
| `GET /api/reports/preview/<manager_id>` | Vista previa del informe sin enviarlo |
| `POST /api/alerts/generate` | Genera alertas automáticas (probablemente las de "canal inactivo", "seguimiento atrasado", etc. — revisar `alerts.py`) |
| `GET /api/test/smtp` y `/api/test/report` | Endpoints de diagnóstico manual, no para uso normal |

### Problema conocido: SMTP bloqueado en Railway Hobby

Railway bloquea el tráfico SMTP saliente (puertos 465/587/25/2525) en los planes Free/Trial/**Hobby** — solo está disponible en el plan Pro. Esto afecta a `/api/calendar-invite` y al envío del informe semanal: **ambos fallan silenciosamente o con timeout**, no por un bug del código sino por una restricción de infraestructura de Railway. Hay dos soluciones posibles, sin decidir aún (ver sección 9): subir a Railway Pro, o sustituir el envío SMTP directo por un servicio HTTP como Resend o SendGrid.

---

## 6. Funcionalidades clave (cómo están construidas)

### 6.1 Baja de usuarios (no hay borrado físico)

Dado que 10 tablas distintas bloquean el borrado de un perfil con datos relacionados (sección 3), el sistema **nunca borra usuarios**. En su lugar:

1. El director elige "dar de baja" a un usuario desde `UserAdminPage.jsx`
2. Si el usuario tiene canales asignados, es obligatorio elegir un destinatario (cualquier otro usuario activo) antes de continuar
3. Una Edge Function de Supabase (`manage-users`, acción `deactivate_user`) reasigna esos canales y marca `profiles.is_active = false`
4. Se crea una alerta resumen (`alert_type = 'system'`) en el CRM avisando al destinatario, sin depender de email
5. `useAuth.js` comprueba `is_active` justo después de validar la contraseña en el login; si es `false`, fuerza el cierre de sesión y muestra "Usuario dado de baja"

**Caso no resuelto:** si el usuario dado de baja tenía gente reportándole (`reports_to` apuntando a él), esa jerarquía no se toca automáticamente — queda como tarea pendiente para quien continúe el desarrollo.

### 6.2 Reasignación de canales

Dos mecanismos distintos para la misma operación de fondo (`channels.assigned_to`):
- **Individual**: componente `ChannelReassign` en la ficha de un canal — solo permite elegir entre usuarios `role = 'kam'`
- **Masiva**: `BulkReassignModal` (mismo archivo, `components/ChannelReassign.jsx`) — selector de canales por origen y destino. El campo "origen" incluye `kam`, `coordinator`, `manager` y `director` (se amplió recientemente para que un manager que ha heredado canales de una baja pueda repartirlos de nuevo)

### 6.3 Pipeline / Kanban

`PipelinePage.jsx` agrupa los canales en 7 columnas según `channels.status` (no según `pipeline_stage` directamente — hay una traducción intermedia, ver sección 7.1). Al arrastrar un canal a otra columna, se recalcula también su `pipeline_stage` vía el mapeo inverso `STATUS_TO_DEFAULT_STAGE`.

### 6.4 Modo offline

`frontend/src/lib/offline.js` implementa una cola en IndexedDB: si el navegador está sin conexión, las operaciones de escritura (`insert`/`update`/`upsert`) se encolan en vez de fallar, y se sincronizan automáticamente en cuanto vuelve la conexión (evento `online` del navegador). Reintenta hasta 5 veces antes de abandonar una operación.

---

## 7. Deuda técnica conocida (cosas a vigilar)

### 7.1 Dos sistemas de color para los mismos estados, ligeramente desincronizados

`crmConstants.js` define `STATUS_CONFIG` con clases de Tailwind (`bg-amber-500/20`, etc.) para los 7 estados del pipeline. Por separado, `PipelinePage.jsx` define su propio array `STATUSES` con colores hexadecimales inline (`color: '#eab308'`, etc.), que se modificó en una sesión reciente para diferenciar mejor visualmente los colores que se confundían entre sí. **Estos dos sistemas ya no coinciden exactamente** — si en el futuro cambias un color en uno, revisa también el otro, o mejor aún, unifica ambos en una sola fuente.

### 7.2 `schema.sql` desactualizado

Como ya se menciona en la sección 3, el archivo del repositorio no refleja la base de datos real. Si se quiere mantener al día, lo más práctico es regenerarlo periódicamente desde Supabase (consulta en sección 8.3) en vez de mantenerlo a mano.

### 7.3 Sin 2FA

Se diseñó un enfoque (Email OTP nativo de Supabase como segundo factor tras la contraseña) pero la decisión quedó pausada para pensarla con calma. Ver sección 9 para retomarlo.

### 7.4 Envío de emails roto

SMTP bloqueado en Railway Hobby (sección 5). Decisión pendiente: subir a Pro o cambiar a un servicio HTTP de email.

---

## 8. Guía operativa — cómo se ha trabajado en este proyecto hasta ahora

Quien herede este proyecto probablemente seguirá un flujo similar al que se ha usado hasta ahora: **describir el problema o el cambio deseado a una IA (Claude), recibir el código completo del archivo modificado, y subirlo manualmente** vía el editor web de GitHub o el panel de Supabase, sin necesidad de un entorno de desarrollo local.

### 8.1 Cómo se sube un cambio de frontend

1. GitHub → repositorio `KAMSNC` → navegar a la ruta del archivo (ej. `frontend/src/pages/PipelinePage.jsx`)
2. Lápiz de "editar" → seleccionar todo el contenido → pegar el código nuevo completo
3. Hacer commit directamente en `main`
4. Netlify detecta el push y despliega automáticamente en 1-2 minutos — comprobar en `kamsnc.netlify.app` (forzar recarga con Ctrl+Shift+R si el navegador cachea la versión vieja)

Alternativa más rápida (usada en sesiones recientes): si se dispone de un token de acceso personal de GitHub (fine-grained, con permiso `Contents: Read and write` sobre el repo concreto), Claude puede clonar el repo, aplicar el cambio, hacer commit y `git push` directamente, sin pasar por el editor web. El token debe generarse con expiración corta (7-30 días) y revocarse cuando ya no se necesite.

### 8.2 Cómo se sube un cambio de backend

Similar, pero sobre el repositorio `KAMAPP`. Railway también tiene despliegue automático al detectar push en `main`.

### 8.3 Cómo se aplican cambios de base de datos

Todo se hace desde **Supabase → SQL Editor → New query**, pegando y ejecutando el SQL proporcionado. No hay sistema de migraciones formal (como Flyway o Prisma Migrate) — cada cambio de esquema se aplica como un script SQL suelto, ejecutado manualmente una vez. **Esto significa que no hay un historial versionado de cambios de esquema en ningún archivo** — la única fuente de verdad es el estado actual de la base de datos en Supabase.

Para regenerar un inventario actualizado del esquema completo (recomendado periódicamente, dado que `schema.sql` está desactualizado):

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Para ver las políticas RLS activas:

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Para ver las funciones de Postgres:

```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public';
```

### 8.4 Cómo se aplican cambios de Edge Functions

Supabase → **Edge Functions** → seleccionar la función (ej. `manage-users`) → pestaña **Code** → sustituir el contenido completo → **Deploy**. Para depurar errores, la pestaña **Invocations** (no "Logs") muestra cada petición HTTP con su código de estado; el cuerpo exacto del error solo se ve fiablemente desde la consola del navegador (F12 → Red/Network → la petición → pestaña Respuesta), no desde el panel de Supabase.

### 8.5 Variables de entorno necesarias

**Frontend** (Netlify, configurado como variables de entorno del sitio):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend** (Railway, configurado como variables de entorno del servicio):
- Credenciales SMTP (host, puerto, usuario, contraseña) — actualmente sin efecto por el bloqueo de Railway, sección 5
- API key de Anthropic (para el proxy del Asistente)
- Credenciales de Supabase con permisos de servicio, si el backend necesita escribir directamente en la base de datos

**Edge Functions** (Supabase, configuradas en su propio panel): usan automáticamente la `SERVICE_ROLE_KEY` del proyecto, que tiene privilegios totales y nunca debe exponerse en el frontend.

---

## 9. Decisiones pendientes (aparcadas, no urgentes)

Estas dos decisiones de producto se discutieron y se diseñó una propuesta técnica, pero se pausaron para decidir con calma:

1. **SMTP roto en Railway** — elegir entre subir a Railway Pro o sustituir el envío directo por un servicio HTTP (Resend/SendGrid)
2. **2FA por email** — diseño propuesto: usar el Email OTP nativo de Supabase (`signInWithOtp`/`verifyOtp`) como segundo paso tras validar la contraseña normal, en vez de construir un sistema de códigos propio desde cero. Pendiente de decidir si seguir adelante.

Además, sin decisión tomada todavía:
- Qué hacer con los subordinados de un usuario dado de baja (sección 6.1)
- Si vale la pena invertir tiempo en unificar los dos sistemas de color del pipeline (sección 7.1)
