import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { CheckInButton } from '../components/CheckInButton';
import { Building2, Loader2, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';

const ALERT_ICONS = {
  task: '⚡',
  followup_overdue: '🔔',
  pipeline_stalled: '📊',
  channel_inactive: '🏢',
  plan_review: '📋',
  system: 'ℹ️',
};

const PRIORITY_COLORS = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  low: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
};

const RESULT_COLORS = {
  positive: 'text-green-400 bg-green-500/20',
  neutral: 'text-amber-400 bg-amber-500/20',
  negative: 'text-red-400 bg-red-500/20',
};

export default function HomePage() {
  const { user, profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, weekTarget: 12, pipeline: 0 });
  const [alerts, setAlerts] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const mondayStart = (() => {
        const d = new Date(now);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })();

      // Queries paralelas
      const [visitsToday, visitsWeek, pipelineCount, alertsData, recentVisits] = await Promise.all([
        supabase.from('visits').select('id', { count: 'exact', head: true })
          .eq('kam_id', user.id).gte('checkin_at', todayStart),
        supabase.from('visits').select('id', { count: 'exact', head: true })
          .eq('kam_id', user.id).gte('checkin_at', mondayStart),
        supabase.from('channels').select('id', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .in('pipeline_stage', ['first_contact', 'proposal', 'negotiation', 'onboarding']),
        supabase.from('alerts').select('*, channels(name)')
          .eq('user_id', user.id).eq('is_dismissed', false)
          .order('priority').order('due_date').limit(10),
        supabase.from('visits').select('*, channels(name)')
          .eq('kam_id', user.id).gte('checkin_at', todayStart)
          .order('checkin_at', { ascending: false }),
      ]);

      setStats({
        today: visitsToday.count || 0,
        week: visitsWeek.count || 0,
        weekTarget: 12,
        pipeline: pipelineCount.count || 0,
      });

      setAlerts(alertsData.data || []);
      setTodayVisits(recentVisits.data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function dismissAlert(alertId) {
    await supabase.from('alerts').update({ is_dismissed: true }).eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }

  // Greeting basado en hora
  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-xs text-text-secondary">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-br from-red-950/30 to-surface-1 border border-red-500/20 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center text-[10px]">🔔</span>
              <span className="text-xs font-bold">Alertas</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">
                {alerts.length}
              </span>
            </div>
          </div>

          {alerts.map((alert, i) => {
            const priority = PRIORITY_COLORS[alert.priority] || PRIORITY_COLORS.medium;
            const icon = ALERT_ICONS[alert.alert_type] || 'ℹ️';

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-2 py-2.5 px-2 rounded-lg ${i === 0 ? 'bg-white/[0.03]' : ''} ${
                  i < alerts.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <span className="text-sm mt-0.5 flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold leading-tight">{alert.title}</div>
                  {alert.detail && (
                    <div className="text-[11px] text-text-secondary leading-tight mt-0.5">{alert.detail}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {alert.due_date && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${priority.bg} ${priority.text}`}>
                      {new Date(alert.due_date) <= new Date() ? 'Vencido' :
                        new Date(alert.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-[9px] text-text-muted hover:text-text-secondary"
                  >
                    ✓ Hecho
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-blue-400">{stats.today}</div>
          <div className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">Hoy</div>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-purple-400">{stats.week}<span className="text-sm text-text-muted">/{stats.weekTarget}</span></div>
          <div className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">Semana</div>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-green-400">{stats.pipeline}</div>
          <div className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">Pipeline</div>
        </div>
      </div>

      {/* Check-in button */}
      <CheckInButton />

      {/* Visitas de hoy */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold">Visitas de hoy</h2>
          <span className="text-[11px] text-text-secondary">{todayVisits.length} registradas</span>
        </div>

        {todayVisits.length === 0 ? (
          <div className="text-center py-8 bg-surface-1 border border-surface-3 rounded-xl">
            <Clock size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">Aún no has registrado visitas hoy</p>
            <p className="text-xs text-text-muted mt-1">Haz check-in para empezar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayVisits.map(visit => {
              const time = new Date(visit.checkin_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const resultClass = visit.result ? RESULT_COLORS[visit.result] : '';

              return (
                <div key={visit.id} className="flex items-center gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    !visit.checkout_at ? 'bg-blue-400 animate-pulse' :
                    visit.result === 'positive' ? 'bg-green-400' :
                    visit.result === 'negative' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{visit.channels?.name || 'Canal'}</div>
                    <div className="text-[11px] text-text-secondary">
                      {time}
                      {visit.duration_minutes ? ` · ${visit.duration_minutes} min` : ' · En curso'}
                    </div>
                  </div>
                  {visit.result ? (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${resultClass}`}>
                      {visit.result === 'positive' ? '✓ Positiva' :
                       visit.result === 'neutral' ? '~ Neutral' : '✗ Negativa'}
                    </span>
                  ) : !visit.checkout_at ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      En curso
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
