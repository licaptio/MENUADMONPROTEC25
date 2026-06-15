import { state } from "./productos.estado.js";
import { escaparHtml, moneda } from "./productos.utils.js";
import { buscarCoincidencias } from "./productos.busqueda.js";
import { filtrarTablaPorProducto } from "./productos.tabla.js";

const modalBuscador = document.getElementById("modalBuscador");
const txtBuscarModal = document.getElementById("txtBuscarModal");
const tbodyBusqueda = document.getElementById("tbodyBusqueda");
const metaBusqueda = document.getElementById("metaBusqueda");
const txtBuscarPrincipal = document.getElementById("txtBuscarPrincipal");

export function limpiarBuscadorModal(){
  txtBuscarModal.value = "";
  tbodyBusqueda.innerHTML = "";
  metaBusqueda.textContent = "Escribe para buscar productos...";
  state.resultadosBusqueda = [];
  state.idxBusqueda = -1;
}

export function abrirModalBuscador(texto = ""){
  if (state.bloqueoReaperturaBuscador) return;

  modalBuscador.classList.add("show");
  txtBuscarModal.value = texto || "";

  const lista = buscarCoincidencias(texto || "");
  renderResultadosBusqueda(lista, texto || "");

  setTimeout(() => {
    txtBuscarModal.focus();
    txtBuscarModal.select();
  }, 0);
}

export function cerrarModalBuscador({ limpiar = false, enfocarPrincipal = true } = {}){
  state.bloqueoReaperturaBuscador = true;
  modalBuscador.classList.remove("show");

  if (limpiar) limpiarBuscadorModal();
  if (document.activeElement) document.activeElement.blur();

  setTimeout(() => {
    if (enfocarPrincipal) txtBuscarPrincipal.focus({ preventScroll: true });
  }, 0);

  setTimeout(() => {
    state.bloqueoReaperturaBuscador = false;
  }, 250);
}

export function renderResultadosBusqueda(lista, texto){
  state.resultadosBusqueda = Array.isArray(lista) ? lista : [];
  state.idxBusqueda = state.resultadosBusqueda.length ? 0 : -1;

  metaBusqueda.textContent = texto
    ? `Coincidencias para: "${texto}" | Resultados: ${state.resultadosBusqueda.length}`
    : "Escribe para buscar productos...";

  if (!state.resultadosBusqueda.length){
    tbodyBusqueda.innerHTML = `<tr><td colspan="8">Sin resultados</td></tr>`;
    return;
  }

  tbodyBusqueda.innerHTML = state.resultadosBusqueda.map((p, i) => `
    <tr class="${i === state.idxBusqueda ? "activa" : ""}" data-id="${escaparHtml(p.id)}">
      <td><span class="tag ${p.activo === true ? "si" : "no"}">${p.activo === true ? "TRUE" : "FALSE"}</span></td>
      <td class="codigo-col">${escaparHtml(p.codigoBarra || p.id || "--")}</td>
      <td>${escaparHtml(p.concepto || "--")}</td>
      <td>${escaparHtml(p.marca || "--")}</td>
      <td class="num">${moneda(p.costoSinImpuesto)}</td>
      <td class="num">${moneda(p.precioPublico)}</td>
      <td class="num">${moneda(p.medioMayoreo)}</td>
      <td class="num">${moneda(p.mayoreo)}</td>
    </tr>
  `).join("");

  tbodyBusqueda.querySelectorAll("tr[data-id]").forEach((row, i) => {
    row.addEventListener("click", () => seleccionarDesdeSugerencias(row.dataset.id));
    row.addEventListener("mouseenter", () => {
      state.idxBusqueda = i;
      pintarActivaBusqueda();
    });
  });
}

export function pintarActivaBusqueda(){
  const filas = tbodyBusqueda.querySelectorAll("tr[data-id]");
  filas.forEach((fila, i) => fila.classList.toggle("activa", i === state.idxBusqueda));
}

export function scrollActivaBusqueda(){
  const filas = tbodyBusqueda.querySelectorAll("tr[data-id]");
  const fila = filas[state.idxBusqueda];
  if (fila) fila.scrollIntoView({ block:"nearest" });
}

export function seleccionarDesdeSugerencias(id){
  const p = state.productos.find(x => String(x.id) === String(id));
  if (!p) return;

  filtrarTablaPorProducto(p);
  cerrarModalBuscador({ limpiar: true, enfocarPrincipal: true });
}
