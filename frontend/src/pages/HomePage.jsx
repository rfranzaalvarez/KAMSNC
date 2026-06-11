import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { CheckInButton } from '../components/CheckInButton';
import { Loader2, Clock, MapPin, Phone, Mail, MessageCircle, Users, Linkedin, Calendar, Check } from 'lucide-react';

const ALERT_ICONS = { task: '⚡', followup_overdue: '🔔', pipeline_stalled: '📊', channel_inactive: '🏢', plan_review: '📋', system: 'ℹ️' };
const PRIORITY_COLORS = { high: { bg: 'bg-red-500/20', text: 'text-red-400' }, medium: { bg: 'bg-amber-500/20', text: 'text-amber-400' }, low: { bg: 'bg-gray-500/20', text: 'text-gray-400' } };
const RESULT_COLORS = { positive: 'text-green-600 bg-green-50', neutral: 'text-amber-600 bg-amber-50', negative: 'text-red-600 bg-red-50' };

const TYPE_CONFIG = {
  visit: { label: 'Visita', icon: MapPin, color: '#E87A1E', bg: 'bg-[#FEF3E8]' },
  call: { label: 'Llamada', icon: Phone, color: '#3b82f6', bg: 'bg-blue-50' },
  email: { label: 'Email', icon: Mail, color: '#8b5cf6', bg: 'bg-purple-50' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#16a34a', bg: 'bg-green-50' },
  meeting: { label: 'Reunión', icon: Users, color: '#E87A1E', bg: 'bg-[#FEF3E8]' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: '#0077b5', bg: 'bg-blue-50' },
  other: { label: 'Otro', icon: Calendar, color: '#5a6078', bg: 'bg-gray-50' },
};

export default function HomePage() {
  const { user, profile } = useAuthContext();
  const [firstLoad, setFirstLoad] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [todayPlanned, setTodayPlanned] = useState([]);
  const mountedRef = useRef(true);

  async function loadData() {
    if (!user?.id) return;
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const pad = (n) => String(n).padStart(2, '0');
      const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const [r4, r5, r6, r7] = await Promise.allSettled([
        supabase.from('alerts').select('*, channels(name)').eq('user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('visits').select('*, channels(name)').eq('kam_id', user.id).gte('checkin_at', todayStart).order('checkin_at', { ascending: false }),
        // Planned visits for today
        supabase.from('planned_visits').select('*, channels(name, address)').eq('kam_id', user.id).eq('planned_date', todayKey).order('planned_time'),
        // Planned actions for today (is_completed = false or NULL with planned_date)
        supabase.from('channel_interactions').select('*, channels(name, address)').eq('user_id', user.id).eq('planned_date', todayKey).or('is_completed.eq.false,is_completed.is.null').order('planned_time'),
      ]);

      if (!mountedRef.current) return;
      const gd = (r) => r.status === 'fulfilled' ? (r.value.data || []) : [];
      setAlerts(gd(r4));
      setTodayVisits(gd(r5));

      // Merge planned visits + planned actions into one list
      const pVisits = gd(r6).map(v => ({
        _id: `pv-${v.id}`, _sourceId: v.id, _source: 'planned_visit',
        _type: 'visit', time: v.planned_time?.slice(0, 5) || '--:--',
        channelName: v.channels?.name || 'Canal', channelAddress: v.channels?.address || '',
        notes: v.notes, is_completed: v.is_completed,
      }));
      const pActions = gd(r7).map(a => ({
        _id: `pa-${a.id}`, _sourceId: a.id, _source: 'interaction',
        _type: a.interaction_type, time: a.planned_time?.slice(0, 5) || '--:--',
        channelName: a.channels?.name || 'Canal', channelAddress: a.channels?.address || '',
        notes: a.notes, is_completed: a.is_completed,
      }));
      setTodayPlanned([...pVisits, ...pActions].sort((a, b) => a.time.localeCompare(b.time)));
    } catch (e) { console.error(e); }
    if (mountedRef.current) setFirstLoad(false);
  }

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    const t = setTimeout(() => { if (mountedRef.current) setFirstLoad(false); }, 4000);
    return () => { mountedRef.current = false; clearTimeout(t); };
  }, [user?.id]);

  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible') loadData(); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [user?.id]);

  async function dismissAlert(id) {
    await supabase.from('alerts').update({ is_dismissed: true }).eq('id', id);
    setAlerts(p => p.filter(a => a.id !== id));
  }

  async function completePlanned(item) {
    try {
      if (item._source === 'interaction') {
        await supabase.from('channel_interactions').update({ is_completed: true }).eq('id', item._sourceId);
      } else if (item._source === 'planned_visit') {
        await supabase.from('planned_visits').update({ is_completed: true }).eq('id', item._sourceId);
      }
      setTodayPlanned(prev => prev.filter(p => p._id !== item._id));
    } catch (err) { console.error(err); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = profile?.full_name?.split(' ')[0] || '';

  if (firstLoad) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-sm text-text-secondary mt-0.5">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center text-[10px]">🔔</span>
            <span className="text-xs font-bold text-text-primary">Alertas</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{alerts.length}</span>
          </div>
          {alerts.map((a, i) => {
            const pr = PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.medium;
            return (
              <div key={a.id} className={`flex items-start gap-2 py-2.5 px-2 rounded-lg ${i === 0 ? 'bg-white/60' : ''} ${i < alerts.length-1 ? 'border-b border-red-100' : ''}`}>
                <span className="text-sm mt-0.5">{ALERT_ICONS[a.alert_type]||'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary">{a.title}</div>
                  {a.detail && <div className="text-[11px] text-text-secondary mt-0.5">{a.detail}</div>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {a.due_date && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pr.bg} ${pr.text}`}>{new Date(a.due_date)<=new Date()?'Vencido':new Date(a.due_date).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>}
                  <button onClick={()=>dismissAlert(a.id)} className="text-[9px] text-text-muted">✓ Hecho</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CheckInButton />

      {/* Acciones planificadas para hoy */}
      {todayPlanned.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold">Planificado para hoy</h2>
            <span className="text-[11px] text-text-secondary">{todayPlanned.length} pendientes</span>
          </div>
          <div className="space-y-2">
            {todayPlanned.map(item => {
              const cfg = TYPE_CONFIG[item._type] || TYPE_CONFIG.other;
              const Icon = cfg.icon;
              return (
                <div key={item._id} className="flex items-center gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl"
                  style={{ borderLeftWidth: '3px', borderLeftColor: cfg.color }}>
                  <div className="text-center flex-shrink-0 w-10">
                    <div className="text-xs font-bold" style={{ color: cfg.color }}>{item.time}</div>
                  </div>
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{item.channelName}</div>
                    <div className="text-[10px] text-text-muted truncate">
                      <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      {item.channelAddress ? ` · ${item.channelAddress}` : ''}
                    </div>
                    {item.notes && <div className="text-[10px] text-text-muted truncate mt-0.5">{item.notes}</div>}
                  </div>
                  <button onClick={() => completePlanned(item)}
                    className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-[10px] font-bold flex-shrink-0 transition-colors flex items-center gap-1">
                    <Check size={10} /> Hecho
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitas de hoy (realizadas) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold">Actividad de hoy</h2>
          <span className="text-[11px] text-text-secondary">{todayVisits.length} registradas</span>
        </div>
        {todayVisits.length === 0 ? (
          <div className="text-center py-8 bg-surface-1 border border-surface-3 rounded-xl">
            <Clock size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">Aún no has registrado visitas hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayVisits.map(v => {
              const time = new Date(v.checkin_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
              const rc = v.result ? RESULT_COLORS[v.result] : '';
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl">
                  <div className={`w-2 h-2 rounded-full ${!v.checkout_at?'bg-brand-500 animate-pulse':v.result==='positive'?'bg-green-500':v.result==='negative'?'bg-red-500':'bg-amber-500'}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.channels?.name||'Canal'}</div>
                    <div className="text-[11px] text-text-secondary">{time}{v.duration_minutes ? ` · ${v.duration_minutes} min` : v.checkout_at || v.result ? ' · Finalizada' : ' · En curso'}</div>
                  </div>
                  {v.result?<span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${rc}`}>{v.result==='positive'?'✓ Positiva':v.result==='neutral'?'~ Neutral':'✗ Negativa'}</span>:!v.checkout_at&&!v.result?<span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600">En curso</span>:null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
