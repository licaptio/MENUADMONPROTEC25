import {
  supabaseUrl,
  supabaseAnonKey
} from "./config.js";

// ============================================================
// CONFIG SUPABASE
// ============================================================
const SUPA_URL = supabaseUrl;
const SUPA_KEY = window.supabasePublishableKey || supabaseAnonKey;
const TABLA = "deuda_limpia_pdd";

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

function parseJSONMaybe(v) {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return v;

  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    try { return JSON.parse(s); } catch { return v; }
  }

  return v;
}

function totalCFDI(f) {
  return Number(f?.total || 0);
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
  const url = `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${encodeURIComponent(uuid)}&select=*`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`
    }
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
  window.__FACTURA = f;

  f.nombre_emisor = f.nombre_emisor || f.razon_social_emisor || "";
  f.nombre_receptor = f.nombre_receptor || f.razon_social_receptor || "";

  f.conceptos_detalle   = parseJSONMaybe(f.conceptos_detalle);
  f.complementos        = parseJSONMaybe(f.complementos);
  f.impuestos_globales  = parseJSONMaybe(f.impuestos_globales);
  f.impuestos_retenidos = parseJSONMaybe(f.impuestos_retenidos) || {};

  let filas = "";
  let conceptos = [];

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
      noIdentificacion: c.noIdentificacion || "",
      unitario: Number(c.valorUnitario || 0),
      descuento: Number(c.descuento || 0),
      iva: Array.isArray(c.traslados)
        ? Number(c.traslados.find(t => t.impuesto === "002")?.importe || 0)
        : 0,
      ieps: Array.isArray(c.traslados)
        ? Number(c.traslados.find(t => t.impuesto === "003")?.importe || 0)
        : 0
    }));
  }

  else if (
    Array.isArray(f.conceptos_detalle) &&
    f.conceptos_detalle.length > 0 &&
    f.conceptos_detalle[0].costoUnitario !== undefined
  ) {
    conceptos = f.conceptos_detalle.map(c => ({
      cantidad: Number(c.cantidad || 0),
      clave: c.codigoSAT || "",
      descripcion: c.descripcion || "",
      noIdentificacion: c.noIdentificacion || "",
      unitario: Number(c.costoUnitario || 0),
      descuento: 0,
      iva: 0,
      ieps: 0
    }));
  }

  else {
    filas = `
      <tr>
        <td colspan="9" style="text-align:center;color:#777;padding:20px">
          CFDI antiguo. No contiene desglose de conceptos.
        </td>
      </tr>`;
  }

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
          <td>${c.noIdentificacion || ""}</td>
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

  function renderGaleria() {
    const galeria = $("galeriaFotos");
    galeria.innerHTML = "";

    const fotos = Array.isArray(f.fotos) ? f.fotos : [];

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

  let impGlobalHTML = "";

  impGlobalHTML += `
    <tr>
      <td>IVA</td>
      <td>16.00%</td>
      <td>${formatoMX(window.__iva || 0)}</td>
    </tr>`;

  let iepsTasas = new Set();

  if (Array.isArray(f.conceptos_detalle)) {
    f.conceptos_detalle.forEach(c => {
      if (Array.isArray(c.traslados)) {
        c.traslados
          .filter(t => t.impuesto === "003" && Number(t.tasa || 0) > 0)
          .forEach(t => iepsTasas.add((Number(t.tasa) * 100).toFixed(2)));
      }
    });
  }

  iepsTasas = [...iepsTasas];

  if (iepsTasas.length === 1) {
    impGlobalHTML += `
      <tr>
        <td>IEPS</td>
        <td>${iepsTasas[0]}%</td>
        <td>${formatoMX(window.__ieps || 0)}</td>
      </tr>`;
  } else if (iepsTasas.length > 1) {
    iepsTasas.forEach(tasa => {
      impGlobalHTML += `
        <tr>
          <td>IEPS</td>
          <td>${tasa}%</td>
          <td>${formatoMX(0)}</td>
        </tr>`;
    });

    impGlobalHTML += `
      <tr>
        <td>IEPS Total</td>
        <td></td>
        <td>${formatoMX(window.__ieps || 0)}</td>
      </tr>`;
  } else {
    impGlobalHTML += `
      <tr>
        <td>IEPS</td>
        <td>0%</td>
        <td>${formatoMX(0)}</td>
      </tr>`;
  }

  impGlobalHTML += `
    <tr style="background:#003366;color:white;font-weight:bold">
      <td>Total Impuestos</td>
      <td></td>
      <td>${formatoMX((window.__iva || 0) + (window.__ieps || 0))}</td>
    </tr>`;

  contenedor.innerHTML = `
    <div class="datos-grid">

      <div class="datos-box">
        <h2>Datos del Emisor</h2>
        <p><strong>RFC:</strong> ${safe(f.rfc_emisor)}</p>
        <p><strong>Nombre:</strong> <span style="font-weight:700;color:#003366">${safe(f.nombre_emisor)}</span></p>
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

      <section class="seccion-seriefolio">
        <div class="seriefolio-grid">
          <p><strong>Serie:</strong> ${safe(f.serie)}</p>
          <p><strong>Folio:</strong> ${safe(f.folio)}</p>
        </div>

        <div class="seriefolio-grid" style="margin-top:10px;">
          <p><strong>UUID:</strong> <span id="uuidText">${safe(f.uuid_cfdi)}</span></p>
          <button id="btnCopiarUUID" class="btn-copiar">📋 Copiar</button>
        </div>

        <div class="seriefolio-grid">
          <p><strong>Fecha:</strong> ${formatFechaBonita(f.fecha)}</p>
        </div>

        <div class="seriefolio-grid">
          <p><strong>Total Factura:</strong> ${formatoMX(Number(f.total || 0))}</p>
        </div>
      </section>

      <section class="seccion-folio compacto">
        <h3>Folio Tecnopro</h3>
        <div class="compacto-row">
          <input data-folio-input maxlength="7"
            class="folio-input"
            placeholder="Folio"
            value="${safe(f.foliotecnopro)}">

          <button data-folio-btn class="btn-guardar-folio">
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
              <th>No. Identificación</th>
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
              <td colspan="8" style="text-align:right">Subtotal</td>
              <td>${formatoMX(window.__sub || 0)}</td>
            </tr>
            <tr>
              <td colspan="8" style="text-align:right" class="desc-total">Descuento Total</td>
              <td class="desc-total">${formatoMX(window.__desc || 0)}</td>
            </tr>
            <tr>
              <td colspan="8" style="text-align:right">IVA</td>
              <td>${formatoMX(window.__iva || 0)}</td>
            </tr>
            <tr>
              <td colspan="8" style="text-align:right">IEPS</td>
              <td>${formatoMX(window.__ieps || 0)}</td>
            </tr>
            <tr>
              <td colspan="8" style="text-align:right;color:#b00020">IVA Retenido</td>
              <td>${formatoMX(Math.abs(f.impuestos_retenidos?.iva || 0))}</td>
            </tr>
            <tr>
              <td colspan="8" style="text-align:right;color:#b00020">ISR Retenido</td>
              <td>${formatoMX(Math.abs(f.impuestos_retenidos?.isr || 0))}</td>
            </tr>
            <tr>
              <td colspan="8" style="text-align:right;background:#003366;color:#fff">TOTAL NETO A PAGAR</td>
              <td style="background:#003366;color:#fff">
                ${formatoMX(Number(f.total || 0))}
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

  renderGaleria();
  initFolioTecnopro(f.uuid_cfdi);
}

