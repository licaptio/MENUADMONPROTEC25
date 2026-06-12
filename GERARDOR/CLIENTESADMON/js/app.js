import { cargarClientes, buscarEnMemoria, guardarCliente, desactivarCliente, clienteDesdeFormulario, siguienteId } from "./clientesApi.js";
import { el, mostrar, ocultar, pintarResultados, pintarDetalle, llenarFormulario, abrirModal, cerrarModal } from "./ui.js";

let clientes = [];
let clienteActual = null;
let modoFormulario = "editar";

async function iniciar() {
  try {
    clientes = await cargarClientes();
    el("resumenCarga").textContent = `${clientes.length} clientes cargados. Usa el buscador para consultar.`;
  } catch (err) {
    console.error(err);
    el("resumenCarga").textContent = "Error cargando clientes. Revisa Firebase o permisos.";
  } finally {
    ocultar("pantallaCarga");
    mostrar("app");
  }
}

function buscar() {
  const texto = el("inputBusqueda").value;
  const resultado = buscarEnMemoria(clientes, texto);
  pintarResultados(resultado, abrirDetalle);
}

function abrirDetalle(cliente) {
  clienteActual = cliente;
  pintarDetalle(cliente);
  ocultar("vistaPrincipal");
  mostrar("vistaDetalle");
}

function regresar() {
  clienteActual = null;
  ocultar("vistaDetalle");
  mostrar("vistaPrincipal");
}

function nuevoCliente() {
  modoFormulario = "nuevo";
  const id = siguienteId(clientes);
  llenarFormulario({ idCliente: id, cliente: Number(id), pais: "MEXICO", activo: true, catPrecio: 1 });
  el("f_idCliente").readOnly = false;
  abrirModal("Alta cliente nuevo");
}

function editarCliente() {
  if (!clienteActual) return;
  modoFormulario = "editar";
  llenarFormulario(clienteActual);
  el("f_idCliente").readOnly = true;
  abrirModal("Editar cliente");
}

async function guardarDesdeModal(e) {
  e.preventDefault();
  const cliente = clienteDesdeFormulario(el("formCliente"));

  try {
    await guardarCliente(cliente);
    clientes = await cargarClientes();
    clienteActual = clientes.find(c => String(c.idCliente) === String(cliente.idCliente)) || cliente;
    cerrarModal();

    if (modoFormulario === "nuevo") {
      el("inputBusqueda").value = cliente.idCliente;
      buscar();
      abrirDetalle(clienteActual);
    } else {
      pintarDetalle(clienteActual);
    }

    alert("Cliente guardado correctamente.");
  } catch (err) {
    console.error(err);
    alert(err.message || "Error al guardar cliente.");
  }
}

async function eliminarActual() {
  if (!clienteActual) return;
  if (!confirm(`Desactivar cliente ${clienteActual.idCliente} - ${clienteActual.nombre}?`)) return;

  await desactivarCliente(clienteActual.idCliente);
  clientes = await cargarClientes();
  clienteActual = clientes.find(c => String(c.idCliente) === String(clienteActual.idCliente));
  pintarDetalle(clienteActual);
  alert("Cliente desactivado.");
}

el("btnBuscar").onclick = buscar;
el("inputBusqueda").addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
el("btnLimpiar").onclick = () => { el("inputBusqueda").value = ""; el("resultados").innerHTML = ""; };
el("btnNuevoCliente").onclick = nuevoCliente;
el("btnRegresar").onclick = regresar;
el("btnEditarCliente").onclick = editarCliente;
el("btnEliminarCliente").onclick = eliminarActual;
el("btnCerrarModal").onclick = cerrarModal;
el("btnCancelarModal").onclick = cerrarModal;
el("formCliente").addEventListener("submit", guardarDesdeModal);

iniciar();
