// ============================================================
// CONFIG SUPABASE (REST)
// ============================================================
const SUPA_URL = "https://cvpbtjlupswbyxenugpz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cGJ0amx1cHN3Ynl4ZW51Z3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MDIxOTQsImV4cCI6MjA2MzI3ODE5NH0.iiJsYM3TtaGPdeCtPcEXwAz3LfFc1uJGECEvOErvrqY";
const TABLA = "deuda_limpia_pdd";

// ============================================================
// UTILIDADES
// ============================================================
function $(id) { return document.getElementById(id); }

function formatoMX(n) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(Number(n || 0));
}

// ============================================================
// LEER UUID DE LA URL
// ============================================================
const params = new URLSearchParams(location.search);
const uuid = params.get("uuid");

const contenedor = $("contenedor");
if (!uuid) {
  contenedor.innerHTML = `<p>No hay UUID en la URL</p>`;
  throw new Error("Falta UUID");
}

// ============================================================
// CONSULTA PRINCIPAL A SUPABASE (REST)
// ============================================================
async function cargarCFDI() {
  const url = `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=*`;

  const res = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });

  const json = await res.json();
  if (!Array.isArray(json) || !json.length) {
    contenedor.innerHTML = "<p>No se encontró información de la factura.</p>";
    return;
  }

  renderFactura(json[0]);
}

// ============================================================
// RENDER PRINCIPAL COMPLETO
// ============================================================
function renderFactura(f) {

  let subtotal = 0;
  let totalIVA = 0;
  let totalIEPS = 0;
  let filas = "";

  // ========================
  //  CONCEPTOS
  // ========================
  if (Array.isArray(f.conceptos_detalle)) {
    for (const c of f.conceptos_detalle) {
      const qty = Number(c.cantidad);
      const unit = Number(c.valorUnitario);

      subtotal += qty * unit;

      let iva = 0, ieps = 0;

      if (Array.isArray(c.traslados)) {
        for (const t of c.traslados) {
          if (t.impuesto === "002") iva += Number(t.importe);
          if (t.impuesto === "003") ieps += Number(t.importe);
        }
      }

      totalIVA += iva;
      totalIEPS += ieps;

      filas += `
        <tr>
          <td>${qty}</td>
          <td>${c.claveProdServ ?? ""}</td>
          <td style="text-align:left">${c.descripcion ?? ""}</td>
          <td>${formatoMX(unit)}</td>
          <td>${formatoMX(iva)}</td>
          <td>${formatoMX(ieps)}</td>
          <td>${formatoMX(qty * unit)}</td>
        </tr>`;
    }
  }

  // ========================
  // RENDER DEL HTML COMPLETO
  // ========================
  contenedor.innerHTML = `
    <div class="datos-grid">

      <div class="datos-box">
        <h2>Datos del Emisor</h2>
        <p><strong>RFC:</strong> ${f.rfc_emisor}</p>
        <p><strong>Nombre:</strong> ${f.nombre_emisor}</p>
        <p><strong>Régimen Fiscal:</strong> ${f.regimen_fiscal_emisor}</p>
      </div>

      <div class="datos-box">
        <h2>Datos del Receptor</h2>
        <p><strong>RFC:</strong> ${f.rfc_receptor}</p>
        <p><strong>Nombre:</strong> ${f.nombre_receptor}</p>
        <p><strong>Uso CFDI:</strong> ${f.uso_cfdi}</p>
      </div>

    </div>

    <section class="seccion-folio">
      <h3>Folio Tecnopro</h3>
      <div class="folio-row">
        <input id="folioInput" maxlength="7" value="${f.foliotecnopro ?? ""}">
        <button id="btnGuardarFolio">Guardar</button>
      </div>
      <p class="folio-hint">${f.foliotecnopro ? `Actual: ${f.foliotecnopro}` : "Sin folio capturado"}</p>
    </section>

    <section class="seccion">
      <h2>Conceptos</h2>
      <div class="tabla-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cant</th>
              <th>Clave</th>
              <th>Descripción</th>
              <th>Unitario</th>
              <th>IVA</th>
              <th>IEPS</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
          <tfoot>
            <tr><td colspan="6" style="text-align:right">Subtotal</td><td>${formatoMX(subtotal)}</td></tr>
            <tr><td colspan="6" style="text-align:right">IVA</td><td>${formatoMX(totalIVA)}</td></tr>
            <tr><td colspan="6" style="text-align:right">IEPS</td><td>${formatoMX(totalIEPS)}</td></tr>
            <tr>
              <td colspan="6" style="text-align:right;background:#003366;color:#fff">TOTAL</td>
              <td style="background:#003366;color:#fff">${formatoMX(subtotal + totalIVA + totalIEPS)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    ${renderTimbre(f)}

    ${renderImpuestosGlobales(f)}
  `;

  initFolioTecnopro(f.uuid_cfdi);
  renderGaleria(f);
}