// ============================================================
// GUARDAR FOLIO TECNOPRO
// ============================================================
function initFolioTecnopro(uuid_cfdi) {
  const input = document.querySelector('[data-folio-input]');
  const btn   = document.querySelector('[data-folio-btn]');

  if (!input || !btn) {
    console.error("❌ No se encontró input o botón de folio");
    return;
  }

  btn.replaceWith(btn.cloneNode(true));
  const btnClean = document.querySelector('[data-folio-btn]');

  btnClean.addEventListener("click", async () => {
    const val = input.value.trim().substring(0, 7);

    if (!val) {
      alert("⚠️ Folio vacío");
      return;
    }

    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${encodeURIComponent(uuid_cfdi)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ foliotecnopro: val })
      }
    );

    if (!res.ok) {
      console.error(await res.text());
      alert("❌ Error al guardar folio");
      return;
    }

    alert("✅ Folio Tecnopro guardado");
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
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${encodeURIComponent(uuid)}&select=fotos`,
    {
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`
      }
    }
  );

  const actuales = (await fotosRes.json())[0]?.fotos || [];
  const nuevas = [...actuales, url];

  const up = await fetch(
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${encodeURIComponent(uuid)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fotos: nuevas })
    }
  );

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
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${encodeURIComponent(uuid)}&select=fotos`,
    {
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`
      }
    }
  );

  const actuales = (await fotosRes.json())[0]?.fotos || [];
  const filtradas = actuales.filter(f => f !== url);

  await fetch(
    `${SUPA_URL}/rest/v1/${TABLA}?uuid_cfdi=eq.${encodeURIComponent(uuid)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fotos: filtradas })
    }
  );

  showToast("Foto eliminada");
  setTimeout(() => location.reload(), 700);
}

window.eliminarFoto = eliminarFoto;

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

// ============================================================
// COPIAR UUID
// ============================================================
document.addEventListener("click", e => {
  if (e.target.id === "btnCopiarUUID") {
    const texto = document.getElementById("uuidText").textContent;

    navigator.clipboard.writeText(texto)
      .then(() => showToast("UUID copiado"))
      .catch(() => showToast("No se pudo copiar", true));
  }
});

// ============================================================
// FOTOS — CONTROL CENTRAL
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const btnCapturar = $("btnCapturar");
  const btnSubirFoto = $("btnSubirFoto");
  const fotoInput = $("fotoInput");

  if (!btnCapturar || !btnSubirFoto || !fotoInput) {
    console.error("❌ Módulo de fotos incompleto");
    return;
  }

  btnCapturar.onclick = () => {
    fotoInput.value = "";
    fotoInput.setAttribute("capture", "environment");
    fotoInput.click();
  };

  btnSubirFoto.onclick = () => {
    fotoInput.value = "";
    fotoInput.removeAttribute("capture");
    fotoInput.click();
  };

  fotoInput.onchange = async () => {
    if (!fotoInput.files || !fotoInput.files.length) return;
    await subirFoto();
  };
});

// ============================================================
// INICIO
// ============================================================
cargarCFDI();
