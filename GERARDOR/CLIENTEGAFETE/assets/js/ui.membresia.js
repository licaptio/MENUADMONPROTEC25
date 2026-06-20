import { obtenerCliente, actualizarMembresiaCliente } from "./clientes.service.js";
import { subirMembresiaPng } from "./storage.service.js";
import { getBlob, ref as storageRef } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storageClientes } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
let clienteActual = null;
let ultimoBlob = null;
let ultimoPreviewUrl = "";

const COLORES = {
  1: { barra: "#198754", borde: "#198754" }, // Normal verde
  2: { barra: "#ffc107", borde: "#e0a800" }, // 1/2 mayoreo amarillo
  3: { barra: "#0d6efd", borde: "#0d6efd" }  // Mayoreo azul
};

export function pintarMembresia(cliente) {
  clienteActual = cliente || null;
  ultimoBlob = null;
  if (ultimoPreviewUrl) URL.revokeObjectURL(ultimoPreviewUrl);
  ultimoPreviewUrl = "";

  const panel = $("membresiaPanel");
  if (!cliente) {
    panel.innerHTML = "<p>Selecciona un cliente para ver su membresía.</p>";
    return;
  }

  const idCliente = String(cliente.idCliente || cliente.id || "");
  const vence = formatearFecha(cliente.fechaVencimientoMembresia);
  const foto = obtenerFotoPrincipal(cliente);
  const generada = !!(cliente.membresiaGenerada || cliente.tieneMembresia || cliente.membresiaImagenUrl);

  panel.innerHTML = `
    <div class="membresia-work">
      <div class="membresia-info card-soft">
        <h4>${esc(cliente.nombre || "SIN NOMBRE")}</h4>
        <div><b>ID QR:</b> ${esc(idCliente)}</div>
        <div><b>Vigencia:</b> ${esc(vence || "Sin vigencia")}</div>
        <div><b>catPrecio:</b> ${esc(cliente.catPrecio ?? "")}</div>
        <div><b>Estado:</b> ${generada ? "Generada" : "Pendiente"}</div>
        <div class="membresia-actions">
          <button id="btnGenerarGafete" type="button">${generada ? "Regenerar gafete" : "Generar gafete"}</button>
          <button id="btnVerGafete" type="button" class="secondary" ${cliente.membresiaImagenUrl ? "" : "disabled"}>Ver actual</button>
          <button id="btnDescargarGafete" type="button" class="secondary" ${cliente.membresiaImagenUrl ? "" : "disabled"}>Descargar PNG</button>
        </div>
        <p class="hint">Al regenerar, se sustituye el mismo archivo: clientes/${esc(idCliente)}/membresia/gafete.png. No se guarda historial.</p>
      </div>
      <div class="gafete-preview-wrap">
        <div id="gafetePreview" class="gafete-preview-empty">Genera la membresía para ver la vista previa.</div>
      </div>
    </div>
  `;

  $("btnGenerarGafete").onclick = generarYGuardarGafete;
  $("btnVerGafete").onclick = () => abrirUrl(clienteActual?.membresiaImagenUrl);
  $("btnDescargarGafete").onclick = () => descargarUrl(clienteActual?.membresiaImagenUrl, `membresia_${idCliente}.png`);

  if (cliente.membresiaImagenUrl) {
    $("gafetePreview").innerHTML = `<img class="gafete-img-preview" src="${esc(cliente.membresiaImagenUrl)}" alt="Membresía generada" />`;
  } else if (!foto) {
    $("gafetePreview").innerHTML = `<div class="hint">Falta foto principal del cliente.</div>`;
  }
}

async function generarYGuardarGafete() {
  if (!clienteActual) return alert("Selecciona un cliente primero.");
  const idCliente = String(clienteActual.idCliente || clienteActual.id || "").trim();
  if (!idCliente) return alert("Cliente sin idCliente.");

  const fotoPath = obtenerFotoPrincipalPath(clienteActual);
  const fotoUrl = obtenerFotoPrincipal(clienteActual);
  if (!fotoPath && !fotoUrl) return alert("Falta foto principal del cliente. Cárgala primero en documentos.");

  const btn = $("btnGenerarGafete");
  btn.disabled = true;
  btn.textContent = "Generando...";

  try {
    const blob = await crearGafetePng(clienteActual);
    ultimoBlob = blob;
    if (ultimoPreviewUrl) URL.revokeObjectURL(ultimoPreviewUrl);
    ultimoPreviewUrl = URL.createObjectURL(blob);
    $("gafetePreview").innerHTML = `<img class="gafete-img-preview" src="${ultimoPreviewUrl}" alt="Vista previa membresía" />`;

    btn.textContent = "Subiendo...";
    const subido = await subirMembresiaPng({ idCliente, blob });
    const versionAnterior = Number(clienteActual.membresiaVersion || 0);

    await actualizarMembresiaCliente(idCliente, {
      membresiaImagenUrl: subido.url,
      membresiaImagenPath: subido.path,
      membresiaGenerada: true,
      tieneMembresia: true,
      membresiaVersion: versionAnterior + 1
    });

    clienteActual = await obtenerCliente(idCliente);
    pintarMembresia(clienteActual);
    alert("Membresía generada y guardada. Se sustituyó la anterior.");
  } catch (err) {
    console.error(err);
    alert("No se pudo generar la membresía: " + (err.message || err));
  } finally {
    if ($("btnGenerarGafete")) {
      $("btnGenerarGafete").disabled = false;
      $("btnGenerarGafete").textContent = clienteActual?.membresiaImagenUrl ? "Regenerar gafete" : "Generar gafete";
    }
  }
}

