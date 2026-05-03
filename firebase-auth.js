/* =========================================
   🔥 FIREBASE CONFIG – PROVSOFT
   ========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/* =========================================
   🔒 PERSISTENCIA (IMPORTANTE)
   ========================================= */
// 🔒 NO guardar sesión (pero ESPERAMOS a que quede aplicado)
const persistReady = auth
  .setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .catch(err => console.error("Persistencia error:", err));
/* =========================================
   ⏱️ CONTROL DE INACTIVIDAD (ROBUSTO)
   ========================================= */

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos
const LAST_ACTIVE_KEY = "provsoft_last_active_ms";

let inactivityTimer = null;
let watchdogInterval = null;

function setLastActiveNow() {
  try {
    sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch (_) {}
}

function getLastActive() {
  const v = sessionStorage.getItem(LAST_ACTIVE_KEY);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function isExpired() {
  const last = getLastActive();
  if (!last) return false;
  return (Date.now() - last) >= INACTIVITY_LIMIT;
}

function stopTimers() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = null;

  if (watchdogInterval) clearInterval(watchdogInterval);
  watchdogInterval = null;
}

function startWatchdog() {
  // Chequeo constante por si el setTimeout se congeló en background
  if (watchdogInterval) return;
  watchdogInterval = setInterval(() => {
    if (auth.currentUser && isExpired()) {
      logout("Sesión cerrada por inactividad");
    }
  }, 10 * 1000); // cada 10s (ajusta si quieres 30s)
}

function resetInactivityTimer() {
  // Solo cuenta inactividad si ya está logueado
  if (!auth.currentUser) return;

  setLastActiveNow();

  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    // En algunos móviles el alert en background se porta raro; mejor mensaje al volver
    logout("Sesión cerrada por inactividad");
  }, INACTIVITY_LIMIT);

  startWatchdog();
}

// Eventos de actividad (no pasa nada si estás logueado o no, pero solo “arma” timer si hay user)
["click", "mousemove", "keydown", "scroll", "touchstart"].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer, { passive: true });
});

// ✅ Al volver del background, validamos el tiempo real transcurrido
document.addEventListener("visibilitychange", () => {
  if (!auth.currentUser) return;

if (document.hidden) {
  // 🔥 OPCIÓN DURA (si quieres que al irse a background se salga AL INSTANTE):
  // logout("Sesión cerrada (app en segundo plano)");
  return;
}
  // Si volvió a foreground, revisa si ya venció
  if (isExpired()) {
    logout("Sesión cerrada por inactividad");
  } else {
    resetInactivityTimer();
  }
});

// Extra: en algunos navegadores PWA ayuda
window.addEventListener("pagehide", () => {
  // opcional: logout al cerrar/ocultar
  // if (auth.currentUser) logout("Sesión cerrada");
});

/* =========================================
   🔐 LOGIN
   ========================================= */
window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorBox = document.getElementById("error");

  errorBox.innerText = "";

  if (!email || !password) {
    errorBox.innerText = "Escribe correo y contraseña.";
    return;
  }

  // ✅ Espera a que la persistencia quede aplicada ANTES del login
  await persistReady;

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errorBox.innerText = err?.message || "Error de autenticación.";
  }
};

/* =========================================
   🔒 LOGOUT (centralizado)
   ========================================= */
window.logout = function (msg) {
  stopTimers();

  auth.signOut().finally(() => {
    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("password");
    const errorBox = document.getElementById("error");

    if (emailEl) emailEl.value = "";
    if (passEl) passEl.value = "";
    if (errorBox) errorBox.innerText = msg || "";

    // Limpia lastActive
    try { sessionStorage.removeItem(LAST_ACTIVE_KEY); } catch (_) {}
  });
};

/* =========================================
   🔒 SESIÓN ACTIVA
   ========================================= */
auth.onAuthStateChanged(user => {
  const loginBox = document.getElementById("loginBox");
  const menu = document.getElementById("menu");

  if (user) {
    loginBox.style.display = "none";
    menu.style.display = "block";

    setLastActiveNow();
    resetInactivityTimer();
  } else {
    menu.style.display = "none";
    loginBox.style.display = "block";

    stopTimers();
  }
});
