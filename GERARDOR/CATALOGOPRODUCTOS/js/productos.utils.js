import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function escaparHtml(txt){
  return String(txt ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function norm(v){
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function moneda(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });
}

export function fmtFecha(v){
  try{
    let d = null;
    if (v instanceof Timestamp) d = v.toDate();
    else if (v?.seconds !== undefined) d = new Date(v.seconds * 1000);
    else if (v) d = new Date(v);
    if (!d || isNaN(d.getTime())) return "--";
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle:"medium",
      timeStyle:"short"
    }).format(d);
  }catch{
    return "--";
  }
}

export function detectarTipo(valor){
  if (Array.isArray(valor)) return "array";
  if (valor instanceof Timestamp || valor?.seconds !== undefined) return "timestamp";
  if (typeof valor === "boolean") return "boolean";
  if (typeof valor === "number") return "number";
  if (valor && typeof valor === "object") return "object";
  return "string";
}

export function campoBloqueado(key, modoEditor){
  if (key === "id") return true;
  if (key === "codigoBarra" && modoEditor === "editar") return true;
  return false;
}
