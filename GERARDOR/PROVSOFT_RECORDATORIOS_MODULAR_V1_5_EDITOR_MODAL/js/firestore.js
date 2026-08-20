import {
  addDoc, arrayUnion, collection, doc, getDocs,
  serverTimestamp, Timestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const COLECCION = "recordatorios";

export async function crearRecordatorio(datos) {
  const fechaProgramada = convertirFecha(datos.fecha, datos.hora);
  const contenidoLimpio = datos.contenido.trim();
  const tituloAutomatico = obtenerTituloAutomatico(contenidoLimpio);

  const referencia = await addDoc(collection(db, COLECCION), {
    tipo: "RECORDATORIO",
    titulo: tituloAutomatico,
    contenido: contenidoLimpio,
    estado: "PENDIENTE",
    prioritario: false,
    fecha_prioridad: null,
    fecha_programada: Timestamp.fromDate(fechaProgramada),
    fecha_creacion: serverTimestamp(),
    fecha_atendido: null,
    fecha_reprogramada: null,
    ultima_modificacion: serverTimestamp(),
    creado_por: "GERARDO",
    imagenes: [],
    historial: [{ accion: "CREADO", usuario: "GERARDO", fecha: Timestamp.now() }]
  });

  return referencia.id;
}

export async function guardarImagenesRecordatorio(id, imagenes) {
  await updateDoc(doc(db, COLECCION, id), {
    imagenes,
    ultima_modificacion: serverTimestamp()
  });
}

export async function actualizarRecordatorio(id, datos) {
  const fechaProgramada = convertirFecha(datos.fecha, datos.hora);
  const contenidoLimpio = datos.contenido.trim();

  await updateDoc(doc(db, COLECCION, id), {
    titulo: obtenerTituloAutomatico(contenidoLimpio),
    contenido: contenidoLimpio,
    fecha_programada: Timestamp.fromDate(fechaProgramada),
    imagenes: datos.imagenes,
    anotacion_extra: (datos.anotacion_extra || "").trim(),
    ultima_modificacion: serverTimestamp(),
    historial: arrayUnion({
      accion: "EDITADO",
      usuario: "GERARDO",
      fecha: Timestamp.now()
    })
  });
}

export async function marcarRecordatorioAtendido(id) {
  await updateDoc(doc(db, COLECCION, id), {
    estado: "ATENDIDO",
    prioritario: false,
    fecha_prioridad: null,
    fecha_atendido: serverTimestamp(),
    ultima_modificacion: serverTimestamp(),
    historial: arrayUnion({
      accion: "ATENDIDO",
      usuario: "GERARDO",
      fecha: Timestamp.now()
    })
  });
}


export async function revivirRecordatorio(id) {
  await updateDoc(doc(db, COLECCION, id), {
    estado: "PENDIENTE",
    fecha_atendido: null,
    ultima_modificacion: serverTimestamp(),
    historial: arrayUnion({
      accion: "REVIVIDO",
      usuario: "GERARDO",
      fecha: Timestamp.now()
    })
  });
}


export async function establecerPrioridadRecordatorio(id, prioritario) {
  if (prioritario) {
    const resultado = await getDocs(collection(db, COLECCION));
    const totalPrioritarios = resultado.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r =>
        r.id !== id &&
        r.tipo === "RECORDATORIO" &&
        r.estado === "PENDIENTE" &&
        r.prioritario === true
      ).length;

    if (totalPrioritarios >= 7) {
      const error = new Error("Ya tienes 7 pendientes prioritarios. Desmarca uno antes de agregar otro.");
      error.code = "prioridad/limite-7";
      throw error;
    }
  }

  await updateDoc(doc(db, COLECCION, id), {
    prioritario: !!prioritario,
    fecha_prioridad: prioritario ? serverTimestamp() : null,
    ultima_modificacion: serverTimestamp(),
    historial: arrayUnion({
      accion: prioritario ? "MARCADO_PRIORITARIO" : "DESMARCADO_PRIORITARIO",
      usuario: "GERARDO",
      fecha: Timestamp.now()
    })
  });
}

function convertirFecha(fecha, hora) {
  const fechaProgramada = new Date(`${fecha}T${hora}:00`);
  if (Number.isNaN(fechaProgramada.getTime())) {
    throw new Error("La fecha u hora indicada no es válida.");
  }
  return fechaProgramada;
}

function obtenerTituloAutomatico(contenido) {
  const lineas = contenido.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!lineas.length) return "Recordatorio con imagen";
  return (lineas[0].replace(/^[-–—•*\s]+/, "").trim() || "Recordatorio").slice(0, 120);
}

export async function obtenerRecordatoriosPendientes() {
  const resultado = await getDocs(collection(db, COLECCION));

  return resultado.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r =>
      r.tipo === "RECORDATORIO" &&
      r.estado === "PENDIENTE" &&
      r.fecha_programada?.toDate
    )
    .sort((a, b) => {
      const prioridadA = a.prioritario === true ? 1 : 0;
      const prioridadB = b.prioritario === true ? 1 : 0;
      if (prioridadA !== prioridadB) return prioridadB - prioridadA;
      return a.fecha_programada.toDate() - b.fecha_programada.toDate();
    });
}

export async function obtenerRecordatoriosAtendidos(maximo = 30) {
  const resultado = await getDocs(collection(db, COLECCION));

  return resultado.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r =>
      r.tipo === "RECORDATORIO" &&
      r.estado === "ATENDIDO"
    )
    .sort((a, b) => {
      const fa =
        a.fecha_atendido?.toDate?.() ||
        a.ultima_modificacion?.toDate?.() ||
        new Date(0);

      const fb =
        b.fecha_atendido?.toDate?.() ||
        b.ultima_modificacion?.toDate?.() ||
        new Date(0);

      return fb - fa;
    })
    .slice(0, maximo);
}
