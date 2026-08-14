const _loadedScripts = new Set();
function loadScript(src) {
  if (_loadedScripts.has(src)) return Promise.resolve();
  _loadedScripts.add(src);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src + (src.includes("?") ? "&" : "?") + "_v=25";
    s.onload = resolve;
    s.onerror = () => { _loadedScripts.delete(src); reject(new Error("Gagal load " + src)); };
    document.body.appendChild(s);
  });
}

function formatRupiah(amount) {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "Rp" + abs.toLocaleString("id-ID");
}
function _parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
  return new Date(y, m - 1, d);
}
function formatDateID(dateStr) {
  return _parseLocalDate(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateShort(dateStr) {
  return _parseLocalDate(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function generateId(prefix) { return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }
function escapeHtml(str) { const div = document.createElement("div"); div.textContent = str == null ? "" : String(str); return div.innerHTML; }
function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function formatMetaDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function compactSyncBadge(status) {
  if (!status || status === "synced") return "";
  const icon = status === "pending" ? "clock" : "wifi-off";
  const color = status === "pending" ? "#D97706" : "#EF4444";
  const title = status === "pending" ? "Menunggu sinkronisasi" : "Offline";
  return `<span class="tx-sync-icon" title="${title}"><i data-lucide="${icon}" style="width:10px;height:10px;color:${color};"></i></span>`;
}
function syncStatusHtml(status) {
  if (!status || status === "synced") return `<span class="badge synced">Ter-sinkronisasi</span>`;
  if (status === "pending") return `<span class="badge pending">Menunggu Sinkronisasi</span>`;
  return `<span class="badge offline">Offline</span>`;
}

function graphemes(str) {
  if (!str) return [];
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(seg.segment(str), (s) => s.segment);
    }
  } catch (e) {}
  return Array.from(str);
}
function lastGrapheme(str) { const g = graphemes(str); return g[g.length - 1] || ""; }

function emojiPickerHtml(id, initialEmoji) {
  const val = initialEmoji || "";
  return `
    <div class="emoji-input-row">
      <div class="emoji-live-preview" id="${id}Preview">${val || "🏷️"}</div>
      <input type="text" class="form-control" id="${id}Input" placeholder="Tap lalu ketik emoji dari keyboard HP" value="${escapeHtml(val)}" autocomplete="off" autocorrect="off" spellcheck="false">
    </div>
    <div class="form-hint mb">Buka keyboard emoji bawaan HP kamu di kolom ini untuk memilih emoji.</div>`;
}
function wireEmojiPicker(root, id, initialEmoji, onChange) {
  const input = root.querySelector(`#${id}Input`);
  const preview = root.querySelector(`#${id}Preview`);
  if (!input || !preview) return { setValue: () => {} };

  function setValue(v) {
    input.value = v;
    preview.textContent = v || "🏷️";
    onChange(v);
  }
  input.addEventListener("input", () => setValue(lastGrapheme(input.value)));

  return { setValue };
}

function applyTheme(theme) { document.documentElement.setAttribute("data-theme", theme); }
function initThemeFromStorage(username) { DataStore.getSettings(username).then((s) => applyTheme(s.theme || "light")).catch((err) => { console.error("[Theme] init error:", err); applyTheme("light"); }); }
function toggleTheme(username) {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  DataStore.saveSettings(username, { theme: next }).catch((err) => { console.error("[Theme] save error:", err); Toast.error("Gagal menyimpan tema."); });
}

function _isoDate(y, m, d) {
  return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function _rangeBoundsISO(rangeKey, customStart, customEnd) {
  const now = new Date();
  if (rangeKey === "today") {
    const t = _isoDate(now.getFullYear(), now.getMonth(), now.getDate());
    return { start: t, end: t };
  }
  if (rangeKey === "week") {
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff);
    const end = new Date(now.getFullYear(), now.getMonth(), diff + 6);
    return {
      start: _isoDate(start.getFullYear(), start.getMonth(), start.getDate()),
      end: _isoDate(end.getFullYear(), end.getMonth(), end.getDate()),
    };
  }
  if (rangeKey === "month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: _isoDate(now.getFullYear(), now.getMonth(), 1),
      end: _isoDate(end.getFullYear(), end.getMonth(), end.getDate()),
    };
  }
  if (rangeKey === "year") {
    return { start: _isoDate(now.getFullYear(), 0, 1), end: _isoDate(now.getFullYear(), 11, 31) };
  }
  if (rangeKey === "custom") {
    return {
      start: customStart || "0000-01-01",
      end: customEnd || _isoDate(now.getFullYear(), now.getMonth(), now.getDate()),
    };
  }
  return null;
}
function isWithinRange(dateStr, rangeKey, customStart, customEnd) {
  if (!dateStr) return false;
  const bounds = _rangeBoundsISO(rangeKey, customStart, customEnd);
  if (!bounds) return true;
  const txDate = String(dateStr).slice(0, 10);
  return txDate >= bounds.start && txDate <= bounds.end;
}

function periodLabel(rangeKey) {
  return { "today": "Hari Ini", "week": "Minggu Ini", "month": "Bulan Ini", "year": "Tahun Ini", "custom": "Custom" }[rangeKey] || "Hari Ini";
}

function accountLogoMarkup(account, size) {
  size = size || 30;
  if (account && account.logo) {
    return `<div class="account-logo" style="width:${size}px;height:${size}px;"><img src="${account.logo}" alt="${escapeHtml(account.name)}" loading="lazy"></div>`;
  }
  return `<div class="account-logo" style="width:${size}px;height:${size}px;"><i data-lucide="wallet"></i></div>`;
}

function flattenCategories(categories) {
  const map = {};
  (categories.income || []).forEach((c) => (map[c.id] = { ...c, type: "income" }));
  (categories.expense || []).forEach((c) => (map[c.id] = { ...c, type: "expense" }));
  return map;
}

function resolveCategory(tx, catMap) {
  const live = catMap[tx.categoryId];
  if (live) return { id: live.id, name: live.name, emoji: live.emoji };
  return { id: tx.categoryId, name: tx.categoryName || "Kategori Dihapus", emoji: tx.categoryEmoji || "🏷️" };
}

function getTxTitle(t, catMap) {
  if (t.type === "transfer") {
    return t.toSavingsId ? "Transfer ke Tabungan" : "Transfer Antar Akun";
  }
  const cat = resolveCategory(t, catMap);
  return cat.name;
}

function buildSearchHaystack(t, catMap) {
  const cat = resolveCategory(t, catMap);
  const title = getTxTitle(t, catMap);
  return [title, cat.name, t.subcategoryName, t.merchantName, t.note, String(t.amount), formatRupiah(t.amount)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function emptyStateHtml(icon, title, sub, actionHtml) {
  return `
    <div class="empty-state">
      <div class="empty-illustration"><i data-lucide="${icon}"></i></div>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(sub)}</p>
      ${actionHtml || ""}
    </div>`;
}

function txRowHtml(t, catMap, accountsById) {
  let title, iconHtml, extraMeta = "";
  if (t.type === "transfer") {
    const from = accountsById[t.fromAccountId];
    const to = t.toSavingsId ? { name: t.toSavingsName || "Tabungan" } : accountsById[t.toAccountId];
    title = t.toSavingsId ? "Transfer ke Tabungan" : "Transfer Antar Akun";
    iconHtml = `<i data-lucide="repeat"></i>`;
    extraMeta = `${from ? escapeHtml(from.name) : "-"} → ${to ? escapeHtml(to.name) : "-"}`;
  } else {
    const cat = resolveCategory(t, catMap);
    title = cat.name;
    iconHtml = `<span class="emo">${cat.emoji}</span>`;
    const acc = accountsById[t.accountId];
    extraMeta = acc ? escapeHtml(acc.name) : "-";
  }
  const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
  const jam = formatTime(t.createdAt);
  const metaParts = [formatDateID(t.date), extraMeta];
  if (jam) metaParts.splice(1, 0, jam);
  if (t.subcategoryName) metaParts.push(escapeHtml(t.subcategoryName));
  if (t.merchantName) metaParts.push(escapeHtml(t.merchantName));
  if (t.note) metaParts.push(escapeHtml(t.note));
  const syncIcon = compactSyncBadge(t.syncStatus);
  return `
    <div class="tx-row" data-id="${t.id}">
      <div class="tx-cat-icon ${t.type}">${iconHtml}</div>
      <div class="tx-info">
        <div class="tx-title">${escapeHtml(title)}${syncIcon}</div>
        <div class="tx-meta">${metaParts.join(" · ")}</div>
      </div>
      <div class="tx-amount ${t.type}">${sign}${formatRupiah(t.amount)}</div>
    </div>`;
}

function openPhotoViewer(dataUrl, fileName) {
  const overlay = document.createElement("div");
  overlay.className = "photo-viewer";
  overlay.innerHTML = `
    <div class="pv-backdrop"></div>
    <div class="pv-card">
      <button class="pv-close" type="button"><i data-lucide="x"></i></button>
      <img src="${escapeHtml(dataUrl)}" alt="${escapeHtml(fileName || "Foto")}" class="pv-img">
      <div class="pv-name">${escapeHtml(fileName || "Foto")}</div>
    </div>`;
  document.body.appendChild(overlay);
  refreshIcons();

  overlay.querySelector(".pv-close").addEventListener("click", () => overlay.remove());
  overlay.querySelector(".pv-backdrop").addEventListener("click", () => overlay.remove());
}

function wireTxRowActions(container, username, allAccounts, allCategories, onChanged) {
  if (container._txHandlerWired) return;
  container._txHandlerWired = true;

  const accountsById = {}; allAccounts.forEach((a) => (accountsById[a.id] = a));
  const catMap = flattenCategories(allCategories);

  container.addEventListener("click", (e) => {
    const photo = e.target.closest(".tx-photo-icon");
    if (photo) {
      e.stopPropagation();
      openPhotoViewer(photo.dataset.src, photo.dataset.name);
      return;
    }
    const row = e.target.closest(".tx-row[data-id]");
    if (row) {
      openTxDetailModal(username, row.dataset.id, catMap, accountsById, allAccounts, allCategories, onChanged);
    }
  });
}

function openTxDetailModal(username, txId, catMap, accountsById, allAccounts, allCategories, onChanged) {
  DataStore.getTransactions(username).then((txs) => {
    const t = txs.find((tx) => tx.id === txId);
    if (!t) return;

    let iconHtml, title, typeLabel;
    if (t.type === "transfer") {
      title = t.toSavingsId ? "Transfer ke Tabungan" : "Transfer Antar Akun";
      iconHtml = `<i data-lucide="repeat"></i>`;
      typeLabel = "Transfer";
    } else {
      const cat = resolveCategory(t, catMap);
      title = cat.name;
      iconHtml = `<span class="emo">${cat.emoji}</span>`;
      typeLabel = t.type === "income" ? "Pemasukan" : "Pengeluaran";
    }

    const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
    const amountHtml = `<div class="tx-detail-amount ${t.type}">${sign}${formatRupiah(t.amount)}</div>`;

    let accountHtml;
    if (t.type === "transfer") {
      const from = accountsById[t.fromAccountId];
      const fromName = from ? escapeHtml(from.name) : "-";
      let toName;
      if (t.toSavingsId) {
        toName = escapeHtml(t.toSavingsName || "Tabungan");
      } else {
        const to = accountsById[t.toAccountId];
        toName = to ? escapeHtml(to.name) : "-";
      }
      accountHtml = `
        <div class="tx-detail-field"><span class="tx-detail-label">Dari Akun</span><span class="tx-detail-value">${fromName}</span></div>
        <div class="tx-detail-field"><span class="tx-detail-label">Ke Akun</span><span class="tx-detail-value">${toName}</span></div>`;
    } else {
      const acc = accountsById[t.accountId];
      const accName = acc ? escapeHtml(acc.name) : "-";
      accountHtml = `<div class="tx-detail-field"><span class="tx-detail-label">Akun</span><span class="tx-detail-value">${accName}</span></div>`;
    }

    let categoryHtml = "";
    if (t.type !== "transfer") {
      const cat = resolveCategory(t, catMap);
      const subcat = t.subcategoryName ? ` - ${escapeHtml(t.subcategoryName)}` : "";
      categoryHtml = `<div class="tx-detail-field"><span class="tx-detail-label">Kategori</span><span class="tx-detail-value">${cat.emoji} ${escapeHtml(cat.name)}${subcat}</span></div>`;
    }

    const divider = `<div class="divider"></div>`;

    const merchantHtml = t.merchantName ? `
      <div class="tx-detail-field"><span class="tx-detail-label">Merchant</span><span class="tx-detail-value">${escapeHtml(t.merchantName)}</span></div>` : "";

    const noteHtml = t.note ? `
      ${divider}
      <div class="tx-detail-field"><span class="tx-detail-label">Catatan</span><span class="tx-detail-value">${escapeHtml(t.note)}</span></div>` : "";

    const photoHtml = t.attachment ? `
      ${divider}
      <div class="tx-detail-field"><span class="tx-detail-label">Lampiran</span></div>
      <div class="tx-detail-photo-wrap">
        <img src="${t.attachment}" alt="${escapeHtml(t.attachmentName || "Foto")}" class="tx-detail-photo tx-attachment-link" loading="lazy" data-src="${t.attachment}" data-name="${escapeHtml(t.attachmentName || "Foto")}">
        <div class="tx-detail-photo-name">${escapeHtml(t.attachmentName || "Foto")}</div>
      </div>` : "";

    const jamTx = formatTime(t.createdAt);
    const createdStr = formatMetaDateTime(t.createdAt);
    const updatedStr = (t.createdAt && t.updatedAt && t.createdAt === t.updatedAt)
      ? "Belum pernah diubah"
      : formatMetaDateTime(t.updatedAt);
    const metaHtml = `${divider}
      <div class="tx-detail-fields tx-detail-meta">
        <div class="tx-detail-field"><span class="tx-detail-label">Jam Transaksi</span><span class="tx-detail-value">${jamTx || "—"}</span></div>
        <div class="tx-detail-field"><span class="tx-detail-label">Dibuat Pada</span><span class="tx-detail-value">${createdStr}</span></div>
        <div class="tx-detail-field"><span class="tx-detail-label">Terakhir Diubah</span><span class="tx-detail-value">${updatedStr}</span></div>
        <div class="tx-detail-field"><span class="tx-detail-label">Status Sinkronisasi</span><span class="tx-detail-value">${syncStatusHtml(t.syncStatus)}</span></div>
      </div>`;

    const html = `
      <div class="modal-head">
        <h3>Detail Transaksi</h3>
        <button class="modal-close" id="txDetailClose"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="tx-detail-top">
          <div class="tx-cat-icon ${t.type}" style="width:40px;height:40px;font-size:20px;">${iconHtml}</div>
          <div class="tx-detail-top-info">
            <div class="tx-detail-title">${escapeHtml(title)}</div>
            <span class="badge ${t.type}">${typeLabel}</span>
          </div>
        </div>
        ${amountHtml}
        ${divider}
        <div class="tx-detail-fields">
          <div class="tx-detail-field"><span class="tx-detail-label">Tanggal</span><span class="tx-detail-value">${formatDateID(t.date)}</span></div>
          ${accountHtml}
          ${categoryHtml}
          ${merchantHtml}
        </div>
        ${noteHtml}
        ${photoHtml}
        ${metaHtml}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="txDetailEdit"><i data-lucide="pencil"></i> Edit</button>
        <button class="btn btn-danger" id="txDetailDelete"><i data-lucide="trash-2"></i> Hapus</button>
      </div>`;

    Modal.open(html);

    document.getElementById("txDetailClose").onclick = Modal.close;

    document.getElementById("txDetailEdit").onclick = () => {
      Modal.close(() => {
        if (typeof TxModal === "undefined") {
          loadScript("js/modals/transaction.js").then(() => {
            TxModal.open(username, { editTx: t, onSaved: onChanged });
          }).catch((e) => {
            console.error("[TxDetail] load modal error:", e);
            Toast.error("Gagal memuat form transaksi.");
          });
          return;
        }
        TxModal.open(username, { editTx: t, onSaved: onChanged });
      });
    };

    document.getElementById("txDetailDelete").onclick = () => {
      Modal.close(() => {
        if (typeof TxModal === "undefined") {
          loadScript("js/modals/transaction.js").then(() => {
            TxModal.confirmDelete(username, t, onChanged);
          }).catch((e) => {
            console.error("[TxDetail] load modal error:", e);
            Toast.error("Gagal memuat form transaksi.");
          });
          return;
        }
        TxModal.confirmDelete(username, t, onChanged);
      });
    };
  }).catch((err) => {
    console.error("[TxDetail] getTransactions error:", err);
    Toast.error("Gagal memuat detail transaksi.");
  });
}

document.addEventListener("click", (e) => {
  const link = e.target.closest(".tx-attachment-link");
  if (link) { e.stopPropagation(); openPhotoViewer(link.dataset.src, link.dataset.name); }
});

/* Count-up animation for numbers */
function animateCountUp(el, target, duration, format) {
  if (!el) return;
  format = format || ((v) => formatRupiah(v));
  const start = performance.now();
  const from = 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (target - from) * eased);
    el.textContent = format(current);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

/* Connection status tracking */
const ConnectionStatus = (function () {
  let _listeners = [];
  let _status = navigator.onLine ? "online" : "offline";
  let _pendingCount = 0;
  let _syncing = false;

  function notify() {
    _listeners.forEach((fn) => fn(_status, _pendingCount));
  }

  function setPending(count) {
    _pendingCount = count;
    notify();
  }

  function setSyncing(v) {
    _syncing = v;
    if (v) {
      _status = "syncing";
    } else {
      _status = navigator.onLine ? "online" : "offline";
    }
    notify();
  }

  window.addEventListener("online", () => {
    _status = navigator.onLine ? "online" : "offline";
    notify();
  });
  window.addEventListener("offline", () => {
    _status = "offline";
    notify();
  });

  function getStatus() {
    if (_syncing) return "syncing";
    if (_pendingCount > 0) return "pending";
    return _status;
  }

  function getPendingCount() { return _pendingCount; }

  function onChange(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter((f) => f !== fn); };
  }

  return { getStatus, getPendingCount, onChange, setPending, setSyncing, get status() { return getStatus(); } };
})();

/* Offline sync queue manager */
const SyncQueue = (function () {
  const STORAGE_KEY = "cashflowz_sync_queue";

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  }

  function saveQueue(queue) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    ConnectionStatus.setPending(queue.length);
  }

  function add(operation) {
    const queue = getQueue();
    queue.push({ ...operation, timestamp: Date.now(), id: generateId("sync") });
    saveQueue(queue);
  }

  function remove(id) {
    const queue = getQueue().filter((item) => item.id !== id);
    saveQueue(queue);
  }

  function clear() {
    saveQueue([]);
  }

  async function processAll() {
    const queue = getQueue();
    if (queue.length === 0) return;

    ConnectionStatus.setSyncing(true);

    const remaining = [];
    for (const item of queue) {
      try {
        await processItem(item);
        Toast.success("Data berhasil disinkronkan.");
      } catch (err) {
        console.error("[SyncQueue] process error:", err);
        remaining.push(item);
      }
    }

    saveQueue(remaining);
    ConnectionStatus.setSyncing(false);
  }

  async function processItem(item) {
    const { type, username, data } = item;
    switch (type) {
      case "addTransaction":
        await DataStore.addTransaction(username, data);
        break;
      case "updateTransaction":
        await DataStore.updateTransaction(username, data.id, data.patch);
        break;
      case "deleteTransaction":
        await DataStore.deleteTransaction(username, data.id);
        break;
      default:
        console.warn("[SyncQueue] unknown type:", type);
    }
  }

  return { add, remove, clear, processAll, getQueue };
})();

