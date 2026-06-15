import { state, ESQUEMA_BASE, ORDEN_CAMPOS } from "./productos.estado.js";
import { escaparHtml, fmtFecha, detectarTipo, campoBloqueado, norm } from "./productos.utils.js";
import { crearProductoFirebase, actualizarProductoFirebase, eliminarProductoFirebase, serverTimestamp } from "./productos.firebase.js";
import { guardarProductoLocal, eliminarProductoLocal } from "./productos.local.js";
import { reaplicarVistaActual, actualizarProductoEnMemoria, quitarProductoDeMemoria } from "./productos.tabla.js";

const modalEditor = document.getElementById("modalEditor");
const editorCampos = document.getElementById("editorCampos");
const btnGuardar = document.getElementById("btnGuardar");
const btnActivar = document.getElementById("btnActivar");
const btnDesactivar = document.getElementById("btnDesactivar");
const btnEliminarReal = document.getElementById("btnEliminarReal");
const statusModal = document.getElementById("statusModal");
const txtBuscarPrincipal = document.getElementById("txtBuscarPrincipal");

function setStatus(msg = "", tipo = ""){
  statusModal.className = "status";
  statusModal.textContent = msg;
  if (tipo) statusModal.classList.add(tipo);
}

function construirProductoEditable(producto){
  const merged = { ...ESQUEMA_BASE, ...producto };
  if (!Array.isArray(merged.codigosEquivalentes)) merged.codigosEquivalentes = [];
  if (!Array.isArray(merged.preciosPorCantidad)) merged.preciosPorCantidad = [];
  merged.preciosPorCantidad = merged.preciosPorCantidad
    .filter(x => x && typeof x === "object")
    .map(x => ({
      cantidadMinima: x.cantidadMinima ?? null,
      precioUnitario: x.precioUnitario ?? null,
      precioTotal: x.precioTotal ?? null
    }));
  return merged;
}

function construirProductoNuevo(){
  return {
    id: "NUEVO - se creará con el código de barras",
    ...ESQUEMA_BASE,
    activo: true,
    cantidadPorCaja: 1,
    ivaTasa: 0,
    iepsTasa: 0,
    comision_valor: 0,
    codigosEquivalentes: [],
    preciosPorCantidad: []
  };
}

