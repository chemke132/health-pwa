import { supabase } from './supabase';

/**
 * Offline write queue ("outbox").
 *
 * When a meal/workout/weight is created offline, we can't reach Supabase, so we
 * stash the insert in IndexedDB. When the browser goes back online we flush the
 * queue to Supabase. This is the background-sync *skeleton*: it runs on the
 * 'online' event and on app start; swap in the Background Sync API later if you
 * want the OS to wake the service worker.
 */
const DB_NAME = 'health-pwa-sync';
const STORE = 'outbox';
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/** Queue one pending insert. `table` is 'meals' | 'workouts' | 'weights'. */
export async function enqueue(table, payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').add({ table, payload, createdAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getOutbox() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removeItem(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function outboxCount() {
  try {
    return (await getOutbox()).length;
  } catch {
    return 0;
  }
}

let flushing = false;

/**
 * Push every queued insert to Supabase. Items that succeed are removed; items
 * that fail stay for the next attempt. Returns the number synced.
 */
export async function flushOutbox() {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let synced = 0;
  try {
    const items = await getOutbox();
    for (const item of items) {
      const { error } = await supabase.from(item.table).insert(item.payload);
      if (!error) {
        await removeItem(item.id);
        synced += 1;
      } else {
        // stop on the first hard failure; retry on the next online event
        break;
      }
    }
  } catch {
    // swallow — we'll retry later
  } finally {
    flushing = false;
  }
  return synced;
}

/**
 * Register auto-sync: flush on the 'online' event and once at startup.
 * `onSynced(count)` lets the caller refresh app state after a successful flush.
 */
export function registerAutoSync(onSynced) {
  const run = async () => {
    const n = await flushOutbox();
    if (n > 0) onSynced?.(n);
  };
  window.addEventListener('online', run);
  // attempt once on load in case we came back while the app was closed
  if (navigator.onLine) run();
  return () => window.removeEventListener('online', run);
}
