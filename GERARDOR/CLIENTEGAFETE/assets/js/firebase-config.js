import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const EMPRESA_ID = "PDD031204KL5";

export const firebaseConfig = {
  apiKey: "PON_AQUI_TU_API_KEY",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storageDefault = getStorage(app);
export const storageClientes = getStorage(app, "gs://clientes-provsoft-pdd");
