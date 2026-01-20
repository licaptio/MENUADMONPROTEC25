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
