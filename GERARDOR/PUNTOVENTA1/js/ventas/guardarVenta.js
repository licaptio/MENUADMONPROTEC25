import { db } from "../firebase/config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getUsuarioLogueado,
  getRutaId
} from "../auth/login.js";

import {
  obtenerRutaVentaPorUsuario
} from "../config/usuariosVentas.js";

import {
  guardarVentaPendiente,
  activarReenvioVentasPendientes,
  reenviarVentasPendientes,
  obtenerVentasPendientes,
  contarVentasPendientes
} from "../offline/ventasPendientes.js";

const VERSION_POS = "POSPDD26-2026.1";
const CAJA_ID = "CAJA01";

activarReenvioVentasPendientes();

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

async function obtenerIdUnicoVenta(rutaVenta, folioLocalUid) {
  let idFinal = folioLocalUid;
  let intento = 0;

  while (true) {
    const ref = doc(
      db,
      "TIENDAS",
      rutaVenta.tienda,
      rutaVenta.coleccion,
      idFinal
    );

    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return idFinal;
    }

    intento++;
    idFinal = `${folioLocalUid}-DUP-${intento}`;
  }
}

async function guardarVentaDirectaFirestore(venta, rutaVenta) {
  const idDocumento = await obtenerIdUnicoVenta(
    rutaVenta,
    venta.folio_local_uid
  );

  const ref = doc(
    db,
    "TIENDAS",
    rutaVenta.tienda,
    rutaVenta.coleccion,
    idDocumento
  );

  const ventaFirestore = {
    ...venta,
    documento_id: idDocumento,
    fecha: serverTimestamp(),
    sincronizado: true,
    fecha_sincronizacion: serverTimestamp(),
    error_sincronizacion: null,
    fecha_error: null
  };

  await setDoc(ref, ventaFirestore, { merge: false });

  return ventaFirestore;
}

export async function guardarVentaFirestore(ventaBase) {
  const usuario = getUsuarioLogueado();
  const rutaIdLogin = getRutaId();
  const rutaVenta = obtenerRutaVentaPorUsuario(usuario);

  const folio = generarFolioVenta();
  const folio_local_uid = generarFolioLocalUid(folio);

  const hoy = new Date();

  const venta = {
    folio,
    folio_local_uid,
    documento_id: null,

    fecha: null,
    fecha_local_iso: hoy.toISOString(),
    fecha_txt: hoy.toLocaleString("es-MX"),

    estado_venta: "ACTIVA",
    version_pos: VERSION_POS,

    usuarioId: usuario?.id || null,
    usuarioNombre: usuario?.nombre || usuario?.usuario || null,
    usuarioLogin: usuario?.usuario || null,

    autorizado_por: ventaBase.autorizado_por || null,

    rutaId: rutaVenta.tienda,
    sucursal: rutaVenta.tienda,
    caja_id: CAJA_ID,

    rutaIdLogin: rutaIdLogin || null,
    venta_prueba: rutaVenta.esPrueba,

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

    detalle: ventaBase.detalle,

    sincronizado: false,
    fecha_sincronizacion: null,
    error_sincronizacion: null,
    fecha_error: null
  };

  try {
    const ventaGuardada = await guardarVentaDirectaFirestore(venta, rutaVenta);

    return {
      ...ventaGuardada,
      pendiente_offline: false
    };

  } catch (err) {
    console.error("❌ No se pudo guardar en Firestore. Se manda a cola offline:", err);

    guardarVentaPendiente({
      venta,
      rutaVenta,
      error: err
    });

    return {
      ...venta,
      sincronizado: false,
      pendiente_offline: true,
      error_sincronizacion: String(err?.message || err),
      fecha_error: new Date().toISOString()
    };
  }
}

export {
  reenviarVentasPendientes,
  obtenerVentasPendientes,
  contarVentasPendientes
};