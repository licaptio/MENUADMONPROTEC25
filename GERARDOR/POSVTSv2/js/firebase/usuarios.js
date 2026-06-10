export async function obtenerUsuarioActivo() {

  const usuario =
    localStorage.getItem("usuario_ruta");

  if (!usuario) return null;

  return JSON.parse(usuario);
}
