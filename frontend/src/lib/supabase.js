import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.\n' +
    'Crea un archivo .env.local en /frontend con:\n' +
    'VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=tu-anon-key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Desactivar el sistema de locks que causa "orphaned lock" 
    // y bloquea el refresco del token al volver a la pestaña
    lock: null,
    storageKey: 'kamapp-auth',
    // Usar localStorage directamente sin locks
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignorar errores de storage
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignorar errores de storage
        }
      },
    },
  },
});
