import { state } from "./productos.estado.js";
import { mostrarLoader, cambiarLoader, ocultarLoader } from "./productos.loader.js";
import { obtenerCatalogoLocal, guardarCatalogoLocal } from "./productos.local.js";
import { obtenerCatalogoFirebase } from "./productos.firebase.js";
import { buscarCodigoConRespaldoFirebase } from "./productos.busqueda.js";
import { renderTabla, reaplicarVistaActual, filtrarTablaPorProducto } from "./productos.tabla.js";
import {
  abrirModalBuscador,
  cerrarModalBuscador,
  renderResultadosBusqueda,
  pintarActivaBusqueda,
  scrollActivaBusqueda,
  seleccionarDesdeSugerencias
} from "./productos.modal-busqueda.js";
import {
  abrirEditor,
  abrirNuevoProducto,
  guardarCambios,
  activarProducto,
  desactivarProducto,
  eliminarFisicamente
} from "./productos.editor.js";
import { buscarCoincidencias } from "./productos.busqueda.js";

const txtBuscarPrincipal = document.getElementById("txtBuscarPrincipal");
const selActivo = document.getElementById("selActivo");
const btnBuscarPrincipal = document.getElementById("btnBuscarPrincipal");
const btnReset = document.getElementById("btnReset");
const btnNuevoProducto = document.getElementById("btnNuevoProducto");
const btnSincronizar = document.getElementById("btnSincronizar");
const meta = document.getElementById("meta");

const modalBuscador = document.getElementById("modalBuscador");
const txtBuscarModal = document.getElementById("txtBuscarModal");
const btnCerrarBuscador = document.getElementById("btnCerrarBuscador");

const modalEditor = document.getElementById("modalEditor");
const btnCerrarEditor = document.getElementById("btnCerrarEditor");
const btnGuardar = document.getElementById("btnGuardar");
const btnActivar = document.getElementById("btnActivar");
const btnDesactivar = document.getElementById("btnDesactivar");
const btnEliminarReal = document.getElementById("btnEliminarReal");

window.abrirEditor = abrirEditor;

async function iniciar(){
  mostrarLoader("Leyendo catálogo local...");

  try{
    const local = await obtenerCatalogoLocal();

    if (local.length > 0) {
      state.productos = local;
      state.filtrados = local;
      renderTabla();
      meta.textContent = `Catálogo local cargado | Total: ${local.length}`;
      ocultarLoader();

      // Actualiza Firebase en segundo plano para no congelar pantalla
      sincronizarDesdeFirebase(false);
      return;
    }

    await sincronizarDesdeFirebase(true);

  }catch(err){
    console.error(err);
    meta.textContent = "Error cargando catálogo.";
    ocultarLoader();
  }
}

async function sincronizarDesdeFirebase(conLoader = true){
  try{
    if (conLoader) mostrarLoader("Descargando catálogo desde Firebase...");
    else cambiarLoader("Sincronizando en segundo plano...");

    const remoto = await obtenerCatalogoFirebase();

    state.productos = remoto;
    state.filtrados = remoto;

    await guardarCatalogoLocal(remoto);
    reaplicarVistaActual();

    meta.textContent = `Catálogo sincronizado | Total: ${state.productos.length}`;
  }catch(err){
    console.error(err);
    meta.textContent = "No se pudo sincronizar Firebase. Se mantiene catálogo local.";
  }finally{
    if (conLoader) ocultarLoader();
  }
}

async function resolverBusquedaPrincipal(){
  if (state.bloqueoReaperturaBuscador) return;

  const texto = txtBuscarPrincipal.value.trim();

  if (!texto){
    state.filtrados = state.productos.filter(p => {
      if (selActivo.value === "true") return p.activo === true;
      if (selActivo.value === "false") return p.activo === false;
      return true;
    });
    renderTabla();
    return;
  }

  // Si parece código, primero local; si no, respaldo Firebase
  const pareceCodigo = /^[0-9A-Za-z._-]{4,}$/.test(texto) && !texto.includes(" ");

  if (pareceCodigo) {
    meta.textContent = "Buscando código local/Firebase...";
    const encontrado = await buscarCodigoConRespaldoFirebase(texto);

    if (encontrado) {
      filtrarTablaPorProducto(encontrado);
      return;
    }

    meta.textContent = `No existe local ni Firebase: ${texto}. Puedes darlo de alta.`;
    state.filtrados = [];
    renderTabla();
    return;
  }

  abrirModalBuscador(texto);
}

btnBuscarPrincipal.addEventListener("click", (e) => {
  e.preventDefault();
  resolverBusquedaPrincipal();
});

txtBuscarPrincipal.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    resolverBusquedaPrincipal();
  }
});

btnReset.addEventListener("click", () => {
  txtBuscarPrincipal.value = "";
  selActivo.value = "todos";
  reaplicarVistaActual();
});

btnNuevoProducto.addEventListener("click", abrirNuevoProducto);

btnSincronizar.addEventListener("click", () => sincronizarDesdeFirebase(true));

selActivo.addEventListener("change", reaplicarVistaActual);

btnCerrarBuscador.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  cerrarModalBuscador({ limpiar: true, enfocarPrincipal: true });
});

txtBuscarModal.addEventListener("input", () => {
  const texto = txtBuscarModal.value.trim();
  renderResultadosBusqueda(buscarCoincidencias(texto), texto);
});

txtBuscarModal.addEventListener("keydown", (e) => {
  e.stopPropagation();

  if (e.key === "Escape") {
    e.preventDefault();
    cerrarModalBuscador({ limpiar: false, enfocarPrincipal: true });
    return;
  }

  if (!state.resultadosBusqueda.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    state.idxBusqueda++;
    if (state.idxBusqueda >= state.resultadosBusqueda.length) state.idxBusqueda = 0;
    pintarActivaBusqueda();
    scrollActivaBusqueda();
    return;
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    state.idxBusqueda--;
    if (state.idxBusqueda < 0) state.idxBusqueda = state.resultadosBusqueda.length - 1;
    pintarActivaBusqueda();
    scrollActivaBusqueda();
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    const p = state.resultadosBusqueda[state.idxBusqueda];
    if (p) seleccionarDesdeSugerencias(p.id);
  }
});

btnCerrarEditor.addEventListener("click", () => modalEditor.classList.remove("show"));
btnGuardar.addEventListener("click", guardarCambios);
btnActivar.addEventListener("click", activarProducto);
btnDesactivar.addEventListener("click", desactivarProducto);
btnEliminarReal.addEventListener("click", eliminarFisicamente);

modalBuscador.addEventListener("click", (e) => {
  if (e.target === modalBuscador) cerrarModalBuscador({ limpiar: false, enfocarPrincipal: true });
});

modalEditor.addEventListener("click", (e) => {
  if (e.target === modalEditor) modalEditor.classList.remove("show");
});

iniciar();
