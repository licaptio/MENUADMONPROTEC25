import { actualizarCliente, buscarClientes, listarClientesBase, obtenerCliente } from "./clientes.service.js";
import { calcularResumenDocumentos, listarDocumentos, subirDocumentoPrincipal } from "./documentos.service.js";

const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 20;

let onClienteSeleccionado = null;
let clientesActuales = [];
let paginaActual = 1;
let clienteSeleccionado = null;
let snapshotEdicion = null;
let modalDocumentosActuales = [];
let archivosCaptura = {
  foto_cliente: null,
  identificacion: null,
  comprobante_domicilio: null
};

const urlsPreviewCaptura = {};

let editorImagen = {
  file: null,
  tipo: null,
  img: null,
  rotation: 0,
  zoom: 1,
  minZoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  resolve: null,
  reject: null
};

const CAMPOS_FICHA = {
  editIdCliente: c => c.idCliente || c.id,
  editNombre: c => c.nombre,
  editRfc: c => c.rfc,
  editRegimenFiscal: c => c.regimenFiscal,
  editEmail: c => c.email,
  editTelefono: c => c.telefono,
  editDireccion: c => c.direccion,
  editNumeroExterior: c => c.numeroExterior,
  editColonia: c => c.colonia,
  editCp: c => c.cp,
  editCiudad: c => c.ciudad,
  editMunicipio: c => c.municipio,
  editEstado: c => c.estado,
  editPais: c => c.pais,
  editDireccionGoogleUrl: c => c.direccionGoogleUrl,
  editCatPrecio: c => c.catPrecio,
  editAgregarPorcentaje: c => c.agregarPorcentaje
};

const PRINCIPALES = {
  foto_cliente: {
    preview: "previewFotoCliente",
    estado: "capEstadoFoto",
    verModal: "btnVerFotoDesdeFicha",
    verCaptura: "btnVerFotoPrincipal",
    clienteUrl: ["fotoClientePrincipalUrl", "fotoClienteUrl"],
    titulo: "Foto principal",
    obs: "Actualización de foto principal desde captura rápida"
  },
  identificacion: {
    preview: "previewIdentificacion",
    estado: "capEstadoIdentificacion",
    verModal: "btnVerIdentificacionDesdeFicha",
    verCaptura: "btnVerIdentificacionPrincipal",
    clienteUrl: ["identificacionPrincipalUrl"],
    titulo: "Identificación oficial",
    obs: "Actualización de identificación principal desde captura rápida"
  },
  comprobante_domicilio: {
    preview: "previewComprobante",
    estado: "capEstadoComprobante",
    verModal: "btnVerComprobanteDesdeFicha",
    verCaptura: "btnVerComprobantePrincipal",
    clienteUrl: ["comprobantePrincipalUrl"],
    titulo: "Comprobante domicilio",
    obs: "Actualización de comprobante principal desde captura rápida"
  }
};

