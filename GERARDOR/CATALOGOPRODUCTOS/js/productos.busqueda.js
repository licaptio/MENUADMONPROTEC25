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

  const tokens = b
    .split(/\s+/)
    .filter(Boolean)
    .filter(t =>
      ![
        "DE","DEL","LA","LAS","EL","LOS",
        "C","CJ","CAJA","PZA","PZAS",
        "LTS","LT","L","ML","KG"
      ].includes(t)
    );

  return state.productos
    .filter(p => coincideActivo(p))
    .map(p => {

      const concepto = norm(p.concepto || "");
      const marca = norm(p.marca || "");
      const codigo = norm(p.codigoBarra || "");
      const equivalentes = Array.isArray(p.codigosEquivalentes)
        ? p.codigosEquivalentes.map(x => norm(x))
        : [];

      let score = 0;
      let encontrados = 0;

      for(const token of tokens){

        let encontrado = false;

        if(codigo.includes(token)){
          score += 1200;
          encontrado = true;
        }

        if(concepto.includes(token)){
          score += 1000;
          encontrado = true;
        }

        if(marca.includes(token)){
          score += 300;
          encontrado = true;
        }

        if(equivalentes.some(eq => eq.includes(token))){
          score += 800;
          encontrado = true;
        }

        if(encontrado){
          encontrados++;
        }
      }

      const cobertura = encontrados / tokens.length;

      if(cobertura === 1){
        score += 2500;
      }else if(cobertura >= .75){
        score += 1200;
      }else if(cobertura >= .50){
        score += 400;
      }

      if(p.activo === true){
        score += 50;
      }

      return {
        producto:p,
        score
      };

    })
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0,80)
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
