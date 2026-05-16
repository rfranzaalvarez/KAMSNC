import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { FileText, Download, Loader2, Calendar, BarChart3, MapPin, CheckCircle } from 'lucide-react';

const STAGE_LABELS = {
  lead: 'Lead', first_contact: 'Primer contacto', proposal: 'Propuesta',
  negotiation: 'Negociación', onboarding: 'Alta', active: 'Activo',
};
const RESULT_LABELS = { positive: 'Positiva', neutral: 'Neutral', negative: 'Negativa' };
const STATUS_LABELS = { prospect: 'Prospecto', developing: 'En desarrollo', active: 'Activo', inactive: 'Inactivo' };

export default function WeeklyReportPage() {
  const { user, profile } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generateReport() {
    if (!user?.id) return;
    setLoading(true);

    try {
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay() || 7;
      monday.setDate(monday.getDate() - day + 1);
      monday.setHours(0, 0, 0, 0);
      const mondayISO = monday.toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all data
      const [visitsRes, channelsRes, allVisitsRes] = await Promise.allSettled([
        supabase.from('visits').select('*, channels(name)')
          .eq('kam_id', user.id).gte('checkin_at', mondayISO)
          .order('checkin_at', { ascending: false }),
        supabase.from('channels').select('*')
          .eq('assigned_to', user.id).order('name'),
        supabase.from('visits').select('id', { count: 'exact', head: true })
          .eq('kam_id', user.id).gte('checkin_at', monthStart),
      ]);

      const visits = visitsRes.status === 'fulfilled' ? (visitsRes.value.data || []) : [];
      const channels = channelsRes.status === 'fulfilled' ? (channelsRes.value.data || []) : [];
      const monthVisits = allVisitsRes.status === 'fulfilled' ? (allVisitsRes.value.count || 0) : 0;

      const positiveVisits = visits.filter(v => v.result === 'positive').length;
      const negativeVisits = visits.filter(v => v.result === 'negative').length;
      const neutralVisits = visits.filter(v => v.result === 'neutral').length;
      const avgDuration = visits.length > 0
        ? Math.round(visits.filter(v => v.duration_minutes).reduce((s, v) => s + v.duration_minutes, 0) / visits.filter(v => v.duration_minutes).length)
        : 0;

      // Pipeline
      const pipeline = {};
      Object.keys(STAGE_LABELS).forEach(s => { pipeline[s] = channels.filter(c => c.pipeline_stage === s).length; });

      // Build HTML for PDF
      const periodStr = `${monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #E87A1E; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #003E6B; }
  .header .subtitle { font-size: 12px; color: #5a6078; margin-top: 4px; }
  .header .brand { font-size: 18px; font-weight: 800; color: #E87A1E; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: bold; color: #003E6B; border-bottom: 2px solid #eef0f4; padding-bottom: 6px; margin-bottom: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: #f7f8fa; border: 1px solid #dde1e8; border-radius: 8px; padding: 14px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 800; }
  .stat-label { font-size: 10px; color: #5a6078; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  .orange { color: #E87A1E; }
  .navy { color: #003E6B; }
  .green { color: #16a34a; }
  .red { color: #dc2626; }
  .blue { color: #3b82f6; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f7f8fa; text-align: left; padding: 8px 10px; font-size: 10px; color: #5a6078; text-transform: uppercase; border-bottom: 2px solid #dde1e8; }
  td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #eef0f4; color: #1a1a2e; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; }
  .badge-green { background: #e6f5ed; color: #16a34a; }
  .badge-red { background: #fef2f2; color: #dc2626; }
  .badge-amber { background: #fef3e8; color: #E87A1E; }
  .badge-gray { background: #f0f0f4; color: #5a6078; }
  .pipeline-bar { display: flex; gap: 4px; height: 24px; margin-top: 8px; margin-bottom: 8px; }
  .pipeline-segment { border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: white; min-width: 30px; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #dde1e8; text-align: center; font-size: 9px; color: #8b90a0; }
</style>
</head><body>

<div class="header">
  <div>
    <h1>Informe Semanal</h1>
    <div class="subtitle">${profile?.full_name || 'KAM'} · ${periodStr}</div>
  </div>
  <div class="brand">CRM para KAMs</div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value orange">${visits.length}</div>
    <div class="stat-label">Visitas semana</div>
  </div>
  <div class="stat-card">
    <div class="stat-value green">${positiveVisits}</div>
    <div class="stat-label">Positivas</div>
  </div>
  <div class="stat-card">
    <div class="stat-value navy">${channels.length}</div>
    <div class="stat-label">Total canales</div>
  </div>
  <div class="stat-card">
    <div class="stat-value blue">${avgDuration}</div>
    <div class="stat-label">Min/visita (media)</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Pipeline</div>
  <div class="pipeline-bar">
    ${Object.entries(pipeline).map(([stage, count]) => {
      const colors = { lead: '#94a3b8', first_contact: '#3b82f6', proposal: '#8b5cf6', negotiation: '#E87A1E', onboarding: '#16a34a', active: '#059669' };
      const pct = channels.length > 0 ? Math.max((count / channels.length) * 100, count > 0 ? 8 : 0) : 0;
      return count > 0 ? `<div class="pipeline-segment" style="background:${colors[stage]};flex:${pct}">${STAGE_LABELS[stage]} (${count})</div>` : '';
    }).join('')}
  </div>
  <table>
    <tr><th>Fase</th><th>Canales</th></tr>
    ${Object.entries(pipeline).map(([stage, count]) =>
      `<tr><td>${STAGE_LABELS[stage]}</td><td><strong>${count}</strong></td></tr>`
    ).join('')}
  </table>
</div>

<div class="section">
  <div class="section-title">Visitas de la semana (${visits.length})</div>
  ${visits.length === 0 ? '<p style="font-size:12px;color:#8b90a0;padding:12px 0;">Sin visitas registradas esta semana</p>' : `
  <table>
    <tr><th>Fecha</th><th>Canal</th><th>Duración</th><th>Resultado</th><th>Notas</th></tr>
    ${visits.map(v => {
      const d = new Date(v.checkin_at);
      const badgeClass = v.result === 'positive' ? 'badge-green' : v.result === 'negative' ? 'badge-red' : 'badge-amber';
      return `<tr>
        <td>${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td>
        <td><strong>${v.channels?.name || '-'}</strong></td>
        <td>${v.duration_minutes ? v.duration_minutes + ' min' : '-'}</td>
        <td><span class="badge ${badgeClass}">${RESULT_LABELS[v.result] || '-'}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.notes || v.next_steps || '-'}</td>
      </tr>`;
    }).join('')}
  </table>`}
</div>

<div class="section">
  <div class="section-title">Canales (${channels.length})</div>
  <table>
    <tr><th>Canal</th><th>Tipo</th><th>Estado</th><th>Pipeline</th><th>Ciudad</th></tr>
    ${channels.slice(0, 20).map(c => {
      const stClass = c.status === 'active' ? 'badge-green' : c.status === 'developing' ? 'badge-amber' : 'badge-gray';
      return `<tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.channel_type || '-'}</td>
        <td><span class="badge ${stClass}">${STATUS_LABELS[c.status] || c.status}</span></td>
        <td>${STAGE_LABELS[c.pipeline_stage] || c.pipeline_stage}</td>
        <td>${c.city || '-'}</td>
      </tr>`;
    }).join('')}
    ${channels.length > 20 ? `<tr><td colspan="5" style="text-align:center;color:#8b90a0">... y ${channels.length - 20} canales más</td></tr>` : ''}
  </table>
</div>

<div class="section">
  <div class="section-title">Resumen del mes</div>
  <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
    <div class="stat-card">
      <div class="stat-value orange">${monthVisits}</div>
      <div class="stat-label">Visitas este mes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value green">${channels.filter(c => c.status === 'active').length}</div>
      <div class="stat-label">Canales activos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value navy">${channels.filter(c => ['first_contact','proposal','negotiation','onboarding'].includes(c.pipeline_stage)).length}</div>
      <div class="stat-label">Pipeline activo</div>
    </div>
  </div>
</div>

<div class="footer">
  CRM para KAMs · Naturgy · Generado el ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} a las ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
</div>

</body></html>`;

      // Open print dialog (saves as PDF)
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();

      // Auto-trigger print after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      setGenerated(true);
      setTimeout(() => setGenerated(false), 5000);
    } catch (err) {
      console.error('Error generando informe:', err);
      alert('Error al generar el informe: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  const periodStr = `${monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <FileText size={20} className="text-brand-500" />
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text-primary">Informe semanal</h1>
          <p className="text-xs text-text-secondary mt-0.5">Genera y descarga tu informe en PDF</p>
        </div>
      </div>

      {/* Preview card */}
      <div className="bg-white border border-surface-3 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-text-primary">Semana actual</div>
            <div className="text-xs text-text-secondary mt-0.5">{periodStr}</div>
          </div>
          <Calendar size={18} className="text-text-muted" />
        </div>

        <div className="bg-surface-1 rounded-lg p-4 mb-4">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">El informe incluye</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BarChart3, text: 'Estadísticas de la semana' },
              { icon: MapPin, text: 'Detalle de todas las visitas' },
              { icon: BarChart3, text: 'Estado del pipeline' },
              { icon: FileText, text: 'Listado de canales' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon size={14} className="text-brand-500 flex-shrink-0" />
                <span className="text-xs text-text-secondary">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className={`w-full py-3.5 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
            generated
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 shadow-sm shadow-brand-500/20'
          }`}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Generando informe...</>
          ) : generated ? (
            <><CheckCircle size={16} /> Informe generado — revisa la ventana de impresión</>
          ) : (
            <><Download size={16} /> Generar y descargar PDF</>
          )}
        </button>
      </div>

      <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Cómo funciona</h3>
        <div className="text-xs text-text-muted space-y-1.5">
          <p>1. Pulsa <strong>"Generar y descargar PDF"</strong></p>
          <p>2. Se abrirá una ventana con el informe formateado</p>
          <p>3. En el diálogo de impresión, selecciona <strong>"Guardar como PDF"</strong></p>
          <p>4. Elige dónde guardarlo y listo</p>
        </div>
      </div>
    </div>
  );
}
