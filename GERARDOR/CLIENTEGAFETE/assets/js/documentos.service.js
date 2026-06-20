import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, EMPRESA_ID } from "./firebase-config.js";
import { clienteRef } from "./clientes.service.js";
import { subirArchivoCliente } from "./storage.service.js";

const docsCol = (idCliente) => collection(
  db,
  "CLIENTES",
  EMPRESA_ID,
  "CLIENTES",
  String(idCliente),
  "DOCUMENTOS"
);

export const CATEGORIAS_DOC = {
  perfil: "Foto cliente",
  foto_cliente: "Foto cliente",
  identificacion: "Identificación",
  comprobante_domicilio: "Comprobante domicilio",
  contratos: "Contratos",
  credito: "Crédito",
  pagares: "Pagarés",
  estados_cuenta: "Estados de cuenta",
  otros: "Otros"
};

export function nombreCategoria(categoria) {
  return CATEGORIAS_DOC[categoria] || categoria || "Sin categoría";
}

export async function listarDocumentos(idCliente) {
  const snap = await getDocs(query(docsCol(idCliente), orderBy("fechaSubida", "desc")));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(x => !x.eliminado);
}

export function calcularResumenDocumentos(documentos) {
  const resumen = {
    totalDocumentos: documentos.length,
    fotoCapturada: documentos.some(d => d.categoria === "perfil" || d.categoria === "foto_cliente"),
    identificacionCapturada: documentos.some(d => d.categoria === "identificacion"),
    comprobanteCapturado: documentos.some(d => d.categoria === "comprobante_domicilio"),
    categorias: {}
  };

  documentos.forEach(d => {
    const cat = d.categoria || "otros";
    resumen.categorias[cat] = (resumen.categorias[cat] || 0) + 1;
  });

  return resumen;
}

async function actualizarResumenCliente(idCliente) {
  const documentos = await listarDocumentos(idCliente);
  const resumen = calcularResumenDocumentos(documentos);

  await updateDoc(clienteRef(idCliente), {
    totalDocumentos: resumen.totalDocumentos,
    fotoCapturada: resumen.fotoCapturada,
    identificacionCapturada: resumen.identificacionCapturada,
    comprobanteCapturado: resumen.comprobanteCapturado,
    documentosCapturados: resumen.totalDocumentos > 0,
    ultimaActualizacionExpediente: serverTimestamp()
  });

  return resumen;
}

export async function obtenerResumenDocumentos(idCliente) {
  const documentos = await listarDocumentos(idCliente);
  return calcularResumenDocumentos(documentos);
}

export async function subirDocumentos(idCliente, categoria, files, observaciones = "") {
  const resultados = [];

  for (const file of files) {
    const subido = await subirArchivoCliente({ idCliente, categoria, file });
    const docData = {
      nombreArchivo: subido.nombreArchivo,
      categoria,
      categoriaNombre: nombreCategoria(categoria),
      tipoDocumento: String(categoria || "otros").toUpperCase(),
      storageBucket: "clientes-provsoft-pdd",
      storagePath: subido.path,
      downloadUrl: subido.url,
      contentType: subido.contentType,
      size: subido.size,
      activo: true,
      eliminado: false,
      observaciones: String(observaciones || "").trim(),
      fechaSubida: serverTimestamp(),
      subidoPor: "PROVSOFT"
    };

    const refDoc = await addDoc(docsCol(idCliente), docData);
    resultados.push({ id: refDoc.id, ...docData });
  }

  await actualizarResumenCliente(idCliente);
  return resultados;
}


export async function subirDocumentoPrincipal(idCliente, tipoPrincipal, file, observaciones = "") {
  const mapa = {
    foto_cliente: {
      categoria: "foto_cliente",
      clienteCampos: {
        fotoCapturada: true,
        tieneFotoCliente: true
      },
      urlCampo: "fotoClientePrincipalUrl",
      pathCampo: "fotoClientePrincipalPath",
      legadoUrl: "fotoClienteUrl",
      legadoPath: "fotoClientePath",
      tipoNombre: "FOTO_CLIENTE"
    },
    identificacion: {
      categoria: "identificacion",
      clienteCampos: {
        identificacionCapturada: true,
        tieneIdentificacion: true
      },
      urlCampo: "identificacionPrincipalUrl",
      pathCampo: "identificacionPrincipalPath",
      tipoNombre: "IDENTIFICACION"
    },
    comprobante_domicilio: {
      categoria: "comprobante_domicilio",
      clienteCampos: {
        comprobanteCapturado: true,
        tieneComprobante: true
      },
      urlCampo: "comprobantePrincipalUrl",
      pathCampo: "comprobantePrincipalPath",
      tipoNombre: "COMPROBANTE_DOMICILIO"
    }
  };

  const cfg = mapa[tipoPrincipal];
  if (!cfg) throw new Error("Tipo principal no soportado: " + tipoPrincipal);

  const existentes = await listarDocumentos(idCliente);
  const principales = existentes.filter(d => d.tipoPrincipal === tipoPrincipal && d.esPrincipal === true);
  await Promise.all(principales.map(d => updateDoc(doc(
    db,
    "CLIENTES",
    EMPRESA_ID,
    "CLIENTES",
    String(idCliente),
    "DOCUMENTOS",
    d.id
  ), {
    esPrincipal: false,
    reemplazadoPorNuevaVersion: true,
    fechaReemplazo: serverTimestamp()
  })));

  const version = existentes.filter(d => d.tipoPrincipal === tipoPrincipal).length + 1;
  const subido = await subirArchivoCliente({ idCliente, categoria: cfg.categoria, file });
  const docData = {
    nombreArchivo: subido.nombreArchivo,
    categoria: cfg.categoria,
    categoriaNombre: nombreCategoria(cfg.categoria),
    tipoDocumento: cfg.tipoNombre,
    tipoPrincipal,
    version,
    esPrincipal: true,
    storageBucket: "clientes-provsoft-pdd",
    storagePath: subido.path,
    downloadUrl: subido.url,
    contentType: subido.contentType,
    size: subido.size,
    activo: true,
    eliminado: false,
    observaciones: String(observaciones || "").trim(),
    fechaSubida: serverTimestamp(),
    subidoPor: "PROVSOFT"
  };

  const refDoc = await addDoc(docsCol(idCliente), docData);

  await updateDoc(clienteRef(idCliente), {
    ...cfg.clienteCampos,
    [cfg.urlCampo]: subido.url,
    [cfg.pathCampo]: subido.path,
    ...(cfg.legadoUrl ? { [cfg.legadoUrl]: subido.url } : {}),
    ...(cfg.legadoPath ? { [cfg.legadoPath]: subido.path } : {}),
    documentosCapturados: true,
    ultimaActualizacionExpediente: serverTimestamp()
  });

  await actualizarResumenCliente(idCliente);
  return { id: refDoc.id, ...docData };
}

export async function eliminarDocumento(idCliente, documento) {
  await updateDoc(doc(
    db,
    "CLIENTES",
    EMPRESA_ID,
    "CLIENTES",
    String(idCliente),
    "DOCUMENTOS",
    documento.id
  ), {
    eliminado: true,
    activo: false,
    fechaEliminacion: serverTimestamp()
  });

  return actualizarResumenCliente(idCliente);
}
