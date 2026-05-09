import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook que espera a que la sesión de Supabase esté lista.
 * Resuelve en máximo 3 segundos para evitar spinners infinitos.
 * refreshKey sube cada vez que se llama refresh(), forzando un reload.
 */
export function useSessionReady() {
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Timeout de seguridad: si en 3s no hay respuesta, marcamos ready igualmente
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('useSessionReady: timeout alcanzado, marcando ready=true');
        setReady(true);
      }
    }, 3000);

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        clearTimeout(timeout);
        setReady(true);
      }
    }).catch(() => {
      if (!cancelled) {
        clearTimeout(timeout);
        setReady(true); // Resolver siempre, incluso con error
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  return { ready, refreshKey, refresh };
}
