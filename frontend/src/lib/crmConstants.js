/**
 * CRM para KAMs — Constantes compartidas
 *
 * Todas las definiciones de campos, estados, tipos y opciones.
 * Importar desde aquí en vez de definir en cada componente.
 */

// ============ STATUS CONFIG (usado en ChannelsPage, etc.) ============
export const STATUS_CONFIG = {
  pendiente_contacto: { label: 'Pendiente contacto', bg: 'bg-gray-500/20',   text: 'text-gray-400',   border: 'border-gray-500/30'   },
  en_desarrollo:      { label: 'En desarrollo',       bg: 'bg-amber-500/20',  text: 'text-amber-400',  border: 'border-amber-500/30'  },
  en_evaluacion:      { label: 'En evaluación',        bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  en_proceso_alta:    { label: 'En proceso de alta',   bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  activo:             { label: 'Activo',               bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30'  },
  rechazado:          { label: 'Rechazado',            bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/30'    },
  cierre_sin_acuerdo: { label: 'Cierre sin acuerdo',  bg: 'bg-gray-500/20',   text: 'text-gray-500',   border: 'border-gray-500/30'   },
};

// ============ PIPELINE CONFIG (stage → label) ============
export const PIPELINE_CONFIG = {
  lead:           'Lead',
  first_contact:  'Primer contacto',
  proposal:       'Propuesta',
  negotiation:    'Negociación',
  onboarding:     'En proceso alta',
  active:         'Activo',
  closed_no_deal: 'Sin acuerdo',
};

// ============ PIPELINE STAGES (array completo, para Kanban) ============
export const PIPELINE_STAGES = [
  { key: 'lead',           label: 'Lead',             color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  { key: 'first_contact',  label: 'Primer contacto',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  },
  { key: 'proposal',       label: 'Propuesta',        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  { key: 'negotiation',    label: 'Negociación',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
  { key: 'onboarding',     label: 'En proceso alta',  color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)'  },
  { key: 'active',         label: 'Activo',           color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
  { key: 'closed_no_deal', label: 'Sin acuerdo',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   },
];

// Stages disponibles al CREAR un canal (sin "closed_no_deal" — no tiene sentido nacer ya cerrado)
export const CREATABLE_PIPELINE_STAGES = PIPELINE_STAGES.filter(s => s.key !== 'closed_no_deal');

export const STAGE_LABELS = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s.label]));

export const ACTIVE_PIPELINE_STAGES = ['first_contact', 'proposal', 'negotiation', 'onboarding'];
export const TERMINAL_STAGES        = ['active', 'closed_no_deal'];
export const INITIAL_STAGE          = 'lead';

// ============ stage -> status (única fuente de verdad, usada en todo el CRM) ============
export function stageToStatus(stage) {
  if (stage === 'active')         return 'activo';
  if (stage === 'lead')           return 'pendiente_contacto';
  if (stage === 'closed_no_deal') return 'cierre_sin_acuerdo';
  if (stage === 'onboarding')     return 'en_proceso_alta';
  if (['first_contact', 'proposal', 'negotiation'].includes(stage)) return 'en_desarrollo';
  return 'pendiente_contacto';
}

// ============ SECTOR CAE (referencia informativa; ya NO es un campo propio del canal:
// la clasificación CAEs > Subcanal ya cubre esta información) ============
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
export const POTENCIAL_OPTIONS = ['Bajo', 'Medio', 'Alto', 'Muy Alto'];

export const POTENCIAL_CONFIG = [
  { key: 'Bajo',     label: 'Bajo',     color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'Medio',    label: 'Medio',    color: '#f59e0b', bg: '#fffbeb' },
  { key: 'Alto',     label: 'Alto',     color: '#E87A1E', bg: '#FEF3E8' },
  { key: 'Muy Alto', label: 'Muy Alto', color: '#dc2626', bg: '#fef2f2' },
];

// ============ COMUNIDADES AUTÓNOMAS ============
export const COMUNIDADES_AUTONOMAS = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Ceuta',
  'Comunidad Valenciana', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid',
  'Melilla', 'Murcia', 'Navarra', 'País Vasco',
];

// ============ ORIGEN DEL LEAD ============
export const LEAD_SOURCE_OPTIONS = [
  { value: 'evento',                   label: 'Evento'                      },
  { value: 'congreso',                 label: 'Congreso'                    },
  { value: 'webinar',                  label: 'Webinar'                     },
  { value: 'linkedin_sales_navigator', label: 'LinkedIn/Sales Navigator'    },
  { value: 'recomendacion_partner',    label: 'Recomendación partner'       },
  { value: 'industrial',               label: 'Industrial'                  },
  { value: 'generacion_distribuida',   label: 'Generación Distribuida'      },
  { value: 'canal_naturgy',            label: 'Canal Naturgy'               },
  { value: 'kam',                      label: 'KAM'                         },
  { value: 'asociacion_sectorial',     label: 'Asociación sectorial'        },
  { value: 'fabricante',               label: 'Fabricante'                  },
  { value: 'solicitud_directa',        label: 'Solicitud directa del canal' },
  { value: 'otros',                    label: 'Otros'                       },
];

// ============ ZONAS ============
export const ZONES = ['Norte', 'Centro', 'Este'];

// ============ CLASIFICACIÓN DE CANAL ============
// Única fuente de verdad para "qué tipo de canal es". Sustituye a los antiguos
// campos sueltos tipo_canal_caes/sector_cae: la rama "CAEs" ya cubre esos sectores.
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
  { key: 'visit',    label: 'Visita',    icon: '📍', color: '#E87A1E', bg: '#FEF3E8' },
  { key: 'call',     label: 'Llamada',   icon: '📞', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'email',    label: 'Email',     icon: '📧', color: '#8b5cf6', bg: '#f3eeff' },
  { key: 'whatsapp', label: 'WhatsApp',  icon: '💬', color: '#16a34a', bg: '#e6f5ed' },
  { key: 'meeting',  label: 'Reunión',   icon: '👥', color: '#E87A1E', bg: '#FEF3E8' },
  { key: 'linkedin', label: 'LinkedIn',  icon: '💼', color: '#0077b5', bg: '#e8f4fd' },
  { key: 'other',    label: 'Otro',      icon: '📋', color: '#5a6078', bg: '#f0f0f4' },
];

// ============ RESULT OPTIONS ============
export const RESULT_OPTIONS = [
  { key: 'positive', label: 'Positiva', color: '#16a34a', bg: 'bg-green-50', text: 'text-green-600' },
  { key: 'neutral',  label: 'Neutral',  color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600' },
  { key: 'negative', label: 'Negativa', color: '#ef4444', bg: 'bg-red-50',   text: 'text-red-600'   },
];

// ============ VOLUME UNITS ============
export const VOLUME_UNITS = [
  { key: 'swe_swg',   label: 'Residencial', unit: 'SWE+SWG', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'gwh_pymes', label: 'PYMEs',       unit: 'GWh',     color: '#8b5cf6', bg: '#f3eeff' },
  { key: 'gwh_caes',  label: 'CAEs',        unit: 'GWh',     color: '#16a34a', bg: '#e6f5ed' },
];