function ordenarCamposProducto(producto){
  const keys = Object.keys(producto);
  return keys.sort((a,b) => {
    const ia = ORDEN_CAMPOS.indexOf(a);
    const ib = ORDEN_CAMPOS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "es");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function renderCodigosEquivalentes(lista){
  const arr = Array.isArray(lista) ? lista : [];
  return `
    <div class="campo">
      <label>codigosEquivalentes</label>
      <div class="eq-wrap">
        <div class="eq-input-row">
          <input type="text" id="nuevoEquivalenteInput" placeholder="Escribe un código equivalente" />
          <button type="button" id="btnAgregarEquivalente" class="btn-green">Agregar</button>
        </div>
        <div class="eq-lista" id="listaEquivalentes">
          ${arr.length
            ? arr.map((codigo, i) => `
                <div class="eq-item" data-index="${i}">
                  <div class="eq-codigo">${escaparHtml(codigo)}</div>
                  <button type="button" class="btn-danger btnQuitarEquivalente" data-index="${i}">Quitar</button>
                </div>`).join("")
            : `<div class="eq-vacio">Sin códigos equivalentes</div>`}
        </div>
        <input type="hidden" id="codigosEquivalentesHidden" data-key="codigosEquivalentes" data-type="array" value='${escaparHtml(JSON.stringify(arr))}' />
      </div>
    </div>`;
}

function obtenerEquivalentesActuales(){
  const hidden = document.getElementById("codigosEquivalentesHidden");
  if (!hidden) return [];
  try{ const arr = JSON.parse(hidden.value || "[]"); return Array.isArray(arr) ? arr : []; }
  catch{ return []; }
}

function actualizarEquivalentesUI(lista){
  const hidden = document.getElementById("codigosEquivalentesHidden");
  const cont = document.getElementById("listaEquivalentes");
  if (!hidden || !cont) return;
  const arr = Array.isArray(lista) ? lista : [];
  hidden.value = JSON.stringify(arr);
  cont.innerHTML = arr.length
    ? arr.map((codigo, i) => `
      <div class="eq-item" data-index="${i}">
        <div class="eq-codigo">${escaparHtml(codigo)}</div>
        <button type="button" class="btn-danger btnQuitarEquivalente" data-index="${i}">Quitar</button>
      </div>`).join("")
    : `<div class="eq-vacio">Sin códigos equivalentes</div>`;
  enlazarEventosEquivalentes();
}

function agregarEquivalente(){
  const input = document.getElementById("nuevoEquivalenteInput");
  const valor = String(input?.value || "").trim();
  if (!valor) return;
  const actuales = obtenerEquivalentesActuales();
  if (actuales.some(x => norm(x) === norm(valor))) {
    alert("Ese código equivalente ya existe.");
    input.focus(); input.select();
    return;
  }
  actuales.push(valor);
  actualizarEquivalentesUI(actuales);
  input.value = "";
  input.focus();
}

function quitarEquivalente(index){
  const actuales = obtenerEquivalentesActuales();
  actuales.splice(index, 1);
  actualizarEquivalentesUI(actuales);
}

function enlazarEventosEquivalentes(){
  const btnAgregar = document.getElementById("btnAgregarEquivalente");
  const input = document.getElementById("nuevoEquivalenteInput");
  if (btnAgregar) btnAgregar.onclick = agregarEquivalente;
  if (input) input.onkeydown = e => {
    if (e.key === "Enter"){ e.preventDefault(); e.stopPropagation(); agregarEquivalente(); }
  };
  document.querySelectorAll(".btnQuitarEquivalente").forEach(btn => {
    btn.onclick = () => quitarEquivalente(Number(btn.dataset.index));
  });
}

function renderPreciosPorCantidad(lista){
  const arr = Array.isArray(lista) ? lista : [];
  return `
    <div class="campo">
      <label>preciosPorCantidad</label>
      <div class="ppc-wrap">
        <div class="ppc-input-grid">
          <input type="number" step="1" min="1" id="ppcCantidadMinima" placeholder="Cantidad mínima" />
          <input type="number" step="any" min="0" id="ppcPrecioUnitario" placeholder="Precio unitario" />
          <input type="number" step="any" min="0" id="ppcPrecioTotal" placeholder="Precio total (opcional)" />
          <button type="button" id="btnAgregarPpc" class="btn-green">Agregar</button>
        </div>
        <div class="ppc-lista" id="listaPpc">
          ${arr.length
            ? arr.map((item, i) => `
              <div class="ppc-item" data-index="${i}">
                <div><span class="ppc-k">Cantidad mínima</span><div class="ppc-v">${escaparHtml(item.cantidadMinima ?? "--")}</div></div>
                <div><span class="ppc-k">Precio unitario</span><div class="ppc-v">${escaparHtml(item.precioUnitario ?? "--")}</div></div>
                <div><span class="ppc-k">Precio total</span><div class="ppc-v">${escaparHtml(item.precioTotal ?? "--")}</div></div>
                <button type="button" class="btn-danger btnQuitarPpc" data-index="${i}">Quitar</button>
              </div>`).join("")
            : `<div class="ppc-vacio">Sin precios por cantidad</div>`}
        </div>
        <input type="hidden" id="preciosPorCantidadHidden" data-key="preciosPorCantidad" data-type="array" value='${escaparHtml(JSON.stringify(arr))}' />
      </div>
    </div>`;
}

function obtenerPpcActuales(){
  const hidden = document.getElementById("preciosPorCantidadHidden");
  if (!hidden) return [];
  try{ const arr = JSON.parse(hidden.value || "[]"); return Array.isArray(arr) ? arr : []; }
  catch{ return []; }
}

function actualizarPpcUI(lista){
  const hidden = document.getElementById("preciosPorCantidadHidden");
  const cont = document.getElementById("listaPpc");
  if (!hidden || !cont) return;
  const arr = Array.isArray(lista) ? lista : [];
  hidden.value = JSON.stringify(arr);
  cont.innerHTML = arr.length
    ? arr.map((item, i) => `
      <div class="ppc-item" data-index="${i}">
        <div><span class="ppc-k">Cantidad mínima</span><div class="ppc-v">${escaparHtml(item.cantidadMinima ?? "--")}</div></div>
        <div><span class="ppc-k">Precio unitario</span><div class="ppc-v">${escaparHtml(item.precioUnitario ?? "--")}</div></div>
        <div><span class="ppc-k">Precio total</span><div class="ppc-v">${escaparHtml(item.precioTotal ?? "--")}</div></div>
        <button type="button" class="btn-danger btnQuitarPpc" data-index="${i}">Quitar</button>
      </div>`).join("")
    : `<div class="ppc-vacio">Sin precios por cantidad</div>`;
  enlazarEventosPpc();
}

function agregarPpc(){
  const cantidadEl = document.getElementById("ppcCantidadMinima");
  const unitarioEl = document.getElementById("ppcPrecioUnitario");
  const totalEl = document.getElementById("ppcPrecioTotal");

  const cantidadMinima = Number(cantidadEl.value);
  const precioUnitario = Number(unitarioEl.value);
  const precioTotalManual = totalEl.value === "" ? null : Number(totalEl.value);

  if (!Number.isFinite(cantidadMinima) || cantidadMinima <= 0 || !Number.isInteger(cantidadMinima)){
    alert("La cantidad mínima debe ser un entero mayor a 0.");
    cantidadEl.focus(); return;
  }
  if (!Number.isFinite(precioUnitario) || precioUnitario < 0){
    alert("El precio unitario debe ser 0 o mayor.");
    unitarioEl.focus(); return;
  }

  const actuales = obtenerPpcActuales();
  if (actuales.some(x => Number(x.cantidadMinima) === cantidadMinima)){
    alert("Ya existe un precio para esa cantidad mínima.");
    cantidadEl.focus(); cantidadEl.select(); return;
  }

  actuales.push({
    cantidadMinima,
    precioUnitario,
    precioTotal: precioTotalManual !== null ? precioTotalManual : Number((cantidadMinima * precioUnitario).toFixed(2))
  });

  actuales.sort((a,b) => Number(a.cantidadMinima) - Number(b.cantidadMinima));
  actualizarPpcUI(actuales);
  cantidadEl.value = "";
  unitarioEl.value = "";
  totalEl.value = "";
  cantidadEl.focus();
}

function quitarPpc(index){
  const actuales = obtenerPpcActuales();
  actuales.splice(index, 1);
  actualizarPpcUI(actuales);
}

function enlazarEventosPpc(){
  const btnAgregar = document.getElementById("btnAgregarPpc");
  if (btnAgregar) btnAgregar.onclick = agregarPpc;

  ["ppcCantidadMinima", "ppcPrecioUnitario", "ppcPrecioTotal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onkeydown = e => {
      if (e.key === "Enter"){ e.preventDefault(); e.stopPropagation(); agregarPpc(); }
    };
  });

  document.querySelectorAll(".btnQuitarPpc").forEach(btn => {
    btn.onclick = () => quitarPpc(Number(btn.dataset.index));
  });
}

