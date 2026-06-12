export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function valor(v, fallback = "") {
  const t = String(v ?? "").trim();
  return t || fallback;
}

export function numero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
