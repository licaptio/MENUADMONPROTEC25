const $ = selector => document.querySelector(selector);

export const ui = {
  xmlInput: $("#xmlInput"),
  btnProcesar: $("#btnProcesar"),
  textoSeleccion: $("#textoSeleccion"),
  listaSupabase: $("#listaSupabase"),
  listaFirebase: $("#listaFirebase"),
  bitacora: $("#bitacora"),
  totalSeleccionados: $("#totalSeleccionados"),
  totalValidos: $("#totalValidos"),
  totalSupabase: $("#totalSupabase"),
  totalFirebase: $("#totalFirebase"),

  vistaConfiguracion: $("#vistaConfiguracion"),
  rfcProveedor: $("#rfcProveedor"),
  mensajeConfiguracion: $("#mensajeConfiguracion"),
  listaRfcAutorizados: $("#listaRfcAutorizados")
};

export function abrirConfiguracion() {
  ui.vistaConfiguracion.classList.add("open");
  ui.vistaConfiguracion.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

export function cerrarConfiguracion() {
  ui.vistaConfiguracion.classList.remove("open");
  ui.vistaConfiguracion.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

export function pintarArchivos(archivos) {
  if (!archivos.length) {
    ui.listaSupabase.className = "process-list empty-state";
    ui.listaFirebase.className = "process-list empty-state";
    ui.listaSupabase.textContent = "Selecciona uno o más archivos XML.";
    ui.listaFirebase.textContent = "Selecciona uno o más archivos XML.";
    return;
  }

  ui.listaSupabase.className = "process-list";
  ui.listaFirebase.className = "process-list";
  ui.listaSupabase.innerHTML = "";
  ui.listaFirebase.innerHTML = "";

  archivos.forEach((archivo, index) => {
    ui.listaSupabase.appendChild(crearProceso(index, archivo.nombreArchivo, "supabase"));
    ui.listaFirebase.appendChild(crearProceso(index, archivo.nombreArchivo, "firebase"));
  });
}

function crearProceso(index, nombre, destino) {
  const item = document.createElement("div");
  item.className = "process-item";
  item.dataset.index = String(index);
  item.innerHTML = `
    <div class="process-main">
      <strong>${escapeHtml(nombre)}</strong>
      <span class="process-detail">Pendiente de lectura</span>
    </div>
    <span class="status status-pending" data-destino="${destino}">Pendiente</span>
  `;
  return item;
}

export function actualizarProceso(destino, index, estado, texto, detalle = "") {
  const lista = destino === "supabase" ? ui.listaSupabase : ui.listaFirebase;
  const item = lista.querySelector(`[data-index="${index}"]`);
  if (!item) return;

  const status = item.querySelector(".status");
  const detail = item.querySelector(".process-detail");

  status.className = `status status-${estado}`;
  status.textContent = texto;
  detail.textContent = detalle || item.querySelector("strong").textContent;
}

export function actualizarResumen(resumen) {
  const valores = {
    totalSeleccionados: resumen.seleccionados ?? 0,
    totalValidos: resumen.validos ?? 0,
    totalSupabase: resumen.supabase ?? 0,
    totalFirebase: resumen.firebase ?? 0
  };

  Object.entries(valores).forEach(([clave, valor]) => {
    if (ui[clave]) ui[clave].textContent = String(valor);
  });
}

export function log(mensaje) {
  const hora = new Date().toLocaleTimeString("es-MX");
  if (ui.bitacora.textContent === "Aplicación lista.") {
    ui.bitacora.textContent = "";
  }
  ui.bitacora.textContent += `${hora} - ${mensaje}\n`;
  ui.bitacora.scrollTop = ui.bitacora.scrollHeight;
}

export function limpiarBitacora() {
  ui.bitacora.textContent = "Bitácora limpia.";
}

export function mensajeConfiguracion(texto, tipo = "") {
  ui.mensajeConfiguracion.textContent = texto;
  ui.mensajeConfiguracion.className = `form-message ${tipo}`;
}

export function pintarRfcAutorizados(rfcs, onEliminar) {
  if (!rfcs.length) {
    ui.listaRfcAutorizados.className = "authorized-list empty-state";
    ui.listaRfcAutorizados.textContent = "No hay RFC autorizados.";
    return;
  }

  ui.listaRfcAutorizados.className = "authorized-list";
  ui.listaRfcAutorizados.innerHTML = "";

  rfcs.forEach(rfc => {
    const item = document.createElement("div");
    item.className = "authorized-item";

    const texto = document.createElement("span");
    texto.className = "authorized-rfc";
    texto.textContent = rfc;

    const boton = document.createElement("button");
    boton.className = "delete-button";
    boton.type = "button";
    boton.textContent = "Eliminar";
    boton.addEventListener("click", () => onEliminar(rfc));

    item.append(texto, boton);
    ui.listaRfcAutorizados.appendChild(item);
  });
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
