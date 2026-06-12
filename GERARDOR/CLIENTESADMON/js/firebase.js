import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "../configuraciones/firebaseConfig.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
