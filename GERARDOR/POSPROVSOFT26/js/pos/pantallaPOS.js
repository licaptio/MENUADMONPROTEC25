import { inicializarBuscador } from "../productos/buscador.js";

const CLIENTE_FIJO = {
  codigo: "1",
  nombre: "PUBLICO EN GENERAL"
};

function generarFolioLocal(usuario) {
  const hoy = new Date();
  const fechaTag = hoy.toISOString().slice(0, 10).replace(/-/g, "");
  const usuarioTag = String(usuario?.usuario || usuario?.nombre || "USR")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 8);

  const key = `folio_pospdd26_${usuarioTag}_${fechaTag}`;
  const consecutivo = Number(localStorage.getItem(key) || 0) + 1;

  localStorage.setItem(key, String(consecutivo));

  return `FR${String(consecutivo).padStart(6, "0")}`;
}

export function renderPantallaPOS({ usuario, onLogout } = {}) {
  const posApp = document.getElementById("posApp");
  if (!posApp) return;

  const folio = generarFolioLocal(usuario);

  posApp.innerHTML = `
    <div class="pos-pc-shell">

      <header class="pos-pc-header">
        <div class="pos-pc-title">
          <strong>PROVEEDORA DE DULCES Y DESECHABLES</strong>
          <span>PUNTO DE VENTA PROVSOFT 2026</span>
        </div>

        <div class="pos-pc-logo">
          <img src="./assets/logo_proveedora.webp" alt="Logo empresa"
               onerror="this.style.display='none'">
        </div>
      </header>

      <section class="pos-pc-info">
        <div class="info-field">
          <label>Folio</label>
          <input id="folioVenta" value="${folio}" readonly>
        </div>

        <div class="info-field">
          <label>Usuario</label>
          <input id="usuarioVenta"
                 value="${usuario?.nombre || usuario?.usuario || "—"}"
                 readonly>
        </div>

        <div class="info-field cliente-field">
          <label>Cliente</label>
          <input id="clienteVenta"
                 value="${CLIENTE_FIJO.nombre}"
                 readonly>
        </div>

        <button id="btnLogout" class="btn-salir">Salir</button>
      </section>

      <section class="pos-pc-scanner">
        <label>Escáner / Código</label>
        <input id="codigoScanner"
               type="text"
               placeholder="Escanea o captura código..."
               autocomplete="off">

        <button id="btnBusquedaManual" type="button">
          🔍 Buscar por concepto
        </button>
      </section>

      <main class="pos-pc-main">

        <section class="carrito-panel">
          <table class="carrito-tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cant.</th>
                <th>Concepto</th>
                <th>Precio Público</th>
                <th>Subtotal</th>
              </tr>
            </thead>

            <tbody id="tbodyCarrito">
              <tr class="fila-vacia">
                <td colspan="5">Carrito vacío. Escanea un producto para iniciar.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <aside class="side-panel">
          <div class="foto-articulo">
            <h3>Imagen de artículo</h3>
            <div id="fotoArticuloBox" class="foto-box">
              SIN IMAGEN
            </div>
          </div>

          <div class="resumen-panel">
            <h3>Totales</h3>

            <div class="resumen-row"><span>Subtotal</span><strong id="resSubtotal">$0.00</strong></div>
            <div class="resumen-row"><span>Descuento</span><strong id="resDescuento">$0.00</strong></div>
            <div class="resumen-row"><span>IVA</span><strong id="resIVA">$0.00</strong></div>
            <div class="resumen-row"><span>IEPS</span><strong id="resIEPS">$0.00</strong></div>
            <div class="resumen-row"><span>Cantidad</span><strong id="resCantidad">0.00</strong></div>
            <div class="resumen-row total-row"><span>Total Venta</span><strong id="resTotal">$0.00</strong></div>

            <div class="acciones-pos">
              <button id="btnCobrar" class="btn-cobrar">Cobrar</button>
              <button id="btnLimpiar" class="btn-secundario">Limpiar</button>
            </div>
          </div>
        </aside>

      </main>

      <div id="modalBusquedaProducto" class="modal-pos oculto">
        <div class="modal-pos-card">
          <header>
            <h3>Buscar artículo</h3>
            <button id="cerrarModalBusqueda">×</button>
          </header>

          <input id="inputBusquedaManual"
                 type="text"
                 placeholder="Escribe concepto, código o descripción..."
                 autocomplete="off">

          <div id="resultadosBusquedaManual" class="resultados-modal">
            Escribe para buscar.
          </div>
        </div>
      </div>

      <div id="modalCantidadProducto" class="modal-pos oculto">
        <div class="modal-pos-card modal-cantidad-card">
          <header>
            <h3>Cantidad</h3>
            <button id="cerrarModalCantidad">×</button>
          </header>

          <input id="inputCantidadProducto"
                 type="number"
                 min="0.01"
                 step="0.01"
                 value="1">

          <button id="btnAceptarCantidad" class="btn-cobrar">
            Agregar al carrito
          </button>
        </div>
      </div>

    </div>
  `;

  document.getElementById("btnLogout")?.addEventListener("click", onLogout);
  document.getElementById("btnBusquedaManual")?.addEventListener("click", abrirModalBusqueda);
  document.getElementById("cerrarModalBusqueda")?.addEventListener("click", cerrarModalBusqueda);
  document.getElementById("cerrarModalCantidad")?.addEventListener("click", cerrarModalCantidad);

  document.getElementById("codigoScanner")?.focus();

  inicializarBuscador();
}

function abrirModalBusqueda() {
  const modal = document.getElementById("modalBusquedaProducto");
  const input = document.getElementById("inputBusquedaManual");

  if (!modal) return;

  modal.classList.remove("oculto");

  setTimeout(() => {
    input?.focus();
  }, 80);
}

function cerrarModalBusqueda() {
  document.getElementById("modalBusquedaProducto")?.classList.add("oculto");
}

function cerrarModalCantidad() {
  document.getElementById("modalCantidadProducto")?.classList.add("oculto");
}
