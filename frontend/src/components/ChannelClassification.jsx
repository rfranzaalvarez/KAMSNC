import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronDown, ChevronUp, Check, Loader2, Tag } from 'lucide-react';

/**
 * Componente de clasificación jerárquica de canales.
 * Permite seleccionar múltiples combinaciones de Canal > Subcanal > Tipo.
 * 
 * Props:
 * - channelId: ID del canal
 * - readOnly: si es true, solo muestra las clasificaciones (no edita)
 */
export default function ChannelClassification({ channelId, readOnly = false }) {
  const [allClassifications, setAllClassifications] = useState([]);
  const [selected, setSelected] = useState([]); // array de { id, classification_id, custom_text }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    loadData();
  }, [channelId]);

  async function loadData() {
    setLoading(true);
    try {
      const [classRes, selectedRes] = await Promise.all([
        supabase.from('channel_classification').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('channel_classifications').select('*, channel_classification(*)').eq('channel_id', channelId),
      ]);

      setAllClassifications(classRes.data || []);
      setSelected(selectedRes.data || []);
    } catch (err) {
      console.error('Error cargando clasificaciones:', err);
    } finally {
      setLoading(false);
    }
  }

  // Agrupar clasificaciones por canal
  function getTree() {
    const tree = {};
    allClassifications.forEach(c => {
      if (!tree[c.canal]) tree[c.canal] = {};
      if (c.subcanal) {
        if (!tree[c.canal][c.subcanal]) tree[c.canal][c.subcanal] = [];
        if (c.tipo) {
          tree[c.canal][c.subcanal].push(c);
        } else {
          // Subcanal sin tipo = es seleccionable directamente
          tree[c.canal][c.subcanal].push(c);
        }
      } else {
        // Canal sin subcanal (ej: "Otros")
        tree[c.canal]['_self'] = c;
      }
    });
    return tree;
  }

  function isSelected(classificationId) {
    return selected.some(s => s.classification_id === classificationId);
  }

  async function toggleClassification(classification) {
    if (readOnly) return;
    setSaving(true);

    const existing = selected.find(s => s.classification_id === classification.id);

    try {
      if (existing) {
        // Deseleccionar
        await supabase.from('channel_classifications').delete().eq('id', existing.id);
        setSelected(prev => prev.filter(s => s.id !== existing.id));
      } else {
        // Seleccionar
        const insert = {
          channel_id: channelId,
          classification_id: classification.id,
          custom_text: classification.canal === 'Otros' && customText ? customText : null,
        };
        const { data, error } = await supabase
          .from('channel_classifications')
          .insert(insert)
          .select('*, channel_classification(*)')
          .single();
        if (error) throw error;
        setSelected(prev => [...prev, data]);
        if (classification.canal === 'Otros') setCustomText('');
      }
    } catch (err) {
      console.error('Error actualizando clasificación:', err);
    } finally {
      setSaving(false);
    }
  }

  function formatLabel(cls) {
    if (!cls?.channel_classification) return '';
    const c = cls.channel_classification;
    let label = c.canal;
    if (c.subcanal) label += ` > ${c.subcanal}`;
    if (c.tipo) label += ` > ${c.tipo}`;
    if (cls.custom_text) label += `: ${cls.custom_text}`;
    return label;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={14} className="animate-spin text-brand-400" />
        <span className="text-xs text-text-muted">Cargando clasificación...</span>
      </div>
    );
  }

  const tree = getTree();

  return (
    <div className="bg-white border border-surface-3 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => !readOnly && setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-1/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-brand-500" />
          <span className="text-sm font-bold text-text-primary">Clasificación del canal</span>
          {selected.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-500">
              {selected.length}
            </span>
          )}
        </div>
        {!readOnly && (
          expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />
        )}
      </button>

      {/* Tags de seleccionados */}
      {selected.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {selected.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/10 text-brand-600 rounded-lg text-[10px] font-semibold">
              {formatLabel(s)}
              {!readOnly && (
                <button onClick={(e) => { e.stopPropagation(); toggleClassification(s.channel_classification); }}
                  className="hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {selected.length === 0 && !expanded && (
        <div className="px-3 pb-3">
          <p className="text-[11px] text-text-muted">Sin clasificación asignada. {!readOnly && 'Pulsa para añadir.'}</p>
        </div>
      )}

      {/* Selector expandido */}
      {expanded && !readOnly && (
        <div className="border-t border-surface-3 p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {Object.entries(tree).map(([canal, subcanales]) => (
            <div key={canal} className="bg-surface-1 rounded-lg overflow-hidden">
              {/* Canal header */}
              <div className="px-3 py-2 bg-surface-2 border-b border-surface-3">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">{canal}</span>
              </div>

              <div className="p-2 space-y-1">
                {Object.entries(subcanales).map(([subcanal, items]) => {
                  if (subcanal === '_self') {
                    // Canal sin subcanal (ej: Otros)
                    const cls = items;
                    const checked = isSelected(cls.id);
                    return (
                      <div key={cls.id}>
                        <button
                          onClick={() => toggleClassification(cls)}
                          disabled={saving}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                            checked ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-white'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            checked ? 'bg-brand-500 border-brand-500' : 'border-surface-3'
                          }`}>
                            {checked && <Check size={10} className="text-white" />}
                          </div>
                          <span className="text-xs text-text-secondary">Otro (especificar)</span>
                        </button>
                        {/* Campo de texto para Otros */}
                        {!checked && (
                          <div className="flex gap-2 mt-1 ml-6">
                            <input
                              type="text"
                              value={customText}
                              onChange={(e) => setCustomText(e.target.value)}
                              placeholder="Escribe el tipo..."
                              className="flex-1 px-2.5 py-1.5 bg-white border border-surface-3 rounded-lg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500"
                            />
                            <button
                              onClick={() => { if (customText.trim()) toggleClassification(cls); }}
                              disabled={!customText.trim() || saving}
                              className="px-2.5 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg disabled:opacity-30"
                            >
                              Añadir
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Subcanal con posibles tipos
                  const hasOnlyOneItem = items.length === 1 && !items[0].tipo;

                  if (hasOnlyOneItem) {
                    // Subcanal sin tipos (ej: Integral, Tienda Naturgy)
                    const cls = items[0];
                    const checked = isSelected(cls.id);
                    return (
                      <button
                        key={cls.id}
                        onClick={() => toggleClassification(cls)}
                        disabled={saving}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                          checked ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          checked ? 'bg-brand-500 border-brand-500' : 'border-surface-3'
                        }`}>
                          {checked && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-xs text-text-secondary">{subcanal}</span>
                      </button>
                    );
                  }

                  // Subcanal con tipos (ej: Mayorista > Cadena/GPV/PdV)
                  return (
                    <div key={subcanal} className="ml-1">
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-2 py-1">
                        {subcanal}
                      </div>
                      <div className="space-y-0.5">
                        {items.map(cls => {
                          const checked = isSelected(cls.id);
                          return (
                            <button
                              key={cls.id}
                              onClick={() => toggleClassification(cls)}
                              disabled={saving}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                                checked ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-white'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                checked ? 'bg-brand-500 border-brand-500' : 'border-surface-3'
                              }`}>
                                {checked && <Check size={10} className="text-white" />}
                              </div>
                              <span className="text-xs text-text-secondary">{cls.tipo || subcanal}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {saving && (
            <div className="flex items-center justify-center py-2">
              <Loader2 size={14} className="animate-spin text-brand-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
