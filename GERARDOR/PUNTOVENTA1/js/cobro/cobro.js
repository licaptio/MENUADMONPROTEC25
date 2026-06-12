import {
  carrito,
  calcularTotales,
  limpiarCarrito
} from "../carrito/carrito.js";

import {
  calcularComisionLinea,
  calcularComisionTotal
} from "../comisiones/comisiones.js";

import { money } from "../util/money.js";
import { toast } from "../ui/toast.js";
import { guardarVentaFirestore } from "../ventas/guardarVenta.js";

const DESCUENTO_MAXIMO = 3;
const PASSWORD_DESCUENTO = "MADERO690*";

export function iniciarCobro() {
  const btnCobrar = document.getElementById("btnCobrar");
  if (!btnCobrar) return;

  btnCobrar.addEventListener("click", abrirModalCobro);
}

function calcularLineaFiscal(x, descuentoPorcentaje = 0) {
  const cantidad = Number(x.cantidad || 0);
  const precioUnitOriginal = Number(x.precioUnit || 0);
  const importeOriginal = Number(x.importe || cantidad * precioUnitOriginal || 0);

  const ivaTasa = Number(x.ivaTasa || 0);
  const iepsTasa = Number(x.iepsTasa || 0);

  let baseOriginal = importeOriginal;

  if (iepsTasa > 0 && ivaTasa > 0) {
    baseOriginal = importeOriginal / (1 + iepsTasa + ivaTasa * (1 + iepsTasa));
  } else if (iepsTasa > 0) {
    baseOriginal = importeOriginal / (1 + iepsTasa);
  } else if (ivaTasa > 0) {
    baseOriginal = importeOriginal / (1 + ivaTasa);
  }

  baseOriginal = +baseOriginal.toFixed(2);

  const descuentoAplicado = +((baseOriginal * descuentoPorcentaje) / 100).toFixed(2);
  const base = +(baseOriginal - descuentoAplicado).toFixed(2);

  const iepsCalculado = +(base * iepsTasa).toFixed(2);
  const ivaCalculado = +((base + iepsCalculado) * ivaTasa).toFixed(2);

  const importe = +(base + iepsCalculado + ivaCalculado).toFixed(2);
  const precioUnit = cantidad > 0 ? +(importe / cantidad).toFixed(2) : 0;

  return {
    cantidad,
    precioUnitOriginal,
    importeOriginal,
    precioUnit,
    importe,
    baseOriginal,
    base,
    ivaTasa,
    iepsTasa,
    ivaCalculado,
    iepsCalculado,
    descuentoAplicado
  };
}

function calcularVentaFiscal(descuentoPorcentaje = 0) {
  let subtotal = 0;
  let iva = 0;
  let ieps = 0;
  let descuentoMonto = 0;
  let piezas = 0;

  const lineas = carrito.map(x => {
    const permiteDescuento = x.permite_descuento !== false;
    const porcLinea = permiteDescuento ? descuentoPorcentaje : 0;

    const fiscal = calcularLineaFiscal(x, porcLinea);

    subtotal += fiscal.base;
    iva += fiscal.ivaCalculado;
    ieps += fiscal.iepsCalculado;
    descuentoMonto += fiscal.descuentoAplicado;
    piezas += fiscal.cantidad;

    return {
      item: x,
      fiscal
    };
  });

  subtotal = +subtotal.toFixed(2);
  iva = +iva.toFixed(2);
  ieps = +ieps.toFixed(2);
  descuentoMonto = +descuentoMonto.toFixed(2);

  const impuestos = +(iva + ieps).toFixed(2);
  const total = +(subtotal + impuestos).toFixed(2);

  return {
    subtotal,
    iva,
    ieps,
    impuestos,
    total,
    descuento_monto: descuentoMonto,
    descuento_porcentaje: descuentoPorcentaje,
    piezas,
    lineas
  };
}

