import { Navigate } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import { useEffect, useState } from 'react';

/**
 * Protección de rutas robusta.
 * - Usa profile cacheado para render instantáneo (sin spinner al navegar)
 * - Solo muestra spinner la primera vez que cargas la app
 * - Timeout de seguridad de 3s para nunca quedarse bloqueado
 */
export function ProtectedRoute({ children, requireManager = false, requireDirector = false }) {
  const { isAuthenticated, isManager, loading, profile } = useAuthContext();
  const [timedOut, setTimedOut] = useState(false);
  // BUGFIX: la key correcta es 'kamapp_profile_cache', no 'kamapp_profile'
  const hasCachedProfile = !!localStorage.getItem('kamapp_profile_cache');

  // Timeout de seguridad: si loading no resuelve en 3s, forzar salida del spinner
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  // Mostrar spinner solo si: está cargando, no hay cache, y no ha pasado el timeout
  if (loading && !hasCachedProfile && !timedOut) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Cargando...</span>
        </div>
      </div>
    );
  }

  // Si no hay sesión ni cache tras resolver, ir a login
  if (!isAuthenticated && !hasCachedProfile) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/home" replace />;
  }

  // requireDirector: comprueba role='director' O can_manage_users=true.
  if (requireDirector && profile?.role !== 'director' && !profile?.can_manage_users) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
