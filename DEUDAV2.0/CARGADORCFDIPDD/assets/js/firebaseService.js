import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig, appConfig } from "./config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

// Cache local de RFC autorizados.
// Se carga una sola vez desde Firestore y después las validaciones son en memoria.
let cacheRfcAutorizados = null;
let promesaCargaRfc = null;

function refColeccionAutorizados() {
  return collection(db, ...appConfig.autorizadosPath);
}

async function cargarCacheRfcAutorizados(forzar = false) {
  if (cacheRfcAutorizados && !forzar) {
    return cacheRfcAutorizados;
  }

  // Evita lanzar dos consultas iguales si varias funciones piden la lista a la vez.
  if (promesaCargaRfc && !forzar) {
    return promesaCargaRfc;
  }

  promesaCargaRfc = (async () => {
    const consulta = query(
      refColeccionAutorizados(),
      where("activo", "==", true)
    );

    const snap = await getDocs(consulta);

    cacheRfcAutorizados = new Set(
      snap.docs
        .map(item => normalizarRfc(item.id))
        .filter(Boolean)
    );

    return cacheRfcAutorizados;
  })();

  try {
    return await promesaCargaRfc;
  } finally {
    promesaCargaRfc = null;
  }
}

// Llamar una vez antes de procesar un lote de XML.
// Devuelve cuántos RFC activos quedaron cargados en memoria.
export async function prepararFiltroFirebase(forzar = false) {
  const cache = await cargarCacheRfcAutorizados(forzar);
  return cache.size;
}

export async function listarRfcAutorizados(forzar = false) {
  const cache = await cargarCacheRfcAutorizados(forzar);

  return Array.from(cache)
    .sort((a, b) => a.localeCompare(b));
}

export async function agregarRfcAutorizado(rfc) {
  const normalizado = normalizarRfc(rfc);
  validarRfc(normalizado);

  await setDoc(
    doc(refColeccionAutorizados(), normalizado),
    {
      rfc: normalizado,
      activo: true,
      fecha_alta: serverTimestamp()
    },
    { merge: true }
  );

  // Si la cache ya estaba cargada, la actualizamos sin volver a leer Firestore.
  if (cacheRfcAutorizados) {
    cacheRfcAutorizados.add(normalizado);
  }

  return normalizado;
}

export async function eliminarRfcAutorizado(rfc) {
  const normalizado = normalizarRfc(rfc);
  await deleteDoc(doc(refColeccionAutorizados(), normalizado));

  if (cacheRfcAutorizados) {
    cacheRfcAutorizados.delete(normalizado);
  }
}

export async function rfcEstaAutorizado(rfc) {
  const normalizado = normalizarRfc(rfc);
  if (!normalizado) return false;

  const cache = await cargarCacheRfcAutorizados();
  return cache.has(normalizado);
}

export async function existeEntradaFirebase(uuid) {
  const uuidMayus = String(uuid || "").toUpperCase().trim();
  if (!uuidMayus) return false;

  const snap = await getDoc(
    doc(db, ...appConfig.firebaseEntradaPath, uuidMayus)
  );

  return snap.exists();
}

export async function guardarEntradaFirebase(uuid, datos) {
  const uuidMayus = String(uuid || "").toUpperCase().trim();

  if (!uuidMayus) {
    throw new Error("Firebase bloqueado: UUID vacío.");
  }

  const rfcEmisor = normalizarRfc(
    datos?.rfc_emisor ||
    datos?.rfcEmisor ||
    ""
  );

  if (!rfcEmisor) {
    throw new Error(
      "Firebase bloqueado: el documento no contiene RFC emisor."
    );
  }

  // Segunda barrera de seguridad. Usa la cache local, no genera una lectura
  // adicional por cada factura cuando el filtro ya fue precargado.
  const autorizado = await rfcEstaAutorizado(rfcEmisor);

  if (!autorizado) {
    throw new Error(
      `Firebase bloqueado: RFC ${rfcEmisor} no autorizado.`
    );
  }

  await setDoc(
    doc(db, ...appConfig.firebaseEntradaPath, uuidMayus),
    {
      ...datos,
      uuid_cfdi: uuidMayus,
      origen: "SUPABASE",
      estado: "pendiente",
      timestamp: new Date().toISOString()
    }
  );
}

export function normalizarRfc(valor) {
  return String(valor || "")
    .toUpperCase()
    .replace(/[^A-ZÑ&0-9]/g, "")
    .trim();
}

function validarRfc(rfc) {
  const patron = /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/;
  if (!patron.test(rfc)) {
    throw new Error("El RFC no tiene un formato válido.");
  }
}
