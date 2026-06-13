import { db } from "./firebase/config.js";
import { money } from "./util/money.js";
import { toast } from "./ui/toast.js";
import { renderLogin } from "./auth/login.js";

import {
  cargarCatalogo,
  cargarCatalogoFotos
} from "./catalogo/catalogo.js";

window.db = db;
window.money = money;
window.toast = toast;

window.POS = {
  db,
  money,
  toast,
  cargarCatalogo,
  cargarCatalogoFotos
};

renderLogin();

window.addEventListener("pos:login-ok", async () => {

  try {

    toast("Cargando catálogo...");

    await cargarCatalogo(db);

    toast("Cargando fotografías...");

    await cargarCatalogoFotos(db);

    toast("Catálogo listo");

  } catch(err) {

    console.error(err);

    toast("Error cargando catálogo");

  }

});

console.log("PROVSOFT POS 2026 cargado correctamente");