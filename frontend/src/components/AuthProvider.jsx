import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext(null);

/**
 * Provider de autenticación. Envuelve toda la app.
 *
 * Uso en App.jsx:
 *   <AuthProvider>
 *     <Router>...</Router>
 *   </AuthProvider>
 *
 * Uso en componentes:
 *   const { user, profile, signOut, isManager } = useAuthContext();
 */
export function AuthProvider({ children }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de <AuthProvider>');
  }
  return context;
}
