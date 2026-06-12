// js/config/usuariosVentas.js
// Aquí modificas qué usuarios graban en ventas reales y cuál es la ruta de prueba.

export const RUTA_VENTAS_REALES = {
  tienda: "RUTA1",
  coleccion: "VENTAS"
};

export const RUTA_VENTAS_PRUEBAS = {
  tienda: "VENTASPRUEBAS",
  coleccion: "VENTAS"
};

export const USUARIOS_RUTA1 = [
  "GERARDO",
  "JUAN"
];

export function obtenerRutaVentaPorUsuario(usuarioActual) {
  const usuario = String(usuarioActual?.usuario || "")
    .toUpperCase()
    .trim();

  if (USUARIOS_RUTA1.includes(usuario)) {
    return {
      ...RUTA_VENTAS_REALES,
      esPrueba: false
    };
  }

  return {
    ...RUTA_VENTAS_PRUEBAS,
    esPrueba: true
  };
}
