import {
  calcularResumenDocumentos,
  eliminarDocumento,
  listarDocumentos,
  nombreCategoria,
  subirDocumentos
} from "./documentos.service.js";

const $ = (id) => document.getElementById(id);
let clienteActual = null;
let archivosPendientes = [];
let documentosActuales = [];

function bytesLegibles(bytes = 0) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fechaLegible(valor) {
  const fecha = valor?.toDate ? valor.toDate() : null;
  if (!fecha) return "";
  return fecha.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function pintarArchivosPendientes() {
  const cont = $("archivosPendientes");
  if (!cont) return;

  if (!archivosPendientes.length) {
    cont.innerHTML = `<div class="hint">Sin archivos seleccionados.</div>`;
    return;
  }

  cont.innerHTML = archivosPendientes.map((file, index) => `
    <div class="pending-file">
      <div><b>${file.name}</b><br><small>${file.type || "archivo"} · ${bytesLegibles(file.size)}</small></div>
      <button class="secondary" type="button" data-remove-pending="${index}">Quitar</button>
    </div>
  `).join("");

  cont.querySelectorAll("[data-remove-pending]").forEach(btn => {
    btn.onclick = () => {
      const index = Number(btn.dataset.removePending);
      archivosPendientes.splice(index, 1);
      pintarArchivosPendientes();
    };
  });
}

function agregarArchivos(files) {
  const nuevos = Array.from(files || []);
  archivosPendientes.push(...nuevos);
  pintarArchivosPendientes();
}

function limpiarSeleccion() {
  archivosPendientes = [];
  $("fileDocumento").value = "";
  $("fileCamaraDocumento").value = "";
  pintarArchivosPendientes();
}

function pintarResumen(documentos) {
  const resumen = calcularResumenDocumentos(documentos);
  $("resTotalDocs").textContent = resumen.totalDocumentos;
  $("resFoto").textContent = resumen.fotoCapturada ? "SÍ" : "NO";
  $("resIdentificacion").textContent = resumen.identificacionCapturada ? "SÍ" : "NO";
  $("resComprobante").textContent = resumen.comprobanteCapturado ? "SÍ" : "NO";
}

function pintarClienteHeader(cliente) {
  if (!cliente) {
    $("expedienteClienteLabel").textContent = "Selecciona un cliente para administrar su expediente.";
    return;
  }
  $("expedienteClienteLabel").textContent = `${cliente.nombre || "SIN NOMBRE"} · Socio ${cliente.idCliente || cliente.id}`;
}

function pintarDocumentos() {
  const filtro = $("selFiltroCategoriaDoc").value;
  const docs = filtro === "TODOS"
    ? documentosActuales
    : documentosActuales.filter(d => d.categoria === filtro);

  const cont = $("listaDocumentos");
  cont.innerHTML = "";

  if (!clienteActual) {
    cont.innerHTML = `<div class="hint">Selecciona un cliente para ver documentos.</div>`;
    return;
  }

  if (!docs.length) {
    cont.innerHTML = `<div class="hint">Sin documentos en esta categoría.</div>`;
    return;
  }

  const tabla = document.createElement("div");
  tabla.className = "docs-table";
  tabla.innerHTML = `
    <div class="docs-head">
      <div>Archivo</div><div>Categoría</div><div>Fecha</div><div>Tamaño</div><div>Acciones</div>
    </div>
  `;

  docs.forEach(d => {
    const row = document.createElement("div");
    row.className = "doc-row";
    row.innerHTML = `
      <div><b>${d.nombreArchivo || "archivo"}</b><br><small>${d.observaciones || d.storagePath || ""}</small></div>
      <div>${nombreCategoria(d.categoria)}</div>
      <div>${fechaLegible(d.fechaSubida)}</div>
      <div>${bytesLegibles(d.size)}</div>
      <div class="doc-actions">
        <button class="secondary" type="button" data-ver>Ver</button>
        <button class="secondary" type="button" data-descargar>Descargar</button>
        <button type="button" data-eliminar>Eliminar</button>
      </div>`;

    row.querySelector("[data-ver]").onclick = () => window.open(d.downloadUrl, "_blank");
    row.querySelector("[data-descargar]").onclick = () => window.open(d.downloadUrl, "_blank");
    row.querySelector("[data-eliminar]").onclick = async () => {
      if (!confirm(`¿Eliminar del expediente ${d.nombreArchivo}?`)) return;
      setEstado("Eliminando documento...");
      await eliminarDocumento(clienteActual.idCliente || clienteActual.id, d);
      await refrescar(clienteActual);
      setEstado("Documento eliminado del expediente");
    };

    tabla.appendChild(row);
  });

  cont.appendChild(tabla);
}

export function initDocumentosUI(getCliente) {
  $("fileDocumento").addEventListener("change", e => agregarArchivos(e.target.files));
  $("fileCamaraDocumento").addEventListener("change", e => agregarArchivos(e.target.files));
  $("btnLimpiarArchivos").addEventListener("click", limpiarSeleccion);
  $("selFiltroCategoriaDoc").addEventListener("change", pintarDocumentos);

  const dropZone = $("dropZoneDocumentos");
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    agregarArchivos(e.dataTransfer.files);
  });

  $("btnSubirDocumentos").addEventListener("click", async () => {
    clienteActual = getCliente();
    if (!clienteActual) return alert("Selecciona un cliente");
    if (!archivosPendientes.length) return alert("Selecciona archivo(s) o toma foto desde el celular");

    setEstado("Subiendo documentos...");
    await subirDocumentos(
      clienteActual.idCliente || clienteActual.id,
      $("selCategoriaDoc").value,
      archivosPendientes,
      $("txtObservacionesDoc").value
    );
    $("txtObservacionesDoc").value = "";
    limpiarSeleccion();
    await refrescar(clienteActual);
    setEstado("Documentos subidos");
  });

  $("btnRefrescarDocs").addEventListener("click", () => {
    const c = getCliente();
    if (c) refrescar(c);
  });

  pintarArchivosPendientes();
}

export async function refrescar(cliente) {
  clienteActual = cliente;
  pintarClienteHeader(cliente);
  const cont = $("listaDocumentos");
  cont.innerHTML = "";

  if (!cliente) {
    documentosActuales = [];
    pintarResumen(documentosActuales);
    pintarDocumentos();
    return;
  }

  setEstado("Leyendo expediente...");
  documentosActuales = await listarDocumentos(cliente.idCliente || cliente.id);
  pintarResumen(documentosActuales);
  pintarDocumentos();
  setEstado(`Expediente: ${documentosActuales.length} documento(s)`);
}

function setEstado(txt) { $("estadoSistema").textContent = txt; }