function renderCampo(key, value){
  if (key === "codigosEquivalentes") return renderCodigosEquivalentes(value);
  if (key === "preciosPorCantidad") return renderPreciosPorCantidad(value);

  const tipo = detectarTipo(value);
  const bloqueado = campoBloqueado(key, state.modoEditor);

  if (key === "id") {
    return `<div class="campo"><label>id</label><input class="readonly" value="${escaparHtml(value)}" readonly /></div>`;
  }

  if (bloqueado) {
    return `<div class="campo"><label>${escaparHtml(key)}</label><input class="readonly" data-key="${escaparHtml(key)}" data-type="${tipo}" value="${escaparHtml(value)}" readonly /></div>`;
  }

  if (tipo === "boolean") {
    return `<div class="campo"><label>${escaparHtml(key)}</label><select data-key="${escaparHtml(key)}" data-type="boolean">
      <option value="true" ${value === true ? "selected" : ""}>true</option>
      <option value="false" ${value === false ? "selected" : ""}>false</option>
    </select></div>`;
  }

  if (tipo === "number") {
    return `<div class="campo"><label>${escaparHtml(key)}</label><input type="number" step="any" data-key="${escaparHtml(key)}" data-type="number" value="${value ?? ""}" /></div>`;
  }

  if (tipo === "array" || tipo === "object") {
    return `<div class="campo"><label>${escaparHtml(key)} (${tipo})</label><textarea data-key="${escaparHtml(key)}" data-type="${tipo}">${escaparHtml(JSON.stringify(value, null, 2))}</textarea></div>`;
  }

  if (tipo === "timestamp") {
    return `<div class="campo"><label>${escaparHtml(key)} (timestamp)</label><input class="readonly" value="${escaparHtml(fmtFecha(value))}" readonly /></div>`;
  }

  return `<div class="campo"><label>${escaparHtml(key)}</label><input type="text" data-key="${escaparHtml(key)}" data-type="string" value="${escaparHtml(value ?? "")}" /></div>`;
}

