import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthProvider';
import {
  Phone, Mail, MessageCircle, Linkedin, Users, Calendar,
  Loader2, Save, ChevronDown, ChevronUp, Plus, X,
  PhoneCall, PhoneOff, PhoneMissed, ArrowUpRight, ArrowDownLeft,
  Clock, Trash2, Edit3
} from 'lucide-react';

const INTERACTION_TYPES = {
  call: { label: 'Llamada', icon: Phone, color: 'text-blue-500', bg: 'bg-blue-50' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-500', bg: 'bg-purple-50' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-50' },
  meeting: { label: 'Reunión', icon: Users, color: 'text-brand-500', bg: 'bg-brand-50' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', bg: 'bg-blue-50' },
  other: { label: 'Otro', icon: Calendar, color: 'text-gray-500', bg: 'bg-gray-50' },
};

const RESULT_OPTIONS = {
  connected: { label: 'Contactado', color: 'text-green-600 bg-green-50' },
  no_answer: { label: 'No contesta', color: 'text-amber-600 bg-amber-50' },
  voicemail: { label: 'Buzón de voz', color: 'text-amber-600 bg-amber-50' },
  callback: { label: 'Devolver llamada', color: 'text-blue-600 bg-blue-50' },
  positive: { label: 'Positivo', color: 'text-green-600 bg-green-50' },
  negative: { label: 'Negativo', color: 'text-red-600 bg-red-50' },
  neutral: { label: 'Neutral', color: 'text-gray-600 bg-gray-50' },
};

export default function ContactHub({ channel }) {
  const { user, profile } = useAuthContext();
  const [prep, setPrep] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPrep, setSavingPrep] = useState(false);
  const [prepExpanded, setPrepExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    interaction_type: 'call', direction: 'outbound', subject: '', notes: '',
    duration_minutes: '', result: '', contact_person: channel?.contact_name || '',
  });
  const [savingInteraction, setSavingInteraction] = useState(false);

  useEffect(() => {
    if (channel?.id) loadData();
  }, [channel?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [prepRes, interRes] = await Promise.allSettled([
        supabase.from('channel_contact_prep').select('*').eq('channel_id', channel.id).maybeSingle(),
        supabase.from('channel_interactions').select('*, profiles(full_name)')
          .eq('channel_id', channel.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setPrep(prepRes.status === 'fulfilled' ? (prepRes.value.data || {
        research_notes: '', strategy: '', key_questions: '', value_proposition: '',
      }) : { research_notes: '', strategy: '', key_questions: '', value_proposition: '' });
      setInteractions(interRes.status === 'fulfilled' ? (interRes.value.data || []) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function savePrep() {
    if (!channel?.id) return;
    setSavingPrep(true);
    try {
      const data = {
        channel_id: channel.id,
        research_notes: prep.research_notes || null,
        strategy: prep.strategy || null,
        key_questions: prep.key_questions || null,
        value_proposition: prep.value_proposition || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('channel_contact_prep').upsert(data, { onConflict: 'channel_id' });
      if (error) throw error;
    } catch (err) {
      console.error('Error guardando preparación:', err);
    } finally {
      setSavingPrep(false);
    }
  }

  async function saveInteraction() {
    if (!channel?.id || !user?.id) return;
    setSavingInteraction(true);
    try {
      const { data, error } = await supabase.from('channel_interactions').insert({
        channel_id: channel.id,
        user_id: user.id,
        interaction_type: newInteraction.interaction_type,
        direction: newInteraction.direction,
        subject: newInteraction.subject || null,
        notes: newInteraction.notes || null,
        duration_minutes: newInteraction.duration_minutes ? parseInt(newInteraction.duration_minutes) : null,
        result: newInteraction.result || null,
        contact_person: newInteraction.contact_person || null,
      }).select('*, profiles(full_name)').single();
      if (error) throw error;
      setInteractions(prev => [data, ...prev]);
      setShowNewInteraction(false);
      setNewInteraction({
        interaction_type: 'call', direction: 'outbound', subject: '', notes: '',
        duration_minutes: '', result: '', contact_person: channel?.contact_name || '',
      });
    } catch (err) {
      console.error('Error guardando interacción:', err);
    } finally {
      setSavingInteraction(false);
    }
  }

  async function deleteInteraction(id) {
    await supabase.from('channel_interactions').delete().eq('id', id);
    setInteractions(prev => prev.filter(i => i.id !== id));
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  const phoneNumber = channel?.phone?.replace(/\s/g, '');
  const whatsappNumber = phoneNumber?.replace('+', '');

  if (loading) {
    return <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-brand-400" /></div>;
  }

  return (
    <div className="bg-white border border-surface-3 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-surface-3">
        <div className="flex items-center gap-2 mb-3">
          <PhoneCall size={16} className="text-brand-500" />
          <span className="text-sm font-bold text-text-primary">Centro de contacto</span>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2">
          {phoneNumber && (
            <a href={`tel:${phoneNumber}`}
              onClick={() => { setNewInteraction(prev => ({ ...prev, interaction_type: 'call', direction: 'outbound' })); setShowNewInteraction(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-semibold transition-colors">
              <Phone size={13} /> Llamar
            </a>
          )}
          {channel?.email && (
            <a href={`mailto:${channel.email}?subject=Colaboración Naturgy - ${channel.name}`}
              onClick={() => { setNewInteraction(prev => ({ ...prev, interaction_type: 'email', direction: 'outbound' })); setShowNewInteraction(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-xs font-semibold transition-colors">
              <Mail size={13} /> Email
            </a>
          )}
          {phoneNumber && (
            <a href={`https://wa.me/${whatsappNumber}?text=Hola, le contacto de Naturgy. Me gustaría presentarle una oportunidad de colaboración.`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => { setNewInteraction(prev => ({ ...prev, interaction_type: 'whatsapp', direction: 'outbound' })); setShowNewInteraction(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-semibold transition-colors">
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          {!phoneNumber && !channel?.email && (
            <p className="text-xs text-text-muted">Añade teléfono o email al canal para contactar</p>
          )}
        </div>
      </div>

      {/* Preparación del contacto */}
      <div className="border-b border-surface-3">
        <button onClick={() => setPrepExpanded(!prepExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-surface-1/50 transition-colors">
          <div className="flex items-center gap-2">
            <Edit3 size={13} className="text-text-muted" />
            <span className="text-xs font-bold text-text-primary">Preparación del contacto</span>
            {prep?.research_notes && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </div>
          {prepExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>

        {prepExpanded && (
          <div className="px-3 pb-3 space-y-2.5">
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Investigación previa</label>
              <textarea value={prep?.research_notes || ''} onChange={(e) => setPrep(p => ({ ...p, research_notes: e.target.value }))}
                placeholder="Actividad de la empresa, tamaño, web, noticias relevantes..." rows={2}
                className="w-full px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-xs resize-none focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Estrategia de aproximación</label>
              <textarea value={prep?.strategy || ''} onChange={(e) => setPrep(p => ({ ...p, strategy: e.target.value }))}
                placeholder="Cómo voy a abordar el contacto, qué ángulo usar..." rows={2}
                className="w-full px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-xs resize-none focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Preguntas clave a hacer</label>
              <textarea value={prep?.key_questions || ''} onChange={(e) => setPrep(p => ({ ...p, key_questions: e.target.value }))}
                placeholder="¿Modelo de negocio? ¿Experiencia en energía? ¿Visión de futuro?..." rows={2}
                className="w-full px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-xs resize-none focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Propuesta de valor a comunicar</label>
              <textarea value={prep?.value_proposition || ''} onChange={(e) => setPrep(p => ({ ...p, value_proposition: e.target.value }))}
                placeholder="Puntos clave de Naturgy que encajan con este prospecto..." rows={2}
                className="w-full px-3 py-2 bg-surface-1 border border-surface-3 rounded-lg text-xs resize-none focus:outline-none focus:border-brand-500" />
            </div>
            <button onClick={savePrep} disabled={savingPrep}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors">
              {savingPrep ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar preparación
            </button>
          </div>
        )}
      </div>

      {/* Timeline de interacciones */}
      <div>
        <button onClick={() => setTimelineExpanded(!timelineExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-surface-1/50 transition-colors">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-text-muted" />
            <span className="text-xs font-bold text-text-primary">Historial de interacciones</span>
            {interactions.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted">{interactions.length}</span>
            )}
          </div>
          {timelineExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>

        {timelineExpanded && (
          <div className="px-3 pb-3">
            {/* Botón nueva interacción */}
            {!showNewInteraction && (
              <button onClick={() => setShowNewInteraction(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-surface-3 rounded-lg text-xs text-text-muted hover:border-brand-500 hover:text-brand-500 transition-colors mb-3">
                <Plus size={12} /> Registrar interacción
              </button>
            )}

            {/* Formulario nueva interacción */}
            {showNewInteraction && (
              <div className="bg-surface-1 border border-surface-3 rounded-lg p-3 mb-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">Nueva interacción</span>
                  <button onClick={() => setShowNewInteraction(false)} className="text-text-muted"><X size={14} /></button>
                </div>

                {/* Tipo + Dirección */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Tipo</label>
                    <select value={newInteraction.interaction_type}
                      onChange={(e) => setNewInteraction(p => ({ ...p, interaction_type: e.target.value }))}
                      className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500">
                      {Object.entries(INTERACTION_TYPES).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Dirección</label>
                    <select value={newInteraction.direction}
                      onChange={(e) => setNewInteraction(p => ({ ...p, direction: e.target.value }))}
                      className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500">
                      <option value="outbound">Saliente (yo contacto)</option>
                      <option value="inbound">Entrante (me contactan)</option>
                    </select>
                  </div>
                </div>

                {/* Contacto + Resultado */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Persona contactada</label>
                    <input type="text" value={newInteraction.contact_person}
                      onChange={(e) => setNewInteraction(p => ({ ...p, contact_person: e.target.value }))}
                      placeholder="Nombre" className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Resultado</label>
                    <select value={newInteraction.result}
                      onChange={(e) => setNewInteraction(p => ({ ...p, result: e.target.value }))}
                      className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500">
                      <option value="">Sin especificar</option>
                      {Object.entries(RESULT_OPTIONS).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duración (solo llamadas/reuniones) */}
                {['call', 'meeting'].includes(newInteraction.interaction_type) && (
                  <div>
                    <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Duración (minutos)</label>
                    <input type="number" value={newInteraction.duration_minutes}
                      onChange={(e) => setNewInteraction(p => ({ ...p, duration_minutes: e.target.value }))}
                      placeholder="5" min="0" className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500" />
                  </div>
                )}

                {/* Asunto */}
                <div>
                  <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Asunto</label>
                  <input type="text" value={newInteraction.subject}
                    onChange={(e) => setNewInteraction(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Tema de la interacción" className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500" />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Notas</label>
                  <textarea value={newInteraction.notes}
                    onChange={(e) => setNewInteraction(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Resumen de la conversación, acuerdos, próximos pasos..."
                    rows={2} className="w-full px-2.5 py-2 bg-white border border-surface-3 rounded-lg text-xs resize-none focus:outline-none focus:border-brand-500" />
                </div>

                <button onClick={saveInteraction} disabled={savingInteraction}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                  {savingInteraction ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar interacción
                </button>
              </div>
            )}

            {/* Lista de interacciones */}
            {interactions.length === 0 && !showNewInteraction && (
              <div className="text-center py-4">
                <p className="text-xs text-text-muted">Sin interacciones registradas</p>
              </div>
            )}

            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {interactions.map(inter => {
                const typeCfg = INTERACTION_TYPES[inter.interaction_type] || INTERACTION_TYPES.other;
                const Icon = typeCfg.icon;
                const resultCfg = inter.result ? RESULT_OPTIONS[inter.result] : null;

                return (
                  <div key={inter.id} className="flex gap-2.5 p-2.5 rounded-lg hover:bg-surface-1/50 transition-colors group">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg ${typeCfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} className={typeCfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-text-primary">{typeCfg.label}</span>
                        {inter.direction === 'inbound' && (
                          <ArrowDownLeft size={10} className="text-green-500" title="Entrante" />
                        )}
                        {inter.direction === 'outbound' && (
                          <ArrowUpRight size={10} className="text-blue-500" title="Saliente" />
                        )}
                        {resultCfg && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${resultCfg.color}`}>
                            {resultCfg.label}
                          </span>
                        )}
                        {inter.duration_minutes && (
                          <span className="text-[9px] text-text-muted">{inter.duration_minutes} min</span>
                        )}
                        <span className="text-[9px] text-text-muted ml-auto">{formatDate(inter.created_at)}</span>
                      </div>
                      {inter.contact_person && (
                        <p className="text-[10px] text-text-muted">👤 {inter.contact_person}</p>
                      )}
                      {inter.subject && (
                        <p className="text-[11px] font-semibold text-text-secondary">{inter.subject}</p>
                      )}
                      {inter.notes && (
                        <p className="text-[11px] text-text-secondary mt-0.5 whitespace-pre-wrap">{inter.notes}</p>
                      )}
                    </div>

                    {/* Delete */}
                    {inter.user_id === user?.id && (
                      <button onClick={() => deleteInteraction(inter.id)}
                        className="p-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
