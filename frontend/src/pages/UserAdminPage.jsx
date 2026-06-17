import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import {
  UserPlus, Users, Shield, Trash2, X, Check, Loader2,
  AlertCircle, Edit3, Mail, MapPin, ChevronDown
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'kam', label: 'KAM' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r.label]));

// ============ FORMULARIO DE ALTA ============
function InviteUserForm({ onInvited, allUsers }) {
  const [form, setForm] = useState({
    email: '', full_name: '', role: 'kam', zone: '', reports_to: '', phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Posibles managers/directores a los que reportar (cualquiera con rol
  // coordinator/manager/director, no tiene sentido reportar a un kam)
  const possibleManagers = allUsers.filter(u => ['coordinator', 'manager', 'director'].includes(u.role));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.email.trim() || !form.full_name.trim()) {
      setError('Email y nombre completo son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'invite_user',
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          zone: form.zone.trim() || null,
          reports_to: form.reports_to || null,
          phone: form.phone.trim() || null,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setSuccess(`Invitación enviada a ${form.email}. Recibirá un email para establecer su contraseña.`);
      setForm({ email: '', full_name: '', role: 'kam', zone: '', reports_to: '', phone: '' });
      onInvited();
    } catch (err) {
      setError(err.message || 'Error al invitar al usuario');
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "w-full px-3 py-2.5 bg-white border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={18} className="text-brand-500" />
        <h2 className="text-base font-bold text-text-primary">Invitar nuevo usuario</h2>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-3 text-sm text-red-600">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3 text-sm text-green-700">
          <Check size={15} className="flex-shrink-0 mt-0.5" />{success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nombre completo *</label>
            <input type="text" value={form.full_name} onChange={(e) => update('full_name', e.target.value)}
              placeholder="Nombre y apellidos" className={fieldClass} required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              placeholder="usuario@naturgy.com" className={fieldClass} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Rol *</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)} className={fieldClass}>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Zona</label>
            <input type="text" value={form.zone} onChange={(e) => update('zone', e.target.value)}
              placeholder="Ej. Norte, Levante..." className={fieldClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Reporta a</label>
            <select value={form.reports_to} onChange={(e) => update('reports_to', e.target.value)} className={fieldClass}>
              <option value="">Sin asignar</option>
              {possibleManagers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} ({ROLE_LABELS[m.role]})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Teléfono</label>
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
              placeholder="+34 600 000 000" className={fieldClass} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando invitación...</> : <><UserPlus size={16} /> Invitar usuario</>}
        </button>
      </form>
    </div>
  );
}

// ============ FILA DE USUARIO (con edición inline) ============
function UserRow({ user: u, allUsers, onUpdated, onDeleted, currentUserId }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ role: u.role, zone: u.zone || '', reports_to: u.reports_to || '', phone: u.phone || '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rowError, setRowError] = useState('');

  const possibleManagers = allUsers.filter(other => other.id !== u.id && ['coordinator', 'manager', 'director'].includes(other.role));
  const managerName = allUsers.find(other => other.id === u.reports_to)?.full_name;

  function startEdit() {
    setEditForm({ role: u.role, zone: u.zone || '', reports_to: u.reports_to || '', phone: u.phone || '' });
    setEditing(true);
    setRowError('');
  }

  async function saveEdit() {
    setSaving(true);
    setRowError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editForm.role,
          zone: editForm.zone || null,
          reports_to: editForm.reports_to || null,
          phone: editForm.phone || null,
        })
        .eq('id', u.id);
      if (error) throw error;
      onUpdated();
      setEditing(false);
    } catch (err) {
      setRowError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setRowError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete_user', user_id: u.id },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      onDeleted();
    } catch (err) {
      setRowError(err.message || 'Error al borrar usuario');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const fieldClass = "px-2.5 py-1.5 bg-white border border-surface-3 rounded-lg text-xs focus:outline-none focus:border-brand-500";

  if (editing) {
    return (
      <div className="bg-surface-1 border border-brand-300 rounded-xl p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-text-primary">{u.full_name}</span>
          <button onClick={() => setEditing(false)} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        {rowError && <div className="text-xs text-red-600 mb-2">{rowError}</div>}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={editForm.role} onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))} className={fieldClass}>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input type="text" value={editForm.zone} onChange={(e) => setEditForm(prev => ({ ...prev, zone: e.target.value }))}
            placeholder="Zona" className={fieldClass} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select value={editForm.reports_to} onChange={(e) => setEditForm(prev => ({ ...prev, reports_to: e.target.value }))} className={fieldClass}>
            <option value="">Sin asignar</option>
            {possibleManagers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <input type="tel" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Teléfono" className={fieldClass} />
        </div>
        <button onClick={saveEdit} disabled={saving}
          className="w-full py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar cambios
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 mb-2">
      {rowError && <div className="text-xs text-red-600 mb-2">{rowError}</div>}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">{u.full_name}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 flex-shrink-0">
              {ROLE_LABELS[u.role] || u.role}
            </span>
            {u.id === currentUserId && (
              <span className="text-[10px] text-text-muted flex-shrink-0">(tú)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-text-secondary">
            <Mail size={11} className="flex-shrink-0" /><span className="truncate">{u.email}</span>
          </div>
          {u.zone && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
              <MapPin size={11} className="flex-shrink-0" /><span>{u.zone}</span>
            </div>
          )}
          {managerName && (
            <div className="text-[11px] text-text-muted mt-0.5">Reporta a: {managerName}</div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors">
            <Edit3 size={14} />
          </button>
          {u.id !== currentUserId && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={deleting}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : 'Confirmar'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-[10px] text-text-muted">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ============ PÁGINA PRINCIPAL ============
export default function UserAdminPage() {
  const { profile, user } = useAuthContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isDirector = profile?.role === 'director';

  useEffect(() => {
    if (isDirector) loadUsers();
  }, [isDirector]);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isDirector) {
    return (
      <div className="text-center py-16">
        <Shield size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-sm text-text-secondary">No tienes permiso para acceder a esta página.</p>
        <p className="text-xs text-text-muted mt-1">Solo los directores pueden gestionar usuarios.</p>
      </div>
    );
  }

  const filtered = users.filter(u =>
    search === '' ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} className="text-text-primary" />
        <h1 className="text-xl font-extrabold tracking-tight">Administración de usuarios</h1>
      </div>

      <InviteUserForm onInvited={loadUsers} allUsers={users} />

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-text-secondary">Usuarios existentes ({users.length})</h2>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        className="w-full px-3 py-2.5 bg-surface-2 border border-surface-3 rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 mb-3"
      />

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-brand-400" />
        </div>
      )}

      {!loading && filtered.map(u => (
        <UserRow key={u.id} user={u} allUsers={users} onUpdated={loadUsers} onDeleted={loadUsers} currentUserId={user?.id} />
      ))}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-text-secondary">No se encontraron usuarios</p>
        </div>
      )}
    </div>
  );
}
