import { state } from "./productos.estado.js";
import { norm } from "./productos.utils.js";
import { buscarFirebasePorCodigo } from "./productos.firebase.js";
import { guardarProductoLocal } from "./productos.local.js";

export function coincideActivo(p){
  const selActivo = document.getElementById("selActivo");
  if (selActivo.value === "true") return p.activo === true;
  if (selActivo.value === "false") return p.activo === false;
  return true;
}

export function bolsaBusqueda(p){
  return [
    norm(p.codigoBarra),
    norm(p.concepto),
    norm(p.marca),
    norm(p.departamento),
    ...(Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes.map(x => norm(x)) : [])
  ].join(" ");
}

export function buscarCoincidencias(texto){
  const b = norm(texto);
  if (!b) return [];

  const tokens = b.split(/\s+/).filter(Boolean);

  return state.productos
    .filter(p => coincideActivo(p))
    .map(p => {
      const bolsa = bolsaBusqueda(p);
      const ok = tokens.every(t => bolsa.includes(t));
      if (!ok) return null;

      let score = 0;
      if (norm(p.codigoBarra) === b) score += 7000;
      if ((Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes.map(x => norm(x)) : []).includes(b)) score += 6500;
      if (norm(p.concepto) === b) score += 4000;
      if (norm(p.codigoBarra).startsWith(b)) score += 2000;
      if (norm(p.concepto).startsWith(b)) score += 1500;
      if (norm(p.codigoBarra).includes(b)) score += 800;
      if (norm(p.concepto).includes(b)) score += 600;
      if (norm(p.marca).includes(b)) score += 300;

      return { producto: p, score };
    })
    .filter(Boolean)
    .sort((a,b) => b.score - a.score)
    .slice(0, 50)
    .map(x => x.producto);
}

export function buscarCoincidenciaExactaLocal(texto){
  const b = norm(texto);
  if (!b) return null;

  const candidatos = state.productos.filter(p => coincideActivo(p));

  const exactoCodigo = candidatos.find(p => norm(p.codigoBarra) === b || norm(p.id) === b);
  if (exactoCodigo) return exactoCodigo;

  const exactoEquivalente = candidatos.find(p => {
    const eqs = Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [];
    return eqs.some(eq => norm(eq) === b);
  });

  return exactoEquivalente || null;
}

export async function buscarCodigoConRespaldoFirebase(texto){
  const local = buscarCoincidenciaExactaLocal(texto);
  if (local) return local;

  const remoto = await buscarFirebasePorCodigo(texto);
  if (!remoto) return null;

  const idx = state.productos.findIndex(p => String(p.id) === String(remoto.id));
  if (idx >= 0) state.productos[idx] = remoto;
  else state.productos.push(remoto);

  await guardarProductoLocal(remoto);
  return remoto;
}