export async function initClientesUI(callback) {
  onClienteSeleccionado = callback;

  $("btnBuscarCliente").addEventListener("click", buscar);
  $("txtBuscarCliente").addEventListener("input", debounce(buscar, 350));
  $("txtBuscarCliente").addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });

  $("btnLimpiarBusqueda").addEventListener("click", async () => {
    $("txtBuscarCliente").value = "";
    await cargarListadoInicial();
  });

  $("btnPaginaAnterior").addEventListener("click", () => cambiarPagina(-1));
  $("btnPaginaSiguiente").addEventListener("click", () => cambiarPagina(1));
  $("btnEditarCliente").addEventListener("click", habilitarEdicion);
  $("btnCancelarEdicion").addEventListener("click", cancelarEdicion);
  $("btnGuardarCliente").addEventListener("click", guardarCliente);
  $("btnCerrarFicha").addEventListener("click", cerrarFicha);
  $("btnAbrirGoogleMaps").addEventListener("click", abrirGoogleMaps);
  $("btnAbrirCargaDocumentos")?.addEventListener("click", abrirCapturaDocumentos);
  $("btnVolverFichaDesdeCaptura")?.addEventListener("click", () => {
    if (clienteSeleccionado) abrirFicha();
    mostrarVista("clientesView");
  });

  initCapturaPrincipal();
  initBotonesVerPrincipales();

  $("modalFichaOverlay").addEventListener("click", (e) => { if (e.target.id === "modalFichaOverlay") cerrarFicha(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modalFichaOverlay").hidden) cerrarFicha(); });
  activarArrastreModal();

  setFichaEditable(false);
  await cargarListadoInicial();
}

async function cargarListadoInicial() {
  setEstado("Cargando clientes...");
  clientesActuales = await listarClientesBase();
  paginaActual = 1;
  pintarListado();
  setEstado(`Clientes: ${clientesActuales.length}`);
}

async function buscar() {
  setEstado("Buscando cliente...");
  clientesActuales = await buscarClientes($("txtBuscarCliente").value);
  paginaActual = 1;
  pintarListado();
  setEstado(`Resultados: ${clientesActuales.length}`);
}

function pintarListado() {
  const cont = $("resultadosClientes");
  cont.innerHTML = "";

  if (!clientesActuales.length) {
    cont.innerHTML = `<div class="hint">Sin resultados</div>`;
    actualizarPaginacion();
    return;
  }

  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const pagina = clientesActuales.slice(inicio, inicio + PAGE_SIZE);

  const tabla = document.createElement("div");
  tabla.className = "clientes-table";
  tabla.innerHTML = `
    <div class="clientes-head">
      <span>ID</span>
      <span>Nombre</span>
      <span>RFC</span>
      <span>Ciudad</span>
      <span>Acción</span>
    </div>
  `;

  pagina.forEach(c => {
    const idCliente = c.idCliente || c.id;
    const row = document.createElement("div");
    row.className = "cliente-row";
    row.innerHTML = `
      <span><b>${esc(idCliente)}</b></span>
      <span>${esc(c.nombre || "SIN NOMBRE")}</span>
      <span>${esc(c.rfc || "")}</span>
      <span>${esc(c.ciudad || c.municipio || "")}</span>
      <span><button type="button">Ver</button></span>
    `;
    row.addEventListener("click", (e) => { if (e.target.tagName !== "BUTTON") seleccionar(idCliente); });
    row.addEventListener("dblclick", () => seleccionar(idCliente));
    row.querySelector("button").addEventListener("click", () => seleccionar(idCliente));
    tabla.appendChild(row);
  });

  cont.appendChild(tabla);
  actualizarPaginacion();
}

function actualizarPaginacion() {
  const totalPaginas = Math.max(1, Math.ceil(clientesActuales.length / PAGE_SIZE));
  $("lblPaginacionClientes").textContent = `Página ${paginaActual} de ${totalPaginas} · ${clientesActuales.length} cliente(s)`;
  $("btnPaginaAnterior").disabled = paginaActual <= 1;
  $("btnPaginaSiguiente").disabled = paginaActual >= totalPaginas || !clientesActuales.length;
}

function cambiarPagina(delta) {
  const totalPaginas = Math.max(1, Math.ceil(clientesActuales.length / PAGE_SIZE));
  paginaActual = Math.min(totalPaginas, Math.max(1, paginaActual + delta));
  pintarListado();
}

async function seleccionar(idCliente) {
  const c = await obtenerCliente(idCliente);
  if (!c) return alert("Cliente no encontrado");

  clienteSeleccionado = c;
  snapshotEdicion = structuredClone(c);
  pintarFicha(c);
  abrirFicha();
  setFichaEditable(false);
  onClienteSeleccionado?.(c);
  await refrescarEstadoDocumentos();
}

function abrirFicha() {
  const overlay = $("modalFichaOverlay");
  const panel = $("fichaClienteCard");
  overlay.hidden = false;
  panel.hidden = false;
  panel.style.left = "50%";
  panel.style.top = "48%";
  panel.style.transform = "translate(-50%, -50%)";
}

function cerrarFicha() {
  if (!$("modalFichaOverlay")) return;
  if (!$("btnGuardarCliente").hidden && !confirm("Hay edición activa. ¿Cerrar sin guardar?")) return;
  setFichaEditable(false);
  $("modalFichaOverlay").hidden = true;
  $("fichaClienteCard").hidden = true;
}

function pintarFicha(c) {
  $("fichaClienteCard").hidden = false;
  Object.entries(CAMPOS_FICHA).forEach(([id, getter]) => {
    $(id).value = getter(c) ?? "";
  });
  actualizarBotonGoogleMaps();
  pintarEstadoPrincipalDesdeCliente();
}

function setFichaEditable(editable) {
  Object.keys(CAMPOS_FICHA).forEach(id => {
    $(id).disabled = id === "editIdCliente" ? true : !editable;
  });
  $("btnEditarCliente").hidden = editable || !clienteSeleccionado;
  $("btnGuardarCliente").hidden = !editable;
  $("btnCancelarEdicion").hidden = !editable;
}

function habilitarEdicion() {
  if (!clienteSeleccionado) return;
  snapshotEdicion = structuredClone(clienteSeleccionado);
  setFichaEditable(true);
  setEstado("Editando cliente");
}

function cancelarEdicion() {
  if (snapshotEdicion) pintarFicha(snapshotEdicion);
  setFichaEditable(false);
  setEstado("Edición cancelada");
}

async function guardarCliente() {
  const idCliente = $("editIdCliente").value;

  await actualizarCliente(idCliente, {
    nombre: $("editNombre").value.trim(),
    rfc: $("editRfc").value.trim().toUpperCase(),
    regimenFiscal: $("editRegimenFiscal").value.trim(),
    email: $("editEmail").value.trim(),
    telefono: $("editTelefono").value.trim(),
    direccion: $("editDireccion").value.trim(),
    numeroExterior: $("editNumeroExterior").value.trim(),
    colonia: $("editColonia").value.trim(),
    cp: $("editCp").value.trim(),
    ciudad: $("editCiudad").value.trim().toUpperCase(),
    municipio: $("editMunicipio").value.trim().toUpperCase(),
    estado: $("editEstado").value.trim().toUpperCase(),
    pais: $("editPais").value.trim().toUpperCase(),
    direccionGoogleUrl: $("editDireccionGoogleUrl").value.trim(),
    catPrecio: Number($("editCatPrecio").value || 0),
    agregarPorcentaje: Number($("editAgregarPorcentaje").value || 0)
  });

  clienteSeleccionado = await obtenerCliente(idCliente);
  snapshotEdicion = structuredClone(clienteSeleccionado);
  pintarFicha(clienteSeleccionado);
  setFichaEditable(false);
  setEstado("Cliente actualizado");
  alert("Cliente actualizado");
  await buscar();
}

function actualizarBotonGoogleMaps() {
  const url = $("editDireccionGoogleUrl")?.value?.trim();
  const btn = $("btnAbrirGoogleMaps");
  if (!btn) return;
  btn.disabled = !url;
  btn.textContent = url ? "Abrir mapa" : "Sin mapa";
}

function abrirGoogleMaps() {
  const url = $("editDireccionGoogleUrl").value.trim();
  if (!url) return alert("Este cliente no tiene URL de Google Maps.");
  window.open(url, "_blank", "noopener,noreferrer");
}

async function refrescarEstadoDocumentos() {
  if (!clienteSeleccionado) return;
  modalDocumentosActuales = await listarDocumentos(clienteSeleccionado.idCliente || clienteSeleccionado.id);
  pintarEstadoPrincipalDesdeCliente();
  pintarEstadoCaptura();
}

function pintarEstadoPrincipalDesdeCliente() {
  if (!clienteSeleccionado) return;
  const resumen = calcularResumenDocumentos(modalDocumentosActuales || []);
  const fotoUrl = obtenerUrlPrincipal("foto_cliente");
  const ineUrl = obtenerUrlPrincipal("identificacion");
  const compUrl = obtenerUrlPrincipal("comprobante_domicilio");

  setStatusCard("statusFotoCliente", "statusFotoTexto", "btnVerFotoDesdeFicha", !!(fotoUrl || resumen.fotoCapturada));
  setStatusCard("statusIdentificacion", "statusIdentificacionTexto", "btnVerIdentificacionDesdeFicha", !!(ineUrl || resumen.identificacionCapturada));
  setStatusCard("statusComprobante", "statusComprobanteTexto", "btnVerComprobanteDesdeFicha", !!(compUrl || resumen.comprobanteCapturado));

  const label = $("modalDocsResumen");
  if (label) {
    label.textContent = `Foto: ${fotoUrl || resumen.fotoCapturada ? "SÍ" : "NO"} · Identificación: ${ineUrl || resumen.identificacionCapturada ? "SÍ" : "NO"} · Comprobante: ${compUrl || resumen.comprobanteCapturado ? "SÍ" : "NO"}`;
  }
}

function setStatusCard(cardId, textId, btnId, ok) {
  const card = $(cardId);
  const txt = $(textId);
  const btn = $(btnId);
  if (card) card.classList.toggle("ok", ok);
  if (txt) txt.textContent = ok ? "Cargado" : "Pendiente";
  if (btn) btn.disabled = !ok;
}

function obtenerUrlPrincipal(tipo) {
  if (!clienteSeleccionado) return "";
  const cfg = PRINCIPALES[tipo];
  for (const campo of cfg.clienteUrl) {
    if (clienteSeleccionado[campo]) return clienteSeleccionado[campo];
  }
  const docPrincipal = (modalDocumentosActuales || []).find(d => d.tipoPrincipal === tipo && d.esPrincipal && d.downloadUrl);
  if (docPrincipal) return docPrincipal.downloadUrl;
  const fallbackCat = tipo === "foto_cliente" ? ["foto_cliente", "perfil"] : [tipo];
  const doc = (modalDocumentosActuales || []).find(d => fallbackCat.includes(d.categoria) && d.downloadUrl);
  return doc?.downloadUrl || "";
}

function initBotonesVerPrincipales() {
  Object.entries(PRINCIPALES).forEach(([tipo, cfg]) => {
    [cfg.verModal, cfg.verCaptura].forEach(id => {
      $(id)?.addEventListener("click", () => abrirPrincipal(tipo));
    });
  });
}

function abrirPrincipal(tipo) {
  const url = obtenerUrlPrincipal(tipo);
  if (!url) return alert("No hay documento principal cargado todavía.");
  window.open(url, "_blank", "noopener,noreferrer");
}

function abrirCapturaDocumentos() {
  if (!clienteSeleccionado) return alert("Selecciona un cliente primero.");
  cerrarFicha();
  mostrarVista("capturaView");
  pintarEstadoCaptura();
}

function mostrarVista(viewId) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active-view", v.id === viewId));
}

function initCapturaPrincipal() {
  bindFilePair("foto_cliente", "fileFotoCliente", "camFotoCliente", "btnGuardarFotoCliente");
  bindFilePair("identificacion", "fileIdentificacion", "camIdentificacion", "btnGuardarIdentificacion");
  bindFilePair("comprobante_domicilio", "fileComprobante", "camComprobante", "btnGuardarComprobante");
  initEditorImagen();
  pintarEstadoCaptura();
}

function bindFilePair(tipo, fileId, camId, btnId) {
  const onChange = async e => {
    const original = Array.from(e.target.files || [])[0] || null;
    if (!original) {
      archivosCaptura[tipo] = null;
      pintarArchivoSeleccionado(tipo);
      return;
    }

    try {
      if (esImagenEditable(original)) {
        archivosCaptura[tipo] = await editarImagenAntesDeSubir(original, tipo);
      } else {
        archivosCaptura[tipo] = original;
      }
      pintarArchivoSeleccionado(tipo);
    } catch (err) {
      console.warn("Edición cancelada", err);
      e.target.value = "";
      archivosCaptura[tipo] = null;
      pintarArchivoSeleccionado(tipo);
    }
  };
  $(fileId)?.addEventListener("change", onChange);
  $(camId)?.addEventListener("change", onChange);
  $(btnId)?.addEventListener("click", () => guardarPrincipal(tipo));
}

function pintarArchivoSeleccionado(tipo) {
  const cfg = PRINCIPALES[tipo];
  const file = archivosCaptura[tipo];
  const el = $(cfg.preview);
  if (!el) return;
  if (!file) {
    el.textContent = "Sin archivo seleccionado";
    return;
  }

  if (file.type?.startsWith("image/")) {
    if (urlsPreviewCaptura[tipo]) URL.revokeObjectURL(urlsPreviewCaptura[tipo]);
    urlsPreviewCaptura[tipo] = URL.createObjectURL(file);
    el.innerHTML = `
      <img class="preview-thumb" src="${urlsPreviewCaptura[tipo]}" alt="Vista previa" />
      <b>${esc(file.name || "foto_camara.jpg")}</b><br>
      <small>${esc(file.type || "imagen")} · ${bytesLegibles(file.size)}</small>
    `;
    return;
  }

  el.innerHTML = `<b>${esc(file.name || "archivo")}</b><br><small>${esc(file.type || "archivo")} · ${bytesLegibles(file.size)}</small>`;
}

function pintarEstadoCaptura() {
  if (!$("capturaClienteLabel")) return;
  if (!clienteSeleccionado) {
    $("capturaClienteLabel").textContent = "Selecciona un cliente desde Clientes para cargar documentos.";
  } else {
    $("capturaClienteLabel").textContent = `${clienteSeleccionado.nombre || "SIN NOMBRE"} · Socio ${clienteSeleccionado.idCliente || clienteSeleccionado.id}`;
  }

  Object.entries(PRINCIPALES).forEach(([tipo, cfg]) => {
    const url = obtenerUrlPrincipal(tipo);
    const status = $(cfg.estado);
    if (status) status.textContent = url ? `${cfg.titulo}: cargado como principal` : `${cfg.titulo}: pendiente`;
    const btn = $(cfg.verCaptura);
    if (btn) btn.disabled = !url;
    pintarArchivoSeleccionado(tipo);
  });
}

async function guardarPrincipal(tipo) {
  if (!clienteSeleccionado) return alert("Selecciona un cliente primero.");
  const file = archivosCaptura[tipo];
  if (!file) return alert("Selecciona archivo o toma foto primero.");
  const idCliente = clienteSeleccionado.idCliente || clienteSeleccionado.id;

  setEstado(`Subiendo ${PRINCIPALES[tipo].titulo.toLowerCase()}...`);
  await subirDocumentoPrincipal(idCliente, tipo, file, PRINCIPALES[tipo].obs);
  archivosCaptura[tipo] = null;
  limpiarInputCaptura(tipo);
  clienteSeleccionado = await obtenerCliente(idCliente);
  snapshotEdicion = structuredClone(clienteSeleccionado);
  await refrescarEstadoDocumentos();
  pintarFicha(clienteSeleccionado);
  onClienteSeleccionado?.(clienteSeleccionado);
  setEstado(`${PRINCIPALES[tipo].titulo} actualizado`);
  alert(`${PRINCIPALES[tipo].titulo} actualizado`);
}

function limpiarInputCaptura(tipo) {
  const ids = {
    foto_cliente: ["fileFotoCliente", "camFotoCliente"],
    identificacion: ["fileIdentificacion", "camIdentificacion"],
    comprobante_domicilio: ["fileComprobante", "camComprobante"]
  }[tipo] || [];
  ids.forEach(id => { if ($(id)) $(id).value = ""; });
}


function esImagenEditable(file) {
  return file && file.type && file.type.startsWith("image/");
}

function initEditorImagen() {
  const canvas = $("canvasEditorImagen");
  if (!canvas || canvas.dataset.ready === "1") return;
  canvas.dataset.ready = "1";

  $("btnRotarIzq")?.addEventListener("click", () => rotarEditor(-90));
  $("btnRotarDer")?.addEventListener("click", () => rotarEditor(90));
  $("btnCentrarImagen")?.addEventListener("click", () => resetEditorTransform());
  $("rangeZoomImagen")?.addEventListener("input", e => {
    editorImagen.zoom = Number(e.target.value || 1);
    dibujarEditorImagen();
  });
  $("btnCancelarEditorImagen")?.addEventListener("click", () => cancelarEditorImagen());
  $("btnUsarImagenEditada")?.addEventListener("click", () => aceptarEditorImagen());

  const empezar = e => {
    e.preventDefault();
    const p = puntoCanvas(e);
    editorImagen.dragging = true;
    editorImagen.lastX = p.x;
    editorImagen.lastY = p.y;
  };
  const mover = e => {
    if (!editorImagen.dragging) return;
    e.preventDefault();
    const p = puntoCanvas(e);
    editorImagen.offsetX += p.x - editorImagen.lastX;
    editorImagen.offsetY += p.y - editorImagen.lastY;
    editorImagen.lastX = p.x;
    editorImagen.lastY = p.y;
    dibujarEditorImagen();
  };
  const terminar = () => { editorImagen.dragging = false; };

  canvas.addEventListener("mousedown", empezar);
  canvas.addEventListener("mousemove", mover);
  window.addEventListener("mouseup", terminar);
  canvas.addEventListener("touchstart", empezar, { passive: false });
  canvas.addEventListener("touchmove", mover, { passive: false });
  window.addEventListener("touchend", terminar);
}

function puntoCanvas(e) {
  const canvas = $("canvasEditorImagen");
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function editarImagenAntesDeSubir(file, tipo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        editorImagen = {
          file,
          tipo,
          img,
          rotation: 0,
          zoom: 1,
          minZoom: 1,
          offsetX: 0,
          offsetY: 0,
          dragging: false,
          lastX: 0,
          lastY: 0,
          resolve,
          reject
        };
        $("editorImagenTitulo").textContent = tipo === "foto_cliente" ? "Editar foto del cliente" : "Editar documento";
        $("editorImagenOverlay").hidden = false;
        prepararCanvasEditor();
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("No se pudo cargar el archivo"));
    reader.readAsDataURL(file);
  });
}

