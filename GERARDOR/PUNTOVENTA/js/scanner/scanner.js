export let scanBuffer = "";
export let scanTimer = null;

export function resetScanner() {
  scanBuffer = "";

  clearTimeout(scanTimer);
}

export function procesarCodigo(codigo, callback) {
  if (!codigo) return;

  callback(codigo.trim());

  resetScanner();
}
