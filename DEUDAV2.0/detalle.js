// ============================================================
// CONFIG SUPABASE
// ============================================================
const SUPA_URL = "https://cvpbtjlupswbyxenugpz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cGJ0amx1cHN3Ynl4ZW51Z3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MDIxOTQsImV4cCI6MjA2MzI3ODE5NH0.iiJsYM3TtaGPdeCtPcEXwAz3LfFc1uJGECEvOErvrqY";
const TABLA = "deuda_limpia_pdd";
function formatFechaBonita(fechaRaw) {
  if (!fechaRaw) return "";

  const fecha = new Date(fechaRaw);

  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  let dia   = fecha.getDate();
  let mes   = meses[fecha.getMonth()];
  let año   = fecha.getFullYear();

  let horas = fecha.getHours();
  let mins  = fecha.getMinutes().toString().padStart(2,"0");

  let ampm = horas >= 12 ? "PM" : "AM";
  horas = horas % 12;
  horas = horas === 0 ? 12 : horas;

  return `${dia} ${mes} ${año} – ${horas}:${mins} ${ampm}`;
}

// ============================================================
// UTILIDADES
// ============================================================
function $(id) { return document.getElementById(id); }

function safe(v) {
  return (v === null || v === undefined || v === "null") ? "" : v;
}

function formatoMX(n) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(Number(n || 0));
}

// ============================================================
// UUID de la URL
// ============================================================
const params = new URLSearchParams(location.search);
const uuid = params.get("uuid");

const contenedor = $("contenedor");
if (!uuid) {
  contenedor.innerHTML = `<p>No hay UUID en la URL</p>`;
  throw new Error("Falta UUID");
}

