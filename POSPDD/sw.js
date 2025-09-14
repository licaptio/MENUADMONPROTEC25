const CACHE_NAME = "pos-v2";
const ASSETS = [
  "./",                
  "./index.html",
  "./POSV1PDDLLIS.html",
  "./producto.html",
  "./consulta.html",
  "./buscacatacam.html",
  "./manifest.json",
  "./html5-qrcode.min.js",
  "./logo_proveedora.webp",
  "./icon-192.png",
  "./icon-512.png"
];

// ===== IndexedDB helpers (desde el SW) =====
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("pos_ruta", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("cache_catalogo")) {
        db.createObjectStore("cache_catalogo", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cache_clientes")) {
        db.createObjectStore("cache_clientes", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToStore(store, items) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    items.forEach(it => os.put(it));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ====== INSTALAR ======
self.addEventListener("install", event => {
  console.log("[SW] Instalando…");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// ====== ACTIVAR ======
self.addEventListener("activate", event => {
  console.log("[SW] Activado");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
});

// ====== FETCH ======
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. Firestore: cachear dinámico en IndexedDB
  if (url.hostname.includes("firestore.googleapis.com")) {
    event.respondWith(
      fetch(event.request)
        .then(async res => {
          const clone = res.clone();
          try {
            const json = await clone.json();
            // Detecta colecciones
            if (url.pathname.includes("/documents/productos")) {
              const items = (json.documents || []).map(d => ({
                id: d.name.split("/").pop(),
                ...Object.fromEntries(Object.entries(d.fields || {}).map(([k,v]) => [k, Object.values(v)[0]]))
              }));
              await saveToStore("cache_catalogo", items);
              console.log("[SW] Guardado catálogo en IndexedDB:", items.length);
            }
            if (url.pathname.includes("/documents/rutas_venta")) {
              const items = (json.documents || []).map(d => ({
                id: d.name.split("/").pop(),
                ...Object.fromEntries(Object.entries(d.fields || {}).map(([k,v]) => [k, Object.values(v)[0]]))
              }));
              await saveToStore("cache_clientes", items);
              console.log("[SW] Guardado clientes en IndexedDB:", items.length);
            }
          } catch (e) {
            console.warn("[SW] No pude parsear Firestore:", e);
          }
          return res;
        })
        .catch(() => {
          // fallback: devolver de cache normal si existe
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Assets estáticos (red primero)
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
