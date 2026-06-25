import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';

// ============ CÁLCULO DE RANGOS ============
function getPeriodRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case '7d': {
      const from = new Date(today); from.setDate(from.getDate() - 7);
      return { from, to: now };
    }
    case '30d': {
      const from = new Date(today); from.setDate(from.getDate() - 30);
      return { from, to: now };
    }
    case 'this_month': {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { from, to };
    }
    case 'this_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return { from: new Date(now.getFullYear(), qMonth, 1), to: now };
    }
    case 'last_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), qMonth - 3, 1);
      const to = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59);
      return { from, to };
    }
    case 'this_year': {
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    }
    default:
      return { from: today, to: now };
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
  { key: 'custom',       label: 'Personalizado' },
];

function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

// ============ COMPONENTE ============
/**
 * Selector de periodo reutilizable.
 * Props:
 *   period (string)    — clave del periodo activo ('7d', 'this_month', 'custom', etc.)
 *   range  ({ from, to }) — rango de fechas activo
 *   onChange(period, range) — callback al cambiar periodo o rango personalizado
 */
export default function PeriodSelector({ period, range, onChange }) {
  const [showCustom, setShowCustom] = useState(period === 'custom');

  function handlePreset(key) {
    if (key === 'custom') {
      setShowCustom(true);
      // Inicializar con el mes actual si no hay rango custom previo
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      onChange('custom', { from: defaultFrom, to: new Date() });
    } else {
      setShowCustom(false);
      onChange(key, getPeriodRange(key));
    }
  }

  function handleCustomDate(field, value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return;
    const newRange = { ...range };
    if (field === 'from') {
      newRange.from = d;
    } else {
      // Poner a fin de día para incluir todo el día seleccionado
      d.setHours(23, 59, 59);
      newRange.to = d;
    }
    onChange('custom', newRange);
  }

  return (
    <div className="mb-5">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-2">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => handlePreset(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === opt.key
                ? 'bg-brand-500 text-white'
                : 'bg-surface-2 text-text-secondary border border-surface-3 hover:border-surface-4'
            }`}
          >
            {opt.key === 'custom' && <Calendar size={12} />}
            {opt.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 mb-2">
          <input
            type="date"
            value={range?.from ? toInputDate(range.from) : ''}
            onChange={(e) => handleCustomDate('from', e.target.value)}
            className="px-3 py-1.5 bg-white border border-surface-3 rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand-500"
          />
          <span className="text-xs text-text-muted">—</span>
          <input
            type="date"
            value={range?.to ? toInputDate(range.to) : ''}
            onChange={(e) => handleCustomDate('to', e.target.value)}
            className="px-3 py-1.5 bg-white border border-surface-3 rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand-500"
          />
        </div>
      )}

      {range?.from && range?.to && (
        <div className="text-[11px] text-text-muted">
          {range.from.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' — '}
          {range.to.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}

// Re-exportar para que los consumidores puedan calcular rangos de presets
export { getPeriodRange };
