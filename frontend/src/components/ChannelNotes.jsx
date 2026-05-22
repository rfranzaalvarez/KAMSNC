import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { MessageSquarePlus, Loader2, Trash2, Send } from 'lucide-react';

export default function ChannelNotes({ channelId }) {
  const { user, profile } = useAuthContext();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (channelId) loadNotes();
  }, [channelId]);

  async function loadNotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channel_notes')
        .select('*, profiles(full_name)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error cargando notas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim() || !user?.id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('channel_notes')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: newNote.trim(),
        })
        .select('*, profiles(full_name)')
        .single();
      if (error) throw error;
      setNotes(prev => [data, ...prev]);
      setNewNote('');
    } catch (err) {
      console.error('Error añadiendo nota:', err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId) {
    try {
      const { error } = await supabase
        .from('channel_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Error eliminando nota:', err);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="bg-white border border-surface-3 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3.5 border-b border-surface-3">
        <MessageSquarePlus size={16} className="text-brand-500" />
        <span className="text-sm font-bold text-text-primary">Notas del canal</span>
        {notes.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted">
            {notes.length}
          </span>
        )}
      </div>

      {/* Input para nueva nota */}
      <div className="p-3 border-b border-surface-3 bg-surface-1/50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Añade una nota..."
              rows={1}
              className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
              style={{ minHeight: '40px', maxHeight: '100px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
            />
          </div>
          <button
            onClick={addNote}
            disabled={saving || !newNote.trim()}
            className="flex items-center justify-center w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:hover:bg-brand-500 text-white rounded-xl transition-colors flex-shrink-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[9px] text-text-muted mt-1.5">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>

      {/* Lista de notas */}
      <div className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-brand-400" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-text-muted">Sin notas todavía</p>
            <p className="text-[10px] text-text-muted mt-0.5">Añade la primera nota sobre este canal</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-3">
            {notes.map(note => (
              <div key={note.id} className="px-3.5 py-3 hover:bg-surface-1/50 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-text-primary">
                        {note.profiles?.full_name || profile?.full_name || 'KAM'}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatDate(note.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  </div>
                  {note.user_id === user?.id && (
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title="Eliminar nota"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
