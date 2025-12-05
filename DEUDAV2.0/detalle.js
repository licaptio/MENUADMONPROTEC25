// ============================================================
// CONFIG SUPABASE
// ============================================================
const SUPA_URL = "https://cvpbtjlupswbyxenugpz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cGJ0amx1cHN3Ynl4ZW51Z3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MDIxOTQsImV4cCI6MjA2MzI3ODE5NH0.iiJsYM3TtaGPdeCtPcEXwAz3LfFc1uJGECEvOErvrqY";
const TABLA = "deuda_limpia_pdd";

function $(id) { return document.getElementById(id); }

// ============================================================
// INICIO – CARGAR CFDI
// ============================================================
const params = new URLSearchParams(location.search);
const uuid = params.get("uuid");

if (!uuid) {
  $("contenedor").innerHTML = "<p>No hay UUID válido</p>";
  throw new Error("Falta UUID");
}

cargarCFDI();

async function cargarCFDI() {
  const url = `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=*`;
  const res = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });

  const json = await res.json();
  if (!json.length) {
    $("contenedor").innerHTML = "<p>No encontrado</p>";
    return;
  }

  renderFactura(json[0]);
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function renderFactura(f) {

  // ... TU CÓDIGO EXISTENTE DE CFDI SIN MODIFICAR ...
  // (Todo lo que genera la tabla, timbre, totales, etc.)
  // 🔥 ESTE NO SE TOCA PARA NADA
  // -----------------------------------------------------------------

  // Después del CONTENEDOR:
  renderGaleria(f);
  initFotoListeners();
}

// ============================================================
// GALERÍA DE FOTOS
// ============================================================
function renderGaleria(f) {
  const galeria = $("galeriaFotos");
  galeria.innerHTML = "";

  const fotos = f.fotos || [];

  if (!fotos.length) {
    galeria.innerHTML = `<p style="color:#777">No hay fotos almacenadas.</p>`;
    return;
  }

  fotos.forEach(url => {
    galeria.innerHTML += `
      <div class="foto-item">
        <img src="${url}" />
        <button onclick="eliminarFoto('${url}')">Eliminar</button>
      </div>`;
  });
}

// ============================================================
// SUBIR FOTO REAL
// ============================================================
const BUCKET = "fotos-facturas";
const CARPETA = "clientes";

async function subirFotoReal() {
  const archivo = $("fotoInput").files[0];
  if (!archivo) return showToast("Selecciona una foto", true);

  const barra = $("barraCargando");
  barra.classList.remove("oculto");

  const client = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  const nombre = `${crypto.randomUUID()}.jpg`;
  const ruta = `${CARPETA}/${nombre}`;

  const { error: errUp } = await client.storage.from(BUCKET).upload(ruta, archivo);

  if (errUp) {
    barra.classList.add("oculto");
    return showToast("Error al subir", true);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(ruta);
  const url = data.publicUrl;

  // Guardar en la BD
  const resFotos = await fetch(
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=fotos`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );

  const actuales = (await resFotos.json())[0]?.fotos || [];
  const nuevas = [...actuales, url];

  await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fotos: nuevas })
  });

  barra.classList.add("oculto");
  showToast("Foto subida ✔️");

  setTimeout(() => location.reload(), 800);
}

// ============================================================
// ELIMINAR FOTO
// ============================================================
async function eliminarFoto(url) {
  if (!confirm("¿Eliminar foto?")) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const path = url.split(marker)[1];

  const client = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  await client.storage.from(BUCKET).remove([path]);

  const resFotos = await fetch(
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=fotos`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );

  const actuales = (await resFotos.json())[0]?.fotos || [];
  const nuevas = actuales.filter(x => x !== url);

  await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fotos: nuevas })
  });

  showToast("Foto eliminada");
  setTimeout(() => location.reload(), 700);
}

// ============================================================
// BOTONES – CÁMARA Y SUBIR
// ============================================================
function initFotoListeners() {
  $("btnCapturar").onclick = () => $("fotoInput").click();
  $("btnSubirFoto").onclick = subirFotoReal;
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, error = false) {
  const toast = $("toast");
  toast.textContent = msg;
  toast.style.background = error ? "#b91c1c" : "#1e3a8a";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}
