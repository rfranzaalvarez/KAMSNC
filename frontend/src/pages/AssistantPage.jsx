import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import {
  Mic, MicOff, Send, Bot, User, Loader2, Sparkles,
  Building2, MapPin, Calendar, BarChart3, CheckCircle, AlertCircle
} from 'lucide-react';

const SYSTEM_PROMPT = `Eres el asistente de IA de KAMApp, un CRM para KAMs (Key Account Managers) que gestionan canales de venta.

Tu trabajo es interpretar lo que el usuario te pide y responder con un JSON que indique la acción a ejecutar.

ACCIONES DISPONIBLES:
1. "create_channel" - Crear un nuevo canal. Campos: name (obligatorio), contact_name, phone, email, address, city, channel_type (distributor|installer|reseller|commercial|other), notes
2. "query_channels" - Consultar canales. Filtros: status, channel_type, sin_visita_dias (canales sin visitar en X días)
3. "query_visits" - Consultar visitas. Filtros: periodo (hoy|semana|mes), resultado (positive|neutral|negative)
4. "move_pipeline" - Mover canal de fase. Campos: channel_name, new_stage (lead|first_contact|proposal|negotiation|onboarding|active)
5. "plan_visit" - Planificar visita. Campos: channel_name, date (YYYY-MM-DD), time (HH:MM)
6. "query_stats" - Consultar estadísticas generales del KAM
7. "chat" - Responder conversacionalmente (si no es una acción del CRM)

RESPONDE SIEMPRE con este JSON exacto (sin markdown, sin backticks):
{"action": "nombre_accion", "params": {...}, "message": "Mensaje para el usuario explicando lo que vas a hacer o la respuesta"}

EJEMPLOS:
- "Crea un canal llamado Solar Madrid, contacto Pedro García, teléfono 612345678"
  → {"action": "create_channel", "params": {"name": "Solar Madrid", "contact_name": "Pedro García", "phone": "612345678"}, "message": "Voy a crear el canal Solar Madrid con Pedro García como contacto."}

- "¿Cuántas visitas he hecho esta semana?"
  → {"action": "query_visits", "params": {"periodo": "semana"}, "message": "Déjame consultar tus visitas de esta semana."}

- "Mueve Pepito a negociación"
  → {"action": "move_pipeline", "params": {"channel_name": "Pepito", "new_stage": "negotiation"}, "message": "Voy a mover Pepito a la fase de Negociación."}

- "¿Qué canales no he visitado en más de 10 días?"
  → {"action": "query_channels", "params": {"sin_visita_dias": 10}, "message": "Buscando canales sin visita en los últimos 10 días."}

- "Planifica una visita a Manolito el jueves a las 10"
  → {"action": "plan_visit", "params": {"channel_name": "Manolito", "date": "NEXT_THURSDAY", "time": "10:00"}, "message": "Voy a planificar una visita a Manolito para el jueves a las 10:00."}

- "Hola, ¿qué puedes hacer?"
  → {"action": "chat", "params": {}, "message": "¡Hola! Soy tu asistente de KAMApp. Puedo ayudarte a: crear canales, consultar visitas y estadísticas, mover canales en el pipeline, planificar visitas, y buscar canales sin actividad reciente. Simplemente dime qué necesitas."}

Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
Si el usuario dice "jueves", "mañana", etc., calcula la fecha correcta.
Responde siempre en español.`;

const STAGE_LABELS = {
  lead: 'Lead', first_contact: 'Primer contacto', proposal: 'Propuesta',
  negotiation: 'Negociación', onboarding: 'Alta', active: 'Activo',
};

const STATUS_LABELS = {
  prospect: 'Prospecto', developing: 'En desarrollo', active: 'Activo', inactive: 'Inactivo',
};

