import { db } from "./firebase-config.js";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, query, orderBy, getDocs, deleteDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

function userDocRef(username) { return doc(db, "users", username); }
function txCollRef(username) { return collection(db, "users", username, "transactions"); }
function txDocRef(username, id) { return doc(db, "users", username, "transactions", id); }

async function ensureUserDoc(username, defaults) {
  const ref = userDocRef(username);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, defaults);
    return { ...defaults };
  }
  return snap.data();
}

async function patchUserDoc(username, patch) {
  await updateDoc(userDocRef(username), patch);
}

function subscribeUserDoc(username, onChange, onError) {
  return onSnapshot(userDocRef(username), (snap) => {
    if (snap.exists()) onChange(snap.data());
  }, (err) => {
    console.error("[Firestore] user doc listener error:", err);
    if (onError) onError(err);
  });
}

function subscribeTransactions(username, onChange, onError) {
  const q = query(txCollRef(username), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error("[Firestore] transactions listener error:", err);
    if (onError) onError(err);
  });
}

async function setTransactionDoc(username, tx) {
  await setDoc(txDocRef(username, tx.id), tx);
  return tx;
}

async function updateTransactionDoc(username, id, patch) {
  await updateDoc(txDocRef(username, id), patch);
}

async function deleteTransactionDoc(username, id) {
  await deleteDoc(txDocRef(username, id));
}

// Used by the "Impor" (restore-from-backup) feature: replaces the whole
// user doc + the whole transactions subcollection in one batch.
const _importLocks = {};
async function replaceAllData(username, data) {
  if (_importLocks[username]) {
    throw new Error("Import already in progress for this user");
  }
  _importLocks[username] = true;
  
  try {
    const { transactions, ...docFields } = data;
    const existing = await getDocs(txCollRef(username));

    const BATCH_LIMIT = 500;
    let batch = writeBatch(db);
    let ops = 0;

    const flushBatch = () => {
      if (ops === 0) return;
      batch.commit();
      batch = writeBatch(db);
      ops = 0;
    };

    batch.set(userDocRef(username), docFields);
    ops++;

    existing.docs.forEach((d) => {
      if (ops >= BATCH_LIMIT) flushBatch();
      batch.delete(d.ref);
      ops++;
    });

    (transactions || []).forEach((tx) => {
      if (ops >= BATCH_LIMIT) flushBatch();
      batch.set(txDocRef(username, tx.id), tx);
      ops++;
    });

    if (ops > 0) await batch.commit();
  } finally {
    delete _importLocks[username];
  }
}

window.FBStore = {
  ensureUserDoc, patchUserDoc,
  subscribeUserDoc, subscribeTransactions,
  setTransactionDoc, updateTransactionDoc, deleteTransactionDoc,
  replaceAllData,
};
