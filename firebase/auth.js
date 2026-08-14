/* ==========================================================================
   FIREBASE AUTH LAYER — Email & Password auth (Modular SDK v9+)

   This is the only place that talks to Firebase Authentication directly.
   There is no local username/password list anywhere in the app — accounts
   are created and managed entirely in the Firebase Console
   (Authentication -> Users -> Add user), and this module simply forwards
   the email/password the user typed to Firebase for verification.

   Exposed globally as window.FBAuth so classic (non-module) scripts —
   js/auth.js in particular — can call it.
   ========================================================================== */
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// Signs in with email+password. The account must already exist in Firebase
// Authentication (create it in Firebase Console -> Authentication -> Users
// -> Add user) — this no longer auto-creates accounts, so a wrong or
// not-yet-created password reliably fails instead of silently registering
// whatever was typed.
//
// `remember` controls how long the session survives:
//  - true  -> browserLocalPersistence: session survives closing the browser
//             entirely (classic "Remember Me" / "Ingat Saya").
//  - false -> browserSessionPersistence: session is cleared once every tab
//             /window of the browser is closed, but still survives a normal
//             page refresh.
async function login(email, password, remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

function logout() {
  return signOut(auth);
}

// Fires once immediately with the current (possibly still-loading) state,
// then again whenever it changes. Returns the unsubscribe function.
function onChange(cb) {
  return onAuthStateChanged(auth, cb);
}

async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

async function updateProfileDisplayName(displayName) {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  await updateProfile(user, { displayName });
}

window.FBAuth = { login, logout, onChange, resetPassword, updateProfileDisplayName };
