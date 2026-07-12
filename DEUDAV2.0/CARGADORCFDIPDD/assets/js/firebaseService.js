import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig, appConfig } from "./config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

function refColeccionAutorizados() {
  return collection(db, ...appConfig.autorizadosPath);
}

export async function listarRfcAutorizados() {
  const snap = await getDocs(refColeccionAutorizados());
  return snap.docs
    .map(item => item.id.toUpperCase())
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

  return normalizado;
}

export async function eliminarRfcAutorizado(rfc) {
  const normalizado = normalizarRfc(rfc);
  await deleteDoc(doc(refColeccionAutorizados(), normalizado));
}

export async function rfcEstaAutorizado(rfc) {
  const normalizado = normalizarRfc(rfc);
  if (!normalizado) return false;

  const snap = await getDoc(doc(refColeccionAutorizados(), normalizado));
  if (!snap.exists()) return false;

  const datos = snap.data();
  return datos?.activo !== false;
}

export async function existeEntradaFirebase(uuid) {
  const snap = await getDoc(
    doc(db, ...appConfig.firebaseEntradaPath, uuid.toUpperCase())
  );
  return snap.exists();
}

export async function guardarEntradaFirebase(uuid, datos) {
  const uuidMayus = uuid.toUpperCase();

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
