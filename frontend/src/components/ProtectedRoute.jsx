import { Navigate } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';

/**
 * Wrapper que protege rutas autenticadas.
 * Redirige a /login si no hay sesión.
 * Muestra spinner mientras carga.
 *
 * Uso en Router:
 *   <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
 *
 * Para rutas solo de managers:
 *   <Route path="/dashboard" element={<ProtectedRoute requireManager><DashboardPage /></ProtectedRoute>} />
 */
export function ProtectedRoute({ children, requireManager = false }) {
  const { isAuthenticated, isManager, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
