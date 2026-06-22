// js/offline/ventasPendientes.js
// Cola local de ventas pendientes cuando no hay internet o Firebase falla.

import { db } from "../firebase/config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STORAGE_KEY = "ventas_pendientes_pospdd26";
let reenvioActivo = false;

function leerCola() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("❌ No se pudo leer cola offline:", err);
    return [];
  }
}

function guardarCola(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function obtenerVentasPendientes() {
  return leerCola();
}

export function contarVentasPendientes() {
  return leerCola().length;
}

export function guardarVentaPendiente({ venta, rutaVenta, error }) {
  const cola = leerCola();
  const folioUid = venta?.folio_local_uid || venta?.folio;

  if (!folioUid) {
    console.error("❌ Venta sin folio. No se guardó en cola offline.", venta);
    return false;
  }

  const yaExiste = cola.some(x =>
    (x.venta?.folio_local_uid || x.venta?.folio) === folioUid
  );

  if (yaExiste) {
    console.warn("⚠️ La venta ya estaba en cola offline:", folioUid);
    return true;
  }

  cola.push({
    id_local: folioUid,
    venta: {
      ...venta,
      sincronizado: false,
      fecha_sincronizacion: null,
      error_sincronizacion: String(error?.message || error || "Error de conexión"),
      fecha_error: new Date().toISOString()
    },
    rutaVenta,
    intentos: 0,
    ultimo_error: String(error?.message || error || "Error de conexión"),
    fecha_pendiente: new Date().toISOString()
  });

  guardarCola(cola);
  console.warn("📦 Venta guardada pendiente de sincronizar:", folioUid);
  return true;
}

export function eliminarVentaPendiente(idLocal) {
  const cola = leerCola();
  const nuevaCola = cola.filter(x => x.id_local !== idLocal);
  guardarCola(nuevaCola);
  return nuevaCola.length;
}

export function limpiarVentasPendientes() {
  guardarCola([]);
}

async function guardarPendienteEnFirestore(item) {
  const rutaVenta = item.rutaVenta || {};
  const venta = item.venta || {};

  if (!rutaVenta.tienda || !rutaVenta.coleccion || !(venta.documento_id || venta.folio_local_uid || venta.folio)) {
    throw new Error("Venta pendiente incompleta: falta ruta o folio/documento.");
  }

  const documentoId = venta.documento_id || venta.folio_local_uid || venta.folio;

  const ref = doc(
    db,
    "TIENDAS",
    rutaVenta.tienda,
    rutaVenta.coleccion,
    documentoId
  );

  const ventaParaFirestore = {
    ...venta,
    fecha: serverTimestamp(),
    sincronizado: true,
    fecha_sincronizacion: serverTimestamp(),
    error_sincronizacion: null,
    fecha_error: null
  };

  await setDoc(ref, ventaParaFirestore, { merge: true });
}

export async function reenviarVentasPendientes() {
  const cola = leerCola();

  if (!cola.length) {
    console.log("✅ No hay ventas pendientes.");
    return { reenviadas: 0, pendientes: 0 };
  }

  if (!navigator.onLine) {
    console.warn("📴 Sin internet. Se mantiene cola offline:", cola.length);
    return { reenviadas: 0, pendientes: cola.length };
  }

  console.log("📤 Reintentando ventas pendientes:", cola.length);

  const restantes = [];
  let reenviadas = 0;

  for (const item of cola) {
    try {
      await guardarPendienteEnFirestore(item);
      reenviadas++;
      console.log("✅ Venta sincronizada:", item.id_local);
    } catch (err) {
      console.error("❌ Sigue pendiente:", item.id_local, err);
      restantes.push({
        ...item,
        intentos: Number(item.intentos || 0) + 1,
        ultimo_error: String(err?.message || err),
        fecha_error: new Date().toISOString()
      });
    }
  }

  guardarCola(restantes);

  if (reenviadas > 0) {
    console.log(`✅ Ventas reenviadas: ${reenviadas}`);
  }

  if (restantes.length === 0) {
    console.log("🧹 Cola offline vacía.");
  }

  return {
    reenviadas,
    pendientes: restantes.length
  };
}

export function activarReenvioVentasPendientes() {
  if (reenvioActivo) return;
  reenvioActivo = true;

  window.addEventListener("online", () => {
    console.log("🌐 Internet recuperado. Reenviando ventas pendientes...");
    setTimeout(() => {
      reenviarVentasPendientes();
    }, 1000);
  });

  // Revisión automática al abrir el POS.
  setTimeout(() => {
    reenviarVentasPendientes();
  }, 2500);
}
