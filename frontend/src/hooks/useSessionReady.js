import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook que garantiza que la sesión de Supabase está activa antes de hacer queries.
 * Resuelve el problema de queries vacías al volver a la pestaña del navegador.
 * 
 * Uso:
 *   const { ready, refresh } = useSessionReady();
 *   
 *   useEffect(() => {
 *     if (ready) loadData();
 *   }, [ready]);
 */
export function useSessionReady() {
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function ensureSession() {
      try {
        // Intentar obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          if (mounted) setReady(true);
          return;
        }

        // Si no hay sesión, intentar refrescar
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (mounted) setReady(!!refreshed);
      } catch {
        // Fallback: si hay token en storage, considerarlo válido
        const token = localStorage.getItem('sb-gjnhyesrqhizdekljzhm-auth-token');
        if (mounted) setReady(!!token);
      }
    }

    ensureSession();

    // Re-verificar cuando la pestaña vuelve a estar visible
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        setReady(false);
        ensureSession().then(() => {
          setRefreshKey(k => k + 1);
        });
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        if (mounted) {
          setReady(true);
          setRefreshKey(k => k + 1);
        }
      }
      if (event === 'SIGNED_OUT') {
        if (mounted) setReady(false);
      }
    });

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { ready, refreshKey, refresh };
}
