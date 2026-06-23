import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { Loader2, TrendingUp, Target, Building2, Zap, MapPin } from 'lucide-react';

// ============ PERIODOS TEMPORALES ============
function getPeriodRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case '7d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      return { from, to: now };
    }
    case '30d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      return { from, to: now };
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: now };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from, to };
    }
    case 'this_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), qMonth, 1);
      return { from, to: now };
    }
    case 'last_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), qMonth - 3, 1);
      const to = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59);
      return { from, to };
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now };
    }
    default:
      return { from: new Date(today), to: now };
  }
}

const PERIOD_OPTIONS = [
  { key: '7d',           label: 'Últimos 7 días' },
  { key: '30d',          label: 'Últimos 30 días' },
  { key: 'this_month',   label: 'Este mes' },
  { key: 'last_month',   label: 'Mes anterior' },
  { key: 'this_quarter', label: 'Este trimestre' },
  { key: 'last_quarter', label: 'Trimestre anterior' },
  { key: 'this_year',    label: 'Este año' },
];

// ============ PÁGINA RVC ============
export default function RvcPage() {
  const { user, isManager } = useAuthContext();
  const [period, setPeriod] = useState('this_month');
  const [channels, setChannels] = useState([]);
  const [allActiveChannels, setAllActiveChannels] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getPeriodRange(period), [period]);

  useEffect(() => {
    if (user) loadData();
  }, [user, period]);

  async function loadData() {
    setLoading(true);
    try {
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();

      // 1. Canales creados en el periodo (para KPIs 1, 2, 3)
      let chQuery = supabase
        .from('channels')
        .select('id, status, volume_amount, volume_unit, created_at')
        .gte('created_at', fromISO)
        .lte('created_at', toISO);
      if (!isManager) chQuery = chQuery.eq('assigned_to', user.id);
      const { data: chData } = await chQuery;
      setChannels(chData || []);

      // 2. TODOS los canales activos (para KPI 4, sin filtro de periodo)
      let activeQuery = supabase
        .from('channels')
        .select('id, volume_amount, volume_unit')
        .eq('status', 'activo');
      if (!isManager) activeQuery = activeQuery.eq('assigned_to', user.id);
      const { data: activeData } = await activeQuery;
      setAllActiveChannels(activeData || []);

      // 3. Visitas en el periodo (para KPI 5)
      let vQuery = supabase
        .from('visits')
        .select('id, checkin_at')
        .gte('checkin_at', fromISO)
        .lte('checkin_at', toISO);
      if (!isManager) vQuery = vQuery.eq('kam_id', user.id);
      const { data: vData } = await vQuery;
      setVisits(vData || []);
    } catch (err) {
      console.error('Error cargando datos RVC:', err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Cálculos de KPIs ──────────────────────────────────────────────────────

  // KPI 1: Nº de leads proactivos identificados (todos los canales creados en el periodo)
  const leadsCount = channels.length;

  // KPI 2: Tasa de éxito (canales activos / total creados en el periodo)
  const activeInPeriod = channels.filter(c => c.status === 'activo').length;
  const successRate = leadsCount > 0 ? ((activeInPeriod / leadsCount) * 100).toFixed(1) : '0.0';

  // KPI 3: Captación nuevas EECC (canales creados en el periodo con status activo)
  const newActiveCount = activeInPeriod;

  // KPI 4: Volumen negociado (suma GWh de TODOS los canales activos, sin filtro de periodo)
  const totalGwh = allActiveChannels
    .filter(c => c.volume_unit === 'gwh_pymes' || c.volume_unit === 'gwh_caes')
    .reduce((sum, c) => sum + (parseFloat(c.volume_amount) || 0), 0);

  // KPI 5: Número de visitas en el periodo
  const visitsCount = visits.length;

  // ─── Render ────────────────────────────────────────────────────────────────

  const kpis = [
    {
      label: 'Leads proactivos identificados',
      value: leadsCount,
      unit: 'canales',
      icon: Target,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Tasa de éxito de leads',
      value: `${successRate}%`,
      unit: leadsCount > 0 ? `${activeInPeriod} de ${leadsCount}` : 'sin datos',
      icon: TrendingUp,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.1)',
    },
    {
      label: 'Captación nuevas EECC',
      value: newActiveCount,
      unit: 'canales activos',
      icon: Building2,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      label: 'Volumen negociado',
      value: totalGwh.toFixed(1),
      unit: 'GWh (total activos)',
      icon: Zap,
      color: '#eab308',
      bg: 'rgba(234,179,8,0.1)',
      noPeriod: true,
    },
    {
      label: 'Visitas realizadas',
      value: visitsCount,
      unit: 'visitas',
      icon: MapPin,
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.1)',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-extrabold tracking-tight">RVC</h1>
      </div>

      {/* Selector de periodo */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-5">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === opt.key
                ? 'bg-brand-500 text-white'
                : 'bg-surface-2 text-text-secondary border border-surface-3 hover:border-surface-4'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Rango de fechas seleccionado */}
      <div className="text-[11px] text-text-muted mb-4">
        {range.from.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        {' — '}
        {range.to.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="bg-surface-1 border border-surface-3 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                    <Icon size={16} style={{ color: kpi.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-text-secondary leading-tight">{kpi.label}</span>
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-text-primary">{kpi.value}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {kpi.noPeriod ? kpi.unit : kpi.unit}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
