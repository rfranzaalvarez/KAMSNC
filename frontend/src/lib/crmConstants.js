/**
 * CRM para KAMs — Constantes compartidas
 * 
 * Todas las definiciones de campos, estados, tipos y opciones.
 * Importar desde aquí en vez de definir en cada componente.
 */

// ============ PIPELINE STAGES ============
export const PIPELINE_STAGES = [
  { key: 'pendiente_contacto', label: 'Pendiente contacto', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  { key: 'en_desarrollo', label: 'En desarrollo', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
  { key: 'en_evaluacion', label: 'En evaluación', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  { key: 'en_proceso_alta', label: 'En proceso de alta', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  { key: 'activo', label: 'Activo', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
  { key: 'rechazado', label: 'Rechazado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  { key: 'cierre_sin_acuerdo', label: 'Cierre sin acuerdo', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
];

export const STAGE_LABELS = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s.label]));

// Stages that count as "active pipeline" (excluding terminal states)
export const ACTIVE_PIPELINE_STAGES = ['en_desarrollo', 'en_evaluacion', 'en_proceso_alta'];
export const TERMINAL_STAGES = ['activo', 'rechazado', 'cierre_sin_acuerdo'];
export const INITIAL_STAGE = 'pendiente_contacto';

// ============ TIPO DE CANAL CAEs ============
export const CANAL_CAES_TYPES = [
  'Instalador',
  'Fabricante',
  'Distribuidor',
  'Asociación',
  'Ingeniería',
  'ESE',
  'Administrador de fincas',
  'Consultoría energética',
  'Plataforma tecnológica',
  'Concesionario VE',
  'Organización de consumidores',
  'Entidad financiera',
  'Rehabilitador',
  'Otros',
];

// ============ SECTOR CAE OBJETIVO (multiselect) ============
export const SECTOR_CAE_OPTIONS = [
  'Aislamiento térmico',
  'Aerotermia',
  'Climatización',
  'BACS',
  'Rehabilitación envolvente',
  'ACS',
  'Iluminación',
  'Vehículo eléctrico',
  'Neumáticos',
  'Tratamiento de aguas',
  'Industrial',
  'Otros',
];

// ============ POTENCIAL ============
export const POTENCIAL_OPTIONS = [
  { key: 'bajo', label: 'Bajo', color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'medio', label: 'Medio', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'alto', label: 'Alto', color: '#E87A1E', bg: '#FEF3E8' },
  { key: 'muy_alto', label: 'Muy Alto', color: '#dc2626', bg: '#fef2f2' },
];

// ============ COMUNIDADES AUTÓNOMAS ============
export const COMUNIDADES_AUTONOMAS = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Ceuta',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Madrid',
  'Melilla',
  'Murcia',
  'Navarra',
  'País Vasco',
];

// ============ ORIGEN DEL LEAD (multiselect) ============
export const LEAD_SOURCE_OPTIONS = [
  'Evento',
  'Congreso',
  'Webinar',
  'LinkedIn/Sales Navigator',
  'Recomendación partner',
  'Industrial',
  'Generación Distribuida',
  'Canal Naturgy',
  'KAM',
  'Asociación sectorial',
  'Fabricante',
  'Solicitud directa del canal',
  'Otros',
];

// ============ ZONAS ============
export const ZONES = ['Norte', 'Centro', 'Este'];

// ============ CLASIFICACIÓN DE CANAL ============
export const CHANNEL_CATEGORIES = {
  'Energia': {
    subcategories: ['Mayorista', 'Integral', 'PYMEs'],
  },
  'Solar': {
    subcategories: ['Venta', 'Instalador', 'Integral'],
  },
  'CAEs': {
    subcategories: [
      'Aislamiento', 'Aerotermia', 'Climatización', 'BACS',
      'Rehabilitación', 'ACS', 'Iluminación', 'VE', 'Industrial', 'Otros',
    ],
  },
  'Otros': {
    subcategories: ['Financiero', 'Tecnológico', 'Consultoría', 'Otro'],
  },
};

// ============ ACTIVITY TYPES ============
export const ACTION_TYPES = [
  { key: 'visit', label: 'Visita', icon: '📍', color: '#E87A1E', bg: '#FEF3E8' },
  { key: 'call', label: 'Llamada', icon: '📞', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'email', label: 'Email', icon: '📧', color: '#8b5cf6', bg: '#f3eeff' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#16a34a', bg: '#e6f5ed' },
  { key: 'meeting', label: 'Reunión', icon: '👥', color: '#E87A1E', bg: '#FEF3E8' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0077b5', bg: '#e8f4fd' },
  { key: 'other', label: 'Otro', icon: '📋', color: '#5a6078', bg: '#f0f0f4' },
];

// ============ RESULT OPTIONS ============
export const RESULT_OPTIONS = [
  { key: 'positive', label: 'Positiva', color: '#16a34a', bg: 'bg-green-50', text: 'text-green-600' },
  { key: 'neutral', label: 'Neutral', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600' },
  { key: 'negative', label: 'Negativa', color: '#ef4444', bg: 'bg-red-50', text: 'text-red-600' },
];

// ============ VOLUME UNITS ============
export const VOLUME_UNITS = [
  { key: 'swe_swg', label: 'Residencial', unit: 'SWE+SWG', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'gwh_pymes', label: 'PYMEs', unit: 'GWh', color: '#8b5cf6', bg: '#f3eeff' },
  { key: 'gwh_caes', label: 'CAEs', unit: 'GWh', color: '#16a34a', bg: '#e6f5ed' },
];
