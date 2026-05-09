import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook de autenticación a prueba de balas.
 * 
 * Problema resuelto: Supabase Auth usa un sistema de "locks" para coordinar
 * el refresco del token entre pestañas. Cuando el navegador suspende una pestaña
 * (al cambiar a otra app, minimizar, etc.), el lock puede quedar "orphaned" y
 * getSession() se bloquea indefinidamente. Esto causa el spinner infinito.
 * 
 * Solución: 
 * 1. Race entre getSession() y un timeout de 2 segundos
 * 2. Si getSession falla, intentar leer el token directamente de localStorage
 * 3. Si hay token válido en localStorage, usarlo sin esperar al lock
 * 4. Siempre resolver loading, nunca quedarse bloqueado
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initialized = useRef(false);

  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (err) throw err;
      setProfile(data);
      // Cache para uso inmediato en renders futuros
      try { localStorage.setItem('kamapp_profile_cache', JSON.stringify(data)); } catch {}
    } catch (err) {
      console.error('Error cargando perfil:', err);
      // Intentar usar cache
      try {
        const cached = localStorage.getItem('kamapp_profile_cache');
        if (cached) setProfile(JSON.parse(cached));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        // Race: getSession vs timeout de 2s
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 2000)
          ),
        ]);

        let session = sessionResult?.data?.session;

        // Si timeout, intentar leer token de localStorage directamente
        if (sessionResult?.timedOut && !session) {
          console.warn('getSession timeout - leyendo token de localStorage');
          try {
            // Buscar cualquier key de Supabase auth en localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.startsWith('kamapp-auth'))) {
                const raw = localStorage.getItem(key);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (parsed?.access_token && parsed?.user) {
                    session = { access_token: parsed.access_token, user: parsed.user };
                    // Intentar restaurar la sesión
                    await supabase.auth.setSession({
                      access_token: parsed.access_token,
                      refresh_token: parsed.refresh_token,
                    }).catch(() => {});
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Error leyendo token de localStorage:', e);
          }
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        }
      } catch (err) {
        console.error('Error init auth:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
          try { localStorage.removeItem('kamapp_profile_cache'); } catch {}
        }

        setLoading(false);

        if (event === 'SIGNED_OUT') {
          setError(null);
          try { localStorage.removeItem('kamapp_profile_cache'); } catch {}
        }
      }
    );

    return () => subscription.unsubscribe();
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
    } catch {}
    setUser(null);
    setProfile(null);
    setLoading(false);
    try {
      localStorage.removeItem('kamapp_profile_cache');
    } catch {}
  }, []);

  // Usar profile cacheado si el real no ha cargado aún
  const effectiveProfile = profile || (() => {
    try {
      const c = localStorage.getItem('kamapp_profile_cache');
      return c ? JSON.parse(c) : null;
    } catch { return null; }
  })();

  return {
    user,
    profile: effectiveProfile,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user || !!effectiveProfile,
    isKam: effectiveProfile?.role === 'kam',
    isManager: ['coordinator', 'manager', 'director'].includes(effectiveProfile?.role),
    isAdmin: effectiveProfile?.role === 'admin',
  };
}
