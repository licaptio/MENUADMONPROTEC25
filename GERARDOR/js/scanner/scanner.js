import { db } from "../firebase/config.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  buscarLocal,
  resolverProductoPorCodigo,
  catalogo
} from "../catalogo/catalogo.js";

import { agregarProducto } from "../carrito/carrito.js";
import { toast } from "../ui/toast.js";

let timer = null;

export function iniciarScanner() {
  const input = document.getElementById("buscador");
  const resultados = document.getElementById("resultados");

  if (!input) return;

  input.focus();

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      procesarTexto(input.value);
    }
  });

  input.addEventListener("input", e => {
    const texto = e.target.value.trim();

    clearTimeout(timer);

    timer = setTimeout(() => {
      if (texto.length >= 3) {
        mostrarResultados(texto, resultados);
      }
    }, 250);
  });
}

function decodificarBalanza(codigo) {
  codigo = String(codigo || "").trim();

  if (!codigo.startsWith("2")) {
    return { esBalanza: false };
  }

  if (codigo.length < 13 || codigo.length > 15) {
    return { esBalanza: false };
  }

  const codigoProducto = codigo.substring(0, 7);
  const pesoBruto = codigo.substring(7, 12);
  const pesoKg = parseFloat(pesoBruto) / 1000;

  return {
    esBalanza: true,
    codigoProducto,
    pesoKg
  };
}

async function buscarEquivalenteRemoto(codigo) {
  try {
    const equivalentesCol = collection(db, "equivalentes");

    const q1 = query(
      equivalentesCol,
      where("codigo_equivalente", "==", codigo)
    );

    const q2 = query(
      equivalentesCol,
      where("codigo_origen", "==", codigo)
    );

    const [snap1, snap2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);

    const codigosBusqueda = [codigo];

    snap1.forEach(d => {
      const origen = d.data().codigo_origen;
      if (origen && !codigosBusqueda.includes(origen)) {
        codigosBusqueda.push(origen);
      }
    });

    snap2.forEach(d => {
      const equivalente = d.data().codigo_equivalente;
      if (equivalente && !codigosBusqueda.includes(equivalente)) {
        codigosBusqueda.push(equivalente);
      }
    });

    return catalogo.filter(p => {
      const codPrincipal = String(p.codigo || "").trim();
      const eqs = Array.isArray(p.equivalentes) ? p.equivalentes : [];

      return (
        codigosBusqueda.includes(codPrincipal) ||
        eqs.some(e => codigosBusqueda.includes(String(e).trim()))
      );
    });

  } catch (err) {
    console.error("Error buscando equivalente remoto:", err);
    return [];
  }
}

export async function procesarTexto(texto) {
  const input = document.getElementById("buscador");
  const resultados = document.getElementById("resultados");

  const q = String(texto || "").trim();
  if (!q) return;

  const balanza = decodificarBalanza(q);

  if (balanza.esBalanza) {
    let codigoBase = balanza.codigoProducto;

    const equivalentesCol = collection(db, "equivalentes");
    const qEq = query(
      equivalentesCol,
      where("codigo_equivalente", "==", codigoBase)
    );

    const snap = await getDocs(qEq);

    if (!snap.empty) {
      codigoBase = snap.docs[0].data().codigo_origen;
    }

    let producto = resolverProductoPorCodigo(codigoBase);

    if (!producto) {
      const remotos = await buscarEquivalenteRemoto(codigoBase);
      producto = remotos[0] || null;
    }

    if (!producto) {
      toast("Producto de báscula no registrado");
      limpiarBusqueda(input, resultados);
      return;
    }

    const peso = Number(balanza.pesoKg.toFixed(3));

    agregarProducto(producto, peso);

    toast(`${producto.nombre} ${peso.toFixed(3)} kg`);

    limpiarBusqueda(input, resultados);
    return;
  }

  let encontrados = buscarLocal(q);

  if (encontrados.length === 0) {
    encontrados = await buscarEquivalenteRemoto(q);
  }

  if (encontrados.length === 1) {
    agregarProducto(encontrados[0], 1);
    toast("Producto agregado");
    limpiarBusqueda(input, resultados);
    return;
  }

  if (encontrados.length > 1) {
    mostrarLista(encontrados, resultados);
    return;
  }

  toast("Producto no encontrado");
  limpiarBusqueda(input, resultados);
}

async function mostrarResultados(texto, contenedor) {
  if (!contenedor) return;

  let encontrados = buscarLocal(texto);

  if (encontrados.length === 0) {
    encontrados = await buscarEquivalenteRemoto(texto);
  }

  mostrarLista(encontrados, contenedor);
}

function mostrarLista(encontrados, contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!encontrados.length) {
    contenedor.style.display = "none";
    return;
  }

  encontrados.slice(0, 20).forEach(prod => {
    const div = document.createElement("div");
    div.className = "result-item";

    div.innerHTML = `
      <span>${prod.nombre}</span>
      <small>${prod.codigo || ""} | $${Number(prod.precioPublico || 0).toFixed(2)}</small>
    `;

    div.addEventListener("click", () => {
      agregarProducto(prod, 1);
      toast("Producto agregado");
      limpiarBusqueda(
        document.getElementById("buscador"),
        contenedor
      );
    });

    contenedor.appendChild(div);
  });

  contenedor.style.display = "block";
}

function limpiarBusqueda(input, resultados) {
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 50);
  }

  if (resultados) {
    resultados.innerHTML = "";
    resultados.style.display = "none";
  }
}