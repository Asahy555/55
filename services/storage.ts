
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
      // Ignore quota errors silently, relying on IDB
      console.warn(`LS Write Error (${key}) - Storage full?`, e);
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

  dbConnection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
  });

  return dbConnection;
};

// --- Hybrid Storage Export ---
export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    // Strategy: Try IDB first. If missing, try LS (and migrate).
    try {
      const db = await getDB();
      const result = await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T || null);
        req.onerror = () => reject(req.error);
      });
      
      if (result) return result;
    } catch (e) {
      console.warn(`IDB Read Failed (${key}):`, e);
    }

    // Fallback / Migration
    const lsData = localStore.get<T>(key);
    if (lsData) {
        // If found in LS but not IDB, save to IDB for future
        storage.set(key, lsData).catch(e => console.error("Migration failed", e));
        return lsData;
    }
    
    return null;
  },

  set: async (key: string, value: any): Promise<void> => {
    // Strategy: Write to BOTH. IDB for capacity, LS for redundancy.
    
    // 1. Write to LS (Best effort)
    localStore.set(key, value);

    // 2. Write to IDB (Critical)
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
      console.error(`IDB Write Failed (${key}):`, e);
      throw e; 
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
    } catch (e) { console.error("IDB Delete Error:", e); }
  }
};
