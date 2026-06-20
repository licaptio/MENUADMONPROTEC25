import { deleteObject, getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storageClientes } from "./firebase-config.js";

const carpetasPorCategoria = {
  perfil: "perfil",
  foto_cliente: "foto",
  identificacion: "documentos/identificacion",
  comprobante_domicilio: "documentos/comprobante_domicilio",
  contratos: "documentos/contratos",
  credito: "documentos/credito",
  pagares: "documentos/pagares",
  estados_cuenta: "documentos/estados_cuenta",
  otros: "documentos/otros"
};

function limpiarNombreArchivo(nombre) {
  const original = String(nombre || "archivo").trim();
  const sinAcentos = original.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return sinAcentos.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function obtenerCarpetaCategoria(categoria) {
  return carpetasPorCategoria[categoria] || carpetasPorCategoria.otros;
}

export async function subirArchivoCliente({ idCliente, categoria, file }) {
  const safeName = `${Date.now()}_${limpiarNombreArchivo(file.name)}`;
  const carpeta = obtenerCarpetaCategoria(categoria);
  const path = `clientes/${idCliente}/${carpeta}/${safeName}`;
  const storageRef = ref(storageClientes, path);
  const result = await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      idCliente: String(idCliente),
      categoria: String(categoria || "otros"),
      nombreOriginal: file.name || "archivo"
    }
  });
  const url = await getDownloadURL(result.ref);
  return {
    path,
    url,
    contentType: file.type || "application/octet-stream",
    size: file.size || 0,
    nombreArchivo: file.name || safeName
  };
}

export async function eliminarArchivoStorage(path) {
  if (!path) return;
  await deleteObject(ref(storageClientes, path));
}


export async function subirMembresiaPng({ idCliente, blob }) {
  const path = `clientes/${idCliente}/membresia/gafete.png`;
  const storageRef = ref(storageClientes, path);
  const result = await uploadBytes(storageRef, blob, {
    contentType: "image/png",
    customMetadata: {
      idCliente: String(idCliente),
      tipo: "MEMBRESIA_DIGITAL",
      reemplazaAnterior: "true"
    }
  });
  const url = await getDownloadURL(result.ref);
  return {
    path,
    url,
    contentType: "image/png",
    size: blob.size || 0,
    nombreArchivo: "gafete.png"
  };
}
