import {
  guardarProductos,
  obtenerProductos,
  guardarMeta,
  obtenerMeta,
  guardarFotos,
  obtenerFotos
} from "./indexeddb.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export let catalogo = [];
export const codeIndex = new Map();
export const catalogoById = new Map();
export const fotosIndex = new Map();

const CACHE_HORAS = 24;

export function reconstruirIndices() {
  codeIndex.clear();
  catalogoById.clear();

  catalogo.forEach(p => {
    catalogoById.set(p.id, p);

    if (p.codigo) {
      codeIndex.set(String(p.codigo).trim(), p.id);
    }

    if (Array.isArray(p.equivalentes)) {
      p.equivalentes.forEach(eq => {
        if (eq) codeIndex.set(String(eq).trim(), p.id);
      });
    }
  });
}

export function normalizarProducto(docSnap) {
  const x = docSnap.data();

  return {
    id: docSnap.id,
    nombre: x.nombre || x.concepto || "SIN NOMBRE",
    codigo: String(x.codigo || x.codigoBarra || "").trim(),
    precioPublico: Number(x.precioPublico || 0),
    mayoreo: Number(x.mayoreo || 0),
    medioMayoreo: Number(x.medioMayoreo || 0),
    ivaTasa: Number(x.ivaTasa || 0),
    iepsTasa: Number(x.iepsTasa || 0),
    equivalentes: Array.isArray(x.equivalentes) ? x.equivalentes : [],
    claveSat: x.claveSat || null,
    unidadMedidaSat: x.unidadSat || x.unidadMedidaSat || null,
    departamento_id: x.departamento_id || null,
    departamento: x.departamento || null,
    costoUnit: Number(x.costoUnit || x.costoSinImpuesto || 0),
    permite_descuento: x.permite_descuento !== false,
    comision_tipo: x.comision_tipo || null,
    comision_valor: Number(x.comision_valor || 0),
    activo: x.activo !== false
  };
}

export async function cargarCatalogo(db, forzar = false) {
  const meta = await obtenerMeta("catalogo");
  const ahora = Date.now();
  const limite = CACHE_HORAS * 60 * 60 * 1000;

  if (!forzar && meta?.fecha && ahora - meta.fecha < limite) {
    const local = await obtenerProductos();

    if (local.length > 0) {
      catalogo = local;
      reconstruirIndices();
      console.log("⚡ Catálogo cargado desde IndexedDB:", catalogo.length);
      return catalogo;
    }
  }

  console.log("🌐 Descargando catálogo desde Firestore...");

  const q = query(
    collection(db, "productos"),
    where("activo", "==", true)
  );

  const snap = await getDocs(q);

  catalogo = snap.docs.map(normalizarProducto);

  await guardarProductos(catalogo);
  await guardarMeta("catalogo", {
    fecha: ahora,
    total: catalogo.length
  });

  reconstruirIndices();

  console.log("✅ Catálogo actualizado:", catalogo.length);
  return catalogo;
}

export async function cargarCatalogoFotos(db, forzar = false) {
  const meta = await obtenerMeta("catalogo_fotos");
  const ahora = Date.now();
  const limite = CACHE_HORAS * 60 * 60 * 1000;

  if (!forzar && meta?.fecha && ahora - meta.fecha < limite) {
    const local = await obtenerFotos();

    fotosIndex.clear();

    local.forEach(x => {
      fotosIndex.set(String(x.codigo), x);
    });

    console.log("📷 Fotos cargadas desde IndexedDB:", fotosIndex.size);
    return fotosIndex;
  }

  console.log("🌐 Descargando catálogo de fotos...");

  const snap = await getDocs(
    collection(db, "productos_fotos_meta")
  );

  const fotos = [];

  snap.forEach(docSnap => {
    fotos.push({
      codigo: docSnap.id,
      ...docSnap.data()
    });
  });

  await guardarFotos(fotos);
  await guardarMeta("catalogo_fotos", {
    fecha: ahora,
    total: fotos.length
  });

  fotosIndex.clear();

  fotos.forEach(x => {
    fotosIndex.set(String(x.codigo), x);
  });

  console.log("✅ Catálogo fotos actualizado:", fotos.length);
  return fotosIndex;
}

export function obtenerFotosProducto(codigo) {
  const key = String(codigo || "").trim();
  const item = fotosIndex.get(key);

  if (!item) return [];

  return Array.isArray(item.urlsFotos)
    ? item.urlsFotos.filter(Boolean)
    : [];
}

export function resolverProductoPorCodigo(codigo) {
  const key = String(codigo || "").trim();
  const id = codeIndex.get(key);

  if (!id) return null;

  return catalogoById.get(id) || null;
}

export function buscarLocal(texto) {
  const q = String(texto || "").trim().toLowerCase();

  if (!q) return [];

  const directo = resolverProductoPorCodigo(q);
  if (directo) return [directo];

  return catalogo
    .filter(p => {
      const nombre = String(p.nombre || "").toLowerCase();
      const codigo = String(p.codigo || "").toLowerCase();

      return nombre.includes(q) || codigo.includes(q);
    })
    .slice(0, 50);
}

export function obtenerCatalogo() {
  return catalogo;
}