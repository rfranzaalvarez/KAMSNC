import { get, set, del, keys } from 'idb-keyval';
import { supabase } from './supabase';

/**
 * Cola offline para operaciones que no pueden ejecutarse sin conexión.
 * Almacena en IndexedDB y sincroniza cuando vuelve la conexión.
 *
 * Uso:
 *   import { offlineQueue } from './lib/offline';
 *   
 *   // Encolar una operación
 *   await offlineQueue.enqueue({
 *     table: 'visits',
 *     operation: 'insert',
 *     data: { channel_id: '...', checkin_at: '...', ... }
 *   });
 *
 *   // La sincronización se ejecuta automáticamente al recuperar conexión
 */

const QUEUE_PREFIX = 'offline_queue_';

export const offlineQueue = {
  /**
   * Añadir operación a la cola offline
   */
  async enqueue(operation) {
    const id = `${QUEUE_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      ...operation,
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    await set(id, entry);
    console.log('[Offline] Operación encolada:', id);
    return id;
  },

  /**
   * Obtener todas las operaciones pendientes
   */
  async getPending() {
    const allKeys = await keys();
    const queueKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX));
    const entries = await Promise.all(queueKeys.map((k) => get(k)));
    return entries.filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /**
   * Sincronizar todas las operaciones pendientes con Supabase
   */
  async sync() {
    const pending = await this.getPending();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    console.log(`[Offline] Sincronizando ${pending.length} operaciones...`);
    let synced = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        const { table, operation, data } = entry;

        let result;
        switch (operation) {
          case 'insert':
            result = await supabase.from(table).insert(data);
            break;
          case 'update':
            result = await supabase.from(table).update(data).eq('id', data.id);
            break;
          case 'upsert':
            result = await supabase.from(table).upsert(data);
            break;
          default:
            throw new Error(`Operación no soportada: ${operation}`);
        }

        if (result.error) throw result.error;

        // Éxito: eliminar de la cola
        await del(entry.id);
        synced++;
        console.log(`[Offline] ✓ Sincronizado: ${entry.id}`);
      } catch (err) {
        failed++;
        console.error(`[Offline] ✗ Error sincronizando ${entry.id}:`, err);

        // Incrementar retries, abandonar después de 5 intentos
        if (entry.retries >= 5) {
          console.error(`[Offline] Abandonando ${entry.id} después de 5 intentos`);
          await del(entry.id);
        } else {
          await set(entry.id, { ...entry, retries: entry.retries + 1 });
        }
      }
    }

    console.log(`[Offline] Sincronización completada: ${synced} ok, ${failed} errores`);
    return { synced, failed };
  },

  /**
   * Obtener el número de operaciones pendientes
   */
  async count() {
    const allKeys = await keys();
    return allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
  },
};

/**
 * Inicializar listener de conectividad.
 * Llama a sync() automáticamente cuando el navegador vuelve a estar online.
 */
export function initOfflineSync() {
  window.addEventListener('online', async () => {
    console.log('[Offline] Conexión recuperada, sincronizando...');
    const result = await offlineQueue.sync();
    if (result.synced > 0) {
      // Dispatch evento custom para que los componentes puedan reaccionar
      window.dispatchEvent(
        new CustomEvent('offline-sync-complete', { detail: result })
      );
    }
  });

  // Intentar sincronizar al arrancar si hay conexión
  if (navigator.onLine) {
    offlineQueue.sync();
  }
}

/**
 * Helper: ejecutar operación online o encolar si offline.
 * Uso:
 *   const result = await onlineOrQueue('visits', 'insert', visitData);
 *   // result = { online: true, data } | { online: false, queueId }
 */
export async function onlineOrQueue(table, operation, data) {
  if (navigator.onLine) {
    const result = await supabase.from(table)[operation](data);
    if (result.error) throw result.error;
    return { online: true, data: result.data };
  } else {
    const queueId = await offlineQueue.enqueue({ table, operation, data });
    return { online: false, queueId };
  }
}
