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

  const esViejo = !Array.isArray(f.conceptos_detalle);
  let filas = "";
  let conceptos = [];

  // -----------------------------
  // CASO NUEVO
  // -----------------------------
  if (
    Array.isArray(f.conceptos_detalle) &&
    f.conceptos_detalle.length > 0 &&
    (f.conceptos_detalle[0].valorUnitario !== undefined ||
     f.conceptos_detalle[0].traslados !== undefined)
  ) {
    conceptos = f.conceptos_detalle.map(c => ({
      cantidad: Number(c.cantidad || 0),
      clave: c.claveProdServ || "",
      descripcion: c.descripcion || "",
      unitario: Number(c.valorUnitario || 0),
      descuento: Number(c.descuento || 0),
      iva: Array.isArray(c.traslados)
        ? Number(c.traslados.find(t => t.impuesto === "002")?.importe || 0)
        : 0,
      ieps: Array.isArray(c.traslados)
        ? Number(c.traslados.find(t => t.impuesto === "003")?.importe || 0)
        : 0,
    }));
  }

  // -----------------------------
  // CASO VIEJO
  // -----------------------------
  else if (
    Array.isArray(f.conceptos_detalle) &&
    f.conceptos_detalle.length > 0 &&
    f.conceptos_detalle[0].costoUnitario !== undefined
  ) {
    conceptos = f.conceptos_detalle.map(c => ({
      cantidad: Number(c.cantidad || 0),
      clave: c.codigoSAT || "",
      descripcion: c.descripcion || "",
      unitario: Number(c.costoUnitario || 0),
      descuento: 0,
      iva: 0,
      ieps: 0
    }));
  }

  // -----------------------------
  // SIN DETALLE
  // -----------------------------
  else {
    filas = `
      <tr>
        <td colspan="8" style="text-align:center;color:#777;padding:20px">
          CFDI antiguo. No contiene desglose de conceptos.
        </td>
      </tr>`;
  }

  // -----------------------------
  // GENERAR TABLA
  // -----------------------------
  let subtotal = 0, totalDesc = 0, totalIVA = 0, totalIEPS = 0;

  if (conceptos.length > 0) {
    conceptos.forEach(c => {
      const importe = c.cantidad * c.unitario - c.descuento;

      subtotal += c.cantidad * c.unitario;
      totalDesc += c.descuento;
      totalIVA += c.iva;
      totalIEPS += c.ieps;

      filas += `
        <tr>
          <td>${c.cantidad}</td>
          <td>${c.clave}</td>
          <td style="text-align:left">${c.descripcion}</td>
          <td>${formatoMX(c.unitario)}</td>
          <td>${formatoMX(c.descuento)}</td>
          <td>${formatoMX(c.iva)}</td>
          <td>${formatoMX(c.ieps)}</td>
          <td>${formatoMX(importe)}</td>
        </tr>`;
    });
  }

  // Guardar totales globales
  window.__sub  = subtotal;
  window.__desc = totalDesc;
  window.__iva  = totalIVA;
  window.__ieps = totalIEPS;

  // -----------------------------
  // TIMBRE
  // -----------------------------
  let timbreHTML = `<p>No hay datos de timbrado</p>`;

  if (Array.isArray(f.complementos) && f.complementos.length) {
    const t = f.complementos[0].atributos || [];
    const busca = x => t.find(a => a.nombre === x)?.valor || "";

    timbreHTML = `
      <div class="timbre-box timbre-grid">
        <div class="timbre-col">
          <p><strong>UUID:</strong> ${f.uuid_cfdi}</p>
          <p><strong>Fecha Timbrado:</strong> ${busca("FechaTimbrado")}</p>
        </div>
        <div class="timbre-col">
          <p><strong>Uso CFDI:</strong> ${f.uso_cfdi}</p>
        </div>
      </div>
    `;
  }

  // -----------------------------
  // IMPUESTOS GLOBALES
  // -----------------------------
  let impGlobalHTML = `
    <tr><td>IVA</td><td>16%</td><td>${formatoMX(totalIVA)}</td></tr>
    <tr><td>IEPS</td><td>-</td><td>${formatoMX(totalIEPS)}</td></tr>
    <tr style="background:#003366;color:white"><td>Total Impuestos</td><td></td><td>${formatoMX(totalIVA+totalIEPS)}</td></tr>
  `;

  // -----------------------------
  // HTML EN EL CONTENEDOR
  // -----------------------------
  $("contenedor").innerHTML = `
    <div class="datos-grid">
      <div class="datos-box">
        <h2>Datos del Emisor</h2>
        <p><strong>RFC:</strong> ${f.rfc_emisor}</p>
      </div>

      <div class="datos-box">
        <h2>Datos del Receptor</h2>
        <p><strong>RFC:</strong> ${f.rfc_receptor}</p>
      </div>
    </div>

    <section class="seccion-seriefolio">
      <div class="seriefolio-grid">
        <p><strong>Serie:</strong> ${f.serie}</p>
        <p><strong>Folio:</strong> ${f.folio}</p>
      </div>
      <div class="seriefolio-grid">
        <p><strong>UUID:</strong> ${f.uuid_cfdi}</p>
      </div>
    </section>

    <section>
      <h2>Conceptos</h2>
      <div class="tabla-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cant</th>
              <th>Clave</th>
              <th>Descripción</th>
              <th>Unitario</th>
              <th>Descuento</th>
              <th>IVA</th>
              <th>IEPS</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </section>

    <section>${timbreHTML}</section>

    <section>
      <h2>Impuestos Globales</h2>
      <table><tbody>${impGlobalHTML}</tbody></table>
    </section>
  `;

  // -----------------------------
  // 📸 NUEVO: Fotos y botones
  // -----------------------------
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
