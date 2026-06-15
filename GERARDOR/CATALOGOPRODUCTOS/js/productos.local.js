const DB_NAME = "PROVSOFT_CATALOGO_DB";
const DB_VERSION = 1;
const STORE_PRODUCTOS = "productos";
const STORE_META = "meta";

function abrirDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_PRODUCTOS)) {
        const store = db.createObjectStore(STORE_PRODUCTOS, { keyPath: "id" });
        store.createIndex("codigoBarra", "codigoBarra", { unique:false });
        store.createIndex("activo", "activo", { unique:false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txStore(db, storeName, mode = "readonly"){
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function obtenerCatalogoLocal(){
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, STORE_PRODUCTOS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarCatalogoLocal(productos){
  const db = await abrirDB();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTOS, "readwrite");
    const store = tx.objectStore(STORE_PRODUCTOS);
    store.clear();

    for (const p of productos) {
      if (p?.id) store.put(p);
    }

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  await guardarMetaLocal("ultimaSync", new Date().toISOString());
  await guardarMetaLocal("totalProductos", productos.length);
}

export async function guardarProductoLocal(producto){
  if (!producto?.id) return;

  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, STORE_PRODUCTOS, "readwrite").put(producto);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function eliminarProductoLocal(id){
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, STORE_PRODUCTOS, "readwrite").delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function buscarProductoLocalPorCodigo(codigo){
  const productos = await obtenerCatalogoLocal();
  const b = String(codigo || "").trim().toUpperCase();

  return productos.find(p => {
    if (String(p.codigoBarra || "").trim().toUpperCase() === b) return true;
    const eqs = Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [];
    return eqs.some(eq => String(eq || "").trim().toUpperCase() === b);
  }) || null;
}

export async function guardarMetaLocal(key, value){
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, STORE_META, "readwrite").put({ key, value });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function obtenerMetaLocal(key){
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, STORE_META).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}
