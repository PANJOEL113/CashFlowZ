const DataStore = (function () {
  const cache = {};   // username -> full data object (same shape as before)
  const subs = {};    // username -> { unsubDoc, unsubTx }
  const ready = {};   // username -> Promise<data>, resolved once first synced
  const userEmails = {}; // username -> email, persisted from first initUser call

  function defaultData(username, email) {
    const now = new Date().toISOString();
    return {
      profile: {
        name: (email || "").split("@")[0] || "User",
        email: email || "",
        photo: null,
      },
      accounts: [],
      categories: { income: [], expense: [] },
      subcategories: {},
      settings: { theme: "light" },
      savingsTargets: [],
      merchants: [
        { id: "mer_default_shopee", name: "Shopee", logo: null, createdAt: now, updatedAt: now },
        { id: "mer_default_tiktok", name: "TikTok Shop", logo: null, createdAt: now, updatedAt: now },
      ],
      activityLog: [],
    };
  }

  const MAX_LOG = 100;

  function addActivityLog(username, action, entity, detail) {
    return getAll(username).then((d) => {
      const entry = { id: generateId("log"), timestamp: Date.now(), action, entity, detail };
      const log = [entry, ...((d.activityLog || []).slice(0, MAX_LOG - 1))];
      cache[username].activityLog = log;
      return patchDoc(username, { activityLog: log }).catch(() => {
        // Silent fail — log is non-critical
        cache[username].activityLog = log;
      });
    });
  }

  function getActivityLogs(username) {
    return getAll(username).then((d) => d.activityLog || []);
  }

  let _lastErrorTime = 0;
  let _wasDisconnected = false;

  function handleListenerError(err) {
    const now = Date.now();
    if (now - _lastErrorTime < 10000) return;
    _lastErrorTime = now;
    _wasDisconnected = true;

    if (!err || err.code === "unavailable" || err.code === "failed-precondition" || err.code === "resource-exhausted") {
      Toast.error("Koneksi terputus. Data mungkin tidak ter-update.");
    } else if (err.code === "permission-denied") {
      Toast.error("Akses data ditolak. Coba login ulang.");
    } else {
      Toast.error("Sinkronisasi data gagal. Periksa koneksi Anda.");
    }
  }

  function notifyIfActive(username) {
    if (typeof currentSession !== "undefined" && currentSession && currentSession.username === username) {
      if (typeof renderRoute === "function") {
        try { renderRoute(); } catch (e) { /* view not ready yet, ignore */ }
      }
    }
  }

  function initUser(username, email) {
    if (ready[username]) return ready[username];
    if (email) userEmails[username] = email;
    const userEmail = email || userEmails[username] || "";

    cache[username] = { ...defaultData(username, userEmail), transactions: [] };

    ready[username] = window.FBStore.ensureUserDoc(username, defaultData(username, userEmail)).then((docData) => {
      cache[username] = { ...cache[username], ...docData };

      subs[username] = {
        unsubDoc: window.FBStore.subscribeUserDoc(username, (data) => {
          if (_wasDisconnected) { _wasDisconnected = false; Toast.success("Tersambung kembali."); }
          cache[username] = { ...cache[username], ...data };
          notifyIfActive(username);
        }, handleListenerError),
        unsubTx: window.FBStore.subscribeTransactions(username, (txs) => {
          if (_wasDisconnected) { _wasDisconnected = false; Toast.success("Tersambung kembali."); }
          cache[username].transactions = txs;
          notifyIfActive(username);
        }, handleListenerError),
      };

      return cache[username];
    }).catch((err) => {
      console.warn("[Storage] initUser error — using local cache:", err);
      Toast.error("Gagal sinkronisasi. Data mungkin tidak real-time.");
      return cache[username];
    });

    return ready[username];
  }

  // Call on logout to detach real-time listeners and drop the cache.
  function stopSync(username) {
    if (subs[username]) {
      subs[username].unsubDoc && subs[username].unsubDoc();
      subs[username].unsubTx && subs[username].unsubTx();
    }
    delete subs[username];
    delete ready[username];
    delete cache[username];
  }

  function getAll(username) { return initUser(username).then(() => cache[username]); }

  // Patches the main user doc both in the local cache (so callers chained
  // with .then() see the new value immediately) and in Firestore.
  function patchDoc(username, fields) {
    return window.FBStore.patchUserDoc(username, fields).then(() => {
      cache[username] = { ...cache[username], ...fields };
      return cache[username];
    }).catch((err) => {
      console.error('[Storage] patchDoc failed:', err);
      throw err;
    });
  }

  // ---------------- Accounts ----------------
  function getAccounts(username) { return getAll(username).then((d) => d.accounts); }
  function addAccount(username, account) {
    return getAll(username).then((d) => patchDoc(username, { accounts: [...d.accounts, account] }).then(() => {
      addActivityLog(username, "created", "account", "Akun \"" + account.name + "\" ditambahkan");
    }));
  }
  function updateAccount(username, id, patch) {
    return getAll(username).then((d) => {
      const old = d.accounts.find((a) => a.id === id);
      return patchDoc(username, {
        accounts: d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }).then(() => {
        addActivityLog(username, "updated", "account", "Akun \"" + (old ? old.name : "") + "\" diperbarui");
      });
    });
  }
  function deleteAccounts(username, ids) {
    return getAll(username).then((d) => {
      const names = ids.map((id) => { const a = d.accounts.find((x) => x.id === id); return a ? a.name : id; });
      const toRemoveTx = d.transactions.filter(
        (t) => ids.includes(t.accountId) || ids.includes(t.fromAccountId) || ids.includes(t.toAccountId)
      );
      return patchDoc(username, { accounts: d.accounts.filter((a) => !ids.includes(a.id)) }).then(() =>
        Promise.all(toRemoveTx.map((t) => window.FBStore.deleteTransactionDoc(username, t.id))).then(() => {
          cache[username].transactions = cache[username].transactions.filter((t) => !toRemoveTx.some((r) => r.id === t.id));
          addActivityLog(username, "deleted", "account", "Akun \"" + names.join(", ") + "\" dihapus (" + toRemoveTx.length + " transaksi)");
        })
      );
    });
  }

  // ---------------- Usage frequency (for sorting) ----------------
  function getAccountUsage(username) {
    return getAll(username).then((d) => {
      const usage = {};
      (d.transactions || []).forEach((t) => {
        if (t.accountId) usage[t.accountId] = (usage[t.accountId] || 0) + 1;
        if (t.fromAccountId) usage[t.fromAccountId] = (usage[t.fromAccountId] || 0) + 1;
        if (t.toAccountId) usage[t.toAccountId] = (usage[t.toAccountId] || 0) + 1;
      });
      return usage;
    });
  }

  function getCategoryUsage(username) {
    return getAll(username).then((d) => {
      const usage = {};
      (d.transactions || []).forEach((t) => {
        if (t.categoryId) usage[t.categoryId] = (usage[t.categoryId] || 0) + 1;
      });
      return usage;
    });
  }

  // ---------------- Categories ----------------
  function getCategories(username) { return getAll(username).then((d) => d.categories); }
  function addCategory(username, type, category) {
    return getAll(username).then((d) => patchDoc(username, {
      categories: { ...d.categories, [type]: [...d.categories[type], category] },
    }).then(() => {
      addActivityLog(username, "created", "category", "Kategori \"" + category.name + "\" ditambahkan");
    }));
  }
  function updateCategory(username, type, id, patch) {
    return getAll(username).then((d) => {
      const old = (d.categories[type] || []).find((c) => c.id === id);
      return patchDoc(username, {
        categories: { ...d.categories, [type]: d.categories[type].map((c) => (c.id === id ? { ...c, ...patch } : c)) },
      }).then(() => {
        addActivityLog(username, "updated", "category", "Kategori \"" + (old ? old.name : "") + "\" diperbarui");
      });
    });
  }
  function deleteCategories(username, type, ids) {
    return getAll(username).then((d) => {
      const names = ids.map((id) => { const c = (d.categories[type] || []).find((x) => x.id === id); return c ? c.name : id; });
      return patchDoc(username, {
        categories: { ...d.categories, [type]: d.categories[type].filter((c) => !ids.includes(c.id)) },
      }).then(() => {
        addActivityLog(username, "deleted", "category", "Kategori \"" + names.join(", ") + "\" dihapus");
      });
    });
  }

  // ---------------- Subcategories ----------------
  function getSubcategories(username) { return getAll(username).then((d) => d.subcategories || {}); }
  function addSubcategory(username, categoryId, subcategory) {
    return getAll(username).then((d) => {
      const subcategories = { ...(d.subcategories || {}) };
      subcategories[categoryId] = [...(subcategories[categoryId] || []), subcategory];
      return patchDoc(username, { subcategories }).then(() => {
        addActivityLog(username, "created", "subcategory", "Subkategori \"" + subcategory.name + "\" ditambahkan");
      });
    });
  }
  function deleteSubcategory(username, categoryId, subcategoryId) {
    return getAll(username).then((d) => {
      const subs = d.subcategories[categoryId] || [];
      const sub = subs.find((s) => s.id === subcategoryId);
      const subcategories = { ...(d.subcategories || {}) };
      subcategories[categoryId] = subs.filter((s) => s.id !== subcategoryId);
      return patchDoc(username, { subcategories }).then(() => {
        addActivityLog(username, "deleted", "subcategory", "Subkategori \"" + (sub ? sub.name : "") + "\" dihapus");
      });
    });
  }
  function updateSubcategory(username, categoryId, subcategoryId, updates) {
    return getAll(username).then((d) => {
      const subs = d.subcategories[categoryId] || [];
      const subcategories = { ...(d.subcategories || {}) };
      subcategories[categoryId] = subs.map((s) => s.id === subcategoryId ? { ...s, ...updates } : s);
      return patchDoc(username, { subcategories }).then(() => {
        addActivityLog(username, "updated", "subcategory", "Subkategori \"" + (updates.name || "") + "\" diperbarui");
      });
    });
  }

  // Menunggu Firestore listener update cache. Dipanggil setelah write
  // untuk memastikan cache sudah sinkron sebelum Promise resolve.
  function waitForListener(username, checkFn, timeoutMs) {
    timeoutMs = timeoutMs || 4000;
    return new Promise((resolve) => {
      if (checkFn()) { resolve(true); return; }
      const start = Date.now();
      function poll() {
        if (checkFn()) { resolve(true); return; }
        if (Date.now() - start >= timeoutMs) { resolve(false); return; }
        setTimeout(poll, 20);
      }
      setTimeout(poll, 20);
    });
  }

  // ---------------- Transactions ----------------
  function getTransactions(username) {
    return getAll(username).then((d) => d.transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)));
  }
  function addTransaction(username, tx) {
    tx.id = tx.id || generateId("tx");
    const now = new Date().toISOString();
    if (!tx.createdAt) tx.createdAt = now;
    tx.updatedAt = now;
    tx.syncStatus = tx.syncStatus || (navigator.onLine ? "synced" : "pending");
    return getAll(username).then(() => {
      const typeLabel = tx.type === "income" ? "Pemasukan" : tx.type === "expense" ? "Pengeluaran" : "Transfer";
      const detail = "Transaksi " + typeLabel + " " + formatRupiah(tx.amount) + " ditambahkan";
      if (!navigator.onLine) {
        cache[username].transactions = [tx, ...cache[username].transactions];
        SyncQueue.add({ type: "addTransaction", username, data: tx });
        addActivityLog(username, "created", "transaction", detail + " (offline)");
        return cache[username];
      }
      return window.FBStore.setTransactionDoc(username, tx).then(() => {
        return waitForListener(username, () =>
          cache[username].transactions.some(t => t.id === tx.id)
        ).then((confirmed) => {
          if (!confirmed) {
            cache[username].transactions = [tx, ...cache[username].transactions];
          }
          addActivityLog(username, "created", "transaction", detail);
          return cache[username];
        });
      }).catch((err) => {
        console.error('[Storage] addTransaction failed:', err);
        throw err;
      });
    });
  }
  function updateTransaction(username, id, patch) {
    patch = { ...patch, updatedAt: new Date().toISOString(), syncStatus: navigator.onLine ? "synced" : "pending" };
    return getAll(username).then(() => {
      const t = cache[username].transactions.find(tx => tx.id === id);
      const typeLabel = t ? (t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer") : "";
      const detail = "Transaksi " + typeLabel + " diperbarui";
      if (!navigator.onLine) {
        if (t) cache[username].transactions = cache[username].transactions.map((tx) => tx.id === id ? { ...tx, ...patch } : tx);
        SyncQueue.add({ type: "updateTransaction", username, data: { id, patch } });
        addActivityLog(username, "updated", "transaction", detail + " (offline)");
        return cache[username];
      }
      return window.FBStore.updateTransactionDoc(username, id, patch).then(() => {
        return waitForListener(username, () => {
          const tx = cache[username].transactions.find(t => t.id === id);
          if (!tx) return false;
          return Object.keys(patch).every(k => tx[k] === patch[k]);
        }).then((confirmed) => {
          if (!confirmed && t) {
            cache[username].transactions = cache[username].transactions.map(tx => tx.id === id ? { ...tx, ...patch } : tx);
          }
          addActivityLog(username, "updated", "transaction", detail);
          return cache[username];
        });
      }).catch((err) => {
        console.error('[Storage] updateTransaction failed:', err);
        throw err;
      });
    });
  }
  function deleteTransaction(username, id) {
    return getAll(username).then(() => {
      const t = cache[username].transactions.find(tx => tx.id === id);
      const typeLabel = t ? (t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer") : "";
      const detail = t ? "Transaksi " + typeLabel + " " + formatRupiah(t.amount) + " dihapus" : "Transaksi dihapus";
      if (!navigator.onLine) {
        cache[username].transactions = cache[username].transactions.filter(tx => tx.id !== id);
        SyncQueue.add({ type: "deleteTransaction", username, data: { id } });
        addActivityLog(username, "deleted", "transaction", detail + " (offline)");
        return cache[username];
      }
      return window.FBStore.deleteTransactionDoc(username, id).then(() => {
        return waitForListener(username, () =>
          !cache[username].transactions.some(t => t.id === id)
        ).then((confirmed) => {
          if (!confirmed) {
            cache[username].transactions = cache[username].transactions.filter(tx => tx.id !== id);
          }
          addActivityLog(username, "deleted", "transaction", detail);
          return cache[username];
        });
      }).catch((err) => {
        console.error('[Storage] deleteTransaction failed:', err);
        throw err;
      });
    });
  }

  // Balance = initial balance + every transaction affecting the account.
  function computeAccountBalance(transactions, account) {
    let bal = account.initialBalance || 0;
    transactions.forEach((t) => {
      if (t.type === "income" && t.accountId === account.id) bal += t.amount;
      else if (t.type === "expense" && t.accountId === account.id) bal -= t.amount;
      else if (t.type === "transfer") {
        if (t.fromAccountId === account.id) bal -= t.amount;
        if (t.toAccountId === account.id) bal += t.amount;
      }
    });
    return bal;
  }

  // ---------------- Profile ----------------
  function getProfile(username) { return getAll(username).then((d) => d.profile); }
  function saveProfile(username, patch) {
    return getAll(username).then((d) => patchDoc(username, { profile: { ...d.profile, ...patch } }).then(() => {
      if (patch.name) addActivityLog(username, "updated", "profile", "Nama profil diperbarui");
      if (patch.photo !== undefined) addActivityLog(username, "updated", "profile", patch.photo ? "Foto profil diganti" : "Foto profil dihapus");
    }));
  }

  // ---------------- Settings ----------------
  function getSettings(username) { return getAll(username).then((d) => d.settings || { theme: "light" }); }
  function saveSettings(username, patch) {
    return getAll(username).then((d) => patchDoc(username, { settings: { ...(d.settings || {}), ...patch } }));
  }

  // ---------------- Savings Targets ----------------
  function getSavingsTargets(username) { return getAll(username).then((d) => d.savingsTargets || []); }
  function addSavingsTarget(username, target) {
    return getAll(username).then((d) => patchDoc(username, { savingsTargets: [...(d.savingsTargets || []), target] }).then(() => {
      addActivityLog(username, "created", "savings", "Tabungan \"" + target.name + "\" ditambahkan");
    }));
  }
  function updateSavingsTarget(username, id, patch) {
    return getAll(username).then((d) => {
      const old = (d.savingsTargets || []).find((s) => s.id === id);
      return patchDoc(username, {
        savingsTargets: (d.savingsTargets || []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }).then(() => {
        addActivityLog(username, "updated", "savings", "Tabungan \"" + (old ? old.name : "") + "\" diperbarui");
      });
    });
  }
  function deleteSavingsTargets(username, ids) {
    return getAll(username).then((d) => {
      const names = ids.map((id) => { const s = (d.savingsTargets || []).find((x) => x.id === id); return s ? s.name : id; });
      return patchDoc(username, {
        savingsTargets: (d.savingsTargets || []).filter((s) => !ids.includes(s.id)),
      }).then(() => {
        addActivityLog(username, "deleted", "savings", "Tabungan \"" + names.join(", ") + "\" dihapus");
      });
    });
  }

  // ---------------- Merchants ----------------
  function getMerchants(username) { return getAll(username).then((d) => d.merchants || []); }
  function addMerchant(username, merchant) {
    return getAll(username).then((d) => patchDoc(username, { merchants: [...(d.merchants || []), merchant] }).then(() => {
      addActivityLog(username, "created", "merchant", "Merchant \"" + merchant.name + "\" ditambahkan");
    }));
  }
  function updateMerchant(username, id, patch) {
    return getAll(username).then((d) => {
      const old = (d.merchants || []).find((m) => m.id === id);
      return patchDoc(username, {
        merchants: (d.merchants || []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }).then(() => {
        addActivityLog(username, "updated", "merchant", "Merchant \"" + (old ? old.name : "") + "\" diperbarui");
      });
    });
  }
  function deleteMerchants(username, ids) {
    return getAll(username).then((d) => {
      const names = ids.map((id) => { const m = (d.merchants || []).find((x) => x.id === id); return m ? m.name : id; });
      return patchDoc(username, {
        merchants: (d.merchants || []).filter((m) => !ids.includes(m.id)),
      }).then(() => {
        addActivityLog(username, "deleted", "merchant", "Merchant \"" + names.join(", ") + "\" dihapus");
      });
    });
  }
  function getMerchantUsage(username) {
    return getAll(username).then((d) => {
      const usage = {};
      (d.transactions || []).forEach((t) => {
        if (t.merchantId) usage[t.merchantId] = (usage[t.merchantId] || 0) + 1;
      });
      return usage;
    });
  }

  // ---------------- Restore from backup (Impor) ----------------
  // Replaces the whole user doc + transactions subcollection in Firestore.
  function restoreAll(username, data) {
    // Ensure merchants field exists even in old backups
    if (!data.merchants) data.merchants = [];
    return window.FBStore.replaceAllData(username, data).then(() => {
      cache[username] = { ...defaultData(username), ...data };
      addActivityLog(username, "imported", "data", "Data dipulihkan dari backup");
      return cache[username];
    });
  }

  return {
    initUser, getAll, stopSync, restoreAll,
    getAccounts, addAccount, updateAccount, deleteAccounts, getAccountUsage, getCategoryUsage,
    getCategories, addCategory, updateCategory, deleteCategories,
    getSubcategories, addSubcategory, updateSubcategory, deleteSubcategory,
    getTransactions, addTransaction, updateTransaction, deleteTransaction,
    computeAccountBalance,
    getProfile, saveProfile,
    getSettings, saveSettings,
    getSavingsTargets, addSavingsTarget, updateSavingsTarget, deleteSavingsTargets,
    getMerchants, addMerchant, updateMerchant, deleteMerchants, getMerchantUsage,
    addActivityLog, getActivityLogs,
  };
})();

// Thin session cache mirroring the authoritative Firebase Auth session (see
// js/auth.js). Kept as a plain object (not raw data) so the router and
// every view can keep reading `session.username` exactly as before.
const SessionStore = {
  KEY: "finance_session",
  set(username) { sessionStorage.setItem(this.KEY, JSON.stringify({ username, loginAt: Date.now() })); },
  get() { const raw = sessionStorage.getItem(this.KEY); return raw ? JSON.parse(raw) : null; },
  clear() { sessionStorage.removeItem(this.KEY); },
};
