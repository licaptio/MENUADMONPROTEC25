import { db } from "../firebase/config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getUsuarioLogueado,
  getRutaId
} from "../auth/login.js";

export function generarFolioVenta() {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, "");

  const usuario = getUsuarioLogueado();
  const usuarioTag = String(usuario?.usuario || "POS")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 10);

  const key = `folio_${usuarioTag}_${fecha}`;
  const consecutivo = Number(localStorage.getItem(key) || 0) + 1;

  localStorage.setItem(key, String(consecutivo));

  return `${usuarioTag}-${fecha}-${String(consecutivo).padStart(4, "0")}`;
}

export async function guardarVentaFirestore(ventaBase) {
  const usuario = getUsuarioLogueado();
  const rutaId = getRutaId();

  const folio = generarFolioVenta();
  const hoy = new Date();
  const mes = hoy.toISOString().slice(0, 7).replace("-", "");

  const venta = {
    folio,
    rutaId: rutaId || null,

    cliente: "PÚBLICO EN GENERAL",

    usuarioId: usuario?.id || null,
    usuarioNombre: usuario?.nombre || usuario?.usuario || null,

    fecha: serverTimestamp(),
    fecha_local_iso: hoy.toISOString(),
    fecha_txt: hoy.toLocaleString("es-MX"),

    moneda: "MXN",
    tipoCambio: 1,
    cortado: false,

    recibido: ventaBase.recibido,
    cambio: ventaBase.cambio,

    resumen_financiero: {
      subtotal: ventaBase.subtotal,
      iva: ventaBase.iva,
      ieps: ventaBase.ieps,
      impuestos: ventaBase.impuestos,
      total: ventaBase.total
    },

    detalle: ventaBase.detalle
  };

  const ref = doc(
    db,
    "VENTAS",
    mes,
    "VENTAS_MES",
    folio
  );

  await setDoc(ref, venta);

  return venta;
}