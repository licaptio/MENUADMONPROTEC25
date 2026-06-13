import { getUsuarioLogueado } from "../auth/login.js";
import { iniciarScanner } from "../scanner/scanner.js";
import {
  renderCarrito,
  limpiarCarrito
} from "../carrito/carrito.js";
import { abrirBusquedaManual } from "../busqueda/busquedaManual.js";
import { iniciarCobro } from "../cobro/cobro.js";
import { limpiarFotoProducto } from "../fotos/fotoProductoVista.js";

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

        <div class="header-left">
          <div class="titulo-principal">
            La Proveedora de Dulces
          </div>

          <div class="subtitulo-pos">
            Punto de Venta
          </div>
        </div>

        <div class="header-right">
          <span>Usuario: <strong>${usuario?.nombre || usuario?.usuario || "-"}</strong></span>
          <span>Cliente: <strong>PUBLICO EN GENERAL</strong></span>
          <span>Folio: <strong id="folioVenta">000001</strong></span>

          <button id="btnMenuConfig" title="Configuración">
            ⚙️
          </button>
        </div>

      </header>

      <div id="panelConfig" class="panel-config oculto">
        <div class="panel-config-titulo">CONFIGURACIÓN</div>

        <button type="button">Corte de Caja</button>
        <button type="button">Historial Ventas</button>
        <button type="button">Reimpresión</button>
        <button type="button">Ventas Pendientes</button>
        <button type="button">Sincronización</button>

        <hr>

        <button type="button">Impresoras</button>
        <button type="button">RawBT</button>
        <button type="button">Configuración Ticket</button>

        <hr>

        <button id="btnLogout" type="button">Cerrar Sesión</button>
      </div>

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

          <div class="foto-producto-box">
            <img
              id="fotoProductoActual"
              src="./assets/logo_proveedora.webp"
              alt="Foto Producto"
            >

            <div
              id="contadorFotosProducto"
              class="contador-fotos oculto"
            >
              1/1
            </div>
          </div>

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
            <button id="btnCobrar">Cobrar</button>
            <button id="btnLimpiar">Limpiar</button>
          </div>

        </aside>

      </section>

    </div>
  `;

  renderCarrito();
  limpiarFotoProducto();

  iniciarScanner();
  iniciarCobro();

  const btnLimpiar = document.getElementById("btnLimpiar");

  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", limpiarCarrito);
  }

  const btnBusquedaManual = document.getElementById("btnBusquedaManual");

  if (btnBusquedaManual) {
    btnBusquedaManual.addEventListener("click", abrirBusquedaManual);
  }

  const btnMenuConfig = document.getElementById("btnMenuConfig");
  const panelConfig = document.getElementById("panelConfig");

  if (btnMenuConfig && panelConfig) {
    btnMenuConfig.addEventListener("click", (event) => {
      event.stopPropagation();
      panelConfig.classList.toggle("oculto");
    });

    panelConfig.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", () => {
      panelConfig.classList.add("oculto");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        panelConfig.classList.add("oculto");
      }
    });
  }

  console.log("POS renderizado correctamente");
}