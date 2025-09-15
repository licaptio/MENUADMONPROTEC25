const CACHE_NAME = "pos-v3";
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

// ===== IndexedDB helpers =====
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
    os.clear();
    items.forEach(it => os.put(it));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getFromStore(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ====== INSTALL ======
self.addEventListener("install", event => {
  console.log("[SW] Instalando…");
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// ====== ACTIVATE ======
self.addEventListener("activate", event => {
  console.log("[SW] Activado");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// ====== FETCH ======
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // === 1. Firestore ===
  if (url.hostname.includes("firestore.googleapis.com")) {
    event.respondWith(
      fetch(event.request)
        .then(async res => {
          const clone = res.clone();
          try {
            const json = await clone.json();
            if (url.pathname.includes("/documents/productos")) {
              const items = (json.documents || []).map(d => ({
                id: d.name.split("/").pop(),
                ...Object.fromEntries(
                  Object.entries(d.fields || {})
                    .map(([k,v]) => [k, Object.values(v)[0]])
                )
              }));
              await saveToStore("cache_catalogo", items);
            }
            if (url.pathname.includes("/documents/clientes")) {
              const items = (json.documents || []).map(d => ({
                id: d.name.split("/").pop(),
                ...Object.fromEntries(
                  Object.entries(d.fields || {})
                    .map(([k,v]) => [k, Object.values(v)[0]])
                )
              }));
              await saveToStore("cache_clientes", items);
            }
          } catch(e) {
            console.warn("[SW] Parse Firestore falló:", e);
          }
          return res;
        })
        .catch(async () => {
          if (url.pathname.includes("/documents/productos")) {
            const items = await getFromStore("cache_catalogo");
            return new Response(JSON.stringify({ offline:true, items }), {
              headers: { "Content-Type": "application/json" }
            });
          }
          if (url.pathname.includes("/documents/clientes")) {
            const items = await getFromStore("cache_clientes");
            return new Response(JSON.stringify({ offline:true, items }), {
              headers: { "Content-Type": "application/json" }
            });
          }
          return caches.match(event.request);
        })
    );
    return;
  }

  // === 2. Assets estáticos ===
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetch(event.request).then(res => {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res));
        }).catch(()=>{});
        return cached;
      }
      return fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
