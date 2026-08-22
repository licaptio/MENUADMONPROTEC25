import { appConfig } from "./config.js";
import {
  agregarRfcAutorizado,
  eliminarRfcAutorizado,
  existeEntradaFirebase,
  guardarEntradaFirebase,
  listarRfcAutorizados,
  normalizarRfc,
  prepararFiltroFirebase,
  rfcEstaAutorizado
} from "./firebaseService.js";
import { existeEnSupabase, guardarEnSupabase } from "./supabaseService.js";
import { leerArchivoXml } from "./xmlService.js";
import {
  abrirConfiguracion,
  actualizarProceso,
  actualizarResumen,
  cerrarConfiguracion,
  limpiarBitacora,
  log,
  mensajeConfiguracion,
  pintarArchivos,
  pintarRfcAutorizados,
  ui
} from "./ui.js";

let archivosSeleccionados = [];
let procesando = false;

const resumen = {
  seleccionados: 0,
  validos: 0,
  supabase: 0,
  firebase: 0
};

document.querySelector("#btnConfiguracion")
  .addEventListener("click", async () => {
    abrirConfiguracion();
    await cargarRfcAutorizados();
  });

document.querySelector("#btnCerrarConfiguracion")
  .addEventListener("click", cerrarConfiguracion);

document.querySelector("#btnActualizarRfc")
  .addEventListener("click", () => cargarRfcAutorizados(true));

document.querySelector("#btnAgregarRfc")
  .addEventListener("click", agregarRfc);

document.querySelector("#btnLimpiarBitacora")
  .addEventListener("click", limpiarBitacora);

ui.rfcProveedor.addEventListener("input", event => {
  event.target.value = normalizarRfc(event.target.value);
});

ui.rfcProveedor.addEventListener("keydown", event => {
  if (event.key === "Enter") agregarRfc();
});

ui.xmlInput.addEventListener("change", () => {
  archivosSeleccionados = Array.from(ui.xmlInput.files || []);
  resumen.seleccionados = archivosSeleccionados.length;
  resumen.validos = 0;
  resumen.supabase = 0;
  resumen.firebase = 0;
  actualizarResumen(resumen);

  ui.textoSeleccion.textContent = archivosSeleccionados.length
    ? `${archivosSeleccionados.length} archivo(s) seleccionado(s)`
    : "Ningún archivo seleccionado";

  ui.btnProcesar.disabled = archivosSeleccionados.length === 0;
  pintarArchivos(
    archivosSeleccionados.map(file => ({ nombreArchivo: file.name }))
  );
});

ui.btnProcesar.addEventListener("click", procesarArchivos);

async function agregarRfc() {
  const rfc = normalizarRfc(ui.rfcProveedor.value);

  try {
    mensajeConfiguracion("Guardando RFC...");
    const guardado = await agregarRfcAutorizado(rfc);
    ui.rfcProveedor.value = "";
    mensajeConfiguracion(`${guardado} autorizado correctamente.`, "ok");
    await cargarRfcAutorizados();
  } catch (error) {
    mensajeConfiguracion(error.message, "error");
  }
}

async function cargarRfcAutorizados(forzar = false) {
  ui.listaRfcAutorizados.className = "authorized-list empty-state";
  ui.listaRfcAutorizados.textContent = "Cargando configuración...";

  try {
    const rfcs = await listarRfcAutorizados(forzar);
    pintarRfcAutorizados(rfcs, confirmarEliminacion);
  } catch (error) {
    ui.listaRfcAutorizados.textContent =
      `No se pudo cargar la configuración: ${error.message}`;
  }
}

async function confirmarEliminacion(rfc) {
  const confirmado = window.confirm(
    `¿Eliminar ${rfc} de los proveedores autorizados para Firebase?`
  );
  if (!confirmado) return;

  try {
    await eliminarRfcAutorizado(rfc);
    mensajeConfiguracion(`${rfc} eliminado.`, "ok");
    await cargarRfcAutorizados();
  } catch (error) {
    mensajeConfiguracion(error.message, "error");
  }
}