/* Auto-sync when back online — ConnectionStatus.online listener di atas handle event */
ConnectionStatus.onChange((status) => {
  if (status === "online") SyncQueue.processAll();
});

/* HEIC/HEIF Converter */
let _heicConverterPromise = null;
function loadHeicConverter() {
  if (_heicConverterPromise) return _heicConverterPromise;
  if (typeof heic2any !== "undefined") {
    _heicConverterPromise = Promise.resolve(heic2any);
    return _heicConverterPromise;
  }
  _heicConverterPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    s.onload = () => resolve(window.heic2any);
    s.onerror = () => reject(new Error("Gagal memuat library konversi HEIC. Coba gunakan file JPG/PNG biasa."));
    document.head.appendChild(s);
  });
  return _heicConverterPromise;
}

function isHeic(file) {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
}

async function ensureJpegDataUrl(file, dataUrl) {
  if (!isHeic(file)) return dataUrl;
  try {
    const heic2any = await loadHeicConverter();
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("Gagal membaca hasil konversi HEIC."));
      r.readAsDataURL(resultBlob);
    });
  } catch (err) {
    console.error("[HEIC] conversion error:", err);
    throw new Error("File HEIC tidak bisa dikonversi. Gunakan JPG/PNG biasa.");
  }
}

async function readImageFromFile(file) {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Gagal membaca file."));
    r.readAsDataURL(file);
  });
  const jpegDataUrl = await ensureJpegDataUrl(file, rawDataUrl);
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("File gambar tidak bisa dibaca. Coba foto lain."));
    img.src = jpegDataUrl;
  });
}
