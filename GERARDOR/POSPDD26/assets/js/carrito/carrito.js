let carrito = [];

export function obtenerCarrito() {
  return carrito;
}

export function limpiarCarrito() {
  carrito = [];
}

export function addProduct(prod, cantidad = 1) {

  const existente = carrito.find(
    x => x.id === prod.id
  );

  if (existente) {

    existente.cantidad += cantidad;

    existente.importe =
      existente.cantidad *
      existente.precioUnit;

    return;
  }

  carrito.push({
    ...prod,
    cantidad,
    precioUnit: Number(prod.precioPublico || 0),
    importe:
      cantidad *
      Number(prod.precioPublico || 0)
  });
}

export function delItem(id) {
  carrito = carrito.filter(
    x => x.id !== id
  );
}
