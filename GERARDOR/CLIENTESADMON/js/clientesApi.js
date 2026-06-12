import { collection, doc, getDocs, setDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { RUTA_CLIENTES } from "../configuraciones/firebaseConfig.js";
import { normalizar, numero } from "./util.js";

const [COL_EMPRESAS, RFC_EMPRESA, SUB_CLIENTES] = RUTA_CLIENTES;

export function refClientes() {
  return collection(db, COL_EMPRESAS, RFC_EMPRESA, SUB_CLIENTES);
}

export function refCliente(idCliente) {
  return doc(db, COL_EMPRESAS, RFC_EMPRESA, SUB_CLIENTES, String(idCliente));
}

export async function cargarClientes() {
  const q = query(refClientes(), orderBy("nombreBusqueda"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ idDoc: d.id, ...d.data() }));
}

export function buscarEnMemoria(clientes, texto) {
  const q = normalizar(texto);
  if (!q) return [];

  return clientes.filter(c => {
    const campos = [
      c.idCliente,
      c.cliente,
      c.nombre,
      c.nombreBusqueda,
      c.rfc,
      c.telefono,
      c.email,
      c.ciudad,
      c.municipio
    ].map(normalizar).join(" | ");

    return campos.includes(q);
  }).slice(0, 80);
}

export function clienteDesdeFormulario(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const idCliente = String(data.idCliente || "").trim();

  return {
    cliente: numero(idCliente),
    idCliente,
    nombre: String(data.nombre || "").trim().toUpperCase(),
    nombreBusqueda: normalizar(data.nombre),
    rfc: String(data.rfc || "").trim().toUpperCase(),
    regimenFiscal: String(data.regimenFiscal || "").trim(),
    direccion: String(data.direccion || "").trim().toUpperCase(),
    numeroExterior: String(data.numeroExterior || "").trim().toUpperCase(),
    colonia: String(data.colonia || "").trim().toUpperCase(),
    municipio: String(data.municipio || "").trim().toUpperCase(),
    ciudad: String(data.ciudad || "").trim().toUpperCase(),
    estado: String(data.estado || "").trim().toUpperCase(),
    pais: String(data.pais || "MEXICO").trim().toUpperCase(),
    cp: String(data.cp || "").trim(),
    telefono: String(data.telefono || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    catPrecio: numero(data.catPrecio),
    limiteCredito: numero(data.limiteCredito),
    agregarPorcentaje: numero(data.agregarPorcentaje),
    activo: form.querySelector("#f_activo").checked,
    fechaActualizacion: new Date()
  };
}

export async function guardarCliente(cliente) {
  if (!cliente.idCliente) throw new Error("Falta ID de cliente");
  if (!cliente.nombre) throw new Error("Falta nombre de cliente");
  await setDoc(refCliente(cliente.idCliente), cliente, { merge: true });
}

export async function desactivarCliente(idCliente) {
  await updateDoc(refCliente(idCliente), {
    activo: false,
    fechaActualizacion: new Date()
  });
}

export function siguienteId(clientes) {
  const max = clientes.reduce((m, c) => Math.max(m, Number(c.idCliente || c.cliente || 0)), 0);
  return String(max + 1);
}
