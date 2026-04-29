import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook de autenticación.
 * Gestiona sesión, carga el perfil del usuario, y expone funciones de login/logout.
 *
 * Uso:
 *   const { user, profile, loading, error, signIn, signOut } = useAuth();
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar perfil del usuario desde la tabla profiles
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(data);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setProfile(null);
    }
  }, []);

  // Inicializar: comprobar si hay sesión existente
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        }
      } catch (err) {
        console.error('Error inicializando auth:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Escuchar cambios de sesión (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setError(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Login con email y password
  const signIn = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Traducir errores comunes al español
        const messages = {
          'Invalid login credentials': 'Email o contraseña incorrectos',
          'Email not confirmed': 'Debes confirmar tu email antes de acceder',
          'Too many requests': 'Demasiados intentos. Espera unos minutos.',
        };
        throw new Error(messages[signInError.message] || signInError.message);
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Error en logout:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    // Helpers
    isAuthenticated: !!user,
    isKam: profile?.role === 'kam',
    isManager: ['coordinator', 'manager', 'director'].includes(profile?.role),
    isAdmin: profile?.role === 'admin',
  };
}
