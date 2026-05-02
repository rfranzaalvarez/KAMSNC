import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import {
  Loader2, Plus, Check, X, Target, Edit3,
  Calendar, ChevronDown, ChevronUp, Trash2, GripVertical
} from 'lucide-react';

const ACTION_STATUS = {
  pending: { label: 'Pendiente', bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-400' },
  in_progress: { label: 'En curso', bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  completed: { label: 'Completada', bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  cancelled: { label: 'Cancelada', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
};

const PLAN_STATUS = {
  draft: { label: 'Borrador', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  active: { label: 'Activo', color: 'text-green-400', bg: 'bg-green-500/20' },
  completed: { label: 'Completado', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/20' },
};

function ActionItem({ action, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(action.title);
  const [dueDate, setDueDate] = useState(action.due_date || '');
  const status = ACTION_STATUS[action.status] || ACTION_STATUS.pending;

  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status === 'pending';

  async function cycleStatus() {
    const order = ['pending', 'in_progress', 'completed'];
    const current = order.indexOf(action.status);
    const next = order[(current + 1) % order.length];
    await onUpdate(action.id, {
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
    });
  }

  async function saveEdit() {
    await onUpdate(action.id, { title, due_date: dueDate || null });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex gap-2 p-2 bg-surface-0 rounded-lg">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-surface-1 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          autoFocus
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-2 py-1.5 bg-surface-1 border border-surface-3 rounded-lg text-xs w-32 focus:outline-none focus:border-brand-500"
        />
        <button onClick={saveEdit} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg">
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="p-1.5 text-text-muted hover:bg-surface-2 rounded-lg">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg group transition-colors ${
      action.status === 'completed' ? 'opacity-60' : ''
    } ${isOverdue ? 'bg-red-500/5' : 'hover:bg-surface-0'}`}>
      {/* Status toggle */}
      <button
        onClick={cycleStatus}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
          action.status === 'completed'
            ? 'bg-green-500 border-green-500'
            : action.status === 'in_progress'
              ? 'border-blue-400 bg-blue-500/20'
              : 'border-surface-4 hover:border-brand-400'
        }`}
      >
        {action.status === 'completed' && <Check size={11} className="text-white" strokeWidth={3} />}
        {action.status === 'in_progress' && <div className="w-2 h-2 rounded-sm bg-blue-400" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${action.status === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
          {action.title}
        </div>
        {action.due_date && (
          <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${
            isOverdue ? 'text-red-400 font-semibold' : 'text-text-muted'
          }`}>
            <Calendar size={10} />
            {new Date(action.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            {isOverdue && ' · Vencida'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setEditing(true)} className="p-1 text-text-muted hover:text-text-primary rounded">
          <Edit3 size={12} />
        </button>
        <button onClick={() => onDelete(action.id)} className="p-1 text-text-muted hover:text-red-400 rounded">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============
export default function AccountPlan({ channelId, channelName }) {
  const { user } = useAuthContext();
  const [plan, setPlan] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Form state
  const [objective, setObjective] = useState('');
  const [strategy, setStrategy] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (channelId) loadPlan();
  }, [channelId]);

  async function loadPlan() {
    setLoading(true);
    try {
      const { data: planData } = await supabase
        .from('account_plans')
        .select('*')
        .eq('channel_id', channelId)
        .eq('year', currentYear)
        .single();

      if (planData) {
        setPlan(planData);
        setObjective(planData.objective || '');
        setStrategy(planData.strategy || '');
        setReviewDate(planData.review_date || '');

        const { data: actionsData } = await supabase
          .from('account_plan_actions')
          .select('*')
          .eq('plan_id', planData.id)
          .order('sort_order')
          .order('created_at');

        setActions(actionsData || []);
      }
    } catch (err) {
      // No plan exists yet, that's ok
    } finally {
      setLoading(false);
    }
  }

  async function createPlan() {
    try {
      const { data, error } = await supabase
        .from('account_plans')
        .insert({
          channel_id: channelId,
          kam_id: user.id,
          year: currentYear,
          objective: '',
          strategy: '',
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      setPlan(data);
      setEditing(true);
    } catch (err) {
      console.error('Error creando plan:', err);
    }
  }

  async function savePlan() {
    try {
      const { error } = await supabase
        .from('account_plans')
        .update({
          objective,
          strategy,
          review_date: reviewDate || null,
          status: plan.status === 'draft' ? 'active' : plan.status,
        })
        .eq('id', plan.id);

      if (error) throw error;
      setPlan(prev => ({
        ...prev,
        objective,
        strategy,
        review_date: reviewDate || null,
        status: prev.status === 'draft' ? 'active' : prev.status,
      }));
      setEditing(false);
    } catch (err) {
      console.error('Error guardando plan:', err);
    }
  }

  async function addAction() {
    if (!newAction.trim() || !plan) return;
    try {
      const { data, error } = await supabase
        .from('account_plan_actions')
        .insert({
          plan_id: plan.id,
          title: newAction.trim(),
          sort_order: actions.length,
        })
        .select()
        .single();

      if (error) throw error;
      setActions(prev => [...prev, data]);
      setNewAction('');
    } catch (err) {
      console.error('Error añadiendo acción:', err);
    }
  }

  async function updateAction(actionId, updates) {
    try {
      const { error } = await supabase
        .from('account_plan_actions')
        .update(updates)
        .eq('id', actionId);

      if (error) throw error;
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, ...updates } : a));
    } catch (err) {
      console.error('Error actualizando acción:', err);
    }
  }

  async function deleteAction(actionId) {
    try {
      await supabase.from('account_plan_actions').delete().eq('id', actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (err) {
      console.error('Error eliminando acción:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin text-brand-400" />
      </div>
    );
  }

  // Sin plan todavía
  if (!plan) {
    return (
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
        <div className="text-center py-4">
          <Target size={24} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm text-text-secondary mb-1">Sin plan de cuenta para {currentYear}</p>
          <p className="text-xs text-text-muted mb-3">Define objetivos y acciones para desarrollar este canal</p>
          <button
            onClick={createPlan}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            Crear plan {currentYear}
          </button>
        </div>
      </div>
    );
  }

  const completedCount = actions.filter(a => a.status === 'completed').length;
  const progressPct = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;
  const planStatus = PLAN_STATUS[plan.status] || PLAN_STATUS.draft;

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-0/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Target size={16} className="text-brand-400" />
          <span className="text-sm font-bold">Plan de cuenta {currentYear}</span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${planStatus.bg} ${planStatus.color}`}>
            {planStatus.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {actions.length > 0 && (
            <span className="text-[10px] text-text-secondary font-semibold">
              {completedCount}/{actions.length} acciones
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-3 pt-3">
          {/* Barra de progreso */}
          {actions.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-text-muted mb-1">
                <span>Progreso</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Objetivo y estrategia */}
          {editing ? (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Objetivo anual</label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="¿Qué quieres conseguir con este canal este año?"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm resize-none focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Estrategia</label>
                <textarea
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="¿Cómo vas a conseguirlo? Enfoque, palancas clave..."
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm resize-none focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Próxima revisión</label>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={savePlan}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Check size={12} /> Guardar
                </button>
                <button
                  onClick={() => { setEditing(false); setObjective(plan.objective || ''); setStrategy(plan.strategy || ''); setReviewDate(plan.review_date || ''); }}
                  className="px-4 py-2 text-text-secondary text-xs font-semibold hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              {(plan.objective || plan.strategy) ? (
                <div className="space-y-2">
                  {plan.objective && (
                    <div className="p-2.5 bg-surface-0 rounded-lg">
                      <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Objetivo</div>
                      <p className="text-xs text-text-primary leading-relaxed">{plan.objective}</p>
                    </div>
                  )}
                  {plan.strategy && (
                    <div className="p-2.5 bg-surface-0 rounded-lg">
                      <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Estrategia</div>
                      <p className="text-xs text-text-secondary leading-relaxed">{plan.strategy}</p>
                    </div>
                  )}
                  {plan.review_date && (
                    <div className="text-[10px] text-text-muted flex items-center gap-1">
                      <Calendar size={10} />
                      Revisión: {new Date(plan.review_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">Sin objetivo ni estrategia definidos</p>
              )}
              <button
                onClick={() => setEditing(true)}
                className="mt-2 text-[11px] text-brand-400 font-semibold hover:text-brand-300 transition-colors inline-flex items-center gap-1"
              >
                <Edit3 size={11} /> Editar objetivo y estrategia
              </button>
            </div>
          )}

          {/* Acciones */}
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
              Acciones clave
            </div>

            <div className="space-y-0.5 mb-3">
              {actions.map(action => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onUpdate={updateAction}
                  onDelete={deleteAction}
                />
              ))}
            </div>

            {/* Añadir acción */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAction()}
                placeholder="Nueva acción..."
                className="flex-1 px-3 py-2 bg-surface-0 border border-surface-3 rounded-lg text-sm placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                onClick={addAction}
                disabled={!newAction.trim()}
                className="px-3 py-2 bg-surface-3 hover:bg-surface-4 disabled:opacity-30 text-text-primary rounded-lg transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
