import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // BUGFIX: desactivar el sistema de locks entre pestañas.
    // El lock de Supabase usa BroadcastChannel/localStorage para coordinar
    // el refresco del token entre pestañas. Cuando el navegador suspende
    // una pestaña, el lock queda "orphaned" y getSession() se bloquea
    // indefinidamente al volver. Con flowType: 'implicit' y lock desactivado
    // cada pestaña gestiona su propio token sin coordinación.
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
});