function enlazarEventosEditorDinamico(){
  enlazarEventosEquivalentes();
  enlazarEventosPpc();
}

function actualizarBotonesActivo(){
  if (!state.productoActual) return;
  const activo = state.productoActual.activo === true;
  btnActivar.style.display = activo ? "none" : "inline-block";
  btnDesactivar.style.display = activo ? "inline-block" : "none";
}

export function abrirEditor(id){
  state.modoEditor = "editar";
  state.productoActual = state.productos.find(x => String(x.id) === String(id));
  if (!state.productoActual) return;

  setStatus("", "");
  btnGuardar.textContent = "Guardar cambios";
  btnActivar.style.display = "inline-block";
  btnDesactivar.style.display = "inline-block";
  btnEliminarReal.style.display = "inline-block";

  const productoEditable = construirProductoEditable(state.productoActual);
  const keysOrdenadas = ordenarCamposProducto(productoEditable);
  editorCampos.innerHTML = keysOrdenadas.map(k => renderCampo(k, productoEditable[k])).join("");
  enlazarEventosEditorDinamico();
  actualizarBotonesActivo();
  modalEditor.classList.add("show");
}

export function abrirNuevoProducto(){
  state.modoEditor = "nuevo";
  state.productoActual = null;
  setStatus("Captura el artículo nuevo. El código de barras será el ID del documento.", "info");

  btnGuardar.textContent = "Dar de alta producto";
  btnActivar.style.display = "none";
  btnDesactivar.style.display = "none";
  btnEliminarReal.style.display = "none";

  const productoNuevo = construirProductoNuevo();
  const keysOrdenadas = ordenarCamposProducto(productoNuevo);
  editorCampos.innerHTML = keysOrdenadas.map(k => renderCampo(k, productoNuevo[k])).join("");
  enlazarEventosEditorDinamico();
  modalEditor.classList.add("show");
}

function recolectarCambios(){
  const campos = editorCampos.querySelectorAll("[data-key]");
  const data = {};

  for (const el of campos) {
    const key = el.dataset.key;
    const type = el.dataset.type;
    if (campoBloqueado(key, state.modoEditor)) continue;

    let value = el.value;
    if (type === "boolean") data[key] = value === "true";
    else if (type === "number") data[key] = value === "" ? null : Number(value);
    else if (type === "array" || type === "object") data[key] = value.trim() === "" ? (type === "array" ? [] : {}) : JSON.parse(value);
    else data[key] = value;
  }

  data.updatedAt = serverTimestamp();

  if (state.modoEditor === "nuevo") data.createdAt = serverTimestamp();

  return validarDatos(data);
}

function validarDatos(data){
  if (!Array.isArray(data.codigosEquivalentes)) data.codigosEquivalentes = [];
  if (!Array.isArray(data.preciosPorCantidad)) data.preciosPorCantidad = [];

  data.codigosEquivalentes = data.codigosEquivalentes
    .map(x => String(x ?? "").trim())
    .filter(Boolean);

  const camposNoNegativos = [
    "cantidadPorCaja", "costoSinImpuesto", "precioPublico",
    "mayoreo", "medioMayoreo", "ivaTasa", "iepsTasa", "comision_valor"
  ];

  for (const campo of camposNoNegativos){
    const valor = data[campo];
    if (valor === null || valor === "" || valor === undefined) continue;
    if (typeof valor === "number" && valor < 0) throw new Error(`El campo ${campo} no puede ser negativo.`);
  }

  if (state.modoEditor === "nuevo") {
    const codigo = String(data.codigoBarra || "").trim();
    const concepto = String(data.concepto || "").trim();

    if (!codigo) throw new Error("El código de barras es obligatorio.");
    if (!concepto) throw new Error("El concepto es obligatorio.");

    const duplicado = state.productos.find(p => {
      if (norm(p.codigoBarra) === norm(codigo)) return true;
      const eqs = Array.isArray(p.codigosEquivalentes) ? p.codigosEquivalentes : [];
      return eqs.some(eq => norm(eq) === norm(codigo));
    });

    if (duplicado) throw new Error(`Ya existe un producto con ese código: ${duplicado.codigoBarra || duplicado.id}`);
    data.codigoBarra = codigo;
    data.concepto = concepto;
  }

  return data;
}

