import { money } from "../util/money.js";

export let carrito = [];

function normalizarTasa(tasa) {
  const n = Number(tasa || 0);
  return n > 1 ? n / 100 : n;
}

export function agregarProducto(prod, cantidad = 1) {
  if (!prod) return;

  const existente = carrito.find(x => x.id === prod.id);
  const precio = Number(prod.precioPublico || prod.precio || 0);

  if (existente) {
    existente.cantidad += cantidad;
    existente.importe = +(existente.cantidad * existente.precioUnit).toFixed(2);
  } else {
    carrito.unshift({
      id: prod.id,
      codigo: prod.codigo || prod.codigoBarra || "",
      nombre: prod.nombre || prod.concepto || "SIN NOMBRE",
      cantidad,
      precioUnit: precio,
      importe: +(cantidad * precio).toFixed(2),

      ivaTasa: normalizarTasa(prod.ivaTasa),
      iepsTasa: normalizarTasa(prod.iepsTasa),
      costoUnit: Number(prod.costoUnit || 0),

      departamento_id: prod.departamento_id || null,
      departamento: prod.departamento || null,

      permite_descuento: prod.permite_descuento !== false
    });
  }

  renderCarrito();
}

export function eliminarProducto(id) {
  carrito = carrito.filter(x => x.id !== id);
  renderCarrito();
}

export function actualizarCantidad(id, nuevaCantidad) {
  const item = carrito.find(x => x.id === id);
  if (!item) return;

  const cantidad = Number(nuevaCantidad);

  if (!cantidad || cantidad <= 0) {
    eliminarProducto(id);
    return;
  }

  item.cantidad = cantidad;
  item.importe = +(item.cantidad * item.precioUnit).toFixed(2);

  renderCarrito();
}

export function limpiarCarrito() {
  carrito = [];
  renderCarrito();
}

export function calcularTotales() {
  let subtotal = 0;
  let iva = 0;
  let ieps = 0;

  carrito.forEach(it => {
    const importe = Number(it.importe || 0);
    const ivaTasa = normalizarTasa(it.ivaTasa);
    const iepsTasa = normalizarTasa(it.iepsTasa);

    let base = importe;

    if (iepsTasa > 0 && ivaTasa > 0) {
      base = importe / (1 + iepsTasa + ivaTasa * (1 + iepsTasa));
    } else if (iepsTasa > 0) {
      base = importe / (1 + iepsTasa);
    } else if (ivaTasa > 0) {
      base = importe / (1 + ivaTasa);
    }

    const iepsCalc = +(base * iepsTasa).toFixed(2);
    const ivaCalc = +((base + iepsCalc) * ivaTasa).toFixed(2);

    it.base = +base.toFixed(2);
    it.ivaTasa = ivaTasa;
    it.iepsTasa = iepsTasa;
    it.iva_calculado = ivaCalc;
    it.ieps_calculado = iepsCalc;

    subtotal += base;
    iva += ivaCalc;
    ieps += iepsCalc;
  });

  const subtotalFinal = +subtotal.toFixed(2);
  const ivaFinal = +iva.toFixed(2);
  const iepsFinal = +ieps.toFixed(2);
  const impuestos = +(ivaFinal + iepsFinal).toFixed(2);
  const total = +(subtotalFinal + impuestos).toFixed(2);

  return {
    subtotal: subtotalFinal,
    iva: ivaFinal,
    ieps: iepsFinal,
    impuestos,
    total,
    piezas: carrito.reduce((s, x) => s + Number(x.cantidad || 0), 0)
  };
}

export function renderCarrito() {
  const tbody = document.getElementById("tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  carrito.forEach(it => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${it.codigo}</td>

      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          value="${it.cantidad}"
          data-id="${it.id}"
          class="input-cantidad"
          style="width:70px"
        >
      </td>

      <td>${it.nombre}</td>

      <td>${money(it.precioUnit)}</td>

      <td>${money(it.importe)}</td>

      <td>
        <button class="btn-eliminar" data-id="${it.id}">
          ×
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".input-cantidad").forEach(input => {
    input.addEventListener("change", e => {
      actualizarCantidad(e.target.dataset.id, e.target.value);
    });
  });

  tbody.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", e => {
      eliminarProducto(e.target.dataset.id);
    });
  });

  renderTotales();
}

export function renderTotales() {
  const tot = calcularTotales();

  const lblSubtotal = document.getElementById("lblSubtotal");
  const lblImpuestos = document.getElementById("lblImpuestos");
  const lblTotal = document.getElementById("lblTotal");
  const lblCantidad = document.getElementById("lblCantidad");
  const lblDescuento = document.getElementById("lblDescuento");

  if (lblSubtotal) lblSubtotal.textContent = money(tot.subtotal);
  if (lblImpuestos) lblImpuestos.textContent = money(tot.impuestos);
  if (lblTotal) lblTotal.textContent = money(tot.total);
  if (lblCantidad) lblCantidad.textContent = tot.piezas;
  if (lblDescuento) lblDescuento.textContent = money(0);
}

export function obtenerCarrito() {
  return carrito;
}

window.carrito = carrito;
window.agregarProducto = agregarProducto;
window.eliminarProducto = eliminarProducto;
window.actualizarCantidad = actualizarCantidad;
window.limpiarCarrito = limpiarCarrito;
