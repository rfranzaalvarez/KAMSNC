import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { useSessionReady } from '../hooks/useSessionReady';
import { CheckInButton } from '../components/CheckInButton';
import { Loader2, Clock } from 'lucide-react';

const ALERT_ICONS = {
  task: '⚡', followup_overdue: '🔔', pipeline_stalled: '📊',
  channel_inactive: '🏢', plan_review: '📋', system: 'ℹ️',
};

const PRIORITY_COLORS = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  low: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

const RESULT_COLORS = {
  positive: 'text-green-600 bg-green-50',
  neutral: 'text-amber-600 bg-amber-50',
  negative: 'text-red-600 bg-red-50',
};

export default function HomePage() {
  const { user, profile } = useAuthContext();
  const { ready, refreshKey } = useSessionReady();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, weekTarget: 12, pipeline: 0 });
  const [alerts, setAlerts] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);

  useEffect(() => {
    if (ready && user?.id) loadData();
  }, [ready, refreshKey, user?.id]);

  async function loadData() {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 6000);

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const mondayStart = (() => {
        const d = new Date(now); const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1); d.setHours(0, 0, 0, 0); return d.toISOString();
      })();

      const [visitsToday, visitsWeek, pipelineCount, alertsData, recentVisits] = await Promise.allSettled([
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('kam_id', user.id).gte('checkin_at', todayStart),
        supabase.from('visits').select('id', { count: 'exact', head: true }).eq('kam_id', user.id).gte('checkin_at', mondayStart),
        supabase.from('channels').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).in('pipeline_stage', ['first_contact', 'proposal', 'negotiation', 'onboarding']),
        supabase.from('alerts').select('*, channels(name)').eq('user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('visits').select('*, channels(name)').eq('kam_id', user.id).gte('checkin_at', todayStart).order('checkin_at', { ascending: false }),
      ]);

      const getCount = (r) => r.status === 'fulfilled' ? (r.value.count || 0) : 0;
      const getData = (r) => r.status === 'fulfilled' ? (r.value.data || []) : [];

      setStats({ today: getCount(visitsToday), week: getCount(visitsWeek), weekTarget: 12, pipeline: getCount(pipelineCount) });
      setAlerts(getData(alertsData));
      setTodayVisits(getData(recentVisits));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function dismissAlert(alertId) {
    await supabase.from('alerts').update({ is_dismissed: true }).eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }

  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (loading && !todayVisits.length && !alerts.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-xs text-text-secondary">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center text-[10px]">🔔</span>
            <span className="text-xs font-bold text-text-primary">Alertas</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center">{alerts.length}</span>
          </div>
          {alerts.map((alert, i) => {
            const priority = PRIORITY_COLORS[alert.priority] || PRIORITY_COLORS.medium;
            return (
              <div key={alert.id} className={`flex items-start gap-2 py-2.5 px-2 rounded-lg ${i === 0 ? 'bg-white/60' : ''} ${i < alerts.length - 1 ? 'border-b border-red-100' : ''}`}>
                <span className="text-sm mt-0.5 flex-shrink-0">{ALERT_ICONS[alert.alert_type] || 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold leading-tight text-text-primary">{alert.title}</div>
                  {alert.detail && <div className="text-[11px] text-text-secondary leading-tight mt-0.5">{alert.detail}</div>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {alert.due_date && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${priority.bg} ${priority.text}`}>{new Date(alert.due_date) <= new Date() ? 'Vencido' : new Date(alert.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                  <button onClick={() => dismissAlert(alert.id)} className="text-[9px] text-text-muted hover:text-text-secondary">✓ Hecho</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-brand-500">{stats.today}</div>
          <div className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">Hoy</div>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-navy-500">{stats.week}<span className="text-sm text-text-muted">/{stats.weekTarget}</span></div>
          <div className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">Semana</div>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 text-center">
          <div className="text-xl font-extrabold text-green-600">{stats.pipeline}</div>
          <div className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">Pipeline</div>
        </div>
      </div>

      <CheckInButton />

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold">Visitas de hoy</h2>
          <span className="text-[11px] text-text-secondary">{todayVisits.length} registradas</span>
        </div>
        {todayVisits.length === 0 ? (
          <div className="text-center py-8 bg-surface-1 border border-surface-3 rounded-xl">
            <Clock size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">Aún no has registrado visitas hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayVisits.map(visit => {
              const time = new Date(visit.checkin_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const resultClass = visit.result ? RESULT_COLORS[visit.result] : '';
              return (
                <div key={visit.id} className="flex items-center gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!visit.checkout_at ? 'bg-brand-500 animate-pulse' : visit.result === 'positive' ? 'bg-green-500' : visit.result === 'negative' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{visit.channels?.name || 'Canal'}</div>
                    <div className="text-[11px] text-text-secondary">{time}{visit.duration_minutes ? ` · ${visit.duration_minutes} min` : ' · En curso'}</div>
                  </div>
                  {visit.result ? (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${resultClass}`}>{visit.result === 'positive' ? '✓ Positiva' : visit.result === 'neutral' ? '~ Neutral' : '✗ Negativa'}</span>
                  ) : !visit.checkout_at ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600">En curso</span>
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
