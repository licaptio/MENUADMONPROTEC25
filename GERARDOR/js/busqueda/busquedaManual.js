import { catalogo } from "../catalogo/catalogo.js";
import { agregarProducto } from "../carrito/carrito.js";
import { money } from "../util/money.js";
import { toast } from "../ui/toast.js";

function normalizar(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(txt) {
  return normalizar(txt)
    .split(" ")
    .filter(Boolean);
}

function buscarFlexible(texto) {
  const qTokens = tokens(texto);
  if (!qTokens.length) return [];

  return catalogo
    .map(prod => {
      const nombre = normalizar(prod.nombre);
      const codigo = normalizar(prod.codigo);
      const base = `${codigo} ${nombre}`;

      let score = 0;

      for (const t of qTokens) {
        if (base.includes(t)) score += 100;
      }

      const encontrados = qTokens.filter(t => base.includes(t)).length;

      if (encontrados === qTokens.length) score += 500;
      if (nombre.includes(normalizar(texto))) score += 300;
      if (codigo === normalizar(texto)) score += 1000;

      return { prod, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)
    .map(x => x.prod);
}

export function abrirBusquedaManual() {
  const anterior = document.getElementById("pantallaBusquedaManual");
  if (anterior) anterior.remove();

  const modal = document.createElement("div");
  modal.id = "pantallaBusquedaManual";

  modal.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      width:100vw;
      height:100vh;
      z-index:999999;
      background:#f4f4f4;
      display:flex;
      flex-direction:column;
      box-sizing:border-box;
      padding:18px;
    ">

      <div style="
        background:#990000;
        color:white;
        border-radius:16px;
        padding:16px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:14px;
      ">
        <h1 style="margin:0;font-size:34px;font-weight:900;">
          Buscar producto
        </h1>

        <button id="cerrarBusquedaManual" style="
          width:64px;
          height:56px;
          border:none;
          border-radius:12px;
          background:#111;
          color:white;
          font-size:34px;
          font-weight:900;
          cursor:pointer;
        ">×</button>
      </div>

      <input
        id="inputBusquedaManual"
        type="text"
        placeholder="Ej. BIG 3.3 / COLA C/6 / C/6 COLA BIG"
        autocomplete="off"
        style="
          width:100%;
          height:72px;
          font-size:32px;
          padding:0 22px;
          border:3px solid #990000;
          outline:none;
          border-radius:14px;
          box-sizing:border-box;
          margin-bottom:14px;
        "
      >

      <div id="listaBusquedaManual" style="
        flex:1;
        overflow:auto;
        background:white;
        border-radius:18px;
        box-shadow:0 8px 24px rgba(0,0,0,.18);
        padding:10px;
      ">
        <div style="padding:40px;text-align:center;font-size:28px;color:#777;">
          Teclea para buscar productos
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const input = document.getElementById("inputBusquedaManual");
  const lista = document.getElementById("listaBusquedaManual");
  const cerrar = document.getElementById("cerrarBusquedaManual");

  cerrar.onclick = cerrarModal;

  input.addEventListener("input", () => {
    const texto = input.value.trim();

    if (texto.length < 2) {
      lista.innerHTML = `
        <div style="padding:40px;text-align:center;font-size:28px;color:#777;">
          Teclea para buscar productos
        </div>
      `;
      return;
    }

    const resultados = buscarFlexible(texto);

    if (!resultados.length) {
      lista.innerHTML = `
        <div style="
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          color:#777;
          font-size:34px;
          font-weight:800;
        ">
          <div style="font-size:70px;margin-bottom:14px;">🔍</div>
          Sin coincidencias
          <div style="font-size:20px;font-weight:400;margin-top:10px;">
            Intenta con menos palabras o solo parte del nombre
          </div>
        </div>
      `;
      return;
    }

    lista.innerHTML = "";

    resultados.forEach(prod => {
      const item = document.createElement("div");

      item.style.cssText = `
        display:grid;
        grid-template-columns:160px 1fr 150px;
        gap:16px;
        align-items:center;
        padding:18px;
        border-bottom:1px solid #ddd;
        cursor:pointer;
        font-size:21px;
      `;

      item.innerHTML = `
        <strong>${prod.codigo || ""}</strong>
        <div>
          <div style="font-weight:900;">${prod.nombre}</div>
          <div style="font-size:15px;color:#666;">Agregar al carrito</div>
        </div>
        <strong style="text-align:right;color:#990000;font-size:26px;">
          ${money(prod.precioPublico)}
        </strong>
      `;

      item.onclick = () => {
        agregarProducto(prod, 1);
        toast("Producto agregado");
        cerrarModal();
      };

      lista.appendChild(item);
    });
  });

  function cerrarModal() {
    modal.remove();
    document.getElementById("buscador")?.focus();
  }

  setTimeout(() => input.focus(), 80);
}