/* =========================================
   🔥 FIREBASE CONFIG – PROVSOFT
   ========================================= */

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/* =========================================
   🔐 LOGIN
   ========================================= */
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorBox = document.getElementById("error");

  errorBox.innerText = "";

  auth.signInWithEmailAndPassword(email, password)
    .catch(err => {
      errorBox.innerText = err.message;
    });
};

/* =========================================
   🚪 LOGOUT
   ========================================= */
window.logout = function () {
  auth.signOut();
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
  } else {
    loginBox.style.display = "block";
    menu.style.display = "none";
  }
});
