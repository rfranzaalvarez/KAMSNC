import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import AccountPlan from '../components/AccountPlan';
import PreVisitBrief from '../components/PreVisitBrief';
import ChannelNotes from '../components/ChannelNotes';
import ChannelClassification from '../components/ChannelClassification';
import ClassificationSelector from '../components/ClassificationSelector';
import CompanyAnalysis from '../components/CompanyAnalysis';
import ContactHub from '../components/ContactHub';
import VolumeEditor from '../components/VolumeEditor';
import AddressFields from '../components/AddressFields';
import { useChannelTypes } from '../hooks/useChannelTypes';
import { validatePhone, validateEmail, validateCIF } from '../lib/validators';
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

const PIPELINE_CONFIG = {
  lead: 'Lead',
  first_contact: 'Primer contacto',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  onboarding: 'Alta',
  active: 'Activo',
};

// ============ LISTADO DE CANALES ============
function ChannelList({ channels, loading, onSelect, filter, setFilter, search, setSearch, typeMap }) {
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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      )}

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
        const type = typeMap[channel.channel_type] || channel.channel_type || 'Otro';
        const daysSinceVisit = channel.last_visit_at
          ? Math.floor((Date.now() - new Date(channel.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.id)}
            className="w-full flex items-center gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl mb-2 text-left hover:border-surface-4 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl ${status.bg} ${status.text} flex items-center justify-center text-sm font-extrabold flex-shrink-0`}>
              {channel.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{channel.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-text-secondary">{type}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>
            </div>
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
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============ DETALLE DE CANAL ============
function ChannelDetail({ channelId, onBack, types, typeMap }) {
  const { user } = useAuthContext();
  const [channel, setChannel] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
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
        channel_type: ch?.channel_type || 'energia_mayorista',
        contact_name: ch?.contact_name || '',
        phone: ch?.phone || '',
        email: ch?.email || '',
        cif: ch?.cif || '',
        website: ch?.website || '',
        google_rating: ch?.google_rating ?? '',
        lead_source: ch?.lead_source || '',
        address: ch?.address || '',
        city: ch?.city || '',
        province: ch?.province || '',
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
      channel_type: channel.channel_type || 'energia_mayorista',
      contact_name: channel.contact_name || '',
      phone: channel.phone || '',
      email: channel.email || '',
      cif: channel.cif || '',
      website: channel.website || '',
      google_rating: channel.google_rating ?? '',
      lead_source: channel.lead_source || '',
      address: channel.address || '',
      city: channel.city || '',
      province: channel.province || '',
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
          cif: editForm.cif || null,
          website: editForm.website || null,
          google_rating: editForm.google_rating && editForm.google_rating !== 'no_tiene' ? parseFloat(editForm.google_rating) : null,
          lead_source: editForm.lead_source || null,
          address: editForm.address || null,
          city: editForm.city || null,
          province: editForm.province || null,
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
  const type = typeMap[channel.channel_type] || channel.channel_type || 'Otro';
  const pipeline = PIPELINE_CONFIG[channel.pipeline_stage] || '-';

  const resultConfig = {
    positive: { label: 'Positiva', color: 'text-green-400', bg: 'bg-green-500/20' },
    neutral: { label: 'Neutral', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    negative: { label: 'Negativa', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-brand-400 font-semibold mb-4">
        ← Canales
      </button>

      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-4 mb-4">
        {editMode ? (
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
              <div className="grid grid-cols-1 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">CIF</label>
                  <input type="text" value={editForm.cif} onChange={(e) => updateField('cif', e.target.value)}
                    placeholder="B12345678" className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Valoración Google</label>
                  <select value={editForm.google_rating ?? ''} onChange={(e) => updateField('google_rating', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500">
                    <option value="">Seleccionar...</option>
                    <option value="no_tiene">No tiene</option>
                    <option value="5">⭐ 5.0</option>
                    <option value="4.5">⭐ 4.5</option>
                    <option value="4">⭐ 4.0</option>
                    <option value="3.5">⭐ 3.5</option>
                    <option value="3">⭐ 3.0</option>
                    <option value="2.5">⭐ 2.5</option>
                    <option value="2">⭐ 2.0</option>
                    <option value="1.5">⭐ 1.5</option>
                    <option value="1">⭐ 1.0</option>
                    <option value="0.5">⭐ 0.5</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Página web</label>
                <input type="url" value={editForm.website} onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://www.ejemplo.com" className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Origen del lead</label>
                <select value={editForm.lead_source} onChange={(e) => updateField('lead_source', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500">
                  <option value="">Seleccionar...</option>
                  <option value="inbound_web">Inbound - Web Naturgy</option>
                  <option value="outbound_navigator">Outbound - Sales Navigator</option>
                  <option value="outbound_referidos">Outbound - Referidos otro canal</option>
                  <option value="outbound_otros">Outbound - Otros</option>
                </select>
              </div>
              <AddressFields form={editForm} update={updateField} fieldClass="w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm focus:outline-none focus:border-brand-500" />
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
                  <span className="text-text-secondary">
                    {channel.address}
                    {channel.city ? `, ${channel.city}` : ''}
                    {channel.province ? ` (${channel.province})` : ''}
                  </span>
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
              {channel.cif && (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-text-muted flex-shrink-0 text-xs font-bold">CIF</span>
                  <span className="text-text-secondary">{channel.cif}</span>
                </div>
              )}
              {channel.website && (
                <a href={channel.website.startsWith('http') ? channel.website : `https://${channel.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm">
                  <span className="text-text-muted flex-shrink-0 text-xs">🌐</span>
                  <span className="text-brand-400">{channel.website}</span>
                </a>
              )}
              {channel.google_rating != null ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-text-muted flex-shrink-0 text-xs">⭐</span>
                  <span className="text-text-secondary">{channel.google_rating} / 5</span>
                </div>
              ) : channel.google_rating === null && channel.cif && (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-text-muted flex-shrink-0 text-xs">⭐</span>
                  <span className="text-text-muted">Sin valoración en Google</span>
                </div>
              )}
              {channel.lead_source && (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="text-text-muted flex-shrink-0 text-xs">📥</span>
                  <span className="text-text-secondary">{{
                    inbound_web: 'Inbound - Web Naturgy',
                    outbound_navigator: 'Outbound - Sales Navigator',
                    outbound_referidos: 'Outbound - Referidos otro canal',
                    outbound_otros: 'Outbound - Otros',
                  }[channel.lead_source] || channel.lead_source}</span>
                </div>
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

      {/* Clasificación del canal */}
      <div className="mb-4">
        <ChannelClassification channelId={channelId} />
      </div>

      {/* Análisis de empresa */}
      <div className="mb-4">
        <CompanyAnalysis channel={channel} onChannelUpdate={setChannel} />
      </div>

      {/* Centro de contacto */}
      <div className="mb-4">
        <ContactHub channel={channel} />
      </div>

      {/* Brief pre-visita con IA */}
      <div className="mb-4">
        <PreVisitBrief channelId={channelId} channelName={channel.name} />
      </div>

      {/* Notas del canal */}
      <div className="mb-4">
        <ChannelNotes channelId={channelId} />
      </div>

      {/* Volumen Anual Negociado */}
      <div className="mb-4">
        <VolumeEditor channel={channel} onChannelUpdate={setChannel} />
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

// ============ FORMULARIO NUEVO CANAL (WIZARD 3 PASOS) ============
function NewChannelForm({ onBack, onSaved, types }) {
  const { user } = useAuthContext();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [classificationError, setClassificationError] = useState('');
  const [classifications, setClassifications] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    name: '', contact_name: '', phone: '', email: '',
    cif: '', website: '', google_rating: '', lead_source: '',
    address: '', city: '', province: '', notes: '',
  });

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'phone') { const v = validatePhone(value); setFieldErrors(prev => ({ ...prev, phone: v.valid ? '' : v.error })); }
    if (field === 'email') { const v = validateEmail(value); setFieldErrors(prev => ({ ...prev, email: v.valid ? '' : v.error })); }
    if (field === 'cif') { const v = validateCIF(value); setFieldErrors(prev => ({ ...prev, cif: v.valid ? '' : v.error })); }
  };

  function nextStep() {
    setError('');
    if (step === 1) {
      if (!form.name.trim()) { setError('El nombre del canal es obligatorio'); return; }
      const phoneV = validatePhone(form.phone);
      const emailV = validateEmail(form.email);
      const cifV = validateCIF(form.cif);
      const errors = {};
      if (!phoneV.valid) errors.phone = phoneV.error;
      if (!emailV.valid) errors.email = emailV.error;
      if (!cifV.valid) errors.cif = cifV.error;
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) { setError('Corrige los errores marcados'); return; }
    }
    if (step === 2) {
      if (classifications.length === 0) { setClassificationError('Selecciona al menos una clasificación'); return; }
    }
    setStep(s => s + 1);
  }

  function prevStep() { setError(''); setStep(s => s - 1); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const { data, error: insertError } = await supabase.from('channels').insert({
        name: form.name.trim(), contact_name: form.contact_name || null,
        phone: form.phone || null, email: form.email || null,
        cif: form.cif || null, website: form.website || null,
        google_rating: form.google_rating && form.google_rating !== 'no_tiene' ? parseFloat(form.google_rating) : null,
        lead_source: form.lead_source || null,
        address: form.address || null, city: form.city || null, province: form.province || null,
        notes: form.notes || null, assigned_to: user.id, status: 'prospect', pipeline_stage: 'lead',
      }).select().single();
      if (insertError) throw insertError;
      const classInserts = classifications.map(c => ({ channel_id: data.id, classification_id: c.classification_id, custom_text: c.custom_text || null }));
      await supabase.from('channel_classifications').insert(classInserts);
      onSaved(data.id);
    } catch (err) { setError(err.message || 'Error al guardar'); }
    finally { setSaving(false); }
  }

  const fieldClass = "w-full px-3 py-2.5 bg-surface-0 border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors";
  const STEPS = [{ num: 1, label: 'Datos básicos' }, { num: 2, label: 'Clasificación' }, { num: 3, label: 'Ubicación y notas' }];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-brand-400 font-semibold mb-4">← Cancelar</button>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-0 mb-5">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s.num ? 'bg-brand-500 text-white' : step > s.num ? 'bg-brand-500/15 text-brand-500' : 'bg-surface-2 text-text-muted border border-surface-3'
            }`}>{step > s.num ? <Check size={14} /> : s.num}</div>
            {i < STEPS.length - 1 && <div className={`w-8 sm:w-12 h-0.5 mx-1 rounded-full transition-colors ${step > s.num ? 'bg-brand-500/30' : 'bg-surface-3'}`} />}
          </div>
        ))}
      </div>
      <div className="text-center mb-5">
        <h1 className="text-lg font-extrabold tracking-tight">{STEPS[step - 1].label}</h1>
        <p className="text-xs text-text-muted mt-0.5">Paso {step} de 3</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">{error}</div>}

      {/* PASO 1: Datos básicos */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nombre del canal *</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nombre del canal o empresa" className={fieldClass} autoFocus />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Persona de contacto</label>
            <input type="text" value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} placeholder="Nombre del contacto principal" className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Teléfono</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+34 612 345 678" className={`${fieldClass} ${fieldErrors.phone ? 'border-red-400' : ''}`} />
              {fieldErrors.phone && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="contacto@empresa.com" className={`${fieldClass} ${fieldErrors.email ? 'border-red-400' : ''}`} />
              {fieldErrors.email && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.email}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">CIF</label>
              <input type="text" value={form.cif} onChange={(e) => update('cif', e.target.value.toUpperCase())} placeholder="B12345678" className={`${fieldClass} ${fieldErrors.cif ? 'border-red-400' : ''}`} />
              {fieldErrors.cif && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.cif}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Valoración Google</label>
              <select value={form.google_rating} onChange={(e) => update('google_rating', e.target.value)} className={fieldClass}>
                <option value="">Seleccionar...</option>
                <option value="no_tiene">No tiene</option>
                <option value="5">⭐ 5.0</option><option value="4.5">⭐ 4.5</option><option value="4">⭐ 4.0</option>
                <option value="3.5">⭐ 3.5</option><option value="3">⭐ 3.0</option><option value="2.5">⭐ 2.5</option>
                <option value="2">⭐ 2.0</option><option value="1.5">⭐ 1.5</option><option value="1">⭐ 1.0</option>
                <option value="0.5">⭐ 0.5</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Página web</label>
            <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://www.ejemplo.com" className={fieldClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Origen del lead</label>
            <select value={form.lead_source} onChange={(e) => update('lead_source', e.target.value)} className={fieldClass}>
              <option value="">Seleccionar...</option>
              <option value="inbound_web">Inbound - Web Naturgy</option>
              <option value="outbound_navigator">Outbound - Sales Navigator</option>
              <option value="outbound_referidos">Outbound - Referidos otro canal</option>
              <option value="outbound_otros">Outbound - Otros</option>
            </select>
          </div>
          <button onClick={nextStep} className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors mt-2">Siguiente →</button>
        </div>
      )}

      {/* PASO 2: Clasificación */}
      {step === 2 && (
        <div className="space-y-3">
          <ClassificationSelector value={classifications} onChange={(v) => { setClassifications(v); setClassificationError(''); }} error={classificationError} />
          <div className="flex gap-2 mt-4">
            <button onClick={prevStep} className="flex-1 py-3 border border-surface-3 text-text-secondary font-semibold rounded-xl text-sm hover:bg-surface-2 transition-colors">← Atrás</button>
            <button onClick={nextStep} className="flex-[2] py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors">Siguiente →</button>
          </div>
        </div>
      )}

      {/* PASO 3: Ubicación y notas */}
      {step === 3 && (
        <div className="space-y-3">
          <AddressFields form={form} update={update} fieldClass={fieldClass} />
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Notas sobre el canal..." rows={3} className={`${fieldClass} resize-none`} />
          </div>
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 mt-2">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Resumen</div>
            <div className="space-y-1 text-xs text-text-secondary">
              <p><span className="font-semibold text-text-primary">{form.name}</span></p>
              {form.contact_name && <p>👤 {form.contact_name} {form.phone ? `· ${form.phone}` : ''}</p>}
              {form.cif && <p>CIF: {form.cif}</p>}
              {classifications.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {classifications.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-brand-500/10 text-brand-600 rounded text-[10px] font-semibold">{c._label}{c.custom_text ? `: ${c.custom_text}` : ''}</span>
                  ))}
                </div>
              )}
              {form.city && <p>📍 {form.city}{form.province ? ` (${form.province})` : ''}{form.address ? ` · ${form.address}` : ''}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={prevStep} className="flex-1 py-3 border border-surface-3 text-text-secondary font-semibold rounded-xl text-sm hover:bg-surface-2 transition-colors">← Atrás</button>
            <button onClick={handleSave} disabled={saving} className="flex-[2] py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Check size={16} /> Guardar canal</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PÁGINA PRINCIPAL DE CANALES ============
export default function ChannelsPage() {
  const { user } = useAuthContext();
  const { types, typeMap } = useChannelTypes();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Leer parámetro ?detail=ID de la URL (deep link desde Pipeline)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detailId = params.get('detail');
    if (detailId) {
      setSelectedId(detailId);
      setView('detail');
      // Limpiar la URL sin recargar
      window.history.replaceState({}, '', '/channels');
    }
  }, []);

  useEffect(() => {
    if (user) loadChannels();
  }, [user]);

  async function loadChannels() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select(`*, visits (checkin_at)`)
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
      console.error('Error cargando canales:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(id) {
    if (id === 'new') { setView('new'); } else { setSelectedId(id); setView('detail'); }
  }
  function handleBack() { setView('list'); setSelectedId(null); }
  function handleSaved(newId) { loadChannels(); setSelectedId(newId); setView('detail'); }

  if (view === 'detail' && selectedId) return <ChannelDetail channelId={selectedId} onBack={handleBack} types={types} typeMap={typeMap} />;
  if (view === 'new') return <NewChannelForm onBack={handleBack} onSaved={handleSaved} types={types} />;
  return <ChannelList channels={channels} loading={loading} onSelect={handleSelect} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} typeMap={typeMap} />;
}
