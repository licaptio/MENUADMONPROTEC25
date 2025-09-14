const CACHE_NAME = "pos-v1"; // cambia a pos-v2 cuando actualices
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

// ====== INSTALAR: precache de assets ======
self.addEventListener("install", event => {
  console.log("[SW] Instalando…");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Cacheando assets iniciales");
      return cache.addAll(ASSETS);
    })
  );
});

// ====== ACTIVAR: limpiar versiones viejas ======
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

// ====== FETCH: red primero, fallback a caché ======
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Guardar copia en caché
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request)) // si falla red, usa caché
  );
});
