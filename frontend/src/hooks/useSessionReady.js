// Este hook ya no llama a getSession() para evitar el bug del lock de Supabase.
// ChannelsPage ya no lo usa, pero se mantiene por si hay imports residuales.
export function useSessionReady() {
  return { ready: true, refreshKey: 0, refresh: () => {} };
}