// ============ MESSAGE BUBBLE ============
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isAction = message.actionResult;

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-brand-500 text-white' : 'bg-surface-2 text-brand-500'
      }`}>
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-500 text-white rounded-tr-md'
            : 'bg-white border border-surface-3 text-text-primary rounded-tl-md'
        }`}>
          {message.text}
        </div>

        {/* Action result card */}
        {isAction && (
          <div className={`mt-1.5 inline-block px-3 py-2 rounded-xl text-xs border ${
            message.actionSuccess
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <div className="flex items-center gap-1.5">
              {message.actionSuccess
                ? <CheckCircle size={12} />
                : <AlertCircle size={12} />
              }
              {message.actionResult}
            </div>
          </div>
        )}

        {/* Data table */}
        {message.data && message.data.length > 0 && (
          <div className="mt-1.5 bg-white border border-surface-3 rounded-xl overflow-hidden max-w-sm">
            {message.data.slice(0, 8).map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${
                i < message.data.length - 1 ? 'border-b border-surface-3' : ''
              }`}>
                <span className="font-semibold text-text-primary flex-1">{item.name || item.label}</span>
                {item.value !== undefined && <span className="text-text-secondary">{item.value}</span>}
                {item.badge && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${item.badgeClass || 'bg-surface-2 text-text-secondary'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
            {message.data.length > 8 && (
              <div className="px-3 py-1.5 text-[10px] text-text-muted text-center bg-surface-1">
                +{message.data.length - 8} más
              </div>
            )}
          </div>
        )}

        <div className="text-[9px] text-text-muted mt-1">
          {new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function AssistantPage() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '¡Hola! Soy tu asistente de KAMApp. Puedo crear canales, consultar visitas, mover el pipeline, planificar visitas y mucho más. ¿En qué te ayudo?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
        // Auto-send after voice
        handleSend(transcript);
      };

      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  function toggleVoice() {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  async function handleSend(text) {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg = { role: 'user', text: msgText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            ...messages.filter(m => m.role !== 'system').slice(-10).map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.text,
            })),
            { role: 'user', content: msgText },
          ],
        }),
      });

      const data = await response.json();
      const rawText = data.content?.map(c => c.text || '').join('') || '';

      // Parse JSON response
      let parsed;
      try {
        const cleaned = rawText.replace(/```json\s*/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // If parsing fails, treat as chat
        parsed = { action: 'chat', params: {}, message: rawText };
      }

      // Execute action
      const result = await executeAction(parsed.action, parsed.params);

      const assistantMsg = {
        role: 'assistant',
        text: parsed.message || 'Hecho.',
        timestamp: Date.now(),
        ...result,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function executeAction(action, params) {
    try {
      switch (action) {
        case 'create_channel': {
          if (!params.name) return { actionResult: 'Falta el nombre del canal', actionSuccess: false };

          const { data, error } = await supabase.from('channels').insert({
            name: params.name,
            contact_name: params.contact_name || null,
            phone: params.phone || null,
            email: params.email || null,
            address: params.address || null,
            city: params.city || null,
            channel_type: params.channel_type || 'other',
            status: 'prospect',
            pipeline_stage: 'lead',
            notes: params.notes || null,
            assigned_to: user.id,
          }).select().single();

          if (error) throw error;
          return { actionResult: `Canal "${params.name}" creado correctamente`, actionSuccess: true };
        }

        case 'query_channels': {
          let query = supabase.from('channels').select('name, status, channel_type, city').eq('assigned_to', user.id);

          if (params.status) query = query.eq('status', params.status);
          if (params.channel_type) query = query.eq('channel_type', params.channel_type);

          const { data, error } = await query.order('name').limit(20);
          if (error) throw error;

          if (params.sin_visita_dias) {
            // Filter channels without recent visits
            const threshold = new Date(Date.now() - params.sin_visita_dias * 86400000).toISOString();
            const channelIds = data.map(c => c.name);

            const { data: allChannels } = await supabase.from('channels')
              .select('id, name, status').eq('assigned_to', user.id);

            const results = [];
            for (const ch of (allChannels || [])) {
              const { data: lastVisit } = await supabase.from('visits')
                .select('checkin_at').eq('channel_id', ch.id)
                .order('checkin_at', { ascending: false }).limit(1);

              if (!lastVisit?.length || lastVisit[0].checkin_at < threshold) {
                const days = lastVisit?.length
                  ? Math.floor((Date.now() - new Date(lastVisit[0].checkin_at).getTime()) / 86400000)
                  : null;
                results.push({
                  name: ch.name,
                  badge: days !== null ? `${days}d` : 'Nunca',
                  badgeClass: 'bg-red-50 text-red-500',
                });
              }
            }

            return {
              data: results,
              actionResult: `${results.length} canales sin visita en ${params.sin_visita_dias}+ días`,
              actionSuccess: true,
            };
          }

          return {
            data: (data || []).map(c => ({
              name: c.name,
              value: c.city || '',
              badge: STATUS_LABELS[c.status] || c.status,
            })),
            actionResult: `${data?.length || 0} canales encontrados`,
            actionSuccess: true,
          };
        }

        case 'query_visits': {
          let startDate;
          const now = new Date();

          if (params.periodo === 'hoy') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          } else if (params.periodo === 'semana') {
            const d = new Date(now);
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - day + 1);
            d.setHours(0, 0, 0, 0);
            startDate = d.toISOString();
          } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          }

          let query = supabase.from('visits').select('*, channels(name)')
            .eq('kam_id', user.id).gte('checkin_at', startDate);
          if (params.resultado) query = query.eq('result', params.resultado);

          const { data, error } = await query.order('checkin_at', { ascending: false });
          if (error) throw error;

          const positive = (data || []).filter(v => v.result === 'positive').length;
          const total = data?.length || 0;

          return {
            data: (data || []).slice(0, 8).map(v => ({
              name: v.channels?.name || 'Canal',
              value: new Date(v.checkin_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
              badge: v.result === 'positive' ? '✓' : v.result === 'negative' ? '✗' : '~',
              badgeClass: v.result === 'positive' ? 'bg-green-50 text-green-600' : v.result === 'negative' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600',
            })),
            actionResult: `${total} visitas (${positive} positivas) ${params.periodo === 'hoy' ? 'hoy' : params.periodo === 'semana' ? 'esta semana' : 'este mes'}`,
            actionSuccess: true,
          };
        }

        case 'move_pipeline': {
          if (!params.channel_name || !params.new_stage) {
            return { actionResult: 'Necesito el nombre del canal y la fase destino', actionSuccess: false };
          }

          const { data: channels } = await supabase.from('channels')
            .select('id, name, pipeline_stage').eq('assigned_to', user.id)
            .ilike('name', `%${params.channel_name}%`).limit(1);

          if (!channels?.length) {
            return { actionResult: `No encontré un canal con nombre "${params.channel_name}"`, actionSuccess: false };
          }

          const channel = channels[0];
          const oldStage = STAGE_LABELS[channel.pipeline_stage] || channel.pipeline_stage;
          const newStage = STAGE_LABELS[params.new_stage] || params.new_stage;

          const { error } = await supabase.from('channels').update({
            pipeline_stage: params.new_stage,
            status: params.new_stage === 'active' ? 'active' : ['first_contact', 'proposal', 'negotiation', 'onboarding'].includes(params.new_stage) ? 'developing' : 'prospect',
          }).eq('id', channel.id);

          if (error) throw error;
          return { actionResult: `${channel.name}: ${oldStage} → ${newStage}`, actionSuccess: true };
        }

        case 'plan_visit': {
          if (!params.channel_name) {
            return { actionResult: 'Necesito el nombre del canal', actionSuccess: false };
          }

          const { data: channels } = await supabase.from('channels')
            .select('id, name').eq('assigned_to', user.id)
            .ilike('name', `%${params.channel_name}%`).limit(1);

          if (!channels?.length) {
            return { actionResult: `No encontré "${params.channel_name}"`, actionSuccess: false };
          }

          // Resolve relative dates
          let date = params.date;
          if (date && date.startsWith('NEXT_')) {
            const dayNames = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0 };
            const targetDay = dayNames[date.replace('NEXT_', '')];
            if (targetDay !== undefined) {
              const d = new Date();
              const currentDay = d.getDay();
              const daysUntil = ((targetDay - currentDay + 7) % 7) || 7;
              d.setDate(d.getDate() + daysUntil);
              date = d.toISOString().split('T')[0];
            }
          }
          if (date === 'TOMORROW') {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            date = d.toISOString().split('T')[0];
          }
          if (!date) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            date = d.toISOString().split('T')[0];
          }

          const { error } = await supabase.from('planned_visits').insert({
            channel_id: channels[0].id,
            kam_id: user.id,
            planned_date: date,
            planned_time: params.time ? params.time + ':00' : '09:00:00',
          });

          if (error) throw error;
          return {
            actionResult: `Visita planificada: ${channels[0].name} el ${new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${params.time || '09:00'}`,
            actionSuccess: true,
          };
        }

        case 'query_stats': {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const mondayStart = (() => {
            const d = new Date(now);
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - day + 1);
            d.setHours(0, 0, 0, 0);
            return d.toISOString();
          })();

          const [today, week, channels, pipeline] = await Promise.allSettled([
            supabase.from('visits').select('id', { count: 'exact', head: true }).eq('kam_id', user.id).gte('checkin_at', todayStart),
            supabase.from('visits').select('id', { count: 'exact', head: true }).eq('kam_id', user.id).gte('checkin_at', mondayStart),
            supabase.from('channels').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id),
            supabase.from('channels').select('id', { count: 'exact', head: true }).eq('assigned_to', user.id).in('pipeline_stage', ['first_contact', 'proposal', 'negotiation', 'onboarding']),
          ]);

          const getCount = (r) => r.status === 'fulfilled' ? (r.value.count || 0) : 0;

          return {
            data: [
              { name: 'Visitas hoy', value: getCount(today) },
              { name: 'Visitas esta semana', value: getCount(week) },
              { name: 'Total canales', value: getCount(channels) },
              { name: 'Pipeline activo', value: getCount(pipeline) },
            ],
            actionResult: 'Tus estadísticas actualizadas',
            actionSuccess: true,
          };
        }

        case 'chat':
        default:
          return {};
      }
    } catch (err) {
      console.error('Error ejecutando acción:', err);
      return { actionResult: `Error: ${err.message}`, actionSuccess: false };
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Sparkles size={18} className="text-brand-500" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-text-primary tracking-tight">Asistente IA</h1>
          <p className="text-[10px] text-text-muted">Dime qué necesitas, por texto o por voz</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center">
              <Sparkles size={14} className="text-brand-500" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-white border border-surface-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 size={14} className="animate-spin" />
                Pensando...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2">
        {[
          '¿Cuántas visitas llevo esta semana?',
          '¿Qué canales no he visitado?',
          'Mis estadísticas',
          'Lista de canales activos',
        ].map((suggestion, i) => (
          <button
            key={i}
            onClick={() => { setInput(suggestion); handleSend(suggestion); }}
            className="px-3 py-1.5 bg-surface-1 border border-surface-3 rounded-full text-[11px] text-text-secondary font-semibold whitespace-nowrap hover:bg-surface-2 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-2 border-t border-surface-3">
        <button
          onClick={toggleVoice}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            listening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text-primary'
          }`}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={listening ? 'Escuchando...' : 'Escribe o habla...'}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-white border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 disabled:opacity-50 transition-colors"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