// ============================================================
// CONSULTA PRINCIPAL A SUPABASE
// ============================================================
async function cargarCFDI() {
  const url = `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=*`;

  const res = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });

  const json = await res.json();
  if (!Array.isArray(json) || !json.length) {
    contenedor.innerHTML = "<p>No se encontró información.</p>";
    return;
  }

  renderFactura(json[0]);
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function renderFactura(f) {

  const esViejo = !Array.isArray(f.conceptos_detalle);

  let subtotal = 0;
  let totalIVA = 0;
  let totalIEPS = 0;
  let totalDescuentos = 0;

let filas = "";
let conceptos = [];

// ---------------------------------------------
// 🟦 CASO NUEVO – tiene valorUnitario y traslados
// ---------------------------------------------
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

// ---------------------------------------------
// 🟥 CASO VIEJO – NO tiene valorUnitario
// ---------------------------------------------
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

// ---------------------------------------------
// 🟧 SI NO TIENE NADA
// ---------------------------------------------
else {
  filas = `
    <tr>
      <td colspan="8" style="text-align:center;color:#777;padding:20px">
        CFDI antiguo. No contiene desglose de conceptos.
      </td>
    </tr>`;
}

// ---------------------------------------------
// GENERACIÓN DE TABLA Y TOTALES
// ---------------------------------------------
if (conceptos.length > 0) {
  let subtotal = 0, totalDesc = 0, totalIVA = 0, totalIEPS = 0;

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

  window.__sub  = subtotal;
  window.__desc = totalDesc;
  window.__iva  = totalIVA;
  window.__ieps = totalIEPS;
}

  // ============================================================
  // GALERÍA DE FOTOS
  // ============================================================
  function renderGaleria() {
    const galeria = $("galeriaFotos");
    galeria.innerHTML = "";

    const fotos = f.fotos || [];

    if (!fotos.length) {
      galeria.innerHTML = `<p style="color:#666">No hay fotos.</p>`;
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
  renderGaleria();

  // ============================================================
  // TIMBRE
  // ============================================================
  let timbreHTML = `<p>No hay datos de timbrado</p>`;

  if (Array.isArray(f.complementos) && f.complementos.length) {
    const t = f.complementos[0].atributos || [];
    const busca = x => t.find(a => a.nombre === x)?.valor || "";

timbreHTML = `
  <div class="timbre-box timbre-grid">
    
    <div class="timbre-col">
      <p><strong>UUID:</strong> ${safe(f.uuid_cfdi)}</p>
      <p><strong>Fecha Timbrado:</strong> ${busca("FechaTimbrado")}</p>
      <p><strong>RFC Prov. Cert.:</strong> ${busca("RfcProvCertif")}</p>
      <p><strong>No. Certificado SAT:</strong> ${busca("NoCertificadoSAT")}</p>
    </div>

    <div class="timbre-col">
      <p><strong>Uso CFDI:</strong> ${safe(f.uso_cfdi)}</p>
      <p><strong>Método de Pago:</strong> ${safe(f.metodo_pago)}</p>
      <p><strong>Forma de Pago:</strong> ${safe(f.forma_pago)}</p>
      <p><strong>Tipo de Pago:</strong> ${safe(f.tipo_comprobante)}</p>
    </div>

  </div>`;

  }

// ============================================================
// IMPUESTOS GLOBALES (USANDO TOTALES REALES DE LOS CONCEPTOS)
// ============================================================
let impGlobalHTML = "";

// IVA REAL calculado por PROVSOFT
if ((window.__iva || 0) > 0) {
  impGlobalHTML += `
    <tr>
      <td>IVA</td>
      <td>16.00%</td>
      <td>${formatoMX(window.__iva)}</td>
    </tr>`;
}

// IEPS REAL calculado por PROVSOFT
if ((window.__ieps || 0) > 0) {
  impGlobalHTML += `
    <tr>
      <td>IEPS</td>
      <td>-</td>
      <td>${formatoMX(window.__ieps)}</td>
    </tr>`;
}

  // ============================================================
  // FOLIO TECNOPRO
  // ============================================================
const folioHTML = `
  <section class="seccion-folio compacto">
    <h3>Folio Tecnopro</h3>

    <div class="compacto-row">
      <input id="folioInput" maxlength="8"
        class="folio-input"
        placeholder="Folio"
        value="${safe(f.foliotecnopro)}">

      <button id="btnGuardarFolio" class="btn-guardar-folio">
        Guardar
      </button>
    </div>
  </section>
`;


  // ============================================================
  // HTML FINAL
  // ============================================================
  contenedor.innerHTML = `
    <div class="datos-grid">

      <div class="datos-box">
        <h2>Datos del Emisor</h2>
        <p><strong>RFC:</strong> ${safe(f.rfc_emisor)}</p>
        <p><strong>Nombre:</strong> ${safe(f.nombre_emisor)}</p>
        <p><strong>Régimen Fiscal:</strong> ${safe(f.regimen_fiscal_emisor)}</p>
      </div>

      <div class="datos-box">
        <h2>Datos del Receptor</h2>
        <p><strong>RFC:</strong> ${safe(f.rfc_receptor)}</p>
        <p><strong>Nombre:</strong> ${safe(f.nombre_receptor)}</p>
        <p><strong>Uso CFDI:</strong> ${safe(f.uso_cfdi)}</p>
      </div>

    </div>
<div class="seriefolio-grid-master">

  <!-- IZQUIERDA: Serie, Folio, UUID -->
  <section class="seccion-seriefolio">
    

    <div class="seriefolio-grid">
      <p><strong>Serie:</strong> ${safe(f.serie)}</p>
      <p><strong>Folio:</strong> ${safe(f.folio)}</p>
    </div>

<!-- FILA UUID -->
<div class="seriefolio-grid" style="margin-top:10px;">
  <p><strong>UUID:</strong> <span id="uuidText">${safe(f.uuid_cfdi)}</span></p>
  <button id="btnCopiarUUID" class="btn-copiar">📋 Copiar</button>
</div>

<!-- FILA FECHA -->
<div class="seriefolio-grid">
  <p><strong>Fecha:</strong> ${formatFechaBonita(f.fecha)}</p>
</div>

<!-- FILA TOTAL -->
<div class="seriefolio-grid">
  <p><strong>Total Factura:</strong> ${formatoMX(
    (window.__sub || 0) - (window.__desc || 0) + (window.__iva || 0) + (window.__ieps || 0)
  )}</p>
</div>


  </section>

  <!-- DERECHA: Folio Tecnopro -->
  <section class="seccion-folio compacto">
    <h3>Folio Tecnopro</h3>

    <div class="compacto-row">
      <input id="folioInput" maxlength="8"
        class="folio-input"
        placeholder="Folio"
        value="${safe(f.foliotecnopro)}">

      <button id="btnGuardarFolio" class="btn-guardar-folio">
        Guardar
      </button>
    </div>
  </section>

</div>

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
<tfoot>
  <tr>
    <td colspan="7" style="text-align:right">Subtotal</td>
    <td>${formatoMX(window.__sub || 0)}</td>
  </tr>

  <tr>
    <td colspan="7" style="text-align:right" class="desc-total">Descuento Total</td>
    <td class="desc-total">${formatoMX(window.__desc || 0)}</td>
  </tr>

  <tr>
    <td colspan="7" style="text-align:right">IVA</td>
    <td>${formatoMX(window.__iva || 0)}</td>
  </tr>

  <tr>
    <td colspan="7" style="text-align:right">IEPS</td>
    <td>${formatoMX(window.__ieps || 0)}</td>
  </tr>

  <tr>
    <td colspan="7" style="text-align:right;background:#003366;color:#fff">TOTAL</td>
    <td style="background:#003366;color:#fff">
      ${formatoMX((window.__sub || 0) - (window.__desc || 0) + (window.__iva || 0) + (window.__ieps || 0))}
    </td>
  </tr>
</tfoot>

        </table>
      </div>
    </section>

    <section>${timbreHTML}</section>

    <section>
      <h2>Impuestos Globales</h2>
      <table>
        <thead><tr><th>Tipo</th><th>Tasa</th><th>Importe</th></tr></thead>
        <tbody>${impGlobalHTML}</tbody>
      </table>
    </section>
  `;

  initFolioTecnopro(f.uuid_cfdi);
}

// ============================================================
// GUARDAR FOLIO TECNOPRO
// ============================================================
function initFolioTecnopro(uuid_cfdi) {
  const input = $("folioInput");
  const btn = $("btnGuardarFolio");

  btn.addEventListener("click", async () => {
    const val = input.value.trim().substring(0, 8);

    const res = await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid_cfdi}`, {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ foliotecnopro: val })
    });

    if (!res.ok) return alert("Error al guardar folio");

    alert("Folio guardado");
  });
}

// ============================================================
// FOTOS — SUBIR
// ============================================================
const BUCKET = "fotos-facturas";
const CARPETA = "clientes";

async function subirFoto() {
  const file = $("fotoInput").files[0];
  if (!file) return showToast("Selecciona una foto", true);

  const nombre = `${crypto.randomUUID()}.jpg`;
  const ruta = `${CARPETA}/${nombre}`;

  const client = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  const { error: upErr } = await client.storage.from(BUCKET).upload(ruta, file);
  if (upErr) return showToast("Error al subir", true);

  const { data: pub } = client.storage.from(BUCKET).getPublicUrl(ruta);
  const url = pub.publicUrl;

  const fotosRes = await fetch(
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=fotos`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );

  const actuales = (await fotosRes.json())[0]?.fotos || [];
  const nuevas = [...actuales, url];

  const up = await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fotos: nuevas })
  });

  if (!up.ok) return showToast("Error BD", true);

  showToast("Foto subida");
  setTimeout(() => location.reload(), 700);
}

// ============================================================
// FOTOS — ELIMINAR
// ============================================================
async function eliminarFoto(url) {
  if (!confirm("¿Eliminar esta foto?")) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return showToast("Ruta inválida", true);

  const ruta = url.substring(idx + marker.length);

  const client = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  await client.storage.from(BUCKET).remove([ruta]);

  const fotosRes = await fetch(
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=fotos`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );

  const actuales = (await fotosRes.json())[0]?.fotos || [];
  const filtradas = actuales.filter(f => f !== url);

  await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fotos: filtradas })
  });

  showToast("Foto eliminada");
  setTimeout(() => location.reload(), 700);
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, error = false) {
  let toast = $("toast");
  toast.textContent = msg;
  toast.style.background = error ? "#b00020" : "#003366";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

$("btnSubirFoto").addEventListener("click", subirFoto);

// INICIO
cargarCFDI();
// ============================================================
// COPIAR UUID
// ============================================================
document.addEventListener("click", e => {
  if (e.target.id === "btnCopiarUUID") {
    const texto = document.getElementById("uuidText").textContent;

    navigator.clipboard.writeText(texto)
      .then(() => {
        showToast("UUID copiado");
      })
      .catch(() => {
        showToast("No se pudo copiar", true);
      });
  }
});

