import { state } from "./productos.estado.js";
import { escaparHtml, moneda } from "./productos.utils.js";
import { coincideActivo, buscarCoincidenciaExactaLocal, buscarCoincidencias } from "./productos.busqueda.js";

const tbody = document.getElementById("tbody");
const meta = document.getElementById("meta");
const txtBuscarPrincipal = document.getElementById("txtBuscarPrincipal");

export function renderTabla(){
  meta.textContent = `Total: ${state.productos.length} | Mostrando: ${state.filtrados.length}`;

  if (!state.filtrados.length){
    tbody.innerHTML = `
      <tr>
        <td colspan="9">Sin resultados</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.filtrados.map(p => `
    <tr>
      <td><span class="tag ${p.activo === true ? "si" : "no"}">${p.activo === true ? "TRUE" : "FALSE"}</span></td>
      <td>${escaparHtml(p.codigoBarra || p.id || "--")}</td>
      <td>${escaparHtml(p.concepto || "--")}</td>
      <td>${escaparHtml(p.marca || "--")}</td>
      <td class="num">${moneda(p.costoSinImpuesto)}</td>
      <td class="num">${moneda(p.precioPublico)}</td>
      <td class="num">${moneda(p.medioMayoreo)}</td>
      <td class="num">${moneda(p.mayoreo)}</td>
      <td>
        <button onclick="window.abrirEditor('${String(p.id).replace(/'/g,"\\'")}')">Editar</button>
      </td>
    </tr>
  `).join("");
}

export function reaplicarVistaActual(){
  const texto = txtBuscarPrincipal.value.trim();

  if (!texto) {
    state.filtrados = state.productos.filter(p => coincideActivo(p));
    renderTabla();
    meta.textContent = `Catálogo local | Total: ${state.productos.length} | Mostrando: ${state.filtrados.length}`;
    return;
  }

  const exacto = buscarCoincidenciaExactaLocal(texto);

  if (exacto) {
    state.filtrados = [exacto];
  } else {
    state.filtrados = buscarCoincidencias(texto);
  }

  renderTabla();
  meta.textContent = `Catálogo local | Total: ${state.productos.length} | Mostrando: ${state.filtrados.length}`;
}

export function filtrarTablaPorProducto(p){
  if (!p) return;
  state.filtrados = [p];
  renderTabla();
  txtBuscarPrincipal.value = p.codigoBarra || p.id || p.concepto || "";
}

export function actualizarProductoEnMemoria(producto){
  const idx = state.productos.findIndex(p => String(p.id) === String(producto.id));
  if (idx >= 0) state.productos[idx] = producto;
  else state.productos.push(producto);
}

export function quitarProductoDeMemoria(id){
  state.productos = state.productos.filter(p => String(p.id) !== String(id));
  state.filtrados = state.filtrados.filter(p => String(p.id) !== String(id));
}
