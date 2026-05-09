import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook de autenticación robusto.
 * - Cachea el profile en localStorage para evitar loading al navegar
 * - Timeout de seguridad para nunca quedarse en loading infinito
 * - Maneja reconexiones y cambios de pestaña
 */
export function useAuth() {
  // Intentar cargar profile cacheado para render instantáneo
  const cachedProfile = (() => {
    try {
      const stored = localStorage.getItem('kamapp_profile');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initDone = useRef(false);

  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(data);
      // Cachear en localStorage
      localStorage.setItem('kamapp_profile', JSON.stringify(data));
    } catch (err) {
      console.error('Error cargando perfil:', err);
      // Si falla pero tenemos cache, usar cache
      if (!cachedProfile) setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Timeout de seguridad: máximo 3 segundos en loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth timeout — forzando fin de loading');
        setLoading(false);
      }
    }, 3000);

    const init = async () => {
      if (initDone.current) return;
      initDone.current = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
          localStorage.removeItem('kamapp_profile');
        }
      } catch (err) {
        console.error('Error inicializando auth:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
          localStorage.removeItem('kamapp_profile');
        }

        // Asegurar que loading se apaga
        setLoading(false);

        if (event === 'SIGNED_OUT') {
          setError(null);
          localStorage.removeItem('kamapp_profile');
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
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

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      localStorage.removeItem('kamapp_profile');
    } catch (err) {
      console.error('Error en logout:', err);
    }
    // Siempre terminar loading
    setLoading(false);
  }, []);

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user || !!cachedProfile,
    isKam: (profile || cachedProfile)?.role === 'kam',
    isManager: ['coordinator', 'manager', 'director'].includes((profile || cachedProfile)?.role),
    isAdmin: (profile || cachedProfile)?.role === 'admin',
  };
}
