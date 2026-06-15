import { state } from "./productos.estado.js";
import { mostrarLoader, cambiarLoader, ocultarLoader } from "./productos.loader.js";
import { obtenerCatalogoLocal, guardarCatalogoLocal } from "./productos.local.js";
import { obtenerCatalogoFirebase } from "./productos.firebase.js";
import { buscarCodigoConRespaldoFirebase } from "./productos.busqueda.js";
import { renderTabla, reaplicarVistaActual, filtrarTablaPorProducto } from "./productos.tabla.js";
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

const modalEditor = document.getElementById("modalEditor");
const btnCerrarEditor = document.getElementById("btnCerrarEditor");
const btnGuardar = document.getElementById("btnGuardar");
const btnActivar = document.getElementById("btnActivar");
const btnDesactivar = document.getElementById("btnDesactivar");
const btnEliminarReal = document.getElementById("btnEliminarReal");

let timerBusqueda = null;
let sincronizacionEnProceso = false;

window.abrirEditor = abrirEditor;

function ejecutarCuandoEsteLibre(fn){
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    setTimeout(fn, 700);
  }
}

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

      // No sincroniza de golpe. Lo manda a tiempo libre para evitar congelar Chrome.
      ejecutarCuandoEsteLibre(() => sincronizarDesdeFirebase(false));
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
  if (sincronizacionEnProceso) return;
  sincronizacionEnProceso = true;

  try{
    if (conLoader) mostrarLoader("Descargando catálogo desde Firebase...");
    else cambiarLoader("Sincronizando catálogo en segundo plano...");

    const remoto = await obtenerCatalogoFirebase();

    state.productos = remoto;

    // Si no hay búsqueda activa, refresca la vista general.
    // renderTabla solo pinta máximo 300 renglones para no congelar la pantalla.
    const texto = txtBuscarPrincipal.value.trim();
    if (!texto) {
      state.filtrados = remoto;
      renderTabla();
    } else {
      state.filtrados = buscarCoincidencias(texto);
      renderTabla();
    }

    // Guardar en IndexedDB puede ser pesado. Se difiere para que Chrome respire.
    ejecutarCuandoEsteLibre(async () => {
      try{
        await guardarCatalogoLocal(remoto);
      }catch(e){
        console.error("Error guardando catálogo local", e);
      }
    });

    meta.textContent = `Catálogo sincronizado | Total: ${state.productos.length}`;
  }catch(err){
    console.error(err);
    meta.textContent = "No se pudo sincronizar Firebase. Se mantiene catálogo local.";
  }finally{
    sincronizacionEnProceso = false;
    if (conLoader) ocultarLoader();
  }
}

async function resolverBusquedaPrincipal({ consultarFirebase = true } = {}){
  const texto = txtBuscarPrincipal.value.trim();

  if (!texto){
    state.filtrados = state.productos.filter(p => {
      if (selActivo.value === "true") return p.activo === true;
      if (selActivo.value === "false") return p.activo === false;
      return true;
    });

    renderTabla();
    meta.textContent = `Catálogo local | Total: ${state.productos.length} | Encontrados: ${state.filtrados.length}`;
    return;
  }

  // 1) Código exacto: pasa directo a la lista principal.
  const encontradoExacto = await buscarCodigoConRespaldoFirebase(texto, consultarFirebase);

  if (encontradoExacto) {
    filtrarTablaPorProducto(encontradoExacto);
    meta.textContent = `Código exacto | Total: ${state.productos.length} | Mostrando: 1`;
    return;
  }

  // 2) Si no fue código exacto, busca similares locales: BIG 3, REGULAR COLA 3, COLA BIG REGULAR.
  state.filtrados = buscarCoincidencias(texto);
  renderTabla();

  if (state.filtrados.length) {
    meta.textContent = `Coincidencias para "${texto}" | Total: ${state.productos.length} | Mostrando: ${state.filtrados.length}`;
  } else {
    meta.textContent = `No encontrado: "${texto}" | Puedes darlo de alta como producto nuevo.`;
  }
}

function programarBusquedaLocal(){
  clearTimeout(timerBusqueda);

  timerBusqueda = setTimeout(() => {
    const texto = txtBuscarPrincipal.value.trim();

    if (!texto) {
      resolverBusquedaPrincipal({ consultarFirebase:false });
      return;
    }

    // Búsqueda local conforme escribe. Firebase solo con Enter o botón Buscar.
    if (texto.length >= 2) {
      resolverBusquedaPrincipal({ consultarFirebase:false });
    }
  }, 250);
}

btnBuscarPrincipal.addEventListener("click", (e) => {
  e.preventDefault();
  resolverBusquedaPrincipal({ consultarFirebase:true });
});

txtBuscarPrincipal.addEventListener("input", programarBusquedaLocal);

txtBuscarPrincipal.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    resolverBusquedaPrincipal({ consultarFirebase:true });
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

btnCerrarEditor.addEventListener("click", () => modalEditor.classList.remove("show"));
btnGuardar.addEventListener("click", guardarCambios);
btnActivar.addEventListener("click", activarProducto);
btnDesactivar.addEventListener("click", desactivarProducto);
btnEliminarReal.addEventListener("click", eliminarFisicamente);

modalEditor.addEventListener("click", (e) => {
  if (e.target === modalEditor) modalEditor.classList.remove("show");
});

iniciar();