export async function guardarCambios(){
  try{
    btnGuardar.disabled = true;
    const cambios = recolectarCambios();

    if (state.modoEditor === "nuevo") {
      setStatus("Dando de alta producto...", "info");

      const codigo = String(cambios.codigoBarra || "").trim();
      const productoLocal = { id: codigo, ...cambios };

      await crearProductoFirebase(codigo, cambios);
      await guardarProductoLocal(productoLocal);
      actualizarProductoEnMemoria(productoLocal);

      txtBuscarPrincipal.value = codigo;
      state.filtrados = [productoLocal];
      reaplicarVistaActual();

      setStatus("Producto dado de alta correctamente.", "ok");
      modalEditor.classList.remove("show");
      return;
    }

    if (!state.productoActual?.id) return;

    setStatus("Guardando cambios...", "info");

    await actualizarProductoFirebase(state.productoActual.id, cambios);

    const actualizado = {
      ...state.productoActual,
      ...cambios,
      updatedAt: new Date().toISOString()
    };

    await guardarProductoLocal(actualizado);
    actualizarProductoEnMemoria(actualizado);
    state.productoActual = actualizado;

    reaplicarVistaActual();
    modalEditor.classList.remove("show");
    setStatus("", "");

  }catch(err){
    console.error(err);
    setStatus(err.message || "Error guardando cambios.", "error");
  }finally{
    btnGuardar.disabled = false;
  }
}

export async function activarProducto(){
  if (!state.productoActual?.id) return;
  const ok = confirm(`¿Activar producto?\n\n${state.productoActual.codigoBarra || "--"}\n${state.productoActual.concepto || "--"}`);
  if (!ok) return;

  await actualizarProductoFirebase(state.productoActual.id, { activo:true, updatedAt:serverTimestamp() });
  const actualizado = { ...state.productoActual, activo:true, updatedAt:new Date().toISOString() };
  await guardarProductoLocal(actualizado);
  actualizarProductoEnMemoria(actualizado);
  reaplicarVistaActual();
  modalEditor.classList.remove("show");
}

export async function desactivarProducto(){
  if (!state.productoActual?.id) return;
  const ok = confirm(`¿Desactivar producto?\n\n${state.productoActual.codigoBarra || "--"}\n${state.productoActual.concepto || "--"}`);
  if (!ok) return;

  await actualizarProductoFirebase(state.productoActual.id, { activo:false, updatedAt:serverTimestamp() });
  const actualizado = { ...state.productoActual, activo:false, updatedAt:new Date().toISOString() };
  await guardarProductoLocal(actualizado);
  actualizarProductoEnMemoria(actualizado);
  reaplicarVistaActual();
  modalEditor.classList.remove("show");
}

export async function eliminarFisicamente(){
  if (!state.productoActual?.id) return;

  const ok1 = confirm(`Vas a eliminar físicamente:\n\n${state.productoActual.codigoBarra || "--"}\n${state.productoActual.concepto || "--"}\n\n¿Continuar?`);
  if (!ok1) return;
  const ok2 = confirm("Confirmación final: esto no se puede deshacer. ¿Eliminar definitivamente?");
  if (!ok2) return;

  await eliminarProductoFirebase(state.productoActual.id);
  await eliminarProductoLocal(state.productoActual.id);
  quitarProductoDeMemoria(state.productoActual.id);
  reaplicarVistaActual();
  modalEditor.classList.remove("show");
}
