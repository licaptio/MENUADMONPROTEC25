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

const VERSION_POS = "POSPDD26-2026.1";
const CAJA_ID = "CAJA01";

export function generarFolioVenta() {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, "");

  const usuario = getUsuarioLogueado();

  const usuarioTag = String(usuario?.usuario || usuario?.nombre || "POS")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 10);

  const key = `folio_${usuarioTag}_${fecha}`;
  const consecutivo = Number(localStorage.getItem(key) || 0) + 1;

  localStorage.setItem(key, String(consecutivo));

  return `${usuarioTag}-${fecha}-${String(consecutivo).padStart(4, "0")}`;
}

export function generarFolioLocalUid(folio) {
  const hoy = new Date();

  const horaTag = hoy
    .toTimeString()
    .slice(0, 8)
    .replace(/:/g, "");

  const random = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `${folio}-${horaTag}-${random}`;
}

export async function guardarVentaFirestore(ventaBase) {
  const usuario = getUsuarioLogueado();
  const rutaId = getRutaId();

  const folio = generarFolioVenta();
  const folio_local_uid = generarFolioLocalUid(folio);

  const hoy = new Date();
  const mes = hoy.toISOString().slice(0, 7).replace("-", "");

  const venta = {
    folio,
    folio_local_uid,

    fecha: serverTimestamp(),
    fecha_local_iso: hoy.toISOString(),
    fecha_txt: hoy.toLocaleString("es-MX"),

    estado_venta: "ACTIVA",
    version_pos: VERSION_POS,

    usuarioId: usuario?.id || null,
    usuarioNombre: usuario?.nombre || usuario?.usuario || null,

    autorizado_por: ventaBase.autorizado_por || null,

    rutaId: rutaId || null,
    sucursal: rutaId || null,
    caja_id: CAJA_ID,

    cliente: ventaBase.cliente || "PÚBLICO EN GENERAL",
    cliente_info: ventaBase.cliente_info || {
      id: null,
      nombre: "PÚBLICO EN GENERAL",
      rfc: "XAXX010101000"
    },

    moneda: "MXN",
    tipoCambio: 1,

    cortado: false,

    recibido: ventaBase.recibido,
    cambio: ventaBase.cambio,

    descuento_porcentaje: ventaBase.descuento_porcentaje || 0,
    descuento_monto: ventaBase.descuento_monto || 0,

    resumen_financiero: {
      subtotal: ventaBase.subtotal,
      iva: ventaBase.iva,
      ieps: ventaBase.ieps,
      impuestos: ventaBase.impuestos,
      descuento: ventaBase.descuento_monto || 0,
      total: ventaBase.total,

      costo_total: ventaBase.costo_total,
      utilidad_total: ventaBase.utilidad_total,
      margen_porcentaje: ventaBase.margen_porcentaje,
      comision_total: ventaBase.comision_total,

      cantidad_articulos: ventaBase.cantidad_articulos,
      cantidad_renglones: ventaBase.cantidad_renglones
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