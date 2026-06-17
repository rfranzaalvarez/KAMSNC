import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Loader2, Building2, MapPin, BarChart3, CheckCircle } from 'lucide-react';

const EXPORTS = [
  {
    id: 'channels',
    label: 'Canales',
    description: 'Todos tus canales con contacto, tipo, estado, CAES y ciudad',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'visits',
    label: 'Visitas',
    description: 'Historial de visitas con fecha, canal, resultado y duración',
    icon: MapPin,
    color: 'text-brand-500',
    bg: 'bg-brand-50',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    description: 'Canales por fase del pipeline con fechas de última actualización',
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

const STATUS_LABELS = {
  pendiente_contacto: 'Pendiente contacto',
  en_desarrollo:      'En desarrollo',
  en_evaluacion:      'En evaluación',
  en_proceso_alta:    'En proceso de alta',
  activo:             'Activo',
  rechazado:          'Rechazado',
  cierre_sin_acuerdo: 'Cierre sin acuerdo',
};

const STAGE_LABELS = {
  lead:           'Lead',
  first_contact:  'Primer contacto',
  proposal:       'Propuesta',
  negotiation:    'Negociación',
  onboarding:     'En proceso alta',
  active:         'Activo',
  closed_no_deal: 'Sin acuerdo',
};

const RESULT_LABELS = {
  positive: 'Positiva',
  neutral:  'Neutral',
  negative: 'Negativa',
};

const LEAD_SOURCE_LABELS = {
  evento:               'Evento',
  congreso:             'Congreso',
  webinar:              'Webinar',
  linkedin_sales_navigator: 'LinkedIn/Sales Navigator',
  recomendacion_partner: 'Recomendación partner',
  industrial:           'Industrial',
  generacion_distribuida: 'Generación Distribuida',
  canal_naturgy:        'Canal Naturgy',
  kam:                  'KAM',
  asociacion_sectorial: 'Asociación sectorial',
  fabricante:           'Fabricante',
  solicitud_directa:    'Solicitud directa del canal',
  otros:                'Otros',
};

export default function ExportPage() {
  const { user, profile, isManager } = useAuthContext();
  const [exporting, setExporting] = useState(null);
  const [done, setDone] = useState(null);

  async function handleExport(type) {
    setExporting(type);
    setDone(null);

    try {
      let data = [];
      let fileName = '';
      const today = new Date().toISOString().split('T')[0];

      switch (type) {
        case 'channels': {
          let query = supabase.from('channels').select('*').order('name');
          if (!isManager) query = query.eq('assigned_to', user.id);

          const { data: channels, error } = await query;
          if (error) throw error;

          data = (channels || []).map(ch => ({
            'Nombre':              ch.name,
            'Estado':              STATUS_LABELS[ch.status] || ch.status || '',
            'Fase Pipeline':       STAGE_LABELS[ch.pipeline_stage] || ch.pipeline_stage || '',
            'Tipo Canal CAES':     ch.tipo_canal_caes || '',
            'Sector CAE':          Array.isArray(ch.sector_cae) ? ch.sector_cae.join(', ') : (ch.sector_cae || ''),
            'Potencial CAES':      ch.potencial_caes || '',
            'Potencial Energía':   ch.potencial_energia || '',
            'Comunidad Autónoma':  ch.comunidad_autonoma || '',
            'Contacto':            ch.contact_name || '',
            'Teléfono':            ch.phone || '',
            'Email':               ch.email || '',
            'CIF':                 ch.cif || '',
            'Web':                 ch.website || '',
            'Valoración Google':   ch.google_rating != null ? ch.google_rating : '',
            'Origen del lead':     Array.isArray(ch.lead_source)
              ? ch.lead_source.map(s => LEAD_SOURCE_LABELS[s] || s).join(', ')
              : (LEAD_SOURCE_LABELS[ch.lead_source] || ch.lead_source || ''),
            'Dirección':           ch.address || '',
            'Ciudad':              ch.city || '',
            'Provincia':           ch.province || '',
            'Notas':               ch.notes || '',
            'Creado':              ch.created_at ? new Date(ch.created_at).toLocaleDateString('es-ES') : '',
          }));
          fileName = `canales_kamapp_${today}.xlsx`;
          break;
        }

        case 'visits': {
          let query = supabase.from('visits').select('*, channels(name)')
            .order('checkin_at', { ascending: false });
          if (!isManager) query = query.eq('kam_id', user.id);

          const { data: visits, error } = await query;
          if (error) throw error;

          data = (visits || []).map(v => ({
            'Canal':          v.channels?.name || '',
            'Fecha':          v.checkin_at ? new Date(v.checkin_at).toLocaleDateString('es-ES') : '',
            'Hora entrada':   v.checkin_at ? new Date(v.checkin_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
            'Hora salida':    v.checkout_at ? new Date(v.checkout_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
            'Duración (min)': v.duration_minutes || '',
            'Resultado':      RESULT_LABELS[v.result] || v.result || '',
            'Objetivo':       v.objective || '',
            'Notas':          v.notes || '',
            'Próximos pasos': v.next_steps || '',
          }));
          fileName = `visitas_kamapp_${today}.xlsx`;
          break;
        }

        case 'pipeline': {
          let query = supabase.from('channels')
            .select('name, pipeline_stage, status, tipo_canal_caes, potencial_caes, potencial_energia, comunidad_autonoma, contact_name, city, updated_at')
            .order('pipeline_stage');
          if (!isManager) query = query.eq('assigned_to', user.id);

          const { data: channels, error } = await query;
          if (error) throw error;

          const stageOrder = ['lead', 'first_contact', 'proposal', 'negotiation', 'onboarding', 'active', 'closed_no_deal'];
          const sorted = (channels || []).sort((a, b) =>
            stageOrder.indexOf(a.pipeline_stage) - stageOrder.indexOf(b.pipeline_stage)
          );

          data = sorted.map(ch => ({
            'Canal':               ch.name,
            'Fase':                STAGE_LABELS[ch.pipeline_stage] || ch.pipeline_stage || '',
            'Estado':              STATUS_LABELS[ch.status] || ch.status || '',
            'Tipo Canal CAES':     ch.tipo_canal_caes || '',
            'Potencial CAES':      ch.potencial_caes || '',
            'Potencial Energía':   ch.potencial_energia || '',
            'Comunidad Autónoma':  ch.comunidad_autonoma || '',
            'Contacto':            ch.contact_name || '',
            'Ciudad':              ch.city || '',
            'Última actualización': ch.updated_at ? new Date(ch.updated_at).toLocaleDateString('es-ES') : '',
          }));
          fileName = `pipeline_kamapp_${today}.xlsx`;
          break;
        }
      }

      if (data.length === 0) {
        alert('No hay datos para exportar');
        setExporting(null);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const cols = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length).slice(0, 50)) + 2,
      }));
      ws['!cols'] = cols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type === 'channels' ? 'Canales' : type === 'visits' ? 'Visitas' : 'Pipeline');
      XLSX.writeFile(wb, fileName);

      setDone(type);
      setTimeout(() => setDone(null), 3000);
    } catch (err) {
      console.error('Error exportando:', err);
      alert('Error al exportar: ' + err.message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <FileSpreadsheet size={20} className="text-brand-500" />
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text-primary">Exportar datos</h1>
          <p className="text-xs text-text-secondary mt-0.5">Descarga tus datos en formato Excel</p>
        </div>
      </div>

      <div className="space-y-3">
        {EXPORTS.map(exp => {
          const Icon = exp.icon;
          const isExporting = exporting === exp.id;
          const isDone = done === exp.id;

          return (
            <div key={exp.id} className="bg-white border border-surface-3 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${exp.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={exp.color} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-text-primary">{exp.label}</div>
                <div className="text-xs text-text-secondary mt-0.5">{exp.description}</div>
              </div>
              <button
                onClick={() => handleExport(exp.id)}
                disabled={isExporting}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${
                  isDone
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50'
                }`}
              >
                {isExporting ? (
                  <><Loader2 size={14} className="animate-spin" /> Exportando...</>
                ) : isDone ? (
                  <><CheckCircle size={14} /> Descargado</>
                ) : (
                  <><Download size={14} /> Descargar</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-surface-1 border border-surface-3 rounded-xl p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Información</h3>
        <div className="text-xs text-text-muted space-y-1.5">
          <p>• Los archivos se descargan en formato <strong>.xlsx</strong> (Excel)</p>
          <p>• {isManager ? 'Como manager, se exportan los datos de todo tu equipo' : 'Se exportan solo tus datos asignados'}</p>
          <p>• Las columnas se ajustan automáticamente al contenido</p>
          <p>• La exportación de canales incluye campos CAES: tipo, sector, potencial y CCAA</p>
        </div>
      </div>
    </div>
  );
}