async function crearGafetePng(cliente) {
  const W = 720;
  const H = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const cat = Number(cliente.catPrecio || 0);
  const color = COLORES[cat] || COLORES[1];
  const idCliente = String(cliente.idCliente || cliente.id || "");
  const nombre = String(cliente.nombre || "SIN NOMBRE").trim().toUpperCase();
  const vence = formatearFecha(cliente.fechaVencimientoMembresia) || "SIN VIGENCIA";

  // Fondo y bordes.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color.barra;
  ctx.fillRect(0, 0, W, 145);
  ctx.fillStyle = color.barra;
  ctx.fillRect(0, H - 34, W, 34);
  ctx.strokeStyle = color.borde;
  ctx.lineWidth = 12;
  roundRect(ctx, 22, 22, W - 44, H - 44, 32, false, true);

  // Logo.
  const logo = await cargarImagen("./assets/img/logo.jfif");
  dibujarImagenContain(ctx, logo, 155, 28, 410, 95);

  // Título.
  ctx.fillStyle = "#c00000";
  ctx.font = "bold 38px Arial";
  ctx.textAlign = "center";
  ctx.fillText("MEMBRESÍA DIGITAL", W / 2, 210);

  // Foto cliente.
  const foto = await cargarImagenCliente(cliente);
  ctx.save();
  roundRect(ctx, 190, 260, 340, 340, 28, true, false);
  ctx.clip();
  dibujarImagenCover(ctx, foto, 190, 260, 340, 340);
  ctx.restore();
  ctx.strokeStyle = color.borde;
  ctx.lineWidth = 8;
  roundRect(ctx, 190, 260, 340, 340, 28, false, true);

  // Nombre.
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  escribirTextoMultilinea(ctx, nombre, W / 2, 675, W - 90, 42, "bold 34px Arial");

  // Vigencia.
  ctx.fillStyle = "#c00000";
  ctx.font = "bold 34px Arial";
  ctx.fillText(`VENCE ${vence}`, W / 2, 795);

  // QR grande.
  const qrCanvas = await generarQrCanvas(idCliente, 330);
  ctx.drawImage(qrCanvas, (W - 330) / 2, 860, 330, 330);

  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("No se pudo generar PNG")), "image/png", 0.95);
  });
}

function obtenerFotoPrincipal(cliente) {
  return cliente?.fotoClientePrincipalUrl || cliente?.fotoClienteUrl || "";
}

function obtenerFotoPrincipalPath(cliente) {
  return cliente?.fotoClientePrincipalPath || cliente?.fotoClientePath || "";
}

function formatearFecha(valor) {
  let d = null;
  if (!valor) return "";
  if (valor.toDate) d = valor.toDate();
  else d = new Date(valor);
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar imagen: " + src));
    img.src = src;
  });
}

async function cargarImagenCliente(cliente) {
  const path = obtenerFotoPrincipalPath(cliente);

  if (path) {
    const blob = await getBlob(storageRef(storageClientes, path));
    return cargarImagenDesdeBlob(blob);
  }

  // Respaldo para registros viejos sin path. Puede requerir CORS.
  const url = obtenerFotoPrincipal(cliente);
  if (!url) throw new Error("Falta foto principal del cliente");
  return cargarImagenDesdeUrlComoImagen(url);
}

async function cargarImagenDesdeBlob(blob) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await cargarImagen(objectUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }
}

async function cargarImagenDesdeUrlComoImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la foto principal por URL. El cliente no tiene fotoClientePrincipalPath/fotoClientePath o el bucket tiene CORS bloqueado."));
    img.src = agregarCacheBust(url);
  });
}

function agregarCacheBust(url) {
  try {
    const u = new URL(url);
    u.searchParams.set("v", Date.now().toString());
    return u.toString();
  } catch {
    return url;
  }
}

function generarQrCanvas(texto, size) {
  return new Promise((resolve, reject) => {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = "-9999px";
    document.body.appendChild(div);
    try {
      new QRCode(div, { text: String(texto), width: size, height: size, correctLevel: QRCode.CorrectLevel.H });
      setTimeout(() => {
        const canvas = div.querySelector("canvas");
        if (!canvas) {
          div.remove();
          reject(new Error("No se pudo generar QR"));
          return;
        }
        const out = document.createElement("canvas");
        out.width = size;
        out.height = size;
        out.getContext("2d").drawImage(canvas, 0, 0, size, size);
        div.remove();
        resolve(out);
      }, 50);
    } catch (err) {
      div.remove();
      reject(err);
    }
  });
}

function dibujarImagenCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function dibujarImagenContain(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function escribirTextoMultilinea(ctx, texto, x, y, maxWidth, lineHeight, font) {
  ctx.font = font;
  const words = String(texto || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function abrirUrl(url) {
  if (!url) return alert("No hay membresía generada todavía.");
  window.open(url, "_blank", "noopener,noreferrer");
}

async function descargarUrl(url, nombre) {
  if (!url) return alert("No hay membresía generada todavía.");
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function esc(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
