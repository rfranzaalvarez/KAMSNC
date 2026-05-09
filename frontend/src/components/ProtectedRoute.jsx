import { Navigate } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';

/**
 * Protección de rutas robusta.
 * - Usa profile cacheado para render instantáneo (sin spinner al navegar)
 * - Solo muestra spinner la primera vez que cargas la app
 * - Timeout implícito via useAuth (máximo 3 segundos)
 */
export function ProtectedRoute({ children, requireManager = false }) {
  const { isAuthenticated, isManager, loading, profile } = useAuthContext();

  // Si hay profile cacheado, no mostrar spinner (la sesión se verificará en background)
  const hasCachedProfile = !!localStorage.getItem('kamapp_profile');

  // Solo mostrar loading si NO hay cache (primera carga o sesión expirada)
  if (loading && !hasCachedProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Cargando...</span>
        </div>
      </div>
    );
  }

  // Si no hay sesión ni cache, ir a login
  if (!isAuthenticated && !hasCachedProfile) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
