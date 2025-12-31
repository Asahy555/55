
const DB_NAME = 'SoulkynDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// --- IDB Helper (Stateless connection to avoid stale closes) ---
const performIDB = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => T | Promise<T>
): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error("IDB not supported"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        
        // Wrap result in Promise to handle both sync and async callbacks
        const result = await Promise.resolve(action(store));

        if (mode === 'readwrite') {
          // For writes, wait for transaction completion to ensure data is on disk
          tx.oncomplete = () => {
            db.close();
            resolve(result);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        } else {
          // For reads, we can resolve immediately
          resolve(result);
          db.close();
        }
      } catch (err) {
        db.close();
        reject(err);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    let idbResult: T | undefined;

    // 1. Try IndexedDB (Primary)
    try {
      idbResult = await performIDB('readonly', (store) => {
        return new Promise<T | undefined>((resolve, reject) => {
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      });
    } catch (e) {
      console.warn(`IDB Read Error (${key}):`, e);
      // Fall through to LocalStorage check
    }

    if (idbResult !== undefined && idbResult !== null) {
      return idbResult;
    }

    // 2. Fallback to LocalStorage
    try {
      const lsItem = window.localStorage.getItem(key);
      return lsItem ? JSON.parse(lsItem) : null;
    } catch (e) {
      console.warn(`LS Read Error (${key}):`, e);
      return null;
    }
  },

  set: async (key: string, value: any): Promise<void> => {
    // 1. Write to IndexedDB (Reliable for large data)
    try {
      await performIDB('readwrite', (store) => {
        store.put(value, key);
      });
    } catch (e) {
      console.error(`IDB Write Error (${key}):`, e);
    }

    // 2. Write to LocalStorage (Backup for small data, fails gracefully on quota)
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Expected for large data (images)
    }
  },

  delete: async (key: string): Promise<void> => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}

    try {
      await performIDB('readwrite', (store) => {
        store.delete(key);
      });
    } catch (e) {}
  }
};
