import { toast } from "../ui/toast.js";
import {
  carrito,
  limpiarCarrito
} from "../carrito/carrito.js";
import { limpiarFotoProducto } from "../fotos/fotoProductoVista.js";
import { guardarVentaCanceladaCaptura } from "./guardarVenta.js";
import { pintarProximoFolio } from "../ui/folioVisible.js";

const PASSWORD_SUPERVISOR = "MADERO690*";

let clicksCancelar = 0;
let timerCancelar = null;

export function iniciarBotonCancelarVenta() {
  const btn = document.getElementById("btnCancelarVenta");
  if (!btn) return;

  btn.addEventListener("click", manejarClickCancelarVenta);
}

function resetBotonCancelar(btn) {
  clicksCancelar = 0;

  if (btn) {
    btn.textContent = "Cancelar";
  }
}

async function manejarClickCancelarVenta() {
  const btn = document.getElementById("btnCancelarVenta");

  clicksCancelar++;

  if (btn) {
    btn.textContent = `Cancelar (${clicksCancelar}/3)`;
  }

  clearTimeout(timerCancelar);

  timerCancelar = setTimeout(() => {
    resetBotonCancelar(btn);
  }, 2500);

  if (clicksCancelar < 3) {
    toast(`Cancelación bloqueada ${clicksCancelar}/3`);
    return;
  }

  clearTimeout(timerCancelar);
  resetBotonCancelar(btn);

  if (carrito.length === 0) {
    toast("No hay artículos para cancelar");
    return;
  }

  const pass = prompt("Contraseña supervisor para cancelar venta actual:");

  if (pass !== PASSWORD_SUPERVISOR) {
    toast("Contraseña incorrecta");
    return;
  }

  const motivo = prompt("Motivo de cancelación:");

  if (!motivo || !motivo.trim()) {
    toast("Cancelación sin motivo no permitida");
    return;
  }

  const confirmar = confirm(
    `¿Cancelar venta actual?\n\nMotivo: ${motivo.trim()}`
  );

  if (!confirmar) {
    toast("Cancelación abortada");
    return;
  }

  try {
    toast("Guardando cancelación...");

    const carritoSnapshot = carrito.map(x => ({ ...x }));

    const cancelada = await guardarVentaCanceladaCaptura(
      motivo.trim(),
      carritoSnapshot
    );

    console.log("VENTA CANCELADA EN CAPTURA:", cancelada);

    limpiarCarrito();
    limpiarFotoProducto();
    pintarProximoFolio();

    toast("Venta cancelada y guardada");

  } catch (err) {
    console.error("Error guardando cancelación:", err);
    toast("Error guardando cancelación");
  }
}