// ============================================================
// TIMBRE
// ============================================================
function renderTimbre(f) {
  if (!Array.isArray(f.complementos) || !f.complementos.length)
    return `<p>No hay datos de timbrado</p>`;

  const t = f.complementos[0].atributos || [];
  const busca = x => t.find(a => a.nombre === x)?.valor || "";

  return `
    <section class="seccion">
      <div class="timbre-box">
        <h3>Timbre Fiscal Digital</h3>
        <p><strong>UUID:</strong> ${f.uuid_cfdi}</p>
        <p><strong>Fecha Timbrado:</strong> ${busca("FechaTimbrado")}</p>
        <p><strong>RFC Prov. Cert.:</strong> ${busca("RfcProvCertif")}</p>
        <p><strong>No. Certificado SAT:</strong> ${busca("NoCertificadoSAT")}</p>
      </div>
    </section>`;
}

// ============================================================
// IMPUESTOS GLOBALES
// ============================================================
function renderImpuestosGlobales(f) {
  const ig = f.impuestos_globales || { detalles: [] };
  let rows = "";

  if (Array.isArray(ig.detalles)) {
    ig.detalles.forEach(d => {
      rows += `
        <tr>
          <td>${d.tipo}</td>
          <td>${(d.tasa * 100).toFixed(2)}%</td>
          <td>${formatoMX(d.importe)}</td>
        </tr>`;
    });
  }

  return `
    <section class="seccion">
      <h2>Impuestos Globales</h2>
      <table>
        <thead><tr><th>Tipo</th><th>Tasa</th><th>Importe</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

// ============================================================
// GALERÍA DE FOTOS
// ============================================================
function renderGaleria(f) {
  const galeria = $("galeriaFotos");
  galeria.innerHTML = "";

  const fotos = f.fotos || [];

  if (!fotos.length) {
    galeria.innerHTML = `<p style="color:#666">No hay fotos registradas.</p>`;
    return;
  }

  fotos.forEach(url => {
    galeria.innerHTML += `
      <div class="foto-item">
        <img src="${url}" />
        <button onclick="eliminarFoto('${url}')">Eliminar</button>
      </div>
    `;
  });
}

// ============================================================
// GUARDAR FOLIO
// ============================================================
function initFolioTecnopro(uuid_cfdi) {
  const input = $("folioInput");
  const btn = $("btnGuardarFolio");
  const hint = document.querySelector(".folio-hint");

  btn.addEventListener("click", async () => {
    const val = input.value.trim().padStart(7, "0");

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

    hint.textContent = `Actual: ${val}`;
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

  const fotosRes = await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=fotos`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });

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

  const fotosRes = await fetch(`${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${uuid}&select=fotos`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });

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

// LISTENER
$("btnSubirFoto").addEventListener("click", subirFoto);

// INICIO
cargarCFDI();
