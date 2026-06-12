const DB_NAME = "POSPDD26_DB";
const DB_VERSION = 1;
const STORE_PRODUCTOS = "productos";
const STORE_META = "meta";

export function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_PRODUCTOS)) {
        db.createObjectStore(STORE_PRODUCTOS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarProductos(productos = []) {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTOS, "readwrite");
    const store = tx.objectStore(STORE_PRODUCTOS);

    productos.forEach(p => store.put(p));

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function obtenerProductos() {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTOS, "readonly");
    const store = tx.objectStore(STORE_PRODUCTOS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarMeta(id, data) {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put({ id, ...data });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function obtenerMeta(id) {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}