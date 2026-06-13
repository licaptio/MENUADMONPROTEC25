import { db } from "../firebase/config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  updateDoc
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

function obtenerDatosFolio() {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, "");

  const usuario = getUsuarioLogueado();

  const usuarioTag = String(usuario?.usuario || usuario?.nombre || "POS")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 10);

  const key = `folio_${usuarioTag}_${fecha}`;
  const contadorId = `${usuarioTag}_${fecha}`;

  return { fecha, usuarioTag, key, contadorId };
}

function obtenerRefContadorFolio(contadorId) {
  const usuario = getUsuarioLogueado();
  const rutaVenta = obtenerRutaVentaPorUsuario(usuario);

  return doc(
    db,
    "TIENDAS",
    rutaVenta.tienda,
    "FOLIOS_POS",
    contadorId
  );
}

export async function generarFolioVenta() {
  const { fecha, usuarioTag, key, contadorId } = obtenerDatosFolio();

  try {
    const ref = obtenerRefContadorFolio(contadorId);

    const nuevoConsecutivo = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);

      const ultimo = snap.exists()
        ? Number(snap.data()?.ultimo || 0)
        : 0;

      const siguiente = ultimo + 1;

      transaction.set(ref, {
        usuarioTag,
        fecha,
        ultimo: siguiente,
        actualizado: serverTimestamp()
      }, { merge: true });

      return siguiente;
    });

    localStorage.setItem(key, String(nuevoConsecutivo));

    return `${usuarioTag}-${fecha}-${String(nuevoConsecutivo).padStart(4, "0")}`;

  } catch (err) {
    console.warn("No se pudo generar folio desde Firestore. Usando localStorage:", err);

    const consecutivo = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(consecutivo));

    return `${usuarioTag}-${fecha}-${String(consecutivo).padStart(4, "0")}`;
  }
}

async function obtenerUltimoFolioDesdeVentas(rutaVenta, usuarioTag, fecha) {
  const ref = collection(
    db,
    "TIENDAS",
    rutaVenta.tienda,
    rutaVenta.coleccion
  );

  const q = query(
    ref,
    orderBy("fecha_local_iso", "desc"),
    limit(50)
  );

  const snap = await getDocs(q);

  let mayor = 0;
  const prefijo = `${usuarioTag}-${fecha}-`;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const folio = String(data?.folio || docSnap.id || "");

    if (!folio.startsWith(prefijo)) return;

    const match = folio.match(new RegExp(`^${prefijo}(\\d{4})`));
    if (!match) return;

    const consecutivo = Number(match[1] || 0);

    if (consecutivo > mayor) {
      mayor = consecutivo;
    }
  });

  return mayor;
}

