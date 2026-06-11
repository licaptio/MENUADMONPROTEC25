import { getUsuarioLogueado } from "../auth/login.js";

export function renderPOS() {

  const usuario = getUsuarioLogueado();
  const posApp = document.getElementById("posApp");

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
        id="txtCodigo"
        type="text"
        placeholder="Escanea o captura código"
        autocomplete="off"
      >

      <button id="btnBusquedaManual">
        Buscar por concepto
      </button>

    </section>

    <section class="contenido-pos">

      <div class="panel-carrito">

        <table>

          <thead>
            <tr>
              <th>Código</th>
              <th>Cantidad</th>
              <th>Concepto</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>

          <tbody id="tbodyCarrito"></tbody>

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
            <span>IVA:</span>
            <span id="lblIVA">$0.00</span>
          </div>

          <div>
            <span>IEPS:</span>
            <span id="lblIEPS">$0.00</span>
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
}