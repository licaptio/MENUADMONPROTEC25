import { state } from "./productos.estado.js";
import { norm } from "./productos.utils.js";
import { buscarFirebasePorCodigo } from "./productos.firebase.js";
import { guardarProductoLocal } from "./productos.local.js";

const PALABRAS_RUIDO = new Set([
  "DE","DEL","LA","LAS","EL","LOS","Y","EN","CON",
  "C","CJ","CAJA","PZA","PZAS","PZ","PACK",
  "LTS","LT","L","ML","GR","G","KG"
]);

function limpiarTexto(v){
  return norm(v)
    .replace(/[^A-Z0-9Ñ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensBusqueda(v){
  return limpiarTexto(v)
    .split(" ")
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !PALABRAS_RUIDO.has(t));
}

function tokensProducto(p){
  return tokensBusqueda([
    p.codigoBarra,
    p.id,
    p.concepto,
    p.marca,
    p.departamento,
    ...(Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [])
  ].join(" "));
}

function textoProducto(p){
  return limpiarTexto([
    p.codigoBarra,
    p.id,
    p.concepto,
    p.marca,
    p.departamento,
    ...(Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [])
  ].join(" "));
}

function tokenParecido(tokenBuscado, tokenProducto){
  if (!tokenBuscado || !tokenProducto) return false;
  if (tokenProducto === tokenBuscado) return true;

  if (/^\d+$/.test(tokenBuscado)) {
    return tokenProducto.startsWith(tokenBuscado) || tokenBuscado.startsWith(tokenProducto);
  }

  if (tokenBuscado.length >= 3 && tokenProducto.includes(tokenBuscado)) return true;
  if (tokenProducto.length >= 3 && tokenBuscado.includes(tokenProducto)) return true;

  return false;
}

function calcularScoreBusqueda(p, texto){
  const consulta = limpiarTexto(texto);
  const tokensQ = tokensBusqueda(texto);
  if (!consulta || !tokensQ.length) return 0;

  const prodTexto = textoProducto(p);
  const prodTokens = tokensProducto(p);

  let score = 0;
  let encontrados = 0;

  const codigo = limpiarTexto(p.codigoBarra || p.id || "");
  const concepto = limpiarTexto(p.concepto || "");
  const marca = limpiarTexto(p.marca || "");

  if (codigo === consulta) score += 10000;
  if (concepto === consulta) score += 6000;
  if (concepto.startsWith(consulta)) score += 2500;
  if (prodTexto.includes(consulta)) score += 1800;
  if (marca.includes(consulta)) score += 400;

  const eqs = Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [];
  if (eqs.some(eq => limpiarTexto(eq) === consulta)) score += 9000;

  for (const tq of tokensQ) {
    let mejorToken = 0;

    for (const tp of prodTokens) {
      if (tp === tq) mejorToken = Math.max(mejorToken, 1000);
      else if (tokenParecido(tq, tp)) mejorToken = Math.max(mejorToken, 450);
    }

    if (mejorToken > 0) {
      encontrados++;
      score += mejorToken;
    }
  }

  const cobertura = encontrados / tokensQ.length;

  if (cobertura === 1) score += 2500;
  else if (cobertura >= 0.75) score += 1200;
  else if (cobertura >= 0.50) score += 400;
  else score -= 1500;

  if (tokensQ.length >= 2 && encontrados >= 2) score += 700;
  if (p.activo === true) score += 80;

  return score;
}

function pareceCodigoReal(texto){
  const t = String(texto || "").trim();
  if (!t || t.includes(" ")) return false;

  // Código de barras o código interno. Evita consultar Firebase por textos como BIG, COLA, REGULAR.
  if (/^\d{6,}$/.test(t)) return true;
  if (/^[A-Za-z0-9._-]{8,}$/.test(t) && /\d/.test(t)) return true;

  return false;
}

export function coincideActivo(p){
  const selActivo = document.getElementById("selActivo");
  if (selActivo.value === "true") return p.activo === true;
  if (selActivo.value === "false") return p.activo === false;
  return true;
}

export function bolsaBusqueda(p){
  return textoProducto(p);
}

export function buscarCoincidencias(texto){
  const tokensQ = tokensBusqueda(texto);
  if (!tokensQ.length) return [];

  return state.productos
    .filter(p => coincideActivo(p))
    .map(p => ({
      producto: p,
      score: calcularScoreBusqueda(p, texto)
    }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0,80)
    .map(x => x.producto);
}

export function buscarCoincidenciaExactaLocal(texto){
  const b = limpiarTexto(texto);
  if (!b) return null;

  const candidatos = state.productos.filter(p => coincideActivo(p));

  const exactoCodigo = candidatos.find(p => {
    return limpiarTexto(p.codigoBarra) === b || limpiarTexto(p.id) === b;
  });

  if (exactoCodigo) return exactoCodigo;

  const exactoEquivalente = candidatos.find(p => {
    const eqs = Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [];
    return eqs.some(eq => limpiarTexto(eq) === b);
  });

  return exactoEquivalente || null;
}

export async function buscarCodigoConRespaldoFirebase(texto, consultarFirebase = true){
  const local = buscarCoincidenciaExactaLocal(texto);
  if (local) return local;

  if (!consultarFirebase || !pareceCodigoReal(texto)) return null;

  const remoto = await buscarFirebasePorCodigo(texto);
  if (!remoto) return null;

  const idx = state.productos.findIndex(p => String(p.id) === String(remoto.id));
  if (idx >= 0) state.productos[idx] = remoto;
  else state.productos.push(remoto);

  await guardarProductoLocal(remoto);
  return remoto;
}
