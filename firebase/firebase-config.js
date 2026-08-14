/* ==========================================================================
   FIREBASE CONFIG — app initialization (Modular SDK v9+, loaded as ES module)
   This is the ONLY file that should contain the Firebase project config.
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMmr5DBGQxqgnppBjVLeum4bhKpbu1pYU",
  authDomain: "cashflow-92373.firebaseapp.com",
  projectId: "cashflow-92373",
  storageBucket: "cashflow-92373.firebasestorage.app",
  messagingSenderId: "1008000715079",
  appId: "1:1008000715079:web:c6c8ffa2b7e8d1369e6462",
  measurementId: "G-BWHFP0PEVQ",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
// Analytics only works over https/localhost and in supported browsers —
// guard it so it never breaks the app (e.g. when opened via file://).
isSupported()
  .then((ok) => { if (ok) getAnalytics(firebaseApp); })
  .catch(() => {});

// Everything else in this app is loaded as classic (non-module) <script>
// tags, so we expose the initialized instances on window for the other
// firebase/*.js modules to import from directly (they import this file),
// while classic scripts (storage.js, auth.js) talk to Firebase only through
// window.FBAuth / window.FBStore defined in the other two files below.
window.__FIREBASE_READY__ = true;
