import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, EMPRESA_ID } from "./firebase-config.js";

const clientesCol = () => collection(db, "CLIENTES", EMPRESA_ID, "CLIENTES");
export const clienteRef = (idCliente) => doc(db, "CLIENTES", EMPRESA_ID, "CLIENTES", String(idCliente));

function normalizar(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textoCliente(c) {
  return normalizar([
    c.idCliente,
    c.cliente,
    c.nombre,
    c.nombreBusqueda,
    c.rfc,
    c.email,
    c.telefono,
    c.ciudad,
    c.municipio,
    c.estado,
    c.colonia
  ].join(" "));
}

function ordenarClientes(a, b) {
  const na = normalizar(a.nombreBusqueda || a.nombre || "ZZZ");
  const nb = normalizar(b.nombreBusqueda || b.nombre || "ZZZ");
  return na.localeCompare(nb, "es") || String(a.idCliente || a.id).localeCompare(String(b.idCliente || b.id));
}

export async function listarClientesBase() {
  const q = query(clientesCol(), orderBy("nombreBusqueda"));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort(ordenarClientes);
}

export async function buscarClientes(texto) {
  const t = normalizar(texto);
  const todos = await listarClientesBase();

  if (!t) return todos;

  const porId = await getDoc(clienteRef(t));
  if (porId.exists()) return [{ id: porId.id, ...porId.data() }];

  const palabras = t.split(/\s+/).filter(Boolean);

  return todos.filter(c => {
    const base = textoCliente(c);
    return palabras.every(p => base.includes(p));
  });
}

export async function obtenerCliente(idCliente) {
  const snap = await getDoc(clienteRef(idCliente));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function actualizarCliente(idCliente, data) {
  const clean = { ...data };
  if (clean.nombre) clean.nombreBusqueda = normalizar(clean.nombre);
  await updateDoc(clienteRef(idCliente), clean);
}


export async function actualizarMembresiaCliente(idCliente, data) {
  await updateDoc(clienteRef(idCliente), {
    ...data,
    membresiaGenerada: true,
    tieneMembresia: true,
    fechaGeneracionMembresia: serverTimestamp(),
    membresiaVersion: Number(data.membresiaVersion || 1)
  });
}