function abrirModalCobro() {
  if (carrito.length === 0) {
    toast("Agrega productos antes de cobrar");
    return;
  }

  let descuentoPorcentaje = 0;
  let autorizadoPor = null;
  let tot = calcularVentaFiscal(descuentoPorcentaje);

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

          <div id="descuentoInfo" style="
            display:none;
            background:#fff3cd;
            color:#664d03;
            border:1px solid #ffecb5;
            border-radius:10px;
            padding:10px;
            font-size:16px;
            font-weight:800;
            text-align:center;
          "></div>

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
            grid-template-columns:1fr 1fr 1fr;
            gap:12px;
          ">
            <button id="btnSolicitarDescuento" style="
              height:54px;
              background:#00416A;
              color:white;
              border:none;
              border-radius:12px;
              font-size:16px;
              font-weight:900;
              cursor:pointer;
            ">
              Descuento
            </button>

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
  const cobroTotal = document.getElementById("cobroTotal");
  const descuentoInfo = document.getElementById("descuentoInfo");

  function recalcularCambio() {
    const pago = Number(recibido.value || 0);
    const cambioCalc = Math.max(0, pago - tot.total);
    cambio.textContent = money(cambioCalc);
  }

  function refrescarModal() {
    cobroTotal.textContent = money(tot.total);

    if (descuentoPorcentaje > 0) {
      descuentoInfo.style.display = "block";
      descuentoInfo.textContent =
        `Descuento autorizado: ${descuentoPorcentaje}% | Monto: ${money(tot.descuento_monto)}`;
    } else {
      descuentoInfo.style.display = "none";
      descuentoInfo.textContent = "";
    }

    recalcularCambio();
  }

  recibido.addEventListener("input", recalcularCambio);

  document
    .getElementById("btnSolicitarDescuento")
    .addEventListener("click", () => {
      const porc = Number(
        prompt(`Introduce descuento máximo ${DESCUENTO_MAXIMO}%`)
      );

      if (!porc || porc <= 0) {
        toast("Descuento inválido");
        return;
      }

      if (porc > DESCUENTO_MAXIMO) {
        toast(`Máximo permitido ${DESCUENTO_MAXIMO}%`);
        return;
      }

      const pass = prompt("Introduce contraseña de autorización");

      if (pass !== PASSWORD_DESCUENTO) {
        toast("Contraseña incorrecta");
        return;
      }

      descuentoPorcentaje = +porc.toFixed(2);
      autorizadoPor = "GERARDO";

      tot = calcularVentaFiscal(descuentoPorcentaje);

      refrescarModal();

      toast(`Descuento ${descuentoPorcentaje}% aplicado`);
    });

  document
    .getElementById("btnCancelarCobro")
    .addEventListener("click", () => modal.remove());

  document
    .getElementById("btnConfirmarCobro")
    .addEventListener("click", () => confirmarCobro(tot, modal, {
      descuentoPorcentaje,
      autorizadoPor
    }));

  setTimeout(() => recibido.focus(), 80);
}

async function confirmarCobro(tot, modal, descuentoData = {}) {
  const recibido = Number(
    document.getElementById("montoRecibido").value || 0
  );

  if (recibido < tot.total) {
    toast("Monto recibido insuficiente");
    return;
  }

  const cambio = recibido - tot.total;

  const descuentoPorcentaje = Number(descuentoData.descuentoPorcentaje || 0);
  const autorizadoPor = descuentoData.autorizadoPor || null;

  let costo_total = 0;
  let utilidad_total = 0;

  const detalle = tot.lineas.map(({ item: x, fiscal }) => {
    const cantidad = fiscal.cantidad;
    const precioUnit = fiscal.precioUnit;
    const importe = fiscal.importe;

    const costoUnit = Number(x.costoUnit || 0);
    const costoTotalLinea = +(costoUnit * cantidad).toFixed(2);
    const utilidadLinea = +(importe - costoTotalLinea).toFixed(2);

    const itemComision = {
      ...x,
      cantidad,
      importe
    };

    const comisionMonto = calcularComisionLinea(itemComision);

    costo_total += costoTotalLinea;
    utilidad_total += utilidadLinea;

    return {
      id: x.id,
      codigo: x.codigo,
      nombre: x.nombre,

      cantidad,
      precio_unit: precioUnit,
      importe,

      base: fiscal.base,

      costo_unit: costoUnit,
      costo_total_linea: costoTotalLinea,
      utilidad_linea: utilidadLinea,

      ivaTasa: fiscal.ivaTasa,
      iva_porcentaje: +(fiscal.ivaTasa * 100).toFixed(2),
      iva_calculado: fiscal.ivaCalculado,

      iepsTasa: fiscal.iepsTasa,
      ieps_porcentaje: +(fiscal.iepsTasa * 100).toFixed(2),
      ieps_calculado: fiscal.iepsCalculado,

      descuento_aplicado: fiscal.descuentoAplicado,

      departamento_id: x.departamento_id,
      departamento_nombre: x.departamento,

      comision_tipo: x.comision_tipo || null,
      comision_valor: Number(x.comision_valor || 0),
      comision_monto: comisionMonto
    };
  });

  costo_total = +costo_total.toFixed(2);
  utilidad_total = +utilidad_total.toFixed(2);

  const comision_total = calcularComisionTotal(detalle);

  const margen_porcentaje =
    tot.total > 0
      ? +((utilidad_total / tot.total) * 100).toFixed(2)
      : 0;

  const ventaBase = {
    cliente: "PÚBLICO EN GENERAL",
    cliente_info: {
      id: null,
      nombre: "PÚBLICO EN GENERAL",
      rfc: "XAXX010101000"
    },

    subtotal: tot.subtotal,
    iva: tot.iva,
    ieps: tot.ieps,
    impuestos: tot.impuestos,
    total: tot.total,

    descuento_porcentaje: descuentoPorcentaje,
    descuento_monto: tot.descuento_monto,

    costo_total,
    utilidad_total,
    margen_porcentaje,
    comision_total,

    cantidad_articulos: tot.piezas,
    cantidad_renglones: detalle.length,

    autorizado_por: autorizadoPor,

    recibido,
    cambio: +cambio.toFixed(2),

    detalle
  };

  try {
    toast("Guardando venta...");

    const venta = await guardarVentaFirestore(ventaBase);

    console.log("VENTA GUARDADA:", venta);

    toast("Venta guardada");

    modal.remove();
    limpiarCarrito();

  } catch (err) {
    console.error("Error guardando venta:", err);
    toast("Error guardando venta");
  }
}