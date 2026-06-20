import { EMPRESA_ID } from "./firebase-config.js";
import { initClientesUI } from "./ui.clientes.js";
import { initDocumentosUI, refrescar as refrescarDocumentos } from "./ui.documentos.js";
import { pintarMembresia } from "./ui.membresia.js";

let clienteActual = null;
const $ = (id) => document.getElementById(id);

function setClienteActual(cliente) {
  clienteActual = cliente;
  $("clienteActualLabel").textContent = `${cliente.nombre || "SIN NOMBRE"} · Socio ${cliente.idCliente || cliente.id}`;
  refrescarDocumentos(cliente);
  pintarMembresia(cliente);
}

function initNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
      btn.classList.add("active");
      $(btn.dataset.view).classList.add("active-view");
    });
  });
}

function initConfigPanel() {
  $("cfgEmpresa").textContent = EMPRESA_ID;
  $("cfgBucketClientes").textContent = "clientes-provsoft-pdd";
  $("cfgRutaBase").textContent = "clientes";
  $("btnCargarConfig").onclick = () => alert("Configuración local cargada. Después conectamos lectura dinámica desde /CLIENTES/PDD031204KL5/CONFIGURACION/STORAGE.");
}

initNav();
initConfigPanel();
initClientesUI(setClienteActual);
initDocumentosUI(() => clienteActual);
$("estadoSistema").textContent = "App cargada";
