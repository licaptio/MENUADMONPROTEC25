import { valor } from "./util.js";

export const el = (id) => document.getElementById(id);

export function mostrar(id) { el(id).classList.remove("oculto"); }
export function ocultar(id) { el(id).classList.add("oculto"); }

export function pintarResultados(clientes, onSelect) {
  const cont = el("resultados");
  cont.innerHTML = "";

  if (!clientes.length) {
    cont.innerHTML = `<div class="sin-resultados">Sin resultados. Busca por nombre, RFC, ID, teléfono o email.</div>`;
    return;
  }

  clientes.forEach(c => {
    const card = document.createElement("button");
    card.className = "cliente-card";
    card.innerHTML = `
      <strong>${valor(c.idCliente || c.cliente)} · ${valor(c.nombre, "SIN NOMBRE")}</strong>
      <span>RFC: ${valor(c.rfc, "SIN RFC")} · Tel: ${valor(c.telefono, "-")}</span>
      <small>${valor(c.ciudad || c.municipio, "-")} · ${c.activo === false ? "INACTIVO" : "ACTIVO"}</small>
    `;
    card.onclick = () => onSelect(c);
    cont.appendChild(card);
  });
}

function dlHTML(items) {
  return items.map(([k, v]) => `<dt>${k}</dt><dd>${valor(v, "-")}</dd>`).join("");
}

export function pintarDetalle(c) {
  el("detalleNombre").textContent = `${valor(c.idCliente || c.cliente)} · ${valor(c.nombre, "SIN NOMBRE")}`;
  el("detalleSubtitulo").textContent = `RFC ${valor(c.rfc, "-")} · ${c.activo === false ? "INACTIVO" : "ACTIVO"}`;

  el("datosFiscales").innerHTML = dlHTML([
    ["ID", c.idCliente || c.cliente],
    ["Nombre", c.nombre],
    ["RFC", c.rfc],
    ["Régimen fiscal", c.regimenFiscal]
  ]);

  el("datosDireccion").innerHTML = dlHTML([
    ["Dirección", c.direccion],
    ["Número", c.numeroExterior],
    ["Colonia", c.colonia],
    ["Municipio", c.municipio],
    ["Ciudad", c.ciudad],
    ["Estado", c.estado],
    ["País", c.pais],
    ["CP", c.cp]
  ]);

  el("datosContacto").innerHTML = dlHTML([
    ["Teléfono", c.telefono],
    ["Email", c.email]
  ]);

  el("datosComercial").innerHTML = dlHTML([
    ["Categoría precio", c.catPrecio],
    ["Límite crédito", c.limiteCredito],
    ["Agregar %", c.agregarPorcentaje],
    ["Activo", c.activo === false ? "NO" : "SÍ"]
  ]);
}

export function llenarFormulario(c = {}) {
  const campos = ["idCliente","nombre","rfc","regimenFiscal","direccion","numeroExterior","colonia","municipio","ciudad","estado","pais","cp","telefono","email","catPrecio","limiteCredito","agregarPorcentaje"];
  campos.forEach(k => {
    const input = el(`f_${k}`);
    if (input) input.value = c[k] ?? "";
  });
  el("f_activo").checked = c.activo !== false;
}

export function abrirModal(titulo) {
  el("modalTitulo").textContent = titulo;
  mostrar("modalCliente");
}

export function cerrarModal() {
  ocultar("modalCliente");
}
