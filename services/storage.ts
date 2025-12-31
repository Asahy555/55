
const DB_NAME = 'SoulkynDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// --- LocalStorage Helpers ---
const localStore = {
  get: <T>(key: string): T | null => {
    try {
      if (typeof window === 'undefined') return null;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn(`LS Read Error (${key}):`, e);
      return null;
    }
  },
  set: (key: string, value: any) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`LS Write Error (${key}) - Likely Quota Exceeded:`, e);
    }
  },
  delete: (key: string) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch (e) { console.error(e); }
  }
};

// --- IndexedDB Implementation ---
let dbConnection: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbConnection) return dbConnection;

  // Check if IDB is supported before trying
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB not supported"));
  }

  dbConnection = new Promise((resolve, reject) => {
    try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error("IDB Open Error:", request.error);
          dbConnection = null;
          reject(request.error);
        };

        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            dbConnection = null;
          };
          db.onclose = () => {
            dbConnection = null;
          };
          resolve(db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
    } catch (e) {
        dbConnection = null;
        reject(e);
    }
  });

  return dbConnection;
};

// --- Hybrid Storage Export ---
export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    // 1. Try LocalStorage FIRST for speed and fallback reliability logic
    const lsData = localStore.get<T>(key);
    
    // 2. Try IndexedDB
    try {
      const db = await getDB();
      const idbData = await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T || null);
        req.onerror = () => reject(req.error);
      });
      
      // If IDB has data, prefer it (usually larger capacity). 
      // If IDB is empty but LS has data, it means we might be in a fallback scenario or just migrated.
      if (idbData) return idbData;
    } catch (e) {
      // IDB failed/unavailable, just continue to use LS data if we have it
      // console.warn(`IDB Read Skipped/Failed (${key})`, e);
    }

    return lsData;
  },

  set: async (key: string, value: any): Promise<void> => {
    // 1. Always write to LocalStorage (Redundancy)
    localStore.set(key, value);

    // 2. Try writing to IndexedDB (Capacity)
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
       // Silent fail for IDB write is okay as long as LS works. 
       // If both fail, we have a problem, but usually LS is safer for small edits.
    }
  },

  delete: async (key: string): Promise<void> => {
    localStore.delete(key);
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) { }
  }
};
