import {
  carrito,
  calcularTotales,
  limpiarCarrito
} from "../carrito/carrito.js";

import { money } from "../util/money.js";
import { toast } from "../ui/toast.js";

export function iniciarCobro() {
  const btnCobrar = document.getElementById("btnCobrar");

  if (!btnCobrar) return;

  btnCobrar.addEventListener("click", abrirModalCobro);
}

function abrirModalCobro() {
  if (carrito.length === 0) {
    toast("Agrega productos antes de cobrar");
    return;
  }

  const tot = calcularTotales();

  document.getElementById("modalCobro")?.remove();

  const modal = document.createElement("div");
  modal.id = "modalCobro";

  modal.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      z-index:99999;
      background:rgba(0,0,0,.45);
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="
        width:460px;
        background:white;
        border-radius:22px;
        box-shadow:0 18px 45px rgba(0,0,0,.45);
        overflow:hidden;
      ">

        <div style="
          background:#990000;
          color:white;
          padding:18px;
          font-size:28px;
          font-weight:900;
          text-align:center;
        ">
          COBRO
        </div>

        <div style="
          padding:24px;
          display:flex;
          flex-direction:column;
          gap:18px;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            font-size:24px;
            font-weight:900;
          ">
            <span>Total:</span>
            <span id="cobroTotal" style="color:#990000;">
              ${money(tot.total)}
            </span>
          </div>

          <label style="font-size:18px;font-weight:800;">
            Recibido
          </label>

          <input
            id="montoRecibido"
            type="number"
            step="0.01"
            min="0"
            inputmode="decimal"
            style="
              height:62px;
              font-size:30px;
              font-weight:800;
              text-align:center;
              border:2px solid #aaa;
              border-radius:12px;
              outline:none;
            "
          >

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            font-size:26px;
            font-weight:900;
            border-top:2px dashed #ccc;
            border-bottom:2px dashed #ccc;
            padding:16px 0;
          ">
            <span>Cambio:</span>
            <span id="montoCambio" style="color:#008000;">
              $0.00
            </span>
          </div>

          <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
          ">
            <button id="btnCancelarCobro" style="
              height:54px;
              background:#777;
              color:white;
              border:none;
              border-radius:12px;
              font-size:18px;
              font-weight:900;
              cursor:pointer;
            ">
              Cancelar
            </button>

            <button id="btnConfirmarCobro" style="
              height:54px;
              background:#990000;
              color:white;
              border:none;
              border-radius:12px;
              font-size:18px;
              font-weight:900;
              cursor:pointer;
            ">
              Confirmar
            </button>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const recibido = document.getElementById("montoRecibido");
  const cambio = document.getElementById("montoCambio");

  recibido.addEventListener("input", () => {
    const pago = Number(recibido.value || 0);
    const cambioCalc = Math.max(0, pago - tot.total);

    cambio.textContent = money(cambioCalc);
  });

  document
    .getElementById("btnCancelarCobro")
    .addEventListener("click", () => modal.remove());

  document
    .getElementById("btnConfirmarCobro")
    .addEventListener("click", () => confirmarCobro(tot, modal));

  setTimeout(() => recibido.focus(), 80);
}

function confirmarCobro(tot, modal) {
  const recibido = Number(
    document.getElementById("montoRecibido").value || 0
  );

  if (recibido < tot.total) {
    toast("Monto recibido insuficiente");
    return;
  }

  const cambio = recibido - tot.total;

  const ventaPreview = {
    fecha_local: new Date().toISOString(),
    subtotal: tot.subtotal,
    impuestos: tot.impuestos,
    total: tot.total,
    recibido,
    cambio: Number(cambio.toFixed(2)),
    detalle: carrito.map(x => ({
      id: x.id,
      codigo: x.codigo,
      nombre: x.nombre,
      cantidad: x.cantidad,
      precio_unit: x.precioUnit,
      importe: x.importe
    }))
  };

  console.log("VENTA PREVIEW:", ventaPreview);

  toast("Venta confirmada");

  modal.remove();
  limpiarCarrito();
}