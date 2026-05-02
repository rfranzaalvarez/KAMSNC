import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import {
  Loader2, Plus, ChevronLeft, ChevronRight, X, Check,
  Clock, MapPin, Building2, CalendarDays
} from 'lucide-react';

// ============ HELPERS ============
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ============ MODAL NUEVA VISITA PLANIFICADA ============
function NewPlannedVisitModal({ date, channels, onSave, onClose }) {
  const [selectedChannel, setSelectedChannel] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = channels.filter(ch =>
    search === '' || ch.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    if (!selectedChannel) return;
    setSaving(true);
    try {
      await onSave({
        channel_id: selectedChannel,
        planned_date: formatDateKey(date),
        planned_time: time + ':00',
        notes: notes || null,
      });
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full px-3 py-2.5 bg-surface-0 border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-surface-3">
          <div>
            <h3 className="font-bold text-sm">Planificar visita</h3>
            <p className="text-xs text-text-secondary">
              {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Seleccionar canal */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Canal *</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar canal..."
              className={`${fieldClass} mb-2`}
            />
            <div className="max-h-40 overflow-y-auto rounded-xl border border-surface-3 bg-surface-0">
              {filtered.length === 0 && (
                <div className="text-xs text-text-muted text-center py-4">Sin resultados</div>
              )}
              {filtered.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { setSelectedChannel(ch.id); setSearch(ch.name); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedChannel === ch.id
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'hover:bg-surface-1 text-text-primary'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-[10px] font-bold text-text-secondary flex-shrink-0">
                    {ch.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-semibold">{ch.name}</div>
                    <div className="text-[10px] text-text-muted truncate">{ch.address || 'Sin dirección'}</div>
                  </div>
                  {selectedChannel === ch.id && <Check size={14} className="text-brand-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Hora */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Hora</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={fieldClass}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Objetivo de la visita, preparación..."
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </div>
        </div>

        <div className="p-4 border-t border-surface-3">
          <button
            onClick={handleSave}
            disabled={!selectedChannel || saving}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ TARJETA DE VISITA PLANIFICADA ============
function PlannedVisitCard({ visit, onDelete }) {
  const time = visit.planned_time
    ? visit.planned_time.slice(0, 5)
    : '--:--';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      visit.is_completed
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-surface-1 border-surface-3'
    }`}>
      {/* Hora */}
      <div className="text-center flex-shrink-0 w-12">
        <div className={`text-sm font-bold ${visit.is_completed ? 'text-green-400' : 'text-text-primary'}`}>
          {time}
        </div>
      </div>

      {/* Línea vertical */}
      <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${
        visit.is_completed ? 'bg-green-500' : 'bg-surface-3'
      }`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate ${visit.is_completed ? 'line-through text-text-secondary' : ''}`}>
          {visit.channels?.name || 'Canal'}
        </div>
        <div className="text-[11px] text-text-secondary truncate">
          {visit.channels?.address || 'Sin dirección'}
        </div>
        {visit.notes && (
          <div className="text-[10px] text-text-muted mt-0.5 truncate">{visit.notes}</div>
        )}
      </div>

      {/* Status / Delete */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {visit.is_completed ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/20 text-green-400">✓</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(visit.id); }}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-red-400 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============ PÁGINA PRINCIPAL DEL CALENDARIO ============
export default function CalendarPage() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [plannedVisits, setPlannedVisits] = useState([]);
  const [completedVisits, setCompletedVisits] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Días de la semana actual
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    if (user) {
      loadWeekData();
      loadChannels();
    }
  }, [user, currentWeekStart]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadChannels() {
    const { data } = await supabase
      .from('channels')
      .select('id, name, address')
      .eq('assigned_to', user.id)
      .order('name');
    setChannels(data || []);
  }

  async function loadWeekData() {
    setLoading(true);
    try {
      const weekEnd = addDays(currentWeekStart, 7);
      const startStr = formatDateKey(currentWeekStart);
      const endStr = formatDateKey(weekEnd);

      const [plannedRes, visitsRes] = await Promise.all([
        supabase.from('planned_visits')
          .select('*, channels(name, address)')
          .eq('kam_id', user.id)
          .gte('planned_date', startStr)
          .lt('planned_date', endStr)
          .order('planned_time'),
        supabase.from('visits')
          .select('id, channel_id, checkin_at, channels(name)')
          .eq('kam_id', user.id)
          .gte('checkin_at', currentWeekStart.toISOString())
          .lt('checkin_at', weekEnd.toISOString()),
      ]);

      setPlannedVisits(plannedRes.data || []);
      setCompletedVisits(visitsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlanned(data) {
    try {
      const { error } = await supabase.from('planned_visits').insert({
        ...data,
        kam_id: user.id,
      });
      if (error) throw error;

      setShowNewModal(false);
      setToast({ message: 'Visita planificada', type: 'success' });
      loadWeekData();
    } catch (err) {
      setToast({ message: 'Error: ' + err.message, type: 'error' });
    }
  }

  async function handleDeletePlanned(id) {
    try {
      await supabase.from('planned_visits').delete().eq('id', id);
      setPlannedVisits(prev => prev.filter(v => v.id !== id));
      setToast({ message: 'Visita eliminada', type: 'success' });
    } catch (err) {
      console.error(err);
    }
  }

  // Datos del día seleccionado
  const selectedDateKey = formatDateKey(selectedDay);
  const dayPlanned = plannedVisits.filter(v => v.planned_date === selectedDateKey);
  const dayCompleted = completedVisits.filter(v =>
    isSameDay(new Date(v.checkin_at), selectedDay)
  );

  // Conteo de visitas por día de la semana
  function getDayCount(day) {
    const key = formatDateKey(day);
    const planned = plannedVisits.filter(v => v.planned_date === key).length;
    const completed = completedVisits.filter(v => isSameDay(new Date(v.checkin_at), day)).length;
    return { planned, completed, total: Math.max(planned, completed) };
  }

  // Navegar semanas
  function prevWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  }
  function nextWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  }
  function goToday() {
    const monday = getMonday(new Date());
    setCurrentWeekStart(monday);
    setSelectedDay(new Date());
  }

  const weekLabel = `${currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${addDays(currentWeekStart, 6).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Agenda</h1>
          <p className="text-xs text-text-secondary">{weekLabel}</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <Plus size={14} />
          Planificar
        </button>
      </div>

      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors">
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={goToday}
          className="text-xs font-semibold text-brand-400 px-3 py-1.5 rounded-lg hover:bg-brand-500/10 transition-colors"
        >
          Hoy
        </button>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDay);
          const counts = getDayCount(day);
          const isPast = day < today && !isToday;

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(new Date(day))}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                isSelected
                  ? 'bg-brand-500/20 border border-brand-500/40'
                  : isToday
                    ? 'bg-surface-2 border border-surface-4'
                    : 'border border-transparent hover:bg-surface-1'
              }`}
            >
              <span className={`text-[10px] font-semibold ${
                isSelected ? 'text-brand-400' : 'text-text-muted'
              }`}>
                {DAY_NAMES[i]}
              </span>
              <span className={`text-lg font-extrabold mt-0.5 ${
                isSelected ? 'text-brand-400' :
                isToday ? 'text-text-primary' :
                isPast ? 'text-text-muted' : 'text-text-primary'
              }`}>
                {day.getDate()}
              </span>
              {counts.total > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: Math.min(counts.total, 4) }).map((_, j) => (
                    <div
                      key={j}
                      className={`w-1 h-1 rounded-full ${
                        j < counts.completed ? 'bg-green-400' : 'bg-brand-400'
                      }`}
                    />
                  ))}
                  {counts.total > 4 && (
                    <span className="text-[8px] text-text-muted ml-0.5">+{counts.total - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detalle del día seleccionado */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">
            {isSameDay(selectedDay, today)
              ? 'Hoy'
              : selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
            }
          </h2>
          <span className="text-[11px] text-text-secondary">
            {dayPlanned.length} planificadas · {dayCompleted.length} realizadas
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-brand-400" />
          </div>
        ) : dayPlanned.length === 0 && dayCompleted.length === 0 ? (
          <div className="text-center py-10 bg-surface-1 border border-surface-3 rounded-xl">
            <CalendarDays size={28} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">Sin visitas para este día</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-3 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              + Planificar visita
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Planificadas */}
            {dayPlanned.map(visit => (
              <PlannedVisitCard
                key={visit.id}
                visit={visit}
                onDelete={handleDeletePlanned}
              />
            ))}

            {/* Visitas realizadas (no planificadas) */}
            {dayCompleted
              .filter(cv => !dayPlanned.some(pv => pv.visit_id === cv.id))
              .map(visit => {
                const time = new Date(visit.checkin_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={visit.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                    <div className="text-center flex-shrink-0 w-12">
                      <div className="text-sm font-bold text-green-400">{time}</div>
                    </div>
                    <div className="w-0.5 h-10 rounded-full bg-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{visit.channels?.name || 'Canal'}</div>
                      <div className="text-[10px] text-green-400 font-semibold">✓ Visita realizada</div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Resumen semanal */}
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Resumen semanal</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-extrabold text-brand-400">
              {plannedVisits.length}
            </div>
            <div className="text-[9px] text-text-muted uppercase tracking-wider">Planificadas</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-green-400">
              {completedVisits.length}
            </div>
            <div className="text-[9px] text-text-muted uppercase tracking-wider">Realizadas</div>
          </div>
          <div>
            <div className="text-lg font-extrabold text-amber-400">
              {Math.max(0, plannedVisits.filter(v => !v.is_completed && new Date(v.planned_date) <= today).length)}
            </div>
            <div className="text-[9px] text-text-muted uppercase tracking-wider">Pendientes</div>
          </div>
        </div>
      </div>

      {/* Modal nueva visita planificada */}
      {showNewModal && (
        <NewPlannedVisitModal
          date={selectedDay}
          channels={channels}
          onSave={handleSavePlanned}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 px-4 py-3 rounded-xl text-center text-sm font-bold shadow-xl z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
