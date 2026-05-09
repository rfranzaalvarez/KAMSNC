import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook de autenticación resistente al bug de Supabase Auth lock.
 *
 * PROBLEMA RAÍZ:
 * Supabase Auth usa un "storage lock" para coordinar el refresco del token
 * entre pestañas. Cuando el navegador suspende una pestaña (minimizar,
 * cambiar de app, bloquear pantalla), el lock queda "orphaned". Al volver:
 *
 * 1. getSession() se bloquea indefinidamente (el lock nunca se libera)
 * 2. onAuthStateChange dispara TOKEN_REFRESHED o SIGNED_OUT con session=null
 * 3. El listener borra user y profile → todas las páginas ven user=null
 * 4. Los useEffect de las páginas no recargan (user no cambia de null a null)
 * 5. Resultado: spinner infinito en todas las páginas
 *
 * SOLUCIÓN:
 * - Nunca confiar ciegamente en session=null del listener: verificar si hay
 *   token válido en localStorage antes de borrar el usuario
 * - Usar visibilitychange para recuperar la sesión al volver al foco
 * - Mantener user/profile en ref además de state para acceso síncrono
 * - Timeout de seguridad en getSession para no bloquearse nunca
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs para acceso síncrono sin depender del closure del listener
  const userRef = useRef(null);
  const initialized = useRef(false);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Lee el token de Supabase directamente de localStorage sin pasar por el lock */
  function readTokenFromStorage() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token && parsed?.user) return parsed;
          }
        }
      }
    } catch {}
    return null;
  }

  /** Comprueba si el token en localStorage está expirado */
  function isTokenExpired(tokenData) {
    if (!tokenData?.expires_at) return false;
    // expires_at es Unix timestamp en segundos
    return tokenData.expires_at * 1000 < Date.now();
  }

  /** Carga el perfil desde Supabase, con fallback a cache */
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (err) throw err;
      setProfile(data);
      try { localStorage.setItem('kamapp_profile_cache', JSON.stringify(data)); } catch {}
    } catch {
      try {
        const cached = localStorage.getItem('kamapp_profile_cache');
        if (cached) setProfile(JSON.parse(cached));
      } catch {}
    }
  }, []);

  /** Restaura la sesión desde localStorage cuando el lock falla */
  const recoverSession = useCallback(async () => {
    const tokenData = readTokenFromStorage();
    if (!tokenData) return null;
    if (isTokenExpired(tokenData)) return null;

    try {
      // Intentar restaurar la sesión con Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });
      if (!error && data?.session?.user) return data.session.user;
    } catch {}

    // Si setSession falla, usar el user del token directamente
    return tokenData.user || null;
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        // Race entre getSession y timeout de 3s
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ timedOut: true, data: { session: null } }), 3000)
          ),
        ]);

        let currentUser = result?.data?.session?.user ?? null;

        // Si getSession tardó demasiado o no devolvió usuario, recuperar de localStorage
        if (!currentUser) {
          currentUser = await recoverSession();
        }

        userRef.current = currentUser;
        setUser(currentUser);
        if (currentUser) await loadProfile(currentUser.id);
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // ─── Listener de cambios de auth ─────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        // SIGNED_OUT real solo si el usuario lo pidió explícitamente
        // (no si es consecuencia del bug del lock al volver del background)
        if (event === 'SIGNED_OUT') {
          // Verificar si hay token válido en localStorage
          // Si lo hay, es un SIGNED_OUT falso causado por el bug del lock
          const tokenData = readTokenFromStorage();
          if (tokenData && !isTokenExpired(tokenData) && userRef.current) {
            // SIGNED_OUT falso — ignorar y recuperar sesión
            console.warn('SIGNED_OUT falso detectado (bug Supabase lock), recuperando sesión...');
            const recovered = await recoverSession();
            if (recovered) {
              userRef.current = recovered;
              setUser(recovered);
              await loadProfile(recovered.id);
              setLoading(false);
              return;
            }
          }
          // SIGNED_OUT real
          userRef.current = null;
          setUser(null);
          setProfile(null);
          setError(null);
          try { localStorage.removeItem('kamapp_profile_cache'); } catch {}
          setLoading(false);
          return;
        }

        // Para cualquier otro evento (SIGNED_IN, TOKEN_REFRESHED, etc.)
        const currentUser = session?.user ?? null;

        if (currentUser) {
          userRef.current = currentUser;
          setUser(currentUser);
          await loadProfile(currentUser.id);
        } else if (event === 'TOKEN_REFRESHED' && !currentUser) {
          // Token refresh falló por el bug del lock — intentar recuperar
          const recovered = await recoverSession();
          if (recovered) {
            userRef.current = recovered;
            setUser(recovered);
            await loadProfile(recovered.id);
          }
          // Si no se pudo recuperar, mantener el usuario actual (no borrar)
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile, recoverSession]);

  // ─── Recuperar sesión al volver al foco (visibilitychange) ──────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (userRef.current) return; // Ya hay usuario, no hacer nada

      // La pestaña vuelve al foco sin usuario — intentar recuperar
      const tokenData = readTokenFromStorage();
      if (!tokenData || isTokenExpired(tokenData)) return;

      try {
        const recovered = await recoverSession();
        if (recovered) {
          userRef.current = recovered;
          setUser(recovered);
          await loadProfile(recovered.id);
          setLoading(false);
        }
      } catch {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [recoverSession, loadProfile]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const signIn = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
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
    // Marcar que es un logout real antes de llamar a Supabase
    // para que el listener no lo trate como un SIGNED_OUT falso
    userRef.current = null;
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setProfile(null);
    setLoading(false);
    try { localStorage.removeItem('kamapp_profile_cache'); } catch {}
  }, []);

  // ─── Return ──────────────────────────────────────────────────────────────────

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