export async function obtenerProximoFolioVenta() {
  const { fecha, usuarioTag, key, contadorId } = obtenerDatosFolio();

  try {
    const ref = obtenerRefContadorFolio(contadorId);
    const snap = await getDoc(ref);

    let ultimoFirebase = snap.exists()
      ? Number(snap.data()?.ultimo || 0)
      : 0;

    if (ultimoFirebase <= 0) {
      const usuario = getUsuarioLogueado();
      const rutaVenta = obtenerRutaVentaPorUsuario(usuario);

      ultimoFirebase = await obtenerUltimoFolioDesdeVentas(
        rutaVenta,
        usuarioTag,
        fecha
      );

      if (ultimoFirebase > 0) {
        await setDoc(ref, {
          usuarioTag,
          fecha,
          ultimo: ultimoFirebase,
          reconstruido_desde_ventas: true,
          actualizado: serverTimestamp()
        }, { merge: true });
      }
    }

    localStorage.setItem(key, String(ultimoFirebase));

    const siguiente = ultimoFirebase + 1;

    return `${usuarioTag}-${fecha}-${String(siguiente).padStart(4, "0")}`;

  } catch (err) {
    console.warn("No se pudo leer próximo folio desde Firestore. Usando localStorage:", err);

    const ultimoLocal = Number(localStorage.getItem(key) || 0);
    const siguiente = ultimoLocal + 1;

    return `${usuarioTag}-${fecha}-${String(siguiente).padStart(4, "0")}`;
  }
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

  const folio = await generarFolioVenta();
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

bitacora_cancelaciones_partidas:
  ventaBase.bitacora_cancelaciones_partidas || [],

bitacora_cambios_cantidad:
  ventaBase.bitacora_cambios_cantidad || [],

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

export async function cancelarVentaFirestore(documentoId, motivo = "") {
  const usuario = getUsuarioLogueado();
  const rutaVenta = obtenerRutaVentaPorUsuario(usuario);

  const ref = doc(
    db,
    "TIENDAS",
    rutaVenta.tienda,
    rutaVenta.coleccion,
    documentoId
  );

  await updateDoc(ref, {
    estado_venta: "CANCELADA",
    cancelada: true,
    motivo_cancelacion: motivo || "Cancelación manual POS",
    cancelada_por: usuario?.nombre || usuario?.usuario || "SIN USUARIO",
    fecha_cancelacion: serverTimestamp()
  });

  return true;
}

export async function guardarVentaCanceladaCaptura(motivo, carritoSnapshot = []) {
  const usuario = getUsuarioLogueado();
  const rutaIdLogin = getRutaId();
  const rutaVenta = obtenerRutaVentaPorUsuario(usuario);

  const folio = await generarFolioVenta();
  const folio_local_uid = generarFolioLocalUid(folio);

  const hoy = new Date();

  const detalle = carritoSnapshot.map(x => ({
    id: x.id || null,
    codigo: x.codigo || x.codigoBarra || null,
    nombre: x.nombre || x.concepto || "",
    cantidad: Number(x.cantidad || 0),
    precio_unit: Number(x.precioUnit || 0),
    importe: Number(x.importe || 0),
    departamento_id: x.departamento_id || null,
    departamento_nombre: x.departamento || null
  }));

  const total = detalle.reduce((sum, x) => {
    return sum + Number(x.importe || 0);
  }, 0);

  const cantidad_articulos = detalle.reduce((sum, x) => {
    return sum + Number(x.cantidad || 0);
  }, 0);

  const venta = {
    folio,
    folio_local_uid,
    documento_id: null,

    fecha: null,
    fecha_local_iso: hoy.toISOString(),
    fecha_txt: hoy.toLocaleString("es-MX"),

    estado_venta: "CANCELADA",
    cancelada: true,
    tipo_movimiento: "CANCELACION_CAPTURA",
    motivo_cancelacion: motivo || "Cancelación de captura POS",
    fecha_cancelacion_local_iso: hoy.toISOString(),

    version_pos: VERSION_POS,

    usuarioId: usuario?.id || null,
    usuarioNombre: usuario?.nombre || usuario?.usuario || null,
    usuarioLogin: usuario?.usuario || null,

    cancelada_por: usuario?.nombre || usuario?.usuario || "SIN USUARIO",

    rutaId: rutaVenta.tienda,
    sucursal: rutaVenta.tienda,
    caja_id: CAJA_ID,
    rutaIdLogin: rutaIdLogin || null,
    venta_prueba: rutaVenta.esPrueba,

    cliente: "PÚBLICO EN GENERAL",
    cliente_info: {
      id: null,
      nombre: "PÚBLICO EN GENERAL",
      rfc: "XAXX010101000"
    },

    moneda: "MXN",
    tipoCambio: 1,

    cortado: false,

    recibido: 0,
    cambio: 0,

    descuento_porcentaje: 0,
    descuento_monto: 0,

    resumen_financiero: {
      subtotal: 0,
      iva: 0,
      ieps: 0,
      impuestos: 0,
      descuento: 0,
      total: +total.toFixed(2),

      costo_total: 0,
      utilidad_total: 0,
      margen_porcentaje: 0,
      comision_total: 0,

      cantidad_articulos,
      cantidad_renglones: detalle.length
    },

    detalle,

    sincronizado: false,
    fecha_sincronizacion: null,
    error_sincronizacion: null,
    fecha_error: null
  };

  const ventaGuardada = await guardarVentaDirectaFirestore(venta, rutaVenta);

  return {
    ...ventaGuardada,
    pendiente_offline: false
  };
}

export {
  reenviarVentasPendientes,
  obtenerVentasPendientes,
  contarVentasPendientes
};