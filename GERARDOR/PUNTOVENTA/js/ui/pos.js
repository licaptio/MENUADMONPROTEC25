import { getUsuarioLogueado } from "../auth/login.js";
import { iniciarScanner } from "../scanner/scanner.js";
import {
  renderCarrito,
  limpiarCarrito
} from "../carrito/carrito.js";
import { abrirBusquedaManual } from "../busqueda/busquedaManual.js";

export function renderPOS() {

  const usuario = getUsuarioLogueado();
  const posApp = document.getElementById("posApp");

  if (!posApp) {
    console.error("No existe #posApp");
    return;
  }

  posApp.innerHTML = `
  <div class="pos-container">

    <header class="pos-header">

      <img
        src="./assets/logo_proveedora.webp"
        alt="Logo"
        class="logo-pos"
      >

      <div class="titulo-box">
        <h1>PROVEEDORA DE DULCES Y DESECHABLES</h1>
        <h2>PUNTO DE VENTA PROVSOFT 2026</h2>
      </div>

      <div class="header-info">

        <span>
          Usuario:
          <strong>
            ${usuario?.nombre || usuario?.usuario || "-"}
          </strong>
        </span>

        <span>
          Cliente:
          <strong>
            PUBLICO EN GENERAL
          </strong>
        </span>

        <span>
          Folio:
          <strong id="folioVenta">
            000001
          </strong>
        </span>

        <button id="btnLogout">
          Salir
        </button>

      </div>

    </header>

    <section class="zona-scanner">

      <input
        id="buscador"
        type="text"
        placeholder="Escanea o captura código"
        autocomplete="off"
      >

      <button id="btnBusquedaManual">
        Buscar por concepto
      </button>

      <div
        id="resultados"
        class="search-results"
        style="display:none"
      ></div>

    </section>

    <section class="contenido-pos">

      <div class="panel-carrito">

        <table>

          <thead>
            <tr>
              <th>Código</th>
              <th>Cant.</th>
              <th>Concepto</th>
              <th>Precio</th>
              <th>Importe</th>
              <th></th>
            </tr>
          </thead>

          <tbody id="tbody"></tbody>

        </table>

      </div>

      <aside class="panel-derecho">

        <div class="totales-box">

          <div>
            <span>Subtotal:</span>
            <span id="lblSubtotal">$0.00</span>
          </div>

          <div>
            <span>Descuento:</span>
            <span id="lblDescuento">$0.00</span>
          </div>

          <div>
            <span>Impuestos:</span>
            <span id="lblImpuestos">$0.00</span>
          </div>

          <div>
            <span>Cantidad:</span>
            <span id="lblCantidad">0</span>
          </div>

          <div class="total-final">
            <span>Total:</span>
            <span id="lblTotal">$0.00</span>
          </div>

        </div>

        <div class="acciones">

          <button id="btnCobrar">
            Cobrar
          </button>

          <button id="btnLimpiar">
            Limpiar
          </button>

        </div>

      </aside>

    </section>

  </div>
  `;

renderCarrito();

iniciarScanner();

const btnLimpiar =
  document.getElementById("btnLimpiar");

if (btnLimpiar) {
  btnLimpiar.addEventListener(
    "click",
    limpiarCarrito
  );
}

const btnBusquedaManual =
  document.getElementById("btnBusquedaManual");

if (btnBusquedaManual) {
  btnBusquedaManual.addEventListener(
    "click",
    abrirBusquedaManual
  );
}

console.log("POS renderizado correctamente");

}