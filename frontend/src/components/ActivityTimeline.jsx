import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthProvider';
import {
  Phone, Mail, MessageCircle, Linkedin, Users, Calendar,
  Loader2, Save, ChevronDown, ChevronUp, Plus, X,
  ArrowUpRight, ArrowDownLeft, Clock, Trash2, MapPin, StickyNote
} from 'lucide-react';

const TYPE_CONFIG = {
  visit: { label: 'Visita', icon: MapPin, color: '#E87A1E', bg: 'bg-[#FEF3E8]' },
  call: { label: 'Llamada', icon: Phone, color: '#3b82f6', bg: 'bg-blue-50' },
  email: { label: 'Email', icon: Mail, color: '#8b5cf6', bg: 'bg-purple-50' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#16a34a', bg: 'bg-green-50' },
  meeting: { label: 'Reunión', icon: Users, color: '#E87A1E', bg: 'bg-[#FEF3E8]' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: '#0077b5', bg: 'bg-blue-50' },
  note: { label: 'Nota', icon: StickyNote, color: '#5a6078', bg: 'bg-gray-50' },
  other: { label: 'Otro', icon: Calendar, color: '#5a6078', bg: 'bg-gray-50' },
};

const RESULT_CONFIG = {
  positive: { label: 'Positiva', color: 'text-green-600', bg: 'bg-green-50' },
  neutral: { label: 'Neutral', color: 'text-amber-600', bg: 'bg-amber-50' },
  negative: { label: 'Negativa', color: 'text-red-600', bg: 'bg-red-50' },
  connected: { label: 'Contactado', color: 'text-green-600', bg: 'bg-green-50' },
  no_answer: { label: 'No contesta', color: 'text-amber-600', bg: 'bg-amber-50' },
  voicemail: { label: 'Buzón', color: 'text-amber-600', bg: 'bg-amber-50' },
  callback: { label: 'Devolver', color: 'text-blue-600', bg: 'bg-blue-50' },
};

const INTERACTION_TYPES = [
  { key: 'call', label: 'Llamada', icon: '📞' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'meeting', label: 'Reunión', icon: '👥' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { key: 'other', label: 'Otro', icon: '📋' },
];

const RESULT_OPTIONS = [
  { key: 'connected', label: 'Contactado' },
  { key: 'no_answer', label: 'No contesta' },
  { key: 'voicemail', label: 'Buzón de voz' },
  { key: 'callback', label: 'Devolver llamada' },
  { key: 'positive', label: 'Positivo' },
  { key: 'negative', label: 'Negativo' },
  { key: 'neutral', label: 'Neutral' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityTimeline({ channel }) {
  const { user, profile } = useAuthContext();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [newForm, setNewForm] = useState({
    interaction_type: 'call', direction: 'outbound', subject: '', notes: '',
    duration_minutes: '', result: '', contact_person: channel?.contact_name || '',
  });
  const [savingForm, setSavingForm] = useState(false);

  useEffect(() => { if (channel?.id) loadAll(); }, [channel?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [visitsRes, interRes, notesRes] = await Promise.allSettled([
        supabase.from('visits').select('*').eq('channel_id', channel.id).order('checkin_at', { ascending: false }).limit(50),
        supabase.from('channel_interactions').select('*, profiles(full_name)').eq('channel_id', channel.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('channel_notes').select('*, profiles(full_name)').eq('channel_id', channel.id).order('created_at', { ascending: false }).limit(50),
      ]);

      const visits = (visitsRes.status === 'fulfilled' ? visitsRes.value.data : []) || [];
      const interactions = (interRes.status === 'fulfilled' ? interRes.value.data : []) || [];
      const notes = (notesRes.status === 'fulfilled' ? notesRes.value.data : []) || [];

      // Merge into unified list
      const merged = [
        ...visits.map(v => ({
          _type: 'visit', _date: v.checkin_at, _id: `v-${v.id}`, _sourceId: v.id,
          result: v.result, duration: v.duration_minutes, notes: v.notes || v.result_notes,
          objective: v.objective, nextSteps: v.next_steps, userId: v.kam_id,
        })),
        ...interactions.map(i => ({
          _type: i.interaction_type, _date: i.created_at, _id: `i-${i.id}`, _sourceId: i.id, _source: 'interaction',
          direction: i.direction, result: i.result, duration: i.duration_minutes,
          subject: i.subject, notes: i.notes, contact: i.contact_person,
          authorName: i.profiles?.full_name, userId: i.user_id,
        })),
        ...notes.map(n => ({
          _type: 'note', _date: n.created_at, _id: `n-${n.id}`, _sourceId: n.id, _source: 'note',
          notes: n.content, authorName: n.profiles?.full_name, userId: n.user_id,
        })),
      ].sort((a, b) => new Date(b._date) - new Date(a._date));

      setActivities(merged);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function saveInteraction() {
    if (!channel?.id || !user?.id) return;
    setSavingForm(true);
    try {
      const { error } = await supabase.from('channel_interactions').insert({
        channel_id: channel.id, user_id: user.id,
        interaction_type: newForm.interaction_type, direction: newForm.direction,
        subject: newForm.subject || null, notes: newForm.notes || null,
        duration_minutes: newForm.duration_minutes ? parseInt(newForm.duration_minutes) : null,
        result: newForm.result || null, contact_person: newForm.contact_person || null,
      });
      if (error) throw error;
      setShowNewForm(false);
      setNewForm({ interaction_type: 'call', direction: 'outbound', subject: '', notes: '', duration_minutes: '', result: '', contact_person: channel?.contact_name || '' });
      loadAll();
    } catch (err) { console.error(err); }
    finally { setSavingForm(false); }
  }

  async function saveNote() {
    if (!noteText.trim() || !user?.id) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('channel_notes').insert({
        channel_id: channel.id, user_id: user.id, content: noteText.trim(),
      });
      if (error) throw error;
      setNoteText(''); setShowNoteInput(false);
      loadAll();
    } catch (err) { console.error(err); }
    finally { setSavingNote(false); }
  }

  async function deleteActivity(activity) {
    try {
      if (activity._source === 'interaction') {
        await supabase.from('channel_interactions').delete().eq('id', activity._sourceId);
      } else if (activity._source === 'note') {
        await supabase.from('channel_notes').delete().eq('id', activity._sourceId);
      }
      setActivities(prev => prev.filter(a => a._id !== activity._id));
    } catch (err) { console.error(err); }
  }

  const filters = [
    { key: 'all', label: 'Todo' },
    { key: 'visit', label: '📍 Visitas' },
    { key: 'call', label: '📞 Llamadas' },
    { key: 'email', label: '📧 Emails' },
    { key: 'whatsapp', label: '💬 WhatsApp' },
    { key: 'note', label: '📝 Notas' },
  ];

  const filtered = filter === 'all' ? activities : activities.filter(a => a._type === filter);
  const phoneNumber = channel?.phone?.replace(/\s/g, '');
  const whatsappNumber = phoneNumber?.replace('+', '');

  const selectClass = "w-full px-2.5 py-2 bg-white border border-[#dde1e8] rounded-lg text-xs focus:outline-none focus:border-[#E87A1E]";
  const inputClass = "w-full px-2.5 py-2 bg-white border border-[#dde1e8] rounded-lg text-xs focus:outline-none focus:border-[#E87A1E]";

  return (
    <div className="bg-white border border-surface-3 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-surface-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand-500" />
            <span className="text-sm font-bold text-text-primary">Actividad del canal</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted">{activities.length}</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-colors">
              <Plus size={12} /> Registrar
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-surface-3 rounded-xl shadow-lg z-10 overflow-hidden w-44">
                {INTERACTION_TYPES.map(it => (
                  <button key={it.key} onClick={() => {
                    setNewForm(prev => ({ ...prev, interaction_type: it.key }));
                    setShowNewForm(true); setShowAddMenu(false); setShowNoteInput(false);
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-1 text-xs font-medium text-text-primary border-b border-surface-3 last:border-0">
                    <span>{it.icon}</span> {it.label}
                  </button>
                ))}
                <button onClick={() => { setShowNoteInput(true); setShowAddMenu(false); setShowNewForm(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-1 text-xs font-medium text-text-primary">
                  <span>📝</span> Nota rápida
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-3">
          {phoneNumber && (
            <a href={`tel:${phoneNumber}`}
              onClick={() => { setNewForm(prev => ({ ...prev, interaction_type: 'call', direction: 'outbound' })); setShowNewForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition-colors">
              <Phone size={13} /> Llamar
            </a>
          )}
          {channel?.email && (
            <a href={`mailto:${channel.email}?subject=Colaboración Naturgy - ${channel.name}`}
              onClick={() => { setNewForm(prev => ({ ...prev, interaction_type: 'email', direction: 'outbound' })); setShowNewForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xs font-semibold transition-colors">
              <Mail size={13} /> Email
            </a>
          )}
          {phoneNumber && (
            <a href={`https://wa.me/${whatsappNumber}?text=Hola, le contacto de Naturgy.`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => { setNewForm(prev => ({ ...prev, interaction_type: 'whatsapp', direction: 'outbound' })); setShowNewForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-semibold transition-colors">
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-brand-500/10 text-brand-500 border border-brand-500/30'
                  : 'bg-surface-2 text-text-muted border border-surface-3'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Quick note input */}
      {showNoteInput && (
        <div className="p-3 border-b border-surface-3 bg-surface-1/50">
          <div className="flex gap-2">
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(); } }}
              placeholder="Escribe una nota rápida..." rows={2}
              className="flex-1 px-3 py-2 bg-white border border-surface-3 rounded-xl text-xs resize-none focus:outline-none focus:border-brand-500" />
            <div className="flex flex-col gap-1">
              <button onClick={saveNote} disabled={savingNote || !noteText.trim()}
                className="px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-30 text-white rounded-lg text-xs font-semibold">
                {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              </button>
              <button onClick={() => { setShowNoteInput(false); setNoteText(''); }}
                className="px-3 py-2 text-text-muted hover:text-text-primary text-xs"><X size={12} /></button>
            </div>
          </div>
        </div>
      )}

      {/* New interaction form */}
      {showNewForm && (
        <div className="p-3 border-b border-surface-3 bg-surface-1/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary">
              Nueva {INTERACTION_TYPES.find(t => t.key === newForm.interaction_type)?.label || 'interacción'}
            </span>
            <button onClick={() => setShowNewForm(false)} className="text-text-muted"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Tipo</label>
              <select value={newForm.interaction_type} onChange={(e) => setNewForm(p => ({ ...p, interaction_type: e.target.value }))} className={selectClass}>
                {INTERACTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Dirección</label>
              <select value={newForm.direction} onChange={(e) => setNewForm(p => ({ ...p, direction: e.target.value }))} className={selectClass}>
                <option value="outbound">Saliente</option>
                <option value="inbound">Entrante</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Contacto</label>
              <input type="text" value={newForm.contact_person} onChange={(e) => setNewForm(p => ({ ...p, contact_person: e.target.value }))}
                placeholder="Nombre" className={inputClass} />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Resultado</label>
              <select value={newForm.result} onChange={(e) => setNewForm(p => ({ ...p, result: e.target.value }))} className={selectClass}>
                <option value="">Sin especificar</option>
                {RESULT_OPTIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {['call', 'meeting'].includes(newForm.interaction_type) && (
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Duración (min)</label>
              <input type="number" value={newForm.duration_minutes} onChange={(e) => setNewForm(p => ({ ...p, duration_minutes: e.target.value }))}
                placeholder="5" className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Asunto</label>
            <input type="text" value={newForm.subject} onChange={(e) => setNewForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Tema de la interacción" className={inputClass} />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Notas</label>
            <textarea value={newForm.notes} onChange={(e) => setNewForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Resumen, acuerdos, próximos pasos..." rows={2} className={`${inputClass} resize-none`} />
          </div>
          <button onClick={saveInteraction} disabled={savingForm}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
            {savingForm ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="px-3.5 py-3 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-brand-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={24} className="mx-auto mb-2 text-text-muted" />
            <p className="text-xs text-text-muted">
              {filter === 'all' ? 'Sin actividad registrada' : 'Sin actividad de este tipo'}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((activity, i) => {
              const cfg = TYPE_CONFIG[activity._type] || TYPE_CONFIG.other;
              const Icon = cfg.icon;
              const resultCfg = activity.result ? RESULT_CONFIG[activity.result] : null;
              const isVisit = activity._type === 'visit';
              const canDelete = activity._source && activity.userId === user?.id;

              return (
                <div key={activity._id} className="flex gap-3 group">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    {i < filtered.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[8px] bg-surface-3 my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      {activity.direction === 'outbound' && (
                        <span className="flex items-center gap-0.5 text-[9px] text-blue-500"><ArrowUpRight size={9} /> Saliente</span>
                      )}
                      {activity.direction === 'inbound' && (
                        <span className="flex items-center gap-0.5 text-[9px] text-green-500"><ArrowDownLeft size={9} /> Entrante</span>
                      )}
                      {resultCfg && (
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${resultCfg.bg} ${resultCfg.color}`}>
                          {resultCfg.label}
                        </span>
                      )}
                      {activity.duration > 0 && (
                        <span className="text-[9px] text-text-muted">{activity.duration} min</span>
                      )}
                      <span className="text-[9px] text-text-muted ml-auto">
                        {formatDate(activity._date)} · {formatTime(activity._date)}
                      </span>
                      {canDelete && (
                        <button onClick={() => deleteActivity(activity)}
                          className="p-0.5 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>

                    {isVisit && activity.objective && (
                      <div className="text-[10px] text-text-muted mb-0.5">Objetivo: {activity.objective.replace(/_/g, ' ')}</div>
                    )}
                    {activity.subject && (
                      <div className="text-xs font-semibold text-text-primary mb-0.5">{activity.subject}</div>
                    )}
                    {activity.contact && (
                      <div className="text-[10px] text-text-muted mb-0.5">👤 {activity.contact}</div>
                    )}
                    {activity.authorName && activity._type === 'note' && (
                      <div className="text-[10px] text-text-muted mb-0.5">por {activity.authorName}</div>
                    )}
                    {activity.notes && (
                      <div className={`text-xs text-text-secondary leading-relaxed whitespace-pre-wrap ${
                        isVisit ? 'bg-surface-1 rounded-lg p-2 mt-1' : ''
                      }`}>{activity.notes}</div>
                    )}
                    {activity.nextSteps && (
                      <div className="mt-1.5 px-2 py-1.5 bg-brand-50 border border-brand-200 rounded-lg">
                        <div className="text-[9px] font-bold text-brand-500 uppercase tracking-wider">Próximos pasos</div>
                        <div className="text-xs text-text-secondary mt-0.5">{activity.nextSteps}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
