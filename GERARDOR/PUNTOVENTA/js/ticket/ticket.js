export function rellenarTicket(venta) {

  window.__VENTA_ACTUAL = venta;

  console.log(
    "Ticket preparado:",
    venta.folio
  );
}
