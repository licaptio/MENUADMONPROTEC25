import { db } from "./firebase/config.js";
import { money } from "./util/money.js";
import { toast } from "./ui/toast.js";
import { renderLogin } from "./auth/login.js";

window.db = db;
window.money = money;
window.toast = toast;

renderLogin();

console.log("PROVSOFT POS 2026 cargado correctamente");