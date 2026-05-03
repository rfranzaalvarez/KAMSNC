import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { Loader2, Trophy, Medal, Star, TrendingUp, Target, Zap, Crown, Award } from 'lucide-react';

const PERIODS = [
  { key: 'weekly', label: 'Esta semana' },
  { key: 'monthly', label: 'Este mes' },
];

const BADGE_DEFS = [
  { type: 'first_visit', icon: '🎯', name: 'Primera visita', desc: 'Registraste tu primera visita' },
  { type: 'visit_streak_5', icon: '🔥', name: 'Racha de 5', desc: '5 visitas en una semana' },
  { type: 'visit_streak_10', icon: '💪', name: 'Imparable', desc: '10 visitas en una semana' },
  { type: 'visit_streak_15', icon: '🏆', name: 'Máquina', desc: '15+ visitas en una semana' },
  { type: 'all_positive', icon: '⭐', name: 'Perfecto', desc: 'Todas las visitas positivas en una semana' },
  { type: 'new_channel', icon: '🚀', name: 'Cazador', desc: 'Captaste un nuevo canal' },
  { type: 'new_channel_5', icon: '🌟', name: 'Súper cazador', desc: '5 canales nuevos en un mes' },
  { type: 'top_1', icon: '👑', name: 'Nº 1', desc: 'Primer puesto del ranking semanal' },
  { type: 'top_3', icon: '🥇', name: 'Podio', desc: 'Top 3 del ranking semanal' },
  { type: 'plan_complete', icon: '📋', name: 'Estratega', desc: 'Plan de cuenta al 100%' },
];

function getMedalColor(position) {
  if (position === 0) return { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300', icon: '👑' };
  if (position === 1) return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', icon: '🥈' };
  if (position === 2) return { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-300', icon: '🥉' };
  return { bg: 'bg-surface-1', text: 'text-text-secondary', border: 'border-surface-3', icon: '' };
}

function ScoreBreakdown({ entry }) {
  const items = [
    { label: 'Visitas', value: entry.visits, points: entry.visits * 10, icon: '📍' },
    { label: 'Positivas', value: entry.positive, points: entry.positive * 5, icon: '✅' },
    { label: 'Canales nuevos', value: entry.new_channels, points: entry.new_channels * 15, icon: '🆕' },
  ];
  if (entry.pipeline_active !== undefined) {
    items.push({ label: 'Pipeline', value: entry.pipeline_active, points: entry.pipeline_active * 3, icon: '📊' });
  }

  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-surface-1 rounded-lg">
          <span className="text-sm">{item.icon}</span>
          <div className="flex-1">
            <div className="text-[10px] text-text-muted">{item.label}</div>
            <div className="text-xs font-bold text-text-primary">{item.value}</div>
          </div>
          <span className="text-[10px] font-bold text-brand-500">+{item.points}</span>
        </div>
      ))}
    </div>
  );
}

function LeaderboardEntry({ entry, position, isMe, onToggle, expanded }) {
  const medal = getMedalColor(position);
  const isTop3 = position < 3;

  return (
    <div className={`rounded-xl border transition-all ${
      isMe ? 'border-brand-500/40 bg-brand-50' :
      isTop3 ? `${medal.border} ${medal.bg}` :
      'border-surface-3 bg-white'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Position */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${
          isTop3 ? `${medal.bg} ${medal.text}` : 'bg-surface-2 text-text-muted'
        }`}>
          {isTop3 ? medal.icon : position + 1}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${isMe ? 'text-brand-600' : 'text-text-primary'}`}>
            {entry.full_name}
            {isMe && <span className="text-[10px] ml-1.5 text-brand-400 font-normal">(Tú)</span>}
          </div>
          <div className="text-[10px] text-text-muted">{entry.zone || 'Sin zona'}</div>
        </div>

        {/* Stats mini */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs font-bold text-text-primary">{entry.visits}</div>
            <div className="text-[8px] text-text-muted">visitas</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-green-600">{entry.positive}</div>
            <div className="text-[8px] text-text-muted">positivas</div>
          </div>
        </div>

        {/* Score */}
        <div className={`text-right flex-shrink-0 min-w-[50px] ${isTop3 ? medal.text : 'text-text-primary'}`}>
          <div className="text-lg font-extrabold">{entry.score}</div>
          <div className="text-[8px] text-text-muted uppercase">pts</div>
        </div>
      </button>

      {expanded && <div className="px-3 pb-3"><ScoreBreakdown entry={entry} /></div>}
    </div>
  );
}

// ============ PÁGINA PRINCIPAL ============
export default function GamificationPage() {
  const { user } = useAuthContext();
  const [period, setPeriod] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState(null);

  useEffect(() => {
    if (user) loadData();
  }, [user, period]);

  async function loadData() {
    setLoading(true);
    try {
      const viewName = period === 'weekly' ? 'leaderboard_weekly' : 'leaderboard_monthly';
      const [lbRes, badgesRes] = await Promise.all([
        supabase.from(viewName).select('*').order('score', { ascending: false }),
        supabase.from('badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }).limit(20),
      ]);

      setLeaderboard(lbRes.data || []);
      setBadges(badgesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const myPosition = leaderboard.findIndex(e => e.kam_id === user.id);
  const myEntry = myPosition >= 0 ? leaderboard[myPosition] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-brand-500" />
          <h1 className="text-xl font-extrabold tracking-tight text-text-primary">Ranking</h1>
        </div>
        <p className="text-xs text-text-secondary mt-1">Compite con tu equipo y gana badges</p>
      </div>

      {/* Mi posición destacada */}
      {myEntry && (
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold opacity-80">Tu posición</div>
              <div className="text-3xl font-extrabold">#{myPosition + 1}</div>
              <div className="text-xs opacity-70 mt-0.5">{myEntry.score} puntos</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-extrabold">{myEntry.visits}</div>
                <div className="text-[9px] opacity-70">Visitas</div>
              </div>
              <div>
                <div className="text-xl font-extrabold">{myEntry.positive}</div>
                <div className="text-[9px] opacity-70">Positivas</div>
              </div>
              <div>
                <div className="text-xl font-extrabold">{myEntry.new_channels}</div>
                <div className="text-[9px] opacity-70">Nuevos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period toggle */}
      <div className="flex bg-surface-2 rounded-xl p-1">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              period === p.key
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Scoring explanation */}
      <div className="flex items-center gap-4 text-[10px] text-text-muted bg-surface-1 rounded-lg px-3 py-2.5 border border-surface-3">
        <span className="font-bold text-text-secondary">Puntuación:</span>
        <span>📍 Visita = 10pts</span>
        <span>✅ Positiva = +5pts</span>
        <span>🆕 Canal = 15pts</span>
        <span>📊 Pipeline = 3pts</span>
      </div>

      {/* Leaderboard */}
      <div>
        <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
          <Medal size={14} className="text-brand-500" />
          Clasificación
          <span className="text-text-muted font-normal">({leaderboard.length} KAMs)</span>
        </h2>

        {leaderboard.length === 0 ? (
          <div className="text-center py-10 bg-white border border-surface-3 rounded-xl">
            <Trophy size={28} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">Aún no hay datos esta semana</p>
            <p className="text-xs text-text-muted mt-1">Haz visitas para aparecer en el ranking</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <LeaderboardEntry
                key={entry.kam_id}
                entry={entry}
                position={i}
                isMe={entry.kam_id === user.id}
                expanded={expandedEntry === entry.kam_id}
                onToggle={() => setExpandedEntry(expandedEntry === entry.kam_id ? null : entry.kam_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
          <Award size={14} className="text-brand-500" />
          Tus badges
          <span className="text-text-muted font-normal">({badges.length})</span>
        </h2>

        {badges.length === 0 ? (
          <div className="bg-white border border-surface-3 rounded-xl p-4">
            <div className="text-center py-4">
              <Star size={24} className="mx-auto mb-2 text-text-muted" />
              <p className="text-sm text-text-secondary">Aún no tienes badges</p>
              <p className="text-xs text-text-muted mt-1">Sigue haciendo visitas para desbloquear logros</p>
            </div>

            {/* Badges disponibles */}
            <div className="mt-4 pt-3 border-t border-surface-3">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Badges disponibles</div>
              <div className="grid grid-cols-2 gap-2">
                {BADGE_DEFS.slice(0, 6).map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-surface-1 rounded-lg opacity-50">
                    <span className="text-lg grayscale">{badge.icon}</span>
                    <div>
                      <div className="text-[11px] font-semibold text-text-secondary">{badge.name}</div>
                      <div className="text-[9px] text-text-muted">{badge.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 bg-white border border-surface-3 rounded-xl">
                <span className="text-2xl">{badge.badge_icon}</span>
                <div>
                  <div className="text-xs font-bold text-text-primary">{badge.badge_name}</div>
                  <div className="text-[10px] text-text-muted">{badge.badge_description}</div>
                  <div className="text-[9px] text-text-muted mt-0.5">
                    {new Date(badge.earned_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
