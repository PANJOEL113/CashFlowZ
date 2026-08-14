const TxModal = (function () {
  let state = {
    type: "expense",
    accounts: [],
    categories: { income: [], expense: [] },
    subcategories: {},
    savingsTargets: [],
    merchants: [],
    transferDestination: "account",
    editTx: null,
    username: null,
  };
  let quickAddOpen = false;
  let quickSubcatOpen = false;
  let quickMerchantOpen = false;

  function open(username, opts) {
    opts = opts || {};
    state.username = username;
    state.editTx = opts.editTx || null;
    state.type = state.editTx ? state.editTx.type : (opts.defaultType || "expense");
    state.transferDestination = "account";
    quickAddOpen = false;
    quickSubcatOpen = false;
    quickMerchantOpen = false;

    Promise.all([
      DataStore.getAccounts(username),
      DataStore.getCategories(username),
      DataStore.getSubcategories(username),
      DataStore.getSavingsTargets(username),
      DataStore.getAccountUsage(username),
      DataStore.getCategoryUsage(username),
      DataStore.getMerchants(username),
    ]).then(([accounts, categories, subcategories, savingsTargets, accUsage, catUsage, merchants]) => {
      state.accounts = [...accounts].sort((a, b) => (accUsage[b.id] || 0) - (accUsage[a.id] || 0));
      state.categories = {
        income: (categories.income || []).sort((a, b) => (catUsage[b.id] || 0) - (catUsage[a.id] || 0)),
        expense: (categories.expense || []).sort((a, b) => (catUsage[b.id] || 0) - (catUsage[a.id] || 0)),
      };
      state.subcategories = subcategories;
      state.savingsTargets = savingsTargets;
      state.merchants = merchants || [];
      if (state.editTx && state.editTx.type === "transfer" && state.editTx.toSavingsId) {
        state.transferDestination = "savings";
      }
      render(opts.onSaved);
    }).catch((err) => {
      console.error("[TxModal] load error:", err);
      Toast.error("Gagal memuat data transaksi.");
    });
  }

  function render(onSaved) {
    const tx = state.editTx, isEdit = !!tx;
    Modal.open(`
      <div class="modal-head"><h3>${isEdit ? "Edit Transaksi" : "Tambah Transaksi"}</h3><button class="modal-close" id="txModalClose"><i data-lucide="x"></i></button></div>
      <div class="modal-body">
        <div class="type-switch" id="typeSwitch">
          <button type="button" data-type="income" class="${state.type === "income" ? "active" : ""}">Pemasukan</button>
          <button type="button" data-type="expense" class="${state.type === "expense" ? "active" : ""}">Pengeluaran</button>
          <button type="button" data-type="transfer" class="${state.type === "transfer" ? "active" : ""}">Transfer</button>
        </div>
        <div class="form-group"><label>Tanggal</label><input type="date" class="form-control" id="fDate" value="${tx ? tx.date : todayISO()}"></div>
        <div class="form-group"><label>Jumlah (Rp)</label><input type="number" min="0" class="form-control" id="fAmount" placeholder="0" value="${tx ? tx.amount : ""}"></div>
        <div id="accountFieldWrap"></div>
        <div id="categoryFieldWrap"></div>
        <div class="form-group" id="merchantFieldWrap"></div>
        <div class="form-group"><label>Catatan</label><textarea class="form-control" id="fNote" rows="2" placeholder="Opsional">${tx && tx.note ? escapeHtml(tx.note) : ""}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="txCancelBtn" type="button">Batal</button>
        <button class="btn btn-primary" id="txSaveBtn" type="button">${isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}</button>
      </div>`);
    renderDynamicFields();

    document.getElementById("txModalClose").onclick = Modal.close;
    document.getElementById("txCancelBtn").onclick = Modal.close;
    document.querySelectorAll("#typeSwitch button").forEach((btn) => {
      btn.onclick = () => { state.type = btn.dataset.type; quickAddOpen = false; quickSubcatOpen = false; quickMerchantOpen = false; document.querySelectorAll("#typeSwitch button").forEach((b) => b.classList.toggle("active", b === btn)); renderDynamicFields(); };
    });
    document.getElementById("txSaveBtn").onclick = () => save(onSaved);
    const amountInput = document.getElementById("fAmount");
    if (amountInput) {
      amountInput.addEventListener("input", () => {
        const v = parseFloat(amountInput.value);
        const invalid = amountInput.value !== "" && (isNaN(v) || v < 0);
        amountInput.classList.toggle("error", invalid);
      });
      amountInput.addEventListener("blur", () => {
        if (amountInput.value !== "" && parseFloat(amountInput.value) < 0) amountInput.value = Math.abs(parseFloat(amountInput.value));
        amountInput.classList.remove("error");
      });
    }
  }

  function renderDynamicFields() {
    const accWrap = document.getElementById("accountFieldWrap");
    const catWrap = document.getElementById("categoryFieldWrap");
    if (!accWrap || !catWrap) return;
    const tx = state.editTx;

    if (state.type === "transfer") {
      accWrap.innerHTML = `
        <div class="form-row">
          <div class="form-group"><label>Dari Dompet</label><select class="form-control" id="fFromAccount">${accountOptions(tx ? tx.fromAccountId : null)}</select></div>
          <div class="form-group"><label>Ke</label><select class="form-control" id="fTransferDestination">${renderTransferDestinationOptions()}</select></div>
        </div>
        <div class="form-group" id="transferDestinationWrap"></div>`;
      renderTransferDestinationField();
      catWrap.innerHTML = "";
      clearMerchantField();
    } else {
      accWrap.innerHTML = `<div class="form-group"><label>Akun</label><select class="form-control" id="fAccount">${accountOptions(tx ? tx.accountId : null)}</select></div>`;
      renderCategoryField(catWrap);
      renderMerchantField();
    }
    refreshIcons();
  }

  function clearMerchantField() {
    const wrap = document.getElementById("merchantFieldWrap");
    if (wrap) wrap.innerHTML = "";
  }

  function renderMerchantField(selectedOverride) {
    const wrap = document.getElementById("merchantFieldWrap");
    if (!wrap) return;
    const tx = state.editTx;
    const merchants = state.merchants || [];
    const selectedMerchantId = selectedOverride || (tx ? (tx.merchantId || "") : "");

    if (quickMerchantOpen) {
      wrap.innerHTML = `
        <label>Merchant Baru</label>
        <input type="text" class="form-control mb" id="quickMerchantName" placeholder="Contoh: Shopee">
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-outline btn-sm" id="quickMerchantCancel" style="flex:1;">Batal</button>
          <button type="button" class="btn btn-primary btn-sm" id="quickMerchantSave" style="flex:1;">Simpan</button>
        </div>`;
      document.getElementById("quickMerchantCancel").onclick = () => { quickMerchantOpen = false; renderMerchantField(); };
      document.getElementById("quickMerchantSave").onclick = () => {
        const name = document.getElementById("quickMerchantName").value.trim();
        if (!name) return Toast.error("Nama merchant wajib diisi.");
        const newMerchant = { id: generateId("mer"), name, logo: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        DataStore.addMerchant(state.username, newMerchant).then(() => {
          state.merchants.push(newMerchant);
          quickMerchantOpen = false;
          renderMerchantField(newMerchant.id);
          Toast.success("Merchant berhasil ditambahkan.");
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan merchant. Coba lagi.");
        });
      };
      return;
    }

    wrap.innerHTML = `
      <label>Merchant (Opsional)</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <select class="form-control" id="fMerchant" style="flex:1;">
          <option value="">Tidak pakai</option>
          ${merchants.map((m) => `<option value="${m.id}" ${m.id === selectedMerchantId ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="quickMerchantOpen" style="flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><i data-lucide="plus" style="width:14px;height:14px;"></i></button>
      </div>`;
    refreshIcons();
    document.getElementById("quickMerchantOpen").onclick = () => { quickMerchantOpen = true; renderMerchantField(); };
  }

  function renderTransferDestinationOptions() {
    const current = state.transferDestination || (state.editTx && state.editTx.toSavingsId ? "savings" : "account");
    state.transferDestination = current;
    return `
      <option value="account" ${current === "account" ? "selected" : ""}>Dompet</option>
      <option value="savings" ${current === "savings" ? "selected" : ""}>Tabungan</option>`;
  }

  function renderTransferDestinationField() {
    const wrap = document.getElementById("transferDestinationWrap");
    const tx = state.editTx;
    const fromId = tx ? tx.fromAccountId : null;
    const toAccountId = tx ? tx.toAccountId : null;
    const toSavingsId = tx ? tx.toSavingsId : null;

    if (!wrap) return;
    if (state.transferDestination === "account") {
      wrap.innerHTML = `
        <label>Ke Dompet</label>
        <select class="form-control" id="fToAccount">${accountOptions(toAccountId)}</select>`;
    } else {
      if (state.savingsTargets.length === 0) {
        wrap.innerHTML = `
          <label>Ke Tabungan</label>
          ${emptyStateHtml("piggy-bank", "Belum ada target tabungan.", "Buat target tabungan terlebih dahulu.", `<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"openSavingsMgmtBtn\">Buat Tabungan</button>`)} `;
        const btn = document.getElementById("openSavingsMgmtBtn");
        if (btn) btn.addEventListener("click", () => {
          if (typeof SettingView === "undefined") {
            loadScript("js/views/setting.js").then(() => SettingView.openSavingsModal(state.username)).catch(() => Toast.error("Gagal membuka pengaturan tabungan."));
          } else {
            SettingView.openSavingsModal(state.username);
          }
        });
        return;
      }
      wrap.innerHTML = `
        <label>Pilih Tabungan</label>
        <select class="form-control" id="fToSavings">${savingsTargetOptions(toSavingsId)}</select>`;
    }
    const destinationSelect = document.getElementById("fTransferDestination");
    if (destinationSelect) {
      destinationSelect.addEventListener("change", (e) => {
        state.transferDestination = e.target.value;
        renderDynamicFields();
      });
    }
  }

  function savingsTargetOptions(selectedId) {
    return state.savingsTargets.map((s) => `<option value="${s.id}" ${s.id === selectedId ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("");
  }

  function renderCategoryField(catWrap, selectedOverride) {
    const tx = state.editTx;
    const cats = state.categories[state.type] || [];
    const selectedId = selectedOverride || (tx ? tx.categoryId : (cats[0] ? cats[0].id : null));

    if (quickAddOpen) {
      catWrap.innerHTML = `
        <div class="form-group">
          <label>Kategori Baru (${state.type === "income" ? "Pemasukan" : "Pengeluaran"})</label>
          <input type="text" class="form-control mb" id="quickCatName" placeholder="Contoh: Investasi">
          <label>Pilih Emoji</label>
          ${emojiPickerHtml("quickCat", "")}
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-outline btn-sm" id="quickCatCancel" style="flex:1;">Batal</button>
            <button type="button" class="btn btn-primary btn-sm" id="quickCatSave" style="flex:1;">Simpan Kategori</button>
          </div>
        </div>`;
      refreshIcons();
      let quickEmoji = "";
      wireEmojiPicker(catWrap, "quickCat", "", (v) => { quickEmoji = v; });
      document.getElementById("quickCatCancel").onclick = () => { quickAddOpen = false; renderCategoryField(catWrap); };
      document.getElementById("quickCatSave").onclick = () => {
        const name = document.getElementById("quickCatName").value.trim();
        if (!name) return Toast.error("Nama kategori wajib diisi.");
        const newCat = { id: generateId("cat"), name, emoji: quickEmoji || "🏷️" };
        DataStore.addCategory(state.username, state.type, newCat).then(() => {
          state.categories[state.type].push(newCat);
          quickAddOpen = false;
          renderCategoryField(catWrap, newCat.id);
          Toast.success("Kategori berhasil ditambahkan.");
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan kategori. Coba lagi.");
        });
      };
      return;
    }

    if (cats.length === 0) {
      catWrap.innerHTML = `
        <div class="form-group">
          <label>Kategori</label>
          ${emptyStateHtml("tag", "Belum ada kategori.", `Buat kategori ${state.type === "income" ? "pemasukan" : "pengeluaran"} pertamamu.`, `<button type="button" class="btn btn-primary btn-sm" id="quickCatOpen">Tambah Kategori</button>`)}
        </div>`;
      refreshIcons();
      document.getElementById("quickCatOpen").onclick = () => { quickAddOpen = true; renderCategoryField(catWrap); };
      return;
    }

    catWrap.innerHTML = `
      <div class="form-group">
        <label>Kategori</label>
        <div class="select-tiles" id="categoryTiles">
          ${cats.map((c) => `<button type="button" class="select-tile clickable ${c.id === selectedId ? "active" : ""}" data-cat="${c.id}"><span class="emo">${c.emoji}</span>${escapeHtml(c.name)}</button>`).join("")}
          <button type="button" class="select-tile clickable" id="quickCatOpen"><i data-lucide="plus"></i>Baru</button>
        </div>
        <input type="hidden" id="fCategory" value="${selectedId || ""}">
      </div>
      <div class="form-group" id="subcategoryFieldWrap"></div>
      <div class="form-group" id="attachmentFieldWrap"></div>`;
    refreshIcons();
    document.querySelectorAll("#categoryTiles .select-tile[data-cat]").forEach((tile) => {
      tile.onclick = () => {
        document.querySelectorAll("#categoryTiles .select-tile").forEach((t) => t.classList.remove("active"));
        tile.classList.add("active");
        document.getElementById("fCategory").value = tile.dataset.cat;
        renderSubcategoryField(catWrap);
      };
    });
    document.getElementById("quickCatOpen").onclick = () => { quickAddOpen = true; renderCategoryField(catWrap); };
    renderSubcategoryField(catWrap);
    renderAttachmentField(catWrap);
  }

  function renderSubcategoryField(catWrap, selectedOverride) {
    const wrap = catWrap.querySelector("#subcategoryFieldWrap");
    if (!wrap) return;
    const selectedCategoryId = document.getElementById("fCategory")?.value;
    const tx = state.editTx;
    if (!selectedCategoryId || state.type === "transfer") {
      wrap.innerHTML = "";
      return;
    }
    const subcats = state.subcategories[selectedCategoryId] || [];
    const currentValue = selectedOverride || (tx ? (tx.subcategoryId || tx.subcategoryName || "") : "");
    if (quickSubcatOpen) {
      wrap.innerHTML = `
        <label>Subkategori (Opsional)</label>
        <input type="text" class="form-control mb" id="quickSubcatName" placeholder="Contoh: Valorant">
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-outline btn-sm" id="quickSubcatCancel" style="flex:1;">Batal</button>
          <button type="button" class="btn btn-primary btn-sm" id="quickSubcatSave" style="flex:1;">Simpan</button>
        </div>`;
      document.getElementById("quickSubcatCancel").onclick = () => { quickSubcatOpen = false; renderSubcategoryField(catWrap); };
      document.getElementById("quickSubcatSave").onclick = () => {
        const name = document.getElementById("quickSubcatName").value.trim();
        if (!name) return Toast.error("Nama subkategori wajib diisi.");
        const newSubcat = { id: generateId("subcat"), name };
        DataStore.addSubcategory(state.username, selectedCategoryId, newSubcat).then(() => {
          state.subcategories[selectedCategoryId] = state.subcategories[selectedCategoryId] || [];
          state.subcategories[selectedCategoryId].push(newSubcat);
          quickSubcatOpen = false;
          renderSubcategoryField(catWrap, newSubcat.id);
          Toast.success("Subkategori ditambahkan.");
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan subkategori. Coba lagi.");
        });
      };
      return;
    }
    if (subcats.length === 0) {
      wrap.innerHTML = `
        <label>Subkategori (Opsional)</label>
        <div class="attachment-actions">
          <button type="button" class="btn btn-outline btn-sm" id="quickSubcatOpen">+ Tambah Subkategori</button>
        </div>`;
      document.getElementById("quickSubcatOpen").onclick = () => { quickSubcatOpen = true; renderSubcategoryField(catWrap); };
      return;
    }
    wrap.innerHTML = `
      <label>Subkategori (Opsional)</label>
      <select class="form-control" id="fSubcategory">
        <option value="">Tidak pakai</option>
        ${subcats.map((s) => `<option value="${s.id}" ${currentValue === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("")}
      </select>
      <div class="attachment-actions" style="margin-top:8px;"><button type="button" class="btn btn-outline btn-sm" id="quickSubcatOpen">+ Tambah Subkategori</button></div>`;
    document.getElementById("quickSubcatOpen").onclick = () => { quickSubcatOpen = true; renderSubcategoryField(catWrap); };
  }

  // Resize (max dimension 800px) + compress lampiran foto transaksi sebagai JPEG,
  // supaya base64-nya tidak melebihi batas ukuran dokumen Firestore (1MB).
  function compressAttachmentImage(file) {
    return new Promise((resolve, reject) => {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        reject(new Error("File terlalu besar. Maksimal 5MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.3));
        };
        img.onerror = () => reject(new Error("Gagal memuat foto."));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Gagal membaca foto."));
      reader.readAsDataURL(file);
    });
  }

  function renderAttachmentField(catWrap) {
    const wrap = catWrap.querySelector("#attachmentFieldWrap");
    if (!wrap) return;
    const tx = state.editTx;
    const existingHidden = wrap.querySelector("#fAttachmentData");
    let attachmentData = existingHidden ? (existingHidden.value || "") : "";
    let attachmentFileName = existingHidden ? (existingHidden.dataset.name || "") : "";

    if (tx && tx.attachment) {
      attachmentData = tx.attachment;
      attachmentFileName = tx.attachmentName || attachmentFileName || "Lampiran";
    }

    const renderPreview = () => {
      const previewHtml = attachmentData
        ? `<div class="attachment-preview"><img src="${attachmentData}" alt="attachment"><div><div class="acc-name">${escapeHtml(attachmentFileName || "Lampiran")}</div><div class="acc-type">${attachmentFileName ? "Siap disimpan" : "Tersimpan"}</div></div></div>`
        : "";
      wrap.querySelector(".attachment-box").innerHTML = `
        ${previewHtml}
        <div class="attachment-actions">
          <label class="btn btn-outline btn-sm" for="fAttachment" style="cursor:pointer;">${attachmentData ? "📷 Ganti Foto" : "📷 Kamera / Galeri"}</label>
          <input type="file" id="fAttachment" accept="image/*" style="display:none;">
          <button type="button" class="btn btn-outline btn-sm" id="fAttachmentRemove" ${attachmentData ? "" : "disabled"}>Hapus</button>
        </div>`;

      const input = wrap.querySelector("#fAttachment");
      const removeBtn = wrap.querySelector("#fAttachmentRemove");
      const syncAttachment = (data, name) => {
        attachmentData = data || "";
        attachmentFileName = name || "";
        const hidden = wrap.querySelector("#fAttachmentData");
        if (hidden) {
          hidden.value = attachmentData;
          hidden.dataset.name = attachmentFileName;
        }
      };
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const nextName = file.name;
        compressAttachmentImage(file)
          .then((dataUrl) => {
            syncAttachment(dataUrl, nextName);
            renderPreview();
          })
          .catch((err) => {
            Toast.error(err.message || "Gagal memproses foto. Coba lagi.");
          });
      });
      removeBtn.addEventListener("click", () => {
        syncAttachment("", "");
        renderPreview();
      });
    };

    wrap.innerHTML = `
      <label>Lampiran Foto (Opsional)</label>
      <div class="attachment-box"></div>`;

    const hiddenAttachment = document.createElement("input");
    hiddenAttachment.type = "hidden";
    hiddenAttachment.id = "fAttachmentData";
    hiddenAttachment.value = attachmentData;
    hiddenAttachment.dataset.name = attachmentFileName;
    wrap.appendChild(hiddenAttachment);

    renderPreview();
  }

  function accountOptions(selectedId) {
    return state.accounts.map((a) => `<option value="${a.id}" ${a.id === selectedId ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("");
  }

  function save(onSaved) {
    const saveBtn = document.getElementById("txSaveBtn");
    const fDate = document.getElementById("fDate");
    const fAmount = document.getElementById("fAmount");
    const fNote = document.getElementById("fNote");
    if (!fDate || !fAmount || !fNote) return Toast.error("Form belum siap.");
    const date = fDate.value;
    const amount = parseFloat(fAmount.value);
    const note = fNote.value.trim();

    if (!date) return Toast.error("Tanggal wajib diisi.");
    if (isNaN(amount) || amount <= 0) return Toast.error("Jumlah harus lebih dari 0 dan valid.");

    let payload = { date, amount, note, type: state.type };

    if (state.type === "transfer") {
      const fromEl = document.getElementById("fFromAccount");
      const destEl = document.getElementById("fTransferDestination");
      if (!fromEl || !destEl) return Toast.error("Form belum siap.");
      const from = fromEl.value;
      const destination = destEl.value;
      if (!from) return Toast.error("Pilih akun asal.");
      payload.fromAccountId = from;
      if (destination === "account") {
        const toEl = document.getElementById("fToAccount");
        if (!toEl) return Toast.error("Form belum siap.");
        const to = toEl.value;
        if (!to) return Toast.error("Pilih akun tujuan.");
        if (from === to) return Toast.error("Akun asal dan tujuan tidak boleh sama.");
        payload.toAccountId = to;
        payload.toSavingsId = "";
        payload.toSavingsName = "";
        payload.toSavingsIcon = "";
      } else {
        const savingsId = document.getElementById("fToSavings") ? document.getElementById("fToSavings").value : "";
        if (!savingsId) return Toast.error("Pilih tabungan tujuan.");
        const savings = state.savingsTargets.find((s) => s.id === savingsId);
        payload.toAccountId = "";
        payload.toSavingsId = savingsId;
        payload.toSavingsName = savings ? savings.name : "Tabungan";
        payload.toSavingsIcon = savings ? savings.icon : "🎯";
      }
    } else {
      const accSel = document.getElementById("fAccount");
      if (!accSel || !accSel.value) return Toast.error("Pilih akun terlebih dahulu.");
      payload.accountId = accSel.value;
      payload.toAccountId = "";
      payload.toSavingsId = "";
      payload.toSavingsName = "";
      payload.toSavingsIcon = "";
      const catId = document.getElementById("fCategory") ? document.getElementById("fCategory").value : "";
      if (!catId) return Toast.error("Pilih kategori terlebih dahulu.");
      const cat = (state.categories[state.type] || []).find((c) => c.id === catId);
      const subcatId = document.getElementById("fSubcategory") ? document.getElementById("fSubcategory").value : "";
      const subcatName = subcatId ? ((state.subcategories[catId] || []).find((s) => s.id === subcatId) || {}).name || "" : "";
      const attachmentHidden = document.getElementById("fAttachmentData");
      payload.categoryId = catId;
      payload.categoryName = cat ? cat.name : "";
      payload.categoryEmoji = cat ? cat.emoji : "🏷️";
      payload.subcategoryId = subcatId || "";
      payload.subcategoryName = subcatName || "";
      const merchantEl = document.getElementById("fMerchant");
      const merchantId = merchantEl ? merchantEl.value : "";
      const merchant = merchantId ? (state.merchants || []).find((m) => m.id === merchantId) : null;
      payload.merchantId = merchantId || "";
      payload.merchantName = merchant ? merchant.name : "";
      const rawAttachment = attachmentHidden ? attachmentHidden.value : "";
      const rawFileName = attachmentHidden ? (attachmentHidden.dataset.name || "") : "";
      payload.attachmentName = rawFileName;
      payload.attachment = rawAttachment;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';

    const action = state.editTx
      ? DataStore.updateTransaction(state.username, state.editTx.id, payload)
      : DataStore.addTransaction(state.username, payload);

    action
      .then(() => {
        Toast.success(state.editTx ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.");
        Modal.close(() => {
          onSaved && onSaved();
        });
      })
      .catch((err) => {
        console.error("[TransactionModal] save error:", err);
        saveBtn.disabled = false;
        saveBtn.innerHTML = state.editTx ? "Simpan Perubahan" : "Simpan Transaksi";
        Toast.error("Gagal menyimpan transaksi. Coba lagi.");
      });
  }

  function confirmDelete(username, tx, onDeleted) {
    if (!tx) {
      Toast.error("Transaksi tidak ditemukan.");
      return Promise.resolve();
    }
    const txId = tx.id;
    return DataStore.deleteTransaction(username, txId).then(() => {
      onDeleted && onDeleted();
      const stack = document.getElementById("toastStack");
      if (!stack) return;
      const el = document.createElement("div");
      el.className = "toast info";
      el.style.display = "flex"; el.style.alignItems = "center";
      el.innerHTML = `<div class="toast-icon"><i data-lucide="trash-2"></i></div><div class="toast-msg">Transaksi dihapus.</div><button class="toast-undo-btn">Batalkan</button>`;
      stack.appendChild(el);
      refreshIcons();
      let undone = false;
      el.querySelector(".toast-undo-btn").addEventListener("click", () => {
        if (undone) return;
        undone = true;
        const restored = { ...tx };
        DataStore.addTransaction(username, restored).then(() => {
          el.classList.add("hide");
          setTimeout(() => el.remove(), 240);
          Toast.success("Penghapusan dibatalkan.");
          onDeleted && onDeleted();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal membatalkan penghapusan. Coba lagi.");
        });
      });
      setTimeout(() => { if (!undone) { el.classList.add("hide"); setTimeout(() => el.remove(), 240); } }, 5000);
    }).catch((err) => {
      console.error("[TxModal] delete error:", err);
      Toast.error("Gagal menghapus transaksi.");
    });
  }

  return { open, confirmDelete };
})();

