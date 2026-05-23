import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

let cachedTypes = null;

/**
 * Hook que carga los tipos de canal desde la tabla channel_types.
 * Los cachea en memoria para no repetir queries.
 * 
 * Devuelve:
 * - types: array de { key, label }
 * - typeMap: objeto { key: label } para lookups rápidos
 * - loading: boolean
 * - refresh: función para forzar recarga
 */
export function useChannelTypes() {
  const [types, setTypes] = useState(cachedTypes || []);
  const [loading, setLoading] = useState(!cachedTypes);

  useEffect(() => {
    if (cachedTypes) return;
    loadTypes();
  }, []);

  async function loadTypes() {
    try {
      const { data, error } = await supabase
        .from('channel_types')
        .select('key, label')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      cachedTypes = data || [];
      setTypes(cachedTypes);
    } catch (err) {
      console.error('Error cargando tipos de canal:', err);
      // Fallback si la tabla no existe aún
      cachedTypes = [
        { key: 'energia_mayorista', label: 'Energía - Mayorista' },
        { key: 'mayorista_gpv', label: 'Mayorista - GPV' },
        { key: 'mayorista_pdv', label: 'Mayorista - PdV' },
        { key: 'integral', label: 'Integral' },
        { key: 'tienda_naturgy', label: 'Tienda Naturgy' },
        { key: 'venta_remoto', label: 'Venta Remoto' },
        { key: 'caes', label: 'CAEs' },
        { key: 'solar_venta', label: 'Solar - Venta' },
        { key: 'solar_instalador', label: 'Solar - Instalador' },
        { key: 'operaciones', label: 'Operaciones' },
      ];
      setTypes(cachedTypes);
    } finally {
      setLoading(false);
    }
  }

  function refresh() {
    cachedTypes = null;
    setLoading(true);
    loadTypes();
  }

  // Mapa key -> label para lookups
  const typeMap = {};
  types.forEach(t => { typeMap[t.key] = t.label; });

  return { types, typeMap, loading, refresh };
}
