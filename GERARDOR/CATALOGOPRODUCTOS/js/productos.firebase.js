import { db } from "../config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { state } from "./productos.estado.js";

export { serverTimestamp };

export async function obtenerCatalogoFirebase(){
  const snap = await getDocs(collection(db, state.coleccionProductos));
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}

export async function buscarFirebasePorCodigo(codigo){
  const codigoTxt = String(codigo || "").trim();
  if (!codigoTxt) return null;

  // Primero intenta por ID directo
  const ref = doc(db, state.coleccionProductos, codigoTxt);
  const snapId = await getDoc(ref);
  if (snapId.exists()) return { id:snapId.id, ...snapId.data() };

  // Segundo intenta por campo codigoBarra
  const qCodigo = query(
    collection(db, state.coleccionProductos),
    where("codigoBarra", "==", codigoTxt),
    limit(1)
  );

  const snapCodigo = await getDocs(qCodigo);
  if (!snapCodigo.empty) {
    const d = snapCodigo.docs[0];
    return { id:d.id, ...d.data() };
  }

  return null;
}

export async function crearProductoFirebase(id, data){
  const refDoc = doc(db, state.coleccionProductos, id);
  await setDoc(refDoc, data);
}

export async function actualizarProductoFirebase(id, data){
  const refDoc = doc(db, state.coleccionProductos, id);
  await updateDoc(refDoc, data);
}

export async function eliminarProductoFirebase(id){
  await deleteDoc(doc(db, state.coleccionProductos, id));
}
