
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
      console.warn(`LS Write Error (${key}) - likely quota exceeded:`, e);
    }
  },
  delete: (key: string) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
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
    // 1. Try IndexedDB first (Primary Source)
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

    // 2. Fallback to LocalStorage (only if IDB empty/failed)
    // ALLOW reading everything (including gallery) to recover old data
    return localStore.get<T>(key);
  },

  set: async (key: string, value: any): Promise<void> => {
    // 1. Heavy items (Gallery) -> IndexedDB ONLY
    if (key === 'ai_rpg_gallery') {
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
         console.error("Critical: Failed to save Gallery to IDB", e);
         throw e; // Propagate error for UI handling
       }
       return;
    }

    // 2. Light items (Chars, Chats) -> Both (LS as backup)
    localStore.set(key, value); // Sync backup
    
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
      console.warn(`IDB Write Failed (${key}):`, e);
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
