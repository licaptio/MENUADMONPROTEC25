import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   CONFIGURACIÓN PROVSOFT
   ========================= */

// Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

// Supabase, si después lo ocupas
export const supabaseUrl = "https://cvpbtjlupswbyxenugpz.supabase.co";
export const supabaseAnonKey = "sb_publishable_SQ7Q5LFJqlxVzwNTxcIyzQ_8F1bqyiX";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);
