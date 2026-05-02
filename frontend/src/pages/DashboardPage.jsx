import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { Loader2, Users, BarChart3, Building2, TrendingUp, AlertTriangle, ChevronRight, Eye } from 'lucide-react';

const RESULT_COLORS = {
  positive: { label: 'Positiva', bg: 'bg-green-500/20', text: 'text-green-400' },
  neutral: { label: 'Neutral', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  negative: { label: 'Negativa', bg: 'bg-red-500/20', text: 'text-red-400' },
};

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: '#94a3b8' },
  { key: 'first_contact', label: 'Contacto', color: '#60a5fa' },
  { key: 'proposal', label: 'Propuesta', color: '#a78bfa' },
  { key: 'negotiation', label: 'Negociación', color: '#f59e0b' },
  { key: 'onboarding', label: 'Alta', color: '#22c55e' },
  { key: 'active', label: 'Activo', color: '#10b981' },
];

function StatCard({ value, target, label, color }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold" style={{ color }}>{value}</span>
        {target && <span className="text-sm text-text-muted">{target}</span>}
      </div>
      <div className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold mt-1">{label}</div>
    </div>
  );
}

function KamRow({ kam, onViewDetail }) {
  const ratio = kam.weekTarget > 0 ? kam.visitsWeek / kam.weekTarget : 0;
  const statusColor = ratio >= 1 ? '#22c55e' : ratio >= 0.6 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-3 last:border-0">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0"
        style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
      >
        {kam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{kam.name}</div>
        <div className="text-[10px] text-text-secondary">
          {kam.zone || 'Sin zona'}
          {kam.lastActive && ` · ${kam.lastActive}`}
        </div>
      </div>

      {/* Visitas */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold" style={{ color: statusColor }}>
          {kam.visitsWeek}/{kam.weekTarget}
        </div>
        <div className="text-[9px] text-text-muted">visitas</div>
      </div>

      {/* Ver detalle */}
      <button
        onClick={() => onViewDetail(kam)}
        className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <Eye size={14} />
      </button>
    </div>
  );
}

function KamDetail({ kam, onBack }) {
  const [visits, setVisits] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [kam.id]);

  async function loadDetail() {
    setLoading(true);
    try {
      const [visitsRes, channelsRes] = await Promise.all([
        supabase.from('visits').select('*, channels(name)')
          .eq('kam_id', kam.id)
          .order('checkin_at', { ascending: false })
          .limit(15),
        supabase.from('channels').select('*')
          .eq('assigned_to', kam.id)
          .order('updated_at', { ascending: false }),
      ]);

      setVisits(visitsRes.data || []);
      setChannels(channelsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    );
  }

  const pipelineCounts = {};
  PIPELINE_STAGES.forEach(s => { pipelineCounts[s.key] = 0; });
  channels.forEach(ch => { if (pipelineCounts[ch.pipeline_stage] !== undefined) pipelineCounts[ch.pipeline_stage]++; });

  return (
    <div>
      <button onClick={onBack} className="text-sm text-brand-400 font-semibold mb-4">← Volver al equipo</button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-lg font-extrabold">
          {kam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <h2 className="text-lg font-extrabold">{kam.name}</h2>
          <p className="text-xs text-text-secondary">{kam.zone || 'Sin zona'} · {channels.length} canales · {kam.visitsWeek} visitas esta semana</p>
        </div>
      </div>

      {/* Pipeline del KAM */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 mb-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Pipeline</h3>
        <div className="space-y-2">
          {PIPELINE_STAGES.map(stage => {
            const count = pipelineCounts[stage.key] || 0;
            const maxCount = Math.max(...Object.values(pipelineCounts), 1);
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="text-[11px] font-semibold w-20 text-right" style={{ color: '#8a8a9a' }}>{stage.label}</span>
                <div className="flex-1 h-6 bg-surface-0 rounded-md overflow-hidden">
                  {count > 0 && (
                    <div
                      className="h-full rounded-md flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-300"
                      style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: stage.color, minWidth: 28 }}
                    >
                      {count}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimas visitas */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Últimas visitas</h3>
        {visits.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">Sin visitas registradas</p>
        ) : (
          <div className="space-y-2">
            {visits.map(visit => {
              const date = new Date(visit.checkin_at);
              const result = visit.result ? RESULT_COLORS[visit.result] : null;
              return (
                <div key={visit.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-0">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    visit.result === 'positive' ? 'bg-green-400' :
                    visit.result === 'negative' ? 'bg-red-400' :
                    visit.result === 'neutral' ? 'bg-amber-400' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{visit.channels?.name || 'Canal'}</div>
                    <div className="text-[10px] text-text-muted">
                      {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {visit.duration_minutes && ` · ${visit.duration_minutes}min`}
                    </div>
                  </div>
                  {result && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${result.bg} ${result.text}`}>
                      {result.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DASHBOARD PRINCIPAL ============
export default function DashboardPage() {
  const { user, profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [teamKams, setTeamKams] = useState([]);
  const [teamStats, setTeamStats] = useState({ visitsWeek: 0, visitsTarget: 0, newChannels: 0, pipelineActive: 0, conversionRate: 0 });
  const [teamAlerts, setTeamAlerts] = useState([]);
  const [pipelineSummary, setPipelineSummary] = useState({});
  const [selectedKam, setSelectedKam] = useState(null);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    try {
      // 1. Obtener KAMs del equipo
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('*')
        .eq('reports_to', user.id)
        .eq('is_active', true)
        .order('full_name');

      // Si no tiene reportes directos, intentar obtener equipo recursivo
      let kams = teamMembers || [];

      // Si es director, también buscar KAMs bajo sus managers
      if (profile?.role === 'director' && kams.length > 0) {
        const managerIds = kams.filter(k => k.role !== 'kam').map(k => k.id);
        if (managerIds.length > 0) {
          const { data: subTeam } = await supabase
            .from('profiles')
            .select('*')
            .in('reports_to', managerIds)
            .eq('is_active', true);
          kams = [...kams, ...(subTeam || [])];
        }
      }

      // Filtrar solo KAMs
      const kamProfiles = kams.filter(k => k.role === 'kam');
      const kamIds = kamProfiles.map(k => k.id);

      if (kamIds.length === 0) {
        setTeamKams([]);
        setLoading(false);
        return;
      }

      // 2. Fechas
      const now = new Date();
      const mondayStart = (() => {
        const d = new Date(now);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 3. Visitas de la semana por KAM
      const { data: weekVisits } = await supabase
        .from('visits')
        .select('kam_id, checkin_at')
        .in('kam_id', kamIds)
        .gte('checkin_at', mondayStart);

      // 4. Canales de todos los KAMs
      const { data: allChannels } = await supabase
        .from('channels')
        .select('id, assigned_to, pipeline_stage, status, created_at')
        .in('assigned_to', kamIds);

      // 5. Alertas del equipo
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*, channels(name), profiles:user_id(full_name)')
        .in('user_id', kamIds)
        .eq('is_dismissed', false)
        .order('priority')
        .order('created_at', { ascending: false })
        .limit(8);

      // 6. Procesar datos por KAM
      const visitsByKam = {};
      (weekVisits || []).forEach(v => {
        visitsByKam[v.kam_id] = (visitsByKam[v.kam_id] || 0) + 1;
      });

      const enrichedKams = kamProfiles.map(k => {
        const visitsWeek = visitsByKam[k.id] || 0;
        const lastVisit = (weekVisits || [])
          .filter(v => v.kam_id === k.id)
          .sort((a, b) => new Date(b.checkin_at) - new Date(a.checkin_at))[0];

        let lastActive = null;
        if (lastVisit) {
          const diff = Math.floor((Date.now() - new Date(lastVisit.checkin_at).getTime()) / 60000);
          if (diff < 60) lastActive = `Hace ${diff}min`;
          else if (diff < 1440) lastActive = `Hace ${Math.floor(diff / 60)}h`;
          else lastActive = `Hace ${Math.floor(diff / 1440)}d`;
        }

        return {
          ...k,
          name: k.full_name,
          visitsWeek,
          weekTarget: 12,
          lastActive,
        };
      }).sort((a, b) => (a.visitsWeek / a.weekTarget) - (b.visitsWeek / b.weekTarget));

      // 7. Stats globales
      const totalVisitsWeek = Object.values(visitsByKam).reduce((a, b) => a + b, 0);
      const totalTarget = kamProfiles.length * 12;
      const newChannelsMonth = (allChannels || []).filter(c => c.created_at >= monthStart).length;
      const pipelineActive = (allChannels || []).filter(c =>
        ['first_contact', 'proposal', 'negotiation', 'onboarding'].includes(c.pipeline_stage)
      ).length;

      // Pipeline summary
      const pipeSummary = {};
      PIPELINE_STAGES.forEach(s => { pipeSummary[s.key] = 0; });
      (allChannels || []).forEach(ch => {
        if (pipeSummary[ch.pipeline_stage] !== undefined) pipeSummary[ch.pipeline_stage]++;
      });

      setTeamKams(enrichedKams);
      setTeamStats({
        visitsWeek: totalVisitsWeek,
        visitsTarget: totalTarget,
        newChannels: newChannelsMonth,
        pipelineActive,
      });
      setTeamAlerts(alerts || []);
      setPipelineSummary(pipeSummary);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    );
  }

  if (selectedKam) {
    return <KamDetail kam={selectedKam} onBack={() => setSelectedKam(null)} />;
  }

  const maxPipeline = Math.max(...Object.values(pipelineSummary), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-xs text-text-secondary">
          {teamKams.length} KAMs en tu equipo · Semana del {new Date(
            (() => { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d; })()
          ).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard value={teamStats.visitsWeek} target={`/ ${teamStats.visitsTarget}`} label="Visitas semana" color="#60a5fa" />
        <StatCard value={teamStats.newChannels} target="este mes" label="Canales nuevos" color="#a78bfa" />
        <StatCard value={teamStats.pipelineActive} target="canales" label="Pipeline activo" color="#f59e0b" />
        <StatCard value={teamKams.length} target="" label="KAMs activos" color="#22c55e" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Actividad KAMs */}
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Actividad KAMs</h2>
            <span className="text-[10px] text-text-secondary">{teamKams.length} personas</span>
          </div>

          {teamKams.length === 0 ? (
            <div className="text-center py-8">
              <Users size={24} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-secondary">No tienes KAMs en tu equipo</p>
              <p className="text-xs text-text-muted mt-1">Los KAMs deben tener tu ID como reports_to</p>
            </div>
          ) : (
            teamKams.map(kam => (
              <KamRow key={kam.id} kam={kam} onViewDetail={setSelectedKam} />
            ))
          )}
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Alertas del equipo */}
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Alertas del equipo</h2>
              {teamAlerts.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                  {teamAlerts.length}
                </span>
              )}
            </div>

            {teamAlerts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-text-muted">Sin alertas pendientes</p>
              </div>
            ) : (
              <div className="space-y-1">
                {teamAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-surface-0 transition-colors">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      alert.priority === 'high' ? 'bg-red-400' :
                      alert.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs leading-snug">{alert.title}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {alert.profiles?.full_name || 'KAM'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline agregado */}
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
            <h2 className="text-sm font-bold mb-3">Pipeline del equipo</h2>
            <div className="space-y-2">
              {PIPELINE_STAGES.map(stage => {
                const count = pipelineSummary[stage.key] || 0;
                return (
                  <div key={stage.key} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-semibold w-[70px] text-right text-text-secondary">{stage.label}</span>
                    <div className="flex-1 h-5 bg-surface-0 rounded overflow-hidden">
                      {count > 0 && (
                        <div
                          className="h-full rounded flex items-center justify-end pr-1.5 text-[9px] font-bold text-white transition-all duration-500"
                          style={{
                            width: `${(count / maxPipeline) * 100}%`,
                            backgroundColor: stage.color,
                            minWidth: 22,
                          }}
                        >
                          {count}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