function dimensionesOrientadas() {
  const img = editorImagen.img;
  const rot = ((editorImagen.rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;
  return {
    w: swap ? img.naturalHeight : img.naturalWidth,
    h: swap ? img.naturalWidth : img.naturalHeight
  };
}

function prepararCanvasEditor() {
  const canvas = $("canvasEditorImagen");
  const d = dimensionesOrientadas();
  if (editorImagen.tipo === "foto_cliente") {
    canvas.width = 900;
    canvas.height = 900;
  } else {
    const max = 1400;
    const scale = Math.min(1, max / Math.max(d.w, d.h));
    canvas.width = Math.max(700, Math.round(d.w * scale));
    canvas.height = Math.max(500, Math.round(d.h * scale));
  }
  resetEditorTransform();
}

function resetEditorTransform() {
  const canvas = $("canvasEditorImagen");
  const d = dimensionesOrientadas();
  const minZoom = Math.max(canvas.width / d.w, canvas.height / d.h);
  editorImagen.minZoom = minZoom;
  editorImagen.zoom = minZoom;
  editorImagen.offsetX = 0;
  editorImagen.offsetY = 0;
  const zoom = $("rangeZoomImagen");
  if (zoom) {
    zoom.min = String(minZoom);
    zoom.max = String(Math.max(minZoom * 4, 3));
    zoom.value = String(minZoom);
  }
  dibujarEditorImagen();
}

function rotarEditor(grados) {
  editorImagen.rotation = (editorImagen.rotation + grados) % 360;
  prepararCanvasEditor();
}

function dibujarEditorImagen() {
  const canvas = $("canvasEditorImagen");
  const ctx = canvas.getContext("2d");
  const img = editorImagen.img;
  if (!canvas || !ctx || !img) return;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rot = ((editorImagen.rotation % 360) + 360) % 360;
  const d = dimensionesOrientadas();
  const drawW = d.w * editorImagen.zoom;
  const drawH = d.h * editorImagen.zoom;
  const cx = canvas.width / 2 + editorImagen.offsetX;
  const cy = canvas.height / 2 + editorImagen.offsetY;

  ctx.translate(cx, cy);
  ctx.rotate(rot * Math.PI / 180);
  const sourceW = img.naturalWidth;
  const sourceH = img.naturalHeight;
  const renderW = (rot === 90 || rot === 270) ? drawH : drawW;
  const renderH = (rot === 90 || rot === 270) ? drawW : drawH;
  ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(200,0,0,.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
  ctx.restore();
}

function aceptarEditorImagen() {
  const canvas = $("canvasEditorImagen");
  const original = editorImagen.file;
  canvas.toBlob(blob => {
    if (!blob) return editorImagen.reject?.(new Error("No se pudo generar la imagen"));
    const base = String(original.name || "imagen.jpg").replace(/\.[^.]+$/, "");
    const file = new File([blob], `${base}_editada.jpg`, { type: "image/jpeg" });
    const resolve = editorImagen.resolve;
    cerrarEditorImagen();
    resolve?.(file);
  }, "image/jpeg", 0.88);
}

function cancelarEditorImagen() {
  const reject = editorImagen.reject;
  cerrarEditorImagen();
  reject?.(new Error("cancelado"));
}

function cerrarEditorImagen() {
  $("editorImagenOverlay").hidden = true;
  editorImagen.resolve = null;
  editorImagen.reject = null;
}

function bytesLegibles(bytes = 0) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function activarArrastreModal() {
  const panel = $("fichaClienteCard");
  const header = $("modalFichaHeader");
  if (!panel || !header) return;

  let activo = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    activo = true;
    const rect = panel.getBoundingClientRect();
    panel.style.transform = "none";
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.classList.add("dragging-modal");
  });

  document.addEventListener("mousemove", (e) => {
    if (!activo) return;
    const maxX = window.innerWidth - panel.offsetWidth - 10;
    const maxY = window.innerHeight - panel.offsetHeight - 10;
    const x = Math.max(10, Math.min(maxX, e.clientX - offsetX));
    const y = Math.max(10, Math.min(maxY, e.clientY - offsetY));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  });

  document.addEventListener("mouseup", () => {
    activo = false;
    document.body.classList.remove("dragging-modal");
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function esc(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setEstado(txt) {
  $("estadoSistema").textContent = txt;
}
