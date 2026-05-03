import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import AccountPlan from '../components/AccountPlan';
import {
  Search, Plus, Building2, Phone, Mail, MapPin,
  ChevronRight, User, X, Check, Loader2, Edit3, Upload
} from 'lucide-react';

const STATUS_CONFIG = {
  prospect: { label: 'Prospecto', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  developing: { label: 'En desarrollo', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  active: { label: 'Activo', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  inactive: { label: 'Inactivo', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const TYPE_CONFIG = {
  distributor: 'Distribuidor',
  installer: 'Instalador',
  reseller: 'Revendedor',
  commercial: 'Comercializadora',
  other: 'Otro',
};

const PIPELINE_CONFIG = {
  lead: 'Lead',
  first_contact: 'Primer contacto',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  onboarding: 'Alta',
  active: 'Activo',
};

// ============ LISTADO DE CANALES ============
function ChannelList({ channels, loading, onSelect, filter, setFilter, search, setSearch }) {
  const filters = [
    { key: 'all', label: 'Todos', count: channels.length },
    { key: 'active', label: 'Activos', count: channels.filter(c => c.status === 'active').length },
    { key: 'developing', label: 'En desarrollo', count: channels.filter(c => c.status === 'developing').length },
    { key: 'prospect', label: 'Prospectos', count: channels.filter(c => c.status === 'prospect').length },
  ];

  const filtered = channels
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c =>
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold tracking-tight">Canales</h1>
        <div className="flex items-center gap-2">
          <a
            href="/import"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 hover:bg-surface-3 text-text-secondary text-xs font-semibold rounded-lg transition-colors"
          >
            <Upload size={13} />
            Importar
          </a>
          <button
            onClick={() => onSelect('new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <Plus size={14} />
            Nuevo
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar canal, contacto o ciudad..."
          className="w-full pl-9 pr-4 py-2.5 bg-surface-2 border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-brand-500 text-white'
                : 'bg-surface-2 text-text-secondary border border-surface-3 hover:border-surface-4'
            }`}
          >
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              filter === f.key ? 'bg-white/20' : 'bg-surface-3'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      )}

      {/* Lista */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-sm text-text-secondary">
            {search ? 'No se encontraron canales' : 'No hay canales en esta categoría'}
          </p>
        </div>
      )}

      {!loading && filtered.map(channel => {
        const status = STATUS_CONFIG[channel.status] || STATUS_CONFIG.prospect;
        const type = TYPE_CONFIG[channel.channel_type] || 'Otro';
        const daysSinceVisit = channel.last_visit_at
          ? Math.floor((Date.now() - new Date(channel.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.id)}
            className="w-full flex items-center gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl mb-2 text-left hover:border-surface-4 transition-colors"
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-xl ${status.bg} ${status.text} flex items-center justify-center text-sm font-extrabold flex-shrink-0`}>
              {channel.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{channel.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-text-secondary">{type}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {daysSinceVisit !== null ? (
                <span className={`text-[10px] font-semibold ${
                  daysSinceVisit > 10 ? 'text-red-400' : daysSinceVisit > 5 ? 'text-amber-400' : 'text-text-secondary'
                }`}>
                  Hace {daysSinceVisit}d
                </span>
              ) : (
                <span className="text-[10px] text-text-muted">Sin visitas</span>
              )}
              <ChevronRight size={14} className="text-text-muted" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============ DETALLE DE CANAL ============
function ChannelDetail({ channelId, onBack }) {
  const { user } = useAuthContext();
  const [channel, setChannel] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadChannel();
  }, [channelId]);

  async function loadChannel() {
    setLoading(true);
    try {
      const { data: ch } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();
      setChannel(ch);
      setEditForm({
        name: ch?.name || '',
        channel_type: ch?.channel_type || 'other',
        contact_name: ch?.contact_name || '',
        phone: ch?.phone || '',
        email: ch?.email || '',
        address: ch?.address || '',
        city: ch?.city || '',
        notes: ch?.notes || '',
        status: ch?.status || 'prospect',
      });

      const { data: v } = await supabase
        .from('visits')
        .select('*')
        .eq('channel_id', channelId)
        .order('checkin_at', { ascending: false })
        .limit(20);
      setVisits(v || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    setEditForm({
      name: channel.name || '',
      channel_type: channel.channel_type || 'other',
      contact_name: channel.contact_name || '',
      phone: channel.phone || '',
      email: channel.email || '',
      address: channel.address || '',
      city: channel.city || '',
      notes: channel.notes || '',
      status: channel.status || 'prospect',
    });
    setEditMode(true);
    setEditError('');
  }

  async function saveEdit() {
    if (!editForm.name.trim()) {
      setEditError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const { error } = await supabase
        .from('channels')
        .update({
          name: editForm.name.trim(),
          channel_type: editForm.channel_type,
          contact_name: editForm.contact_name || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          address: editForm.address || null,
          city: editForm.city || null,
          notes: editForm.notes || null,
          status: editForm.status,
        })
        .eq('id', channelId);
      if (error) throw error;
      setChannel(prev => ({ ...prev, ...editForm, name: editForm.name.trim() }));
      setEditMode(false);
    } catch (err) {
      setEditError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const updateField = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-400" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-secondary">Canal no encontrado</p>
        <button onClick={onBack} className="mt-3 text-sm text-brand-400 font-semibold">Volver</button>
      </div>
    );
  }

  const status = STATUS_CONFIG[channel.status] || STATUS_CONFIG.prospect;
  const type = TYPE_CONFIG[channel.channel_type] || 'Otro';
  const pipeline = PIPELINE_CONFIG[channel.pipeline_stage] || '-';

  const resultConfig = {
    positive: { label: 'Positiva', color: 'text-green-400', bg: 'bg-green-500/20' },
    neutral: { label: 'Neutral', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    negative: { label: 'Negativa', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-brand-400 font-semibold mb-4">
        ← Canales
      </button>

      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-4 mb-4">
        {editMode ? (
          /* ---- MODO EDICIÓN ---- */
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-text-primary">Editar canal</h2>
              <button onClick={() => setEditMode(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs text-red-600">{editError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nombre *</label>
                <input type="text" value={editForm.name} onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tipo</label>
                  <select value={editForm.channel_type} onChange={(e) => updateField('channel_type', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500">
                    {Object.entries(TYPE_CONFIG).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Estado</label>
                  <select value={editForm.status} onChange={(e) => updateField('status', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Contacto</label>
                <input type="text" value={editForm.contact_name} onChange={(e) => updateField('contact_name', e.target.value)}
                  placeholder="Nombre del contacto" className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Teléfono</label>
                  <input type="tel" value={editForm.phone} onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Dirección</label>
                <input type="text" value={editForm.address} onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Ciudad</label>
                <input type="text" value={editForm.city} onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Notas</label>
                <textarea value={editForm.notes} onChange={(e) => updateField('notes', e.target.value)}
                  rows={2} className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm resize-none focus:outline-none focus:border-brand-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Guardar
                </button>
                <button onClick={() => setEditMode(false)}
                  className="px-4 py-2.5 border border-surface-3 text-text-secondary rounded-xl text-sm font-semibold hover:bg-surface-2 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ---- MODO LECTURA ---- */
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl ${status.bg} ${status.text} flex items-center justify-center text-lg font-extrabold flex-shrink-0`}>
                {channel.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-extrabold tracking-tight">{channel.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-secondary">{type}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">
                    {pipeline}
                  </span>
                </div>
              </div>
              <button onClick={startEdit}
                className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
                <Edit3 size={16} />
              </button>
            </div>

            {/* Datos de contacto */}
            <div className="space-y-2 mt-4">
          {channel.contact_name && (
            <div className="flex items-center gap-2.5 text-sm">
              <User size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-text-secondary">{channel.contact_name}</span>
            </div>
          )}
          {channel.address && (
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-text-secondary">{channel.address}{channel.city ? `, ${channel.city}` : ''}</span>
            </div>
          )}
          {channel.phone && (
            <a href={`tel:${channel.phone}`} className="flex items-center gap-2.5 text-sm">
              <Phone size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-brand-400">{channel.phone}</span>
            </a>
          )}
          {channel.email && (
            <a href={`mailto:${channel.email}`} className="flex items-center gap-2.5 text-sm">
              <Mail size={14} className="text-text-muted flex-shrink-0" />
              <span className="text-brand-400">{channel.email}</span>
            </a>
          )}
        </div>

        {channel.notes && (
          <div className="mt-4 p-3 bg-surface-0 rounded-lg">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Notas</div>
            <p className="text-xs text-text-secondary leading-relaxed">{channel.notes}</p>
          </div>
        )}
          </>
        )}
      </div>

      {/* Plan de cuenta */}
      <div className="mb-4">
        <AccountPlan channelId={channelId} channelName={channel.name} />
      </div>

      {/* Historial de visitas */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Historial de visitas</h3>
          <span className="text-[11px] text-text-secondary">{visits.length} visitas</span>
        </div>

        {visits.length === 0 ? (
          <div className="text-center py-8 bg-surface-1 border border-surface-3 rounded-xl">
            <p className="text-sm text-text-secondary">Aún no hay visitas registradas</p>
            <p className="text-xs text-text-muted mt-1">Haz check-in para registrar la primera</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visits.map(visit => {
              const date = new Date(visit.checkin_at);
              const result = visit.result ? resultConfig[visit.result] : null;

              return (
                <div key={visit.id} className="bg-surface-1 border border-surface-3 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {visit.duration_minutes && (
                        <span className="text-[10px] text-text-muted">{visit.duration_minutes} min</span>
                      )}
                    </div>
                    {result && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${result.bg} ${result.color}`}>
                        {result.label}
                      </span>
                    )}
                  </div>
                  {visit.objective && (
                    <div className="text-[11px] text-text-secondary mb-1">
                      Objetivo: {visit.objective.replace(/_/g, ' ')}
                    </div>
                  )}
                  {visit.result_notes && (
                    <p className="text-xs text-text-secondary leading-relaxed">{visit.result_notes}</p>
                  )}
                  {visit.next_steps && (
                    <div className="mt-2 p-2 bg-surface-0 rounded-lg">
                      <div className="text-[10px] font-bold text-brand-400 mb-0.5">Próximos pasos</div>
                      <p className="text-xs text-text-secondary">{visit.next_steps}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ FORMULARIO NUEVO CANAL ============
function NewChannelForm({ onBack, onSaved }) {
  const { user } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    channel_type: 'other',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  async function handleSave() {
    if (!form.name.trim()) {
      setError('El nombre del canal es obligatorio');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('channels')
        .insert({
          ...form,
          name: form.name.trim(),
          assigned_to: user.id,
          status: 'prospect',
          pipeline_stage: 'lead',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      onSaved(data.id);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full px-3 py-2.5 bg-surface-0 border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors";

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-brand-400 font-semibold mb-4">
        ← Cancelar
      </button>

      <h1 className="text-xl font-extrabold tracking-tight mb-4">Nuevo canal</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Nombre del canal o empresa"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tipo de canal</label>
          <select
            value={form.channel_type}
            onChange={(e) => update('channel_type', e.target.value)}
            className={fieldClass}
          >
            {Object.entries(TYPE_CONFIG).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Persona de contacto</label>
          <input
            type="text"
            value={form.contact_name}
            onChange={(e) => update('contact_name', e.target.value)}
            placeholder="Nombre del contacto principal"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+34 612 345 678"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="contacto@empresa.com"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Dirección</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Calle, número"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Ciudad</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Madrid"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Notas sobre el canal..."
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check size={16} />
              Guardar canal
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============ PÁGINA PRINCIPAL DE CANALES ============
export default function ChannelsPage() {
  const { user } = useAuthContext();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'new'
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) loadChannels();
  }, [user]);

  async function loadChannels() {
    setLoading(true);
    try {
      // Obtener canales con la fecha de última visita
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          visits (checkin_at)
        `)
        .eq('assigned_to', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Añadir last_visit_at calculado
      const enriched = (data || []).map(ch => ({
        ...ch,
        last_visit_at: ch.visits?.length > 0
          ? ch.visits.sort((a, b) => new Date(b.checkin_at) - new Date(a.checkin_at))[0].checkin_at
          : null,
        visits: undefined, // limpiar el join
      }));

      setChannels(enriched);
    } catch (err) {
      console.error('Error cargando canales:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(id) {
    if (id === 'new') {
      setView('new');
    } else {
      setSelectedId(id);
      setView('detail');
    }
  }

  function handleBack() {
    setView('list');
    setSelectedId(null);
  }

  function handleSaved(newId) {
    loadChannels();
    setSelectedId(newId);
    setView('detail');
  }

  if (view === 'detail' && selectedId) {
    return <ChannelDetail channelId={selectedId} onBack={handleBack} />;
  }

  if (view === 'new') {
    return <NewChannelForm onBack={handleBack} onSaved={handleSaved} />;
  }

  return (
    <ChannelList
      channels={channels}
      loading={loading}
      onSelect={handleSelect}
      filter={filter}
      setFilter={setFilter}
      search={search}
      setSearch={setSearch}
    />
  );
}