async function procesarArchivos() {
  if (procesando || !archivosSeleccionados.length) return;

  procesando = true;
  ui.btnProcesar.disabled = true;
  ui.xmlInput.disabled = true;
  ui.btnProcesar.textContent = "Procesando...";

  resumen.validos = 0;
  resumen.supabase = 0;
  resumen.firebase = 0;
  actualizarResumen(resumen);

  log(`Inicio de proceso: ${archivosSeleccionados.length} archivo(s).`);

  // Una sola consulta a la lista blanca de Firebase por lote.
  // Después cada RFC se valida contra un Set local (sin lecturas por XML).
  try {
    const totalAutorizados = await prepararFiltroFirebase();
    log(`Filtro Firebase listo: ${totalAutorizados} RFC autorizado(s) en memoria.`);
  } catch (errorFiltro) {
    log(`❌ No se pudo cargar el filtro de Firebase: ${errorFiltro.message}`);
  }

  // Evita lecturas repetidas de Firebase si el mismo UUID viene duplicado
  // dentro de la selección actual.
  const uuidsFirebaseProcesados = new Set();

  for (let index = 0; index < archivosSeleccionados.length; index++) {
    const file = archivosSeleccionados[index];

    try {
      const cfdi = await leerArchivoXml(file);
      const detalle = `${cfdi.rfcEmisor} · ${cfdi.uuid}`;

      if (
        cfdi.tipo !== "I" ||
        cfdi.receptorRFC !== appConfig.rfcReceptorPermitido
      ) {
        actualizarProceso(
          "supabase", index, "error", "Rechazado",
          "Tipo de comprobante o receptor no permitido"
        );
        actualizarProceso(
          "firebase", index, "error", "Rechazado",
          "Tipo de comprobante o receptor no permitido"
        );
        log(`❌ ${file.name}: CFDI inválido para esta aplicación.`);
        continue;
      }

      resumen.validos++;
      actualizarResumen(resumen);

      actualizarProceso("supabase", index, "pending", "Revisando", detalle);

      try {
        if (await existeEnSupabase(cfdi.uuid)) {
          actualizarProceso("supabase", index, "warn", "Ya existía", detalle);
          log(`⚠️ Supabase ya contenía ${cfdi.uuid}.`);
        } else {
          await guardarEnSupabase(cfdi.uuid, cfdi.datosInsert);
          resumen.supabase++;
          actualizarResumen(resumen);
          actualizarProceso("supabase", index, "ok", "Subido", detalle);
          log(`✅ Supabase: ${cfdi.uuid}.`);
        }
      } catch (errorSupa) {
        actualizarProceso(
          "supabase", index, "error", "Error",
          errorSupa.message
        );
        log(`❌ Supabase ${cfdi.uuid}: ${errorSupa.message}`);
      }

      actualizarProceso("firebase", index, "pending", "Validando RFC", detalle);

      try {
        const autorizado = await rfcEstaAutorizado(cfdi.rfcEmisor);

        if (!autorizado) {
          actualizarProceso(
            "firebase", index, "warn", "Omitido",
            `${cfdi.rfcEmisor} no autorizado`
          );
          log(`⏭️ Firebase omitido: ${cfdi.rfcEmisor} no está autorizado.`);
          continue;
        }

        const uuidFirebase = String(cfdi.uuid || "").toUpperCase().trim();

        if (uuidsFirebaseProcesados.has(uuidFirebase)) {
          actualizarProceso(
            "firebase", index, "warn", "Duplicado en lote", detalle
          );
          log(`⚠️ Firebase omitido: ${uuidFirebase} está repetido en este lote.`);
          continue;
        }

        if (await existeEntradaFirebase(uuidFirebase)) {
          uuidsFirebaseProcesados.add(uuidFirebase);
          actualizarProceso("firebase", index, "warn", "Ya existía", detalle);
          log(`⚠️ Firebase ya contenía ${uuidFirebase}.`);
          continue;
        }

        await guardarEntradaFirebase(uuidFirebase, cfdi.datosInsert);
        uuidsFirebaseProcesados.add(uuidFirebase);
        resumen.firebase++;
        actualizarResumen(resumen);
        actualizarProceso("firebase", index, "ok", "Guardado", detalle);
        log(`✅ Firebase: ${cfdi.uuid} · RFC autorizado ${cfdi.rfcEmisor}.`);
      } catch (errorFire) {
        actualizarProceso(
          "firebase", index, "error", "Error",
          errorFire.message
        );
        log(`❌ Firebase ${cfdi.uuid}: ${errorFire.message}`);
      }
    } catch (errorXml) {
      actualizarProceso("supabase", index, "error", "XML inválido", errorXml.message);
      actualizarProceso("firebase", index, "error", "XML inválido", errorXml.message);
      log(`❌ ${file.name}: ${errorXml.message}`);
    }
  }

  procesando = false;
  ui.btnProcesar.disabled = false;
  ui.xmlInput.disabled = false;
  ui.btnProcesar.textContent = "Procesar y subir";
  log("Proceso completado.");
}
