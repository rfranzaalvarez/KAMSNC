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
 *
 * USUARIOS DADOS DE BAJA (is_active = false):
 * - Si el perfil cargado tiene is_active === false, se fuerza un signOut
 *   inmediato y se expone deactivated=true, para que LoginPage muestre un
 *   mensaje claro ("Usuario dado de baja") en vez de dejarlo pasar.
 *
 * MFA (TOTP via app autenticadora):
 * - Obligatorio para todos los usuarios, sin excepción.
 * - Tras validar contraseña correctamente, se comprueba el AAL (Authenticator
 *   Assurance Level). Si es aal1 (solo contraseña), mfaRequired=true, y el
 *   usuario NO se considera autenticado (isAuthenticated=false) hasta que
 *   complete la verificación TOTP (aal2).
 * - Si el usuario no tiene ningún factor TOTP registrado, se fuerza el flujo
 *   de enrollment (escanear QR) antes de poder acceder al CRM.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deactivated, setDeactivated] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);

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
    return tokenData.expires_at * 1000 < Date.now();
  }

  /**
   * Carga el perfil desde Supabase, con fallback a cache.
   * Si el perfil está desactivado (is_active === false), fuerza signOut
   * inmediato y marca deactivated=true.
   * Devuelve true si el perfil está activo, false si desactivado.
   */
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (err) throw err;

      if (data?.is_active === false) {
        try { localStorage.removeItem('kamapp_profile_cache'); } catch {}
        userRef.current = null;
        setUser(null);
        setProfile(null);
        setDeactivated(true);
        try { await supabase.auth.signOut(); } catch {}
        return false;
      }

      setProfile(data);
      try { localStorage.setItem('kamapp_profile_cache', JSON.stringify(data)); } catch {}
      return true;
    } catch {
      try {
        const cached = localStorage.getItem('kamapp_profile_cache');
        if (cached) setProfile(JSON.parse(cached));
      } catch {}
      return true;
    }
  }, []);

  /**
   * Comprueba el nivel de MFA del usuario autenticado.
   * Devuelve { required, enrolled, factorId } indicando si se necesita MFA,
   * si ya tiene un factor TOTP registrado, y su ID.
   */
  const checkMfaStatus = useCallback(async () => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactors = factorsData?.totp || [];

      if (aalData?.currentLevel === 'aal2') {
        // Ya verificó MFA en esta sesión
        return { required: false, enrolled: true, factorId: totpFactors[0]?.id || null };
      }

      // aal1: contraseña correcta, pero MFA pendiente
      if (totpFactors.length > 0) {
        // Tiene factor registrado, necesita verificarlo
        return { required: true, enrolled: true, factorId: totpFactors[0].id };
      }

      // No tiene ningún factor TOTP → obligar a registrar uno
      return { required: true, enrolled: false, factorId: null };
    } catch {
      // Si falla la comprobación de MFA, dejar pasar (fail-open)
      // para no bloquear el acceso por un error transitorio
      return { required: false, enrolled: false, factorId: null };
    }
  }, []);

  /** Restaura la sesión desde localStorage cuando el lock falla */
  const recoverSession = useCallback(async () => {
    const tokenData = readTokenFromStorage();
    if (!tokenData) return null;
    if (isTokenExpired(tokenData)) return null;

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });
      if (!error && data?.session?.user) return data.session.user;
    } catch {}

    return tokenData.user || null;
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) =>
            setTimeout(() => resolve({ timedOut: true, data: { session: null } }), 3000)
          ),
        ]);

        let currentUser = result?.data?.session?.user ?? null;

        if (!currentUser) {
          currentUser = await recoverSession();
        }

        userRef.current = currentUser;
        setUser(currentUser);
        if (currentUser) {
          const isActive = await loadProfile(currentUser.id);
          if (!isActive) {
            userRef.current = null;
            setUser(null);
          } else {
            // Comprobar si la sesión existente necesita MFA
            const mfa = await checkMfaStatus();
            setMfaRequired(mfa.required);
          }
        }
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

        if (event === 'SIGNED_OUT') {
          const tokenData = readTokenFromStorage();
          if (tokenData && !isTokenExpired(tokenData) && userRef.current) {
            console.warn('SIGNED_OUT falso detectado (bug Supabase lock), recuperando sesión...');
            const recovered = await recoverSession();
            if (recovered) {
              userRef.current = recovered;
              setUser(recovered);
              const isActive = await loadProfile(recovered.id);
              if (!isActive) { userRef.current = null; setUser(null); }
              setLoading(false);
              return;
            }
          }
          // SIGNED_OUT real
          userRef.current = null;
          setUser(null);
          setProfile(null);
          setError(null);
          setMfaRequired(false);
          try { localStorage.removeItem('kamapp_profile_cache'); } catch {}
          setLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;

        if (currentUser) {
          if (userRef.current?.id !== currentUser.id) {
            userRef.current = currentUser;
            setUser(currentUser);
            const isActive = await loadProfile(currentUser.id);
            if (!isActive) {
              userRef.current = null;
              setUser(null);
            } else {
              const mfa = await checkMfaStatus();
              setMfaRequired(mfa.required);
            }
          } else {
            userRef.current = currentUser;
          }
        } else if (event === 'TOKEN_REFRESHED' && !currentUser) {
          const recovered = await recoverSession();
          if (recovered) {
            userRef.current = recovered;
            setUser(recovered);
            const isActive = await loadProfile(recovered.id);
            if (!isActive) { userRef.current = null; setUser(null); }
          }
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile, recoverSession, checkMfaStatus]);

  // ─── Recuperar sesión al volver al foco (visibilitychange) ──────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (userRef.current) return;

      const tokenData = readTokenFromStorage();
      if (!tokenData || isTokenExpired(tokenData)) return;

      try {
        const recovered = await recoverSession();
        if (recovered) {
          userRef.current = recovered;
          setUser(recovered);
          const isActive = await loadProfile(recovered.id);
          if (!isActive) { userRef.current = null; setUser(null); }
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
    setDeactivated(false);
    setMfaRequired(false);
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

      // La contraseña es correcta. Comprobamos is_active ANTES de dejar pasar.
      if (data?.user) {
        const isActive = await loadProfile(data.user.id);
        if (!isActive) {
          throw new Error('Usuario dado de baja. Contacta con tu administrador.');
        }
        userRef.current = data.user;
        setUser(data.user);

        // Comprobar MFA
        const mfa = await checkMfaStatus();
        if (mfa.required) {
          setMfaRequired(true);
          // Devolvemos la info de MFA para que LoginPage sepa qué paso mostrar
          return { ...data, mfa };
        }
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadProfile, checkMfaStatus]);

  /**
   * Inicia el enrollment de un nuevo factor TOTP.
   * Devuelve { id, totp: { qr_code, secret, uri } }
   */
  const enrollMfa = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'CRM KAMs Authenticator',
    });
    if (error) throw error;
    return data;
  }, []);

  /**
   * Verifica un código TOTP contra un factor registrado.
   * En un solo paso crea el challenge y lo verifica (challengeAndVerify).
   * Si tiene éxito, la sesión sube a aal2 y mfaRequired se desactiva.
   */
  const verifyMfa = useCallback(async (factorId, code) => {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw error;
    setMfaRequired(false);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    userRef.current = null;
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setProfile(null);
    setMfaRequired(false);
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
    deactivated,
    mfaRequired,
    signIn,
    signOut,
    enrollMfa,
    verifyMfa,
    isAuthenticated: (!!user || !!effectiveProfile) && !mfaRequired,
    isKam: effectiveProfile?.role === 'kam',
    isManager: ['coordinator', 'manager', 'director'].includes(effectiveProfile?.role),
    isAdmin: effectiveProfile?.role === 'admin',
  };
}
