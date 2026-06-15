export function mostrarLoader(detalle = "Cargando información..."){
  const loader = document.getElementById("loaderProvsoft");
  const detalleEl = document.getElementById("loaderDetalle");
  if (detalleEl) detalleEl.textContent = detalle;
  if (loader) loader.classList.add("show");
}

export function cambiarLoader(detalle = ""){
  const detalleEl = document.getElementById("loaderDetalle");
  if (detalleEl) detalleEl.textContent = detalle;
}

export function ocultarLoader(){
  const loader = document.getElementById("loaderProvsoft");
  if (loader) loader.classList.remove("show");
}
