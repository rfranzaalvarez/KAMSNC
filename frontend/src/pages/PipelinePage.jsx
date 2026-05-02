import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { Loader2, Plus, ChevronRight, Clock, Building2, X, Check } from 'lucide-react';

const STAGES = [
  { key: 'lead', label: 'Lead', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
  { key: 'first_contact', label: 'Contacto', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
  { key: 'proposal', label: 'Propuesta', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  { key: 'negotiation', label: 'Negociación', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  { key: 'onboarding', label: 'Alta', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
  { key: 'active', label: 'Activo', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
];

const TYPE_LABELS = {
  distributor: 'Distribuidor',
  installer: 'Instalador',
  reseller: 'Revendedor',
  commercial: 'Comercializadora',
  other: 'Otro',
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ============ TARJETA DE CANAL ============
function ChannelCard({ channel, onDragStart, stage }) {
  const daysInStage = daysSince(channel.updated_at);
  const lastVisitDays = channel.last_visit_at ? daysSince(channel.last_visit_at) : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', channel.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(channel.id);
      }}
      className="bg-[#ffffff] border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-opacity-60 transition-all group"
      style={{ borderColor: stage.border }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{channel.name}</div>
          <div className="text-[10px] text-[#5a6078]">{TYPE_LABELS[channel.channel_type] || 'Otro'}</div>
        </div>
      </div>

      {channel.contact_name && (
        <div className="text-[11px] text-[#5a6078] mb-1.5 truncate">
          👤 {channel.contact_name}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {daysInStage !== null && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
              daysInStage > 14 ? 'bg-red-500/20 text-red-400' :
              daysInStage > 7 ? 'bg-amber-500/20 text-amber-400' :
              'bg-[#dde1e8] text-[#5a6078]'
            }`}>
              {daysInStage}d en fase
            </span>
          )}
        </div>
        {lastVisitDays !== null && (
          <span className={`text-[9px] font-semibold ${
            lastVisitDays > 10 ? 'text-red-400' : lastVisitDays > 5 ? 'text-amber-400' : 'text-[#8b90a0]'
          }`}>
            Visita: {lastVisitDays}d
          </span>
        )}
      </div>
    </div>
  );
}

// ============ COLUMNA DEL PIPELINE ============
function PipelineColumn({ stage, channels, onDrop, onDragStart, dragOver, setDragOver }) {
  const isOver = dragOver === stage.key;

  return (
    <div
      className="flex flex-col min-w-[200px] max-w-[240px] flex-1"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(stage.key);
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const channelId = e.dataTransfer.getData('text/plain');
        onDrop(channelId, stage.key);
        setDragOver(null);
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: stage.color }}>
          {stage.label}
        </span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#dde1e8] text-[#5a6078]">
          {channels.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 space-y-2 p-1.5 rounded-xl min-h-[120px] transition-colors ${
          isOver ? 'bg-[#1a1a2e] ring-1' : 'bg-transparent'
        }`}
        style={isOver ? { ringColor: stage.color } : {}}
      >
        {channels.map(ch => (
          <ChannelCard
            key={ch.id}
            channel={ch}
            stage={stage}
            onDragStart={onDragStart}
          />
        ))}

        {channels.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 border border-dashed border-[#dde1e8] rounded-xl">
            <span className="text-[10px] text-[#c5cbd6]">Sin canales</span>
          </div>
        )}

        {isOver && (
          <div
            className="flex items-center justify-center h-14 border-2 border-dashed rounded-xl transition-colors"
            style={{ borderColor: stage.color, backgroundColor: stage.bg }}
          >
            <span className="text-xs font-semibold" style={{ color: stage.color }}>Soltar aquí</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ VISTA MOBILE (Lista vertical) ============
function PipelineMobile({ channelsByStage, onMove, loading }) {
  const [expandedStage, setExpandedStage] = useState(null);
  const [movingChannel, setMovingChannel] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#E87A1E]" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {STAGES.map(stage => {
        const channels = channelsByStage[stage.key] || [];
        const isExpanded = expandedStage === stage.key;

        return (
          <div key={stage.key}>
            <button
              onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: isExpanded ? stage.bg : 'transparent',
                border: `1px solid ${isExpanded ? stage.border : '#dde1e8'}`,
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
              <span className="text-sm font-bold flex-1 text-left" style={{ color: isExpanded ? stage.color : '#1a1a2e' }}>
                {stage.label}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: stage.bg, color: stage.color }}>
                {channels.length}
              </span>
              <ChevronRight
                size={14}
                className="transition-transform"
                style={{
                  color: '#8b90a0',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {isExpanded && (
              <div className="mt-1 ml-5 space-y-1.5 pb-2">
                {channels.length === 0 && (
                  <div className="text-xs text-[#8b90a0] py-3 text-center">Sin canales en esta fase</div>
                )}
                {channels.map(ch => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-[#ffffff] border"
                    style={{ borderColor: stage.border }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{ch.name}</div>
                      <div className="text-[10px] text-[#8b90a0]">
                        {TYPE_LABELS[ch.channel_type] || 'Otro'}
                        {ch.contact_name && ` · ${ch.contact_name}`}
                      </div>
                    </div>

                    {/* Botones de mover */}
                    {movingChannel === ch.id ? (
                      <div className="flex gap-1 flex-wrap justify-end max-w-[180px]">
                        {STAGES.filter(s => s.key !== stage.key).map(s => (
                          <button
                            key={s.key}
                            onClick={() => { onMove(ch.id, s.key); setMovingChannel(null); }}
                            className="text-[9px] font-semibold px-2 py-1 rounded-md transition-colors"
                            style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                          >
                            {s.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setMovingChannel(null)}
                          className="text-[9px] px-1.5 py-1 text-[#8b90a0]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMovingChannel(ch.id)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[#dde1e8] text-[#5a6078] hover:text-[#1a1a2e] transition-colors"
                      >
                        Mover →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ PÁGINA PRINCIPAL DEL PIPELINE ============
export default function PipelinePage() {
  const { user } = useAuthContext();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [toast, setToast] = useState(null);
  const scrollRef = useRef(null);

  // Detectar móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (user) loadChannels();
  }, [user]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadChannels() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select(`*, visits(checkin_at)`)
        .eq('assigned_to', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map(ch => ({
        ...ch,
        last_visit_at: ch.visits?.length > 0
          ? ch.visits.sort((a, b) => new Date(b.checkin_at) - new Date(a.checkin_at))[0].checkin_at
          : null,
        visits: undefined,
      }));

      setChannels(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function moveChannel(channelId, newStage) {
    // Optimistic update
    const oldChannels = [...channels];
    const channel = channels.find(c => c.id === channelId);
    if (!channel || channel.pipeline_stage === newStage) return;

    const oldStage = STAGES.find(s => s.key === channel.pipeline_stage);
    const newStageObj = STAGES.find(s => s.key === newStage);

    setChannels(prev => prev.map(c =>
      c.id === channelId ? { ...c, pipeline_stage: newStage, updated_at: new Date().toISOString() } : c
    ));

    // También actualizar status según la fase
    let newStatus = channel.status;
    if (newStage === 'active') newStatus = 'active';
    else if (newStage === 'lead') newStatus = 'prospect';
    else if (['first_contact', 'proposal', 'negotiation', 'onboarding'].includes(newStage)) newStatus = 'developing';

    try {
      const { error } = await supabase
        .from('channels')
        .update({ pipeline_stage: newStage, status: newStatus })
        .eq('id', channelId);

      if (error) throw error;

      setToast({
        message: `${channel.name}: ${oldStage?.label} → ${newStageObj?.label}`,
        color: newStageObj?.color,
      });
    } catch (err) {
      // Rollback
      setChannels(oldChannels);
      setToast({ message: 'Error al mover canal', color: '#ef4444' });
    }

    setDraggingId(null);
  }

  // Agrupar canales por stage
  const channelsByStage = {};
  STAGES.forEach(s => { channelsByStage[s.key] = []; });
  channels.forEach(ch => {
    if (channelsByStage[ch.pipeline_stage]) {
      channelsByStage[ch.pipeline_stage].push(ch);
    }
  });

  // Totales para el header
  const totalInPipeline = channels.filter(c => !['lead', 'active'].includes(c.pipeline_stage)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Pipeline</h1>
          <p className="text-xs text-[#5a6078]">
            {channels.length} canales · {totalInPipeline} en proceso
          </p>
        </div>
      </div>

      {/* Resumen visual de funnel */}
      <div className="flex gap-1 mb-4 h-2 rounded-full overflow-hidden bg-[#dde1e8]">
        {STAGES.map(stage => {
          const count = channelsByStage[stage.key]?.length || 0;
          const pct = channels.length > 0 ? (count / channels.length) * 100 : 0;
          return pct > 0 ? (
            <div
              key={stage.key}
              style={{ width: `${pct}%`, backgroundColor: stage.color }}
              className="transition-all duration-300"
              title={`${stage.label}: ${count}`}
            />
          ) : null;
        })}
      </div>

      {/* Vista según dispositivo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#E87A1E]" />
        </div>
      ) : isMobile ? (
        <PipelineMobile
          channelsByStage={channelsByStage}
          onMove={moveChannel}
          loading={loading}
        />
      ) : (
        /* Vista desktop: Kanban horizontal */
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-4"
          style={{ minHeight: 300 }}
        >
          {STAGES.map(stage => (
            <PipelineColumn
              key={stage.key}
              stage={stage}
              channels={channelsByStage[stage.key] || []}
              onDrop={moveChannel}
              onDragStart={setDraggingId}
              dragOver={dragOver}
              setDragOver={setDragOver}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 px-4 py-3 rounded-xl text-center text-sm font-bold shadow-xl z-50"
          style={{ backgroundColor: toast.color || '#6366f1', color: '#fff' }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
