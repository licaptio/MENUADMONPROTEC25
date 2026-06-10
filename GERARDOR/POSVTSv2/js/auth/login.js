import { cargarCatalogo } from "../firebase/catalogo.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase/config.js";

let USUARIO_LOGUEADO = null;
let rutaId = null;

export function renderLogin() {
  const loginScreen = document.getElementById("loginScreen");

  if (!loginScreen) {
    console.error("No existe #loginScreen");
    return;
  }

  loginScreen.innerHTML = `
    <div class="login-card">
      <h1>PROVEEDORA DE DULCES<br>Y DESECHABLES</h1>

      <h2>PUNTO DE VENTA<br>PROVSOFT 2026</h2>

      <input id="loginUsuario" type="text" placeholder="Usuario">
      <input id="loginPassword" type="password" placeholder="Contraseña">

      <button id="btnLogin" type="button">Entrar</button>

      <div id="loginMsg"></div>
    </div>
  `;

  document
    .getElementById("btnLogin")
    .addEventListener("click", loginUsuario);

  document
    .getElementById("loginPassword")
    .addEventListener("keydown", e => {
      if (e.key === "Enter") loginUsuario();
    });

  restaurarSesion();
}

async function loginUsuario() {
  const u = document.getElementById("loginUsuario").value.trim();
  const p = document.getElementById("loginPassword").value.trim();
  const msg = document.getElementById("loginMsg");
  const btn = document.getElementById("btnLogin");

  if (!u || !p) {
    msg.textContent = "Captura usuario y contraseña.";
    return;
  }

  msg.textContent = "Verificando usuario...";
  btn.disabled = true;
  btn.textContent = "Validando...";

  try {
    const q = query(
      collection(db, "usuarios_ruta"),
      where("usuario", "==", u),
      where("password", "==", p),
      where("activo", "==", true)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      msg.textContent = "Usuario o contraseña incorrectos.";
      btn.disabled = false;
      btn.textContent = "Entrar";
      return;
    }

    const data = snap.docs[0].data();

    USUARIO_LOGUEADO = {
      id: snap.docs[0].id,
      ...data
    };

    rutaId = data.rutaId || null;

    localStorage.setItem(
      "usuario_ruta",
      JSON.stringify(USUARIO_LOGUEADO)
    );

    entrarAlPOS();

  } catch (err) {
    console.error("Error login:", err);
    msg.textContent = "Error de conexión con Firestore.";
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

function restaurarSesion() {
  const guardado = localStorage.getItem("usuario_ruta");

  if (!guardado) return;

  try {
    USUARIO_LOGUEADO = JSON.parse(guardado);
    rutaId = USUARIO_LOGUEADO?.rutaId || null;

    console.log(
      "Sesión restaurada:",
      USUARIO_LOGUEADO.nombre || USUARIO_LOGUEADO.usuario
    );

    entrarAlPOS();

  } catch (err) {
    console.warn("No se pudo restaurar sesión:", err);
    localStorage.removeItem("usuario_ruta");
  }
}

function entrarAlPOS() {
  const loginScreen = document.getElementById("loginScreen");
  const posApp = document.getElementById("posApp");

  if (loginScreen) loginScreen.style.display = "none";
  if (posApp) {
    posApp.style.display = "block";
    posApp.innerHTML = `
      <div style="
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#fff;
        font-family:Arial,sans-serif;
        text-align:center;
        padding:20px;
      ">
        <div>
          <h1 style="color:#8b0000;margin-bottom:10px;">
            POSPDD26
          </h1>

          <h2 style="color:#333;margin-bottom:16px;">
            Sesión iniciada correctamente
          </h2>

          <p style="font-size:15px;color:#555;margin-bottom:20px;">
            Usuario: ${USUARIO_LOGUEADO?.nombre || USUARIO_LOGUEADO?.usuario || "—"}
          </p>

          <button id="btnLogout" style="
            padding:13px 22px;
            border:none;
            border-radius:12px;
            background:#8b0000;
            color:white;
            font-weight:700;
            cursor:pointer;
          ">
            Cerrar sesión
          </button>
        </div>
      </div>
    `;
  }

  document.body.classList.add("sesion-activa");

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", logout);
  }

  console.log("Sesión iniciada:", USUARIO_LOGUEADO);
  console.log("Ruta:", rutaId);
}

export function logout() {
  localStorage.removeItem("usuario_ruta");
  location.reload();
}

export function getUsuarioLogueado() {
  return USUARIO_LOGUEADO;
}

export function getRutaId() {
  return rutaId;
}