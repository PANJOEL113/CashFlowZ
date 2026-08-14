const SettingView = (function () {
  let accountsCache = [];
  let categoriesCache = { income: [], expense: [] };
  let savingsTargetsCache = [];
  let merchantsCache = [];
  let catMgmtType = "income";

  // Called from the Profile popup's "Kelola Data" section.
  function openAccountManager(username) {
    renderAccountMgmtList(username, () => renderRoute());
  }
  function openCategoryManager(username, type) {
    catMgmtType = type || "income";
    renderCategoryMgmtList(username, () => renderRoute());
  }

  function openSavingsModal(username) {
    renderSavingsMgmtList(username, () => renderRoute());
  }

  function openMerchantManager(username) {
    renderMerchantMgmtList(username, () => renderRoute());
  }

  function renderSavingsMgmtList(username, onClose) {
    DataStore.getSavingsTargets(username).then((targets) => {
      savingsTargetsCache = targets || [];
      const rows = savingsTargetsCache.length
        ? savingsTargetsCache.map((s) => `
          <div class="cat-card" data-id="${s.id}">
            <span class="cat-card-emoji">${s.icon || "🎯"}</span>
            <span class="cat-card-name">${escapeHtml(s.name)}</span>
            <span class="cat-card-sub">${s.targetAmount > 0 ? formatRupiah(s.targetAmount) : "Bebas"}${s.currentAmount ? " · sudah " + formatRupiah(s.currentAmount) : ""}</span>
            <span class="cat-card-arrow"><i data-lucide="chevron-right"></i></span>
          </div>`).join("")
        : `<p class="acc-mgmt-empty">Belum ada target tabungan. Klik Tambah untuk membuat target pertamamu.</p>`;

      Modal.open(`
        <div class="modal-head"><h3>Tabungan</h3><button class="modal-close" id="savingsMgmtClose"><i data-lucide="x"></i></button></div>
        <div class="modal-body">
          <div class="acc-mgmt-toolbar" style="margin-top:10px;">
            <button class="btn btn-outline btn-sm" id="savingsAddBtn" type="button"><i data-lucide="plus"></i> Tambah</button>
          </div>
          <div class="cat-card-list" id="savingsMgmtList">${rows}</div>
        </div>`);

      document.getElementById("savingsMgmtClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("savingsAddBtn").onclick = () => renderSavingsForm(username, null, onClose);

      document.querySelectorAll("#savingsMgmtList .cat-card").forEach((card) => {
        card.addEventListener("click", () => {
          const s = savingsTargetsCache.find((x) => x.id === card.dataset.id);
          if (!s) return;
          showSavingsDetail(s, username, onClose);
        });
      });
      refreshIcons();
    }).catch((err) => {
      console.error("[Setting] load savings error:", err);
      Toast.error("Gagal memuat data tabungan.");
    });
  }

  function renderSavingsForm(username, editTarget, onClose) {
    const isEdit = !!editTarget;
    let chosenIcon = isEdit ? editTarget.icon : "🎯";
    let chosenColor = isEdit ? (editTarget.color || "#d89a3d") : "#d89a3d";

    Modal.open(`
      <div class="modal-head"><h3>${isEdit ? "Edit Tabungan" : "Tambah Tabungan"}</h3><button class="modal-close" id="savingsFormClose"><i data-lucide="x"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label>Nama Tabungan</label><input type="text" class="form-control" id="savFormName" value="${isEdit ? escapeHtml(editTarget.name) : ""}" placeholder="Contoh: Laptop Gaming"></div>
        <div class="form-group"><label>Target Nominal (Rp)</label><input type="number" min="0" class="form-control" id="savFormTarget" value="${isEdit ? (editTarget.targetAmount || "") : ""}" placeholder="Contoh: 10000000"></div>
        <div class="form-group"><label>Sudah Terkumpul (Rp)</label><input type="number" min="0" class="form-control" id="savFormCurrent" value="${isEdit ? (editTarget.currentAmount || "") : ""}" placeholder="Contoh: 500000"></div>
        <div class="form-row">
          <div class="form-group"><label>Tanggal Target (Opsional)</label><input type="date" class="form-control" id="savFormDueDate" value="${isEdit ? (editTarget.dueDate || "") : ""}"></div>
          <div class="form-group"><label>Warna (Opsional)</label><input type="color" class="form-control" id="savFormColor" value="${chosenColor}"></div>
        </div>
        <div class="form-group"><label>Ikon (Opsional)</label>${emojiPickerHtml("savFormIcon", chosenIcon)}</div>
        <div class="form-group"><label>Catatan (Opsional)</label><textarea class="form-control" id="savFormNote" rows="2" placeholder="Contoh: Dana liburan akhir tahun">${isEdit ? escapeHtml(editTarget.note || "") : ""}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="savFormBack" type="button">Kembali</button>
        <button class="btn btn-primary" id="savFormSave" type="button">${isEdit ? "Simpan" : "Tambah"}</button>
      </div>`);
    refreshIcons();
    wireEmojiPicker(document.getElementById("modalBox"), "savFormIcon", chosenIcon, (v) => { chosenIcon = v; });

    document.getElementById("savingsFormClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
    document.getElementById("savFormBack").onclick = () => renderSavingsMgmtList(username, onClose);
    document.getElementById("savFormSave").onclick = () => {
      const saveBtn = document.getElementById("savFormSave");
      const name = document.getElementById("savFormName").value.trim();
      const targetAmount = parseFloat(document.getElementById("savFormTarget").value) || 0;
      const currentAmount = parseFloat(document.getElementById("savFormCurrent").value) || 0;
      const dueDate = document.getElementById("savFormDueDate").value;
      const color = document.getElementById("savFormColor").value;
      const note = document.getElementById("savFormNote").value.trim();
      if (!name) return Toast.error("Nama tabungan wajib diisi.");
      const payload = { name, targetAmount: targetAmount > 0 ? targetAmount : 0, currentAmount, dueDate: dueDate || "", color, icon: chosenIcon || "🎯", note };
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';
      if (isEdit) {
        DataStore.updateSavingsTarget(username, editTarget.id, payload).then(() => {
          Toast.success("Target tabungan berhasil diperbarui.");
          renderSavingsMgmtList(username, onClose);
          renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Simpan";
        });
      } else {
        DataStore.addSavingsTarget(username, { id: generateId("sav"), ...payload }).then(() => {
          Toast.success("Target tabungan berhasil ditambahkan.");
          renderSavingsMgmtList(username, onClose);
          renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Tambah";
        });
      }
    };
  }

  async function openExportModal(username) {
    try {
      const [txs, accs, cats] = await Promise.all([
        DataStore.getTransactions(username),
        DataStore.getAccounts(username),
        DataStore.getCategories(username),
      ]);
      const accounts = [...accs];
      const categories = [...(cats.income || []), ...(cats.expense || [])];
          Modal.open(`
            <div class="modal-head"><h3>Ekspor Data</h3><button class="modal-close" id="exportClose"><i data-lucide="x"></i></button></div>
            <div class="modal-body">
              <div class="form-group"><label>Rentang Tanggal</label><div class="form-row"><div><input type="date" class="form-control" id="exportStart"></div><div><input type="date" class="form-control" id="exportEnd"></div></div></div>
              <div class="form-row">
                <div class="form-group"><label>Dompet</label><select class="form-control" id="exportAccount"><option value="all">Semua Dompet</option>${accounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("")}</select></div>
                <div class="form-group"><label>Kategori</label><select class="form-control" id="exportCategory"><option value="all">Semua Kategori</option>${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}</select></div>
              </div>
              <div class="form-group"><label>Jenis Transaksi</label><select class="form-control" id="exportType"><option value="all">Semua</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="transfer">Transfer</option></select></div>
            </div>
            <div class="modal-foot" style="flex-wrap:wrap;gap:6px;">
              <button class="btn btn-outline" id="exportCancel" type="button">Batal</button>
              <button class="btn btn-outline" id="exportBackupBtn" type="button"><i data-lucide="download"></i> Backup JSON</button>
              <button class="btn btn-outline" id="exportImportBtn" type="button"><i data-lucide="upload"></i> Impor</button>
              <button class="btn btn-outline" id="exportPdfBtn" type="button"><i data-lucide="file-text"></i> Ekspor PDF</button>
              <button class="btn btn-primary" id="exportCsv" type="button">Ekspor CSV</button>
            </div>`, { small: true });
          refreshIcons();
          document.getElementById("exportClose").onclick = Modal.close;
          document.getElementById("exportCancel").onclick = Modal.close;

          document.getElementById("exportBackupBtn").onclick = () => {
            DataStore.getAll(username).then((data) => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `cashflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
              link.click();
              URL.revokeObjectURL(link.href);
              Toast.success("Backup JSON berhasil diunduh.");
            }).catch((err) => {
              console.error("[Setting] backup error:", err);
              Toast.error("Gagal mengambil data backup.");
            });
          };

          document.getElementById("exportImportBtn").onclick = () => {
            const input = document.createElement("input");
            input.type = "file"; input.accept = ".json"; input.style.display = "none";
            input.onchange = () => {
              const file = input.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const data = JSON.parse(reader.result);
                  if (!data.transactions || !data.categories) { Toast.error("Format backup tidak valid."); return; }
                  if (data.profile && data.profile.email) {
                    const pEmail = data.profile.email.toLowerCase();
                    const uName = username.toLowerCase();
                    if (!pEmail.includes(uName) && !uName.includes(pEmail)) {
                      if (!confirm("Email di file backup tidak cocok dengan akun saat ini. Tetap pulihkan?")) return;
                    }
                  }
                  DataStore.restoreAll(username, data).then(() => {
                    Toast.success("Data dipulihkan! Memuat ulang...");
                    Modal.close();
                    setTimeout(() => location.reload(), 1000);
                  }).catch(() => Toast.error("Gagal memulihkan data ke server."));
                } catch { Toast.error("File backup tidak valid atau rusak."); }
              };
              reader.readAsText(file);
              try { document.body.removeChild(input); } catch (e) {}
            };
            document.body.appendChild(input);
            input.click();
          };

          document.getElementById("exportCsv").onclick = () => {
            const start = document.getElementById("exportStart").value;
            const end = document.getElementById("exportEnd").value;
            const account = document.getElementById("exportAccount").value;
            const category = document.getElementById("exportCategory").value;
            const type = document.getElementById("exportType").value;
            const filtered = txs.filter((t) => {
              if (start && t.date < start) return false;
              if (end && t.date > end) return false;
              if (type !== "all" && t.type !== type) return false;
              if (account !== "all" && !(t.accountId === account || t.fromAccountId === account || t.toAccountId === account)) return false;
              if (category !== "all" && t.categoryId !== category) return false;
              return true;
            });
            const rows = ["date,type,category,subcategory,account,amount,note"];
            function escapeCSV(str) {
              if (str == null) return '';
              const s = String(str).replace(/"/g, '""');
              return /[,"\n\r]/.test(s) ? `"${s}"` : s;
            }
            filtered.forEach((t) => {
              rows.push([escapeCSV(t.date), escapeCSV(t.type), escapeCSV(t.categoryName), escapeCSV(t.subcategoryName), escapeCSV(t.accountId || t.fromAccountId || t.toAccountId), t.amount, escapeCSV(t.note)].join(","));
            });
            const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "rekap-keuangan.csv";
            link.click();
            URL.revokeObjectURL(link.href);
            Toast.success("File CSV siap diunduh.");
            Modal.close();
          };

          document.getElementById("exportPdfBtn").onclick = () => {
            const w = window.open("", "_blank");
            if (!w) { Toast.error("Izinkan pop-up untuk melihat pratinjau laporan."); return; }
            Toast.info("Menyiapkan laporan...");
            DataStore.getSavingsTargets(username).then((savingsTargets) => {
              exportPDF(w, username, txs, accounts, categories, savingsTargets || []);
            }).catch(() => {
              exportPDF(w, username, txs, accounts, categories, []);
            }).catch((err) => {
              console.error("[Export] PDF error:", err);
              Toast.error("Gagal membuat PDF. Coba lagi.");
              w.close();
            });
          };
    } catch (err) {
      console.error("[Setting] load export data error:", err);
      Toast.error("Gagal memuat data ekspor.");
    }
  }

  // ================= Account management modal =================
  function renderAccountMgmtList(username, onClose) {
    Promise.all([DataStore.getAccounts(username), DataStore.getTransactions(username), DataStore.getAccountUsage(username)]).then(([accounts, allTx, accUsage]) => {
      accountsCache = accounts;
      const sorted = [...accounts].sort((a, b) => (accUsage[b.id] || 0) - (accUsage[a.id] || 0));
      const rows = sorted.length
        ? sorted.map((a) => `
          <div class="cat-card" data-id="${a.id}">
            ${accountLogoMarkup(a, 28)}
            <span class="cat-card-name">${escapeHtml(a.name)}</span>
            <span class="cat-card-sub">${formatRupiah(DataStore.computeAccountBalance(allTx, a))}</span>
            <span class="cat-card-arrow"><i data-lucide="chevron-right"></i></span>
          </div>`).join("")
        : `<p class="acc-mgmt-empty">Belum ada akun. Klik Tambah untuk membuat akun pertamamu.</p>`;

      Modal.open(`
        <div class="modal-head"><h3>Manajemen Akun Saldo</h3><button class="modal-close" id="accMgmtClose"><i data-lucide="x"></i></button></div>
        <div class="modal-body">
          <div class="acc-mgmt-toolbar" style="margin-top:10px;">
            <button class="btn btn-outline btn-sm" id="mgmtAddBtn" type="button"><i data-lucide="plus"></i> Tambah</button>
          </div>
          <div class="cat-card-list" id="mgmtList">${rows}</div>
        </div>`);

      document.getElementById("accMgmtClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("mgmtAddBtn").onclick = () => renderAccountForm(username, null, onClose);

      document.querySelectorAll("#mgmtList .cat-card").forEach((card) => {
        card.addEventListener("click", () => {
          const a = accountsCache.find((x) => x.id === card.dataset.id);
          if (!a) return;
          showAccountDetail(a, username, onClose);
        });
      });
      refreshIcons();
    }).catch((err) => {
      console.error("[Setting] load accounts error:", err);
      Toast.error("Gagal memuat data akun.");
    });
  }

  function renderAccountForm(username, editAcc, onClose) {
    const isEdit = !!editAcc;
    let chosenLogo = isEdit ? (editAcc.logo || null) : null;

    Modal.open(`
      <div class="modal-head"><h3>${isEdit ? "Edit Akun" : "Tambah Akun"}</h3><button class="modal-close" id="accFormClose"><i data-lucide="x"></i></button></div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nama Akun</label>
          <input type="text" class="form-control" id="accFormName" value="${isEdit ? escapeHtml(editAcc.name) : ""}" placeholder="Contoh: Bank Jago, Cash, OVO">
        </div>
        <div class="form-group">
          <label>Saldo Awal (Rp)</label>
          <input type="number" min="0" class="form-control" id="accFormInitialBalance" value="${isEdit ? (editAcc.initialBalance || 0) : 0}" placeholder="0">
          <div class="form-hint">Isi jika akun ini sudah punya saldo sebelum dicatat di aplikasi. Saldo akhir tetap dihitung otomatis dari saldo awal + transaksi terkait.</div>
        </div>
        <div class="form-group">
          <label>Upload Logo</label>
          <div class="logo-upload-zone" id="logoUploadZone">
            <div class="logo-preview" id="logoPreview">${chosenLogo ? `<img src="${chosenLogo}" alt="">` : `<i data-lucide="image-plus"></i>`}</div>
            <div>
              <div class="logo-upload-text">Klik untuk unggah gambar</div>
              <div class="logo-upload-sub">PNG / JPG, opsional</div>
            </div>
          </div>
          <input type="file" id="logoInput" accept="image/*" style="display:none;">
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="accFormBack" type="button">Kembali</button>
        <button class="btn btn-primary" id="accFormSave" type="button">${isEdit ? "Simpan" : "Tambah"}</button>
      </div>`);
    refreshIcons();

    document.getElementById("logoUploadZone").addEventListener("click", () => document.getElementById("logoInput").click());
    document.getElementById("logoInput").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const SIZE = 64;
          const canvas = document.createElement("canvas");
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          // crop to square from center then draw scaled
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
          // PNG preserves transparency (JPEG would fill transparent areas
          // with a solid background), so logos with a transparent
          // background stay transparent.
          chosenLogo = canvas.toDataURL("image/png");
          document.getElementById("logoPreview").innerHTML = `<img src="${chosenLogo}" alt="">`;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("accFormClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
    document.getElementById("accFormBack").onclick = () => renderAccountMgmtList(username, onClose);
    document.getElementById("accFormSave").onclick = () => {
      const saveBtn = document.getElementById("accFormSave");
      const name = document.getElementById("accFormName").value.trim();
      const initialBalance = parseFloat(document.getElementById("accFormInitialBalance").value) || 0;
      if (!name) return Toast.error("Nama akun wajib diisi.");

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';

      if (isEdit) {
        DataStore.updateAccount(username, editAcc.id, { name, logo: chosenLogo, initialBalance }).then(() => {
          Toast.success("Akun berhasil diperbarui."); renderAccountMgmtList(username, onClose); renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Simpan";
        });
      } else {
        DataStore.addAccount(username, { id: generateId("acc"), name, logo: chosenLogo, initialBalance }).then(() => {
          Toast.success("Akun berhasil ditambahkan."); renderAccountMgmtList(username, onClose); renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Tambah";
        });
      }
    };
  }

  // ================= Category management modal =================
  function renderCategoryMgmtList(username, onClose) {
    Promise.all([DataStore.getCategories(username), DataStore.getCategoryUsage(username)]).then(([cats, catUsage]) => {
      categoriesCache = cats;
      const list = (cats[catMgmtType] || []).sort((a, b) => (catUsage[b.id] || 0) - (catUsage[a.id] || 0));
      const rows = list.length
        ? list.map((c) => `
          <div class="cat-card" data-id="${c.id}" data-cat-id="${c.id}">
            <span class="cat-card-emoji">${c.emoji}</span>
            <span class="cat-card-name">${escapeHtml(c.name)}</span>
            <span class="cat-card-arrow"><i data-lucide="chevron-right"></i></span>
          </div>`).join("")
        : `<p class="acc-mgmt-empty">Belum ada kategori. Klik Tambah untuk membuat kategori pertamamu.</p>`;

      Modal.open(`
        <div class="modal-head"><h3>Manajemen Kategori</h3><button class="modal-close" id="catMgmtClose"><i data-lucide="x"></i></button></div>
        <div class="modal-body">
          <div class="type-switch" id="catMgmtTypeSwitch">
            <button type="button" data-type="income" class="${catMgmtType === "income" ? "active" : ""}">Pemasukan</button>
            <button type="button" data-type="expense" class="${catMgmtType === "expense" ? "active" : ""}">Pengeluaran</button>
          </div>
          <div class="acc-mgmt-toolbar" style="margin-top:10px;">
            <button class="btn btn-outline btn-sm" id="catAddBtn" type="button"><i data-lucide="plus"></i> Tambah</button>
          </div>
          <div class="cat-card-list" id="catMgmtList">${rows}</div>
        </div>`);

      document.getElementById("catMgmtClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.querySelectorAll("#catMgmtTypeSwitch button").forEach((btn) => {
        btn.onclick = () => { catMgmtType = btn.dataset.type; renderCategoryMgmtList(username, onClose); };
      });
      document.getElementById("catAddBtn").onclick = () => renderCategoryForm(username, null, onClose);

      document.querySelectorAll(".cat-card").forEach((card) => {
        card.addEventListener("click", () => {
          const cat = list.find((c) => c.id === card.dataset.catId);
          if (!cat) return;
          showCategoryDetail(cat, username, onClose);
        });
      });

      refreshIcons();
    }).catch((err) => {
      console.error("[Setting] load categories error:", err);
      Toast.error("Gagal memuat data kategori.");
    });
  }

  function showCategoryDetail(cat, username, onClose) {
    function render() {
      DataStore.getSubcategories(username).then((allSubs) => {
        const subs = (allSubs[cat.id] || []).sort((a, b) => a.name.localeCompare(b.name));
        const subRows = subs.length
          ? subs.map((s) => `<div class="cat-sub-row">
            <span class="cat-sub-bullet"></span>
            <span>${escapeHtml(s.name)}</span>
            <div class="cat-sub-actions">
              <button type="button" class="cat-sub-edit" data-sub-id="${s.id}" title="Edit subkategori"><i data-lucide="pencil"></i></button>
              <button type="button" class="cat-sub-del" data-sub-id="${s.id}" title="Hapus subkategori"><i data-lucide="x"></i></button>
            </div>
          </div>`).join("")
          : `<p class="cat-sub-empty">Belum ada subkategori.</p>`;

        const box = document.getElementById("modalBox");
        box.innerHTML = `
          <div class="modal-head">
            <button class="modal-back" id="catDetailBack" type="button"><i data-lucide="arrow-left"></i></button>
            <h3>${escapeHtml(cat.emoji + " " + cat.name)}</h3>
            <button class="modal-close" id="catDetailClose"><i data-lucide="x"></i></button>
          </div>
          <div class="modal-body">
            <div class="cat-sub-list">${subRows}</div>
            <div class="cat-detail-actions">
              <button class="btn btn-outline btn-sm" id="catDetailEdit" type="button"><i data-lucide="pencil"></i> Edit</button>
              <button class="btn btn-outline btn-sm" id="catDetailAddSub" type="button"><i data-lucide="plus-circle"></i> Subkategori</button>
              <button class="btn btn-outline btn-sm" id="catDetailDelete" type="button"><i data-lucide="trash-2"></i> Hapus</button>
            </div>
          </div>`;
        refreshIcons();

        document.querySelectorAll(".cat-sub-del").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const subId = btn.dataset.subId;
            const sub = subs.find((s) => s.id === subId);
            if (!sub) return;
            Modal.confirmDialog({
              title: 'Hapus subkategori "' + sub.name + '"?',
              message: "Transaksi yang menggunakan subkategori ini tidak akan terpengaruh.",
              confirmLabel: "Hapus",
              onConfirm: () => DataStore.deleteSubcategory(username, cat.id, subId).then(() => {
                Toast.success("Subkategori berhasil dihapus.");
                render();
              }).catch((err) => {
                console.error(err); Toast.error("Gagal menghapus subkategori. Coba lagi.");
              }),
            });
          });
        });

        document.querySelectorAll(".cat-sub-edit").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const subId = btn.dataset.subId;
            const sub = subs.find((s) => s.id === subId);
            if (!sub) return;
            showSubForm(sub);
          });
        });

        document.getElementById("catDetailBack").onclick = () => renderCategoryMgmtList(username, onClose);
        document.getElementById("catDetailClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
        document.getElementById("catDetailEdit").onclick = showEdit;
        document.getElementById("catDetailAddSub").onclick = showSubForm;
        document.getElementById("catDetailDelete").onclick = () => {
          Modal.confirmDialog({
            title: 'Hapus kategori "' + cat.name + '"?',
            message: "Transaksi yang menggunakan kategori ini tidak akan dihapus.",
            confirmLabel: "Hapus",
            onConfirm: () => DataStore.deleteCategories(username, catMgmtType, [cat.id]).then(() => {
              Toast.success("Kategori berhasil dihapus."); renderCategoryMgmtList(username, onClose);
            }).catch((err) => {
              console.error(err); Toast.error("Gagal menghapus kategori. Coba lagi.");
            }),
          });
        };
      }).catch((err) => {
        console.error("[Setting] load subcategories error:", err);
        Toast.error("Gagal memuat subkategori.");
      });
    }

    function showEdit() {
      let chosenEmoji = cat.emoji;
      const box = document.getElementById("modalBox");
      box.innerHTML = `
        <div class="modal-head">
          <button class="modal-back" id="catEditBack" type="button"><i data-lucide="arrow-left"></i></button>
          <h3>Edit Kategori</h3>
          <button class="modal-close" id="catEditClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nama Kategori</label>
            <input type="text" class="form-control" id="catFormName" value="${escapeHtml(cat.name)}" placeholder="Contoh: Makanan">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Pilih Emoji</label>
            ${emojiPickerHtml("catEditF", chosenEmoji)}
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="catEditCancel" type="button">Batal</button>
          <button class="btn btn-primary" id="catEditSave" type="button">Simpan</button>
        </div>`;
      refreshIcons();
      wireEmojiPicker(box, "catEditF", chosenEmoji, (v) => { chosenEmoji = v; });

      const closeAll = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("catEditBack").onclick = render;
      document.getElementById("catEditClose").onclick = closeAll;
      document.getElementById("catEditCancel").onclick = render;
      document.getElementById("catEditSave").onclick = () => {
        const name = document.getElementById("catFormName").value.trim();
        if (!name) return Toast.error("Nama kategori wajib diisi.");
        const list = categoriesCache[catMgmtType] || [];
        const clash = list.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== cat.id);
        if (clash) return Toast.error("Kategori dengan nama tersebut sudah ada.");
        DataStore.updateCategory(username, catMgmtType, cat.id, { name, emoji: chosenEmoji }).then(() => {
          cat.name = name; cat.emoji = chosenEmoji;
          Toast.success("Kategori berhasil diperbarui.");
          render();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan kategori. Coba lagi.");
        });
      };
      setTimeout(() => document.getElementById("catFormName").focus(), 100);
    }

    function showSubForm(editSub) {
      const isEdit = !!editSub;
      const box = document.getElementById("modalBox");
      box.innerHTML = `
        <div class="modal-head">
          <button class="modal-back" id="subcatBack" type="button"><i data-lucide="arrow-left"></i></button>
          <h3>${isEdit ? "Edit Subkategori" : "Tambah Subkategori"}</h3>
          <button class="modal-close" id="subcatClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:14px;">Untuk kategori: <strong>${escapeHtml(cat.emoji + " " + cat.name)}</strong></p>
          <div class="form-group" style="margin-bottom:0;">
            <label>Nama Subkategori</label>
            <input type="text" class="form-control" id="subcatFormName" value="${isEdit ? escapeHtml(editSub.name) : ""}" placeholder="Contoh: Makan Siang">
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="subcatCancel" type="button">Batal</button>
          <button class="btn btn-primary" id="subcatSave" type="button">${isEdit ? "Simpan" : "Tambah"}</button>
        </div>`;
      refreshIcons();

      document.getElementById("subcatBack").onclick = render;
      document.getElementById("subcatClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("subcatCancel").onclick = render;
      document.getElementById("subcatSave").onclick = () => {
        const name = document.getElementById("subcatFormName").value.trim();
        if (!name) return Toast.error("Nama subkategori wajib diisi.");
        const promise = isEdit
          ? DataStore.updateSubcategory(username, cat.id, editSub.id, { name })
          : DataStore.addSubcategory(username, cat.id, { id: generateId("subcat"), name });
        promise.then(() => {
          Toast.success(isEdit ? "Subkategori berhasil diperbarui." : "Subkategori berhasil ditambahkan.");
          render();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan subkategori. Coba lagi.");
        });
      };
      setTimeout(() => document.getElementById("subcatFormName").focus(), 100);
    }

    render();
  }

  function renderCategoryForm(username, editCat, onClose) {
    const isEdit = !!editCat;
    let chosenEmoji = isEdit ? editCat.emoji : "🏷️";

    Modal.open(`
      <div class="modal-head"><h3>${isEdit ? "Edit Kategori" : "Tambah Kategori"}</h3><button class="modal-close" id="catFormClose"><i data-lucide="x"></i></button></div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nama Kategori (${catMgmtType === "income" ? "Pemasukan" : "Pengeluaran"})</label>
          <input type="text" class="form-control" id="catFormName" value="${isEdit ? escapeHtml(editCat.name) : ""}" placeholder="Contoh: Investasi">
        </div>
        <div class="form-group">
          <label>Pilih Emoji</label>
          ${emojiPickerHtml("catForm", chosenEmoji)}
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="catFormBack" type="button">Kembali</button>
        <button class="btn btn-primary" id="catFormSave" type="button">${isEdit ? "Simpan" : "Tambah"}</button>
      </div>`);
    refreshIcons();

    wireEmojiPicker(document.getElementById("modalBox"), "catForm", chosenEmoji, (v) => { chosenEmoji = v; });

    document.getElementById("catFormClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
    document.getElementById("catFormBack").onclick = () => renderCategoryMgmtList(username, onClose);
    document.getElementById("catFormSave").onclick = () => {
      const saveBtn = document.getElementById("catFormSave");
      const name = document.getElementById("catFormName").value.trim();
      if (!name) return Toast.error("Nama kategori wajib diisi.");
      const list = categoriesCache[catMgmtType] || [];
      const clash = list.some((c) => c.name.toLowerCase() === name.toLowerCase() && (!isEdit || c.id !== editCat.id));
      if (clash) return Toast.error("Kategori dengan nama tersebut sudah ada.");
      const emoji = chosenEmoji || "🏷️";

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';

      if (isEdit) {
        DataStore.updateCategory(username, catMgmtType, editCat.id, { name, emoji }).then(() => {
          Toast.success("Kategori berhasil diperbarui."); renderCategoryMgmtList(username, onClose); renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Simpan";
        });
      } else {
        DataStore.addCategory(username, catMgmtType, { id: generateId("cat"), name, emoji }).then(() => {
          Toast.success("Kategori berhasil ditambahkan."); renderCategoryMgmtList(username, onClose); renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Tambah";
        });
      }
    };
  }

  // ================= Account detail popup (backable) =================
  function showAccountDetail(acc, username, onClose) {
    Promise.all([DataStore.getAccounts(username), DataStore.getTransactions(username)]).then(([accounts, allTx]) => {
      const balance = DataStore.computeAccountBalance(allTx, acc);

      function render() {
        const box = document.getElementById("modalBox");
        box.innerHTML = `
          <div class="modal-head">
            <button class="modal-back" id="accDetailBack" type="button"><i data-lucide="arrow-left"></i></button>
            <h3>${escapeHtml(acc.name)}</h3>
            <button class="modal-close" id="accDetailClose"><i data-lucide="x"></i></button>
          </div>
          <div class="modal-body">
            <div class="cat-acc-info">
              ${accountLogoMarkup(acc, 48)}
              <div class="cat-acc-bal">${formatRupiah(balance)}</div>
              <div class="cat-acc-sub">Saldo awal: ${formatRupiah(acc.initialBalance || 0)}</div>
            </div>
            <div class="cat-detail-actions" style="margin-top:20px;">
              <button class="btn btn-outline btn-sm" id="accDetailEdit" type="button"><i data-lucide="pencil"></i> Edit</button>
              <button class="btn btn-outline btn-sm" id="accDetailDelete" type="button"><i data-lucide="trash-2"></i> Hapus</button>
            </div>
          </div>`;
        refreshIcons();

        document.getElementById("accDetailBack").onclick = () => renderAccountMgmtList(username, onClose);
        document.getElementById("accDetailClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
        document.getElementById("accDetailEdit").onclick = showEdit;
        document.getElementById("accDetailDelete").onclick = () => {
          Modal.confirmDialog({
            title: 'Hapus akun "' + acc.name + '"?',
            message: "Transaksi yang terkait dengan akun ini juga akan terhapus.",
            confirmLabel: "Hapus",
            onConfirm: () => DataStore.deleteAccounts(username, [acc.id]).then(() => {
              Toast.success("Akun berhasil dihapus."); renderAccountMgmtList(username, onClose);
            }).catch((err) => {
              console.error(err); Toast.error("Gagal menghapus akun. Coba lagi.");
            }),
          });
        };
      }

      function showEdit() {
        let chosenLogo = acc.logo || null;
        const box = document.getElementById("modalBox");
        box.innerHTML = `
          <div class="modal-head">
            <button class="modal-back" id="accEditBack" type="button"><i data-lucide="arrow-left"></i></button>
            <h3>Edit Akun</h3>
            <button class="modal-close" id="accEditClose"><i data-lucide="x"></i></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nama Akun</label>
              <input type="text" class="form-control" id="accFormName" value="${escapeHtml(acc.name)}" placeholder="Contoh: Bank Jago, Cash, OVO">
            </div>
            <div class="form-group">
              <label>Saldo Awal (Rp)</label>
              <input type="number" min="0" class="form-control" id="accFormInitialBalance" value="${acc.initialBalance || 0}" placeholder="0">
              <div class="form-hint">Isi jika akun ini sudah punya saldo sebelum dicatat di aplikasi.</div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Upload Logo</label>
              <div class="logo-upload-zone" id="logoUploadZone">
                <div class="logo-preview" id="logoPreview">${chosenLogo ? `<img src="${chosenLogo}" alt="">` : `<i data-lucide="image-plus"></i>`}</div>
                <div>
                  <div class="logo-upload-text">Klik untuk unggah gambar</div>
                  <div class="logo-upload-sub">PNG / JPG, opsional</div>
                </div>
              </div>
              <input type="file" id="logoInput" accept="image/*" style="display:none;">
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" id="accEditCancel" type="button">Batal</button>
            <button class="btn btn-primary" id="accEditSave" type="button">Simpan</button>
          </div>`;
        refreshIcons();

        document.getElementById("logoUploadZone").addEventListener("click", () => document.getElementById("logoInput").click());
        document.getElementById("logoInput").addEventListener("change", (e) => {
          const file = e.target.files[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const SIZE = 64;
              const canvas = document.createElement("canvas");
              canvas.width = SIZE; canvas.height = SIZE;
              const ctx = canvas.getContext("2d");
              const side = Math.min(img.width, img.height);
              const sx = (img.width - side) / 2;
              const sy = (img.height - side) / 2;
              ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
              chosenLogo = canvas.toDataURL("image/png");
              document.getElementById("logoPreview").innerHTML = `<img src="${chosenLogo}" alt="">`;
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });

        const closeAll = () => { Modal.close(() => { onClose && onClose(); }); };
        document.getElementById("accEditBack").onclick = render;
        document.getElementById("accEditClose").onclick = closeAll;
        document.getElementById("accEditCancel").onclick = render;
        document.getElementById("accEditSave").onclick = () => {
          const name = document.getElementById("accFormName").value.trim();
          const initialBalance = parseFloat(document.getElementById("accFormInitialBalance").value) || 0;
          if (!name) return Toast.error("Nama akun wajib diisi.");
          DataStore.updateAccount(username, acc.id, { name, logo: chosenLogo, initialBalance }).then(() => {
            acc.name = name; acc.logo = chosenLogo; acc.initialBalance = initialBalance;
            Toast.success("Akun berhasil diperbarui.");
            render();
          }).catch((err) => {
            console.error(err); Toast.error("Gagal menyimpan akun. Coba lagi.");
          });
        };
        setTimeout(() => document.getElementById("accFormName").focus(), 100);
      }

      render();
    }).catch((err) => {
      console.error("[Setting] load account detail error:", err);
      Toast.error("Gagal memuat detail akun.");
    });
  }

  // ================= Savings detail popup (backable) =================
  function showSavingsDetail(sav, username, onClose) {
    function render() {
      const box = document.getElementById("modalBox");
      box.innerHTML = `
        <div class="modal-head">
          <button class="modal-back" id="savDetailBack" type="button"><i data-lucide="arrow-left"></i></button>
          <h3>${escapeHtml(sav.icon + " " + sav.name)}</h3>
          <button class="modal-close" id="savDetailClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="cat-acc-info">
            <div class="cat-sav-icon">${sav.icon || "🎯"}</div>
            <div class="cat-acc-bal">${sav.targetAmount > 0 ? formatRupiah(sav.targetAmount) : "Tanpa target"}</div>
            <div class="cat-acc-sub">${sav.dueDate ? "Target: " + sav.dueDate : "Tanpa tanggal target"}${sav.color ? " · Warna: " + sav.color : ""}</div>
            ${sav.currentAmount > 0 ? `<div style="text-align:center;margin-top:8px;font-size:13px;color:var(--brand-600);">Sudah terkumpul: ${formatRupiah(sav.currentAmount)}</div>` : ""}
            ${sav.note ? `<div class="cat-sav-note">${escapeHtml(sav.note)}</div>` : ""}
          </div>
          <div class="cat-detail-actions" style="margin-top:20px;">
            <button class="btn btn-outline btn-sm" id="savDetailEdit" type="button"><i data-lucide="pencil"></i> Edit</button>
            <button class="btn btn-outline btn-sm" id="savDetailDelete" type="button"><i data-lucide="trash-2"></i> Hapus</button>
          </div>
        </div>`;
      refreshIcons();

      document.getElementById("savDetailBack").onclick = () => renderSavingsMgmtList(username, onClose);
      document.getElementById("savDetailClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("savDetailEdit").onclick = showEdit;
      document.getElementById("savDetailDelete").onclick = () => {
        Modal.confirmDialog({
          title: 'Hapus tabungan "' + sav.name + '"?',
          message: "Riwayat transfer ke target ini akan tetap tersimpan.",
          confirmLabel: "Hapus",
          onConfirm: () => DataStore.deleteSavingsTargets(username, [sav.id]).then(() => {
            Toast.success("Target tabungan berhasil dihapus."); renderSavingsMgmtList(username, onClose);
          }).catch((err) => {
            console.error(err); Toast.error("Gagal menghapus target tabungan. Coba lagi.");
          }),
        });
      };
    }

    function showEdit() {
      let chosenIcon = sav.icon || "🎯";
      let chosenColor = sav.color || "#d89a3d";
      const box = document.getElementById("modalBox");
      box.innerHTML = `
        <div class="modal-head">
          <button class="modal-back" id="savEditBack" type="button"><i data-lucide="arrow-left"></i></button>
          <h3>Edit Tabungan</h3>
          <button class="modal-close" id="savEditClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>Nama Tabungan</label><input type="text" class="form-control" id="savFormName" value="${escapeHtml(sav.name)}" placeholder="Contoh: Laptop Gaming"></div>
          <div class="form-group"><label>Target Nominal (Rp)</label><input type="number" min="0" class="form-control" id="savFormTarget" value="${sav.targetAmount || ""}" placeholder="Contoh: 10000000"></div>
          <div class="form-group"><label>Sudah Terkumpul (Rp)</label><input type="number" min="0" class="form-control" id="savFormCurrent" value="${sav.currentAmount || ""}" placeholder="Contoh: 500000"></div>
          <div class="form-row">
            <div class="form-group"><label>Tanggal Target (Opsional)</label><input type="date" class="form-control" id="savFormDueDate" value="${sav.dueDate || ""}"></div>
            <div class="form-group"><label>Warna (Opsional)</label><input type="color" class="form-control" id="savFormColor" value="${chosenColor}"></div>
          </div>
          <div class="form-group"><label>Ikon (Opsional)</label>${emojiPickerHtml("savEditF", chosenIcon)}</div>
          <div class="form-group" style="margin-bottom:0;"><label>Catatan (Opsional)</label><textarea class="form-control" id="savFormNote" rows="2" placeholder="Contoh: Dana liburan akhir tahun">${escapeHtml(sav.note || "")}</textarea></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="savEditCancel" type="button">Batal</button>
          <button class="btn btn-primary" id="savEditSave" type="button">Simpan</button>
        </div>`;
      refreshIcons();
      wireEmojiPicker(box, "savEditF", chosenIcon, (v) => { chosenIcon = v; });

      const closeAll = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("savEditBack").onclick = render;
      document.getElementById("savEditClose").onclick = closeAll;
      document.getElementById("savEditCancel").onclick = render;
      document.getElementById("savEditSave").onclick = () => {
        const name = document.getElementById("savFormName").value.trim();
        const targetAmount = parseFloat(document.getElementById("savFormTarget").value) || 0;
        const currentAmount = parseFloat(document.getElementById("savFormCurrent").value) || 0;
        const dueDate = document.getElementById("savFormDueDate").value;
        const color = document.getElementById("savFormColor").value;
        const note = document.getElementById("savFormNote").value.trim();
        if (!name) return Toast.error("Nama tabungan wajib diisi.");
        DataStore.updateSavingsTarget(username, sav.id, { name, targetAmount: targetAmount > 0 ? targetAmount : 0, currentAmount, dueDate, color, icon: chosenIcon || "🎯", note }).then(() => {
          sav.name = name; sav.targetAmount = targetAmount; sav.currentAmount = currentAmount; sav.dueDate = dueDate; sav.color = color; sav.icon = chosenIcon; sav.note = note;
          Toast.success("Target tabungan berhasil diperbarui.");
          render();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan target tabungan. Coba lagi.");
        });
      };
      setTimeout(() => document.getElementById("savFormName").focus(), 100);
    }

    render();
  }

  // ================= Merchant management modal =================
  function renderMerchantMgmtList(username, onClose) {
    Promise.all([DataStore.getMerchants(username), DataStore.getMerchantUsage(username)]).then(([merchants, merchantUsage]) => {
      merchantsCache = merchants || [];
      const sorted = [...merchantsCache].sort((a, b) => (merchantUsage[b.id] || 0) - (merchantUsage[a.id] || 0));
      const rows = sorted.length
        ? sorted.map((m) => `
          <div class="cat-card" data-id="${m.id}">
            ${merchantLogoMarkup(m, 28)}
            <span class="cat-card-name">${escapeHtml(m.name)}</span>
            <span class="cat-card-arrow"><i data-lucide="chevron-right"></i></span>
          </div>`).join("")
        : `<p class="acc-mgmt-empty">Belum ada merchant. Klik Tambah untuk membuat merchant pertamamu.</p>`;

      Modal.open(`
        <div class="modal-head"><h3>Manajemen Merchant</h3><button class="modal-close" id="merchantMgmtClose"><i data-lucide="x"></i></button></div>
        <div class="modal-body">
          <div class="acc-mgmt-toolbar" style="margin-top:10px;">
            <button class="btn btn-outline btn-sm" id="merchantAddBtn" type="button"><i data-lucide="plus"></i> Tambah</button>
          </div>
          <div class="cat-card-list" id="merchantMgmtList">${rows}</div>
        </div>`);

      document.getElementById("merchantMgmtClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("merchantAddBtn").onclick = () => renderMerchantForm(username, null, onClose);

      document.querySelectorAll("#merchantMgmtList .cat-card").forEach((card) => {
        card.addEventListener("click", () => {
          const m = merchantsCache.find((x) => x.id === card.dataset.id);
          if (!m) return;
          showMerchantDetail(m, username, onClose);
        });
      });
      refreshIcons();
    }).catch((err) => {
      console.error("[Setting] load merchants error:", err);
      Toast.error("Gagal memuat data merchant.");
    });
  }

  function renderMerchantForm(username, editMerchant, onClose) {
    const isEdit = !!editMerchant;
    let chosenLogo = isEdit ? (editMerchant.logo || null) : null;

    Modal.open(`
      <div class="modal-head"><h3>${isEdit ? "Edit Merchant" : "Tambah Merchant"}</h3><button class="modal-close" id="merchantFormClose"><i data-lucide="x"></i></button></div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nama Merchant</label>
          <input type="text" class="form-control" id="merchantFormName" value="${isEdit ? escapeHtml(editMerchant.name) : ""}" placeholder="Contoh: Shopee, Tokopedia, Grab">
        </div>
        <div class="form-group">
          <label>Upload Logo</label>
          <div class="logo-upload-zone" id="merchantLogoUploadZone">
            <div class="logo-preview" id="merchantLogoPreview">${chosenLogo ? `<img src="${chosenLogo}" alt="">` : `<i data-lucide="store"></i>`}</div>
            <div>
              <div class="logo-upload-text">Klik untuk unggah gambar</div>
              <div class="logo-upload-sub">PNG / JPG, opsional</div>
            </div>
          </div>
          <input type="file" id="merchantLogoInput" accept="image/*" style="display:none;">
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="merchantFormBack" type="button">Kembali</button>
        <button class="btn btn-primary" id="merchantFormSave" type="button">${isEdit ? "Simpan" : "Tambah"}</button>
      </div>`);
    refreshIcons();

    document.getElementById("merchantLogoUploadZone").addEventListener("click", () => document.getElementById("merchantLogoInput").click());
    document.getElementById("merchantLogoInput").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const SIZE = 64;
          const canvas = document.createElement("canvas");
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
          chosenLogo = canvas.toDataURL("image/png");
          document.getElementById("merchantLogoPreview").innerHTML = `<img src="${chosenLogo}" alt="">`;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("merchantFormClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
    document.getElementById("merchantFormBack").onclick = () => renderMerchantMgmtList(username, onClose);
    document.getElementById("merchantFormSave").onclick = () => {
      const saveBtn = document.getElementById("merchantFormSave");
      const name = document.getElementById("merchantFormName").value.trim();
      if (!name) return Toast.error("Nama merchant wajib diisi.");

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';

      if (isEdit) {
        DataStore.updateMerchant(username, editMerchant.id, { name, logo: chosenLogo }).then(() => {
          Toast.success("Merchant berhasil diperbarui."); renderMerchantMgmtList(username, onClose); renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Simpan";
        });
      } else {
        DataStore.addMerchant(username, { id: generateId("mer"), name, logo: chosenLogo, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).then(() => {
          Toast.success("Merchant berhasil ditambahkan."); renderMerchantMgmtList(username, onClose); renderRoute();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan. Coba lagi."); saveBtn.disabled = false; saveBtn.innerHTML = "Tambah";
        });
      }
    };
  }

  // ================= Merchant detail popup (backable) =================
  function showMerchantDetail(mer, username, onClose) {
    function render() {
      const box = document.getElementById("modalBox");
      box.innerHTML = `
        <div class="modal-head">
          <button class="modal-back" id="merchantDetailBack" type="button"><i data-lucide="arrow-left"></i></button>
          <h3>${escapeHtml(mer.name)}</h3>
          <button class="modal-close" id="merchantDetailClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="cat-acc-info">
            ${merchantLogoMarkup(mer, 48)}
            <div class="cat-acc-sub">${mer.createdAt ? "Dibuat: " + formatDateID(mer.createdAt.slice(0, 10)) : ""}</div>
          </div>
          <div class="cat-detail-actions" style="margin-top:20px;">
            <button class="btn btn-outline btn-sm" id="merchantDetailEdit" type="button"><i data-lucide="pencil"></i> Edit</button>
            <button class="btn btn-outline btn-sm" id="merchantDetailDelete" type="button"><i data-lucide="trash-2"></i> Hapus</button>
          </div>
        </div>`;
      refreshIcons();

      document.getElementById("merchantDetailBack").onclick = () => renderMerchantMgmtList(username, onClose);
      document.getElementById("merchantDetailClose").onclick = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("merchantDetailEdit").onclick = showEdit;
      document.getElementById("merchantDetailDelete").onclick = () => {
        Modal.confirmDialog({
          title: 'Hapus merchant "' + mer.name + '"?',
          message: "Transaksi yang terkait dengan merchant ini tidak akan terhapus.",
          confirmLabel: "Hapus",
          onConfirm: () => DataStore.deleteMerchants(username, [mer.id]).then(() => {
            Toast.success("Merchant berhasil dihapus."); renderMerchantMgmtList(username, onClose);
          }).catch((err) => {
            console.error(err); Toast.error("Gagal menghapus merchant. Coba lagi.");
          }),
        });
      };
    }

    function showEdit() {
      let chosenLogo = mer.logo || null;
      const box = document.getElementById("modalBox");
      box.innerHTML = `
        <div class="modal-head">
          <button class="modal-back" id="merchantEditBack" type="button"><i data-lucide="arrow-left"></i></button>
          <h3>Edit Merchant</h3>
          <button class="modal-close" id="merchantEditClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nama Merchant</label>
            <input type="text" class="form-control" id="merchantFormName" value="${escapeHtml(mer.name)}" placeholder="Contoh: Shopee, Tokopedia, Grab">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Upload Logo</label>
            <div class="logo-upload-zone" id="merchantLogoUploadZone">
              <div class="logo-preview" id="merchantLogoPreview">${chosenLogo ? `<img src="${chosenLogo}" alt="">` : `<i data-lucide="store"></i>`}</div>
              <div>
                <div class="logo-upload-text">Klik untuk unggah gambar</div>
                <div class="logo-upload-sub">PNG / JPG, opsional</div>
              </div>
            </div>
            <input type="file" id="merchantLogoInput" accept="image/*" style="display:none;">
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="merchantEditCancel" type="button">Batal</button>
          <button class="btn btn-primary" id="merchantEditSave" type="button">Simpan</button>
        </div>`;
      refreshIcons();

      document.getElementById("merchantLogoUploadZone").addEventListener("click", () => document.getElementById("merchantLogoInput").click());
      document.getElementById("merchantLogoInput").addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const SIZE = 64;
            const canvas = document.createElement("canvas");
            canvas.width = SIZE; canvas.height = SIZE;
            const ctx = canvas.getContext("2d");
            const side = Math.min(img.width, img.height);
            const sx = (img.width - side) / 2;
            const sy = (img.height - side) / 2;
            ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
            chosenLogo = canvas.toDataURL("image/png");
            document.getElementById("merchantLogoPreview").innerHTML = `<img src="${chosenLogo}" alt="">`;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });

      const closeAll = () => { Modal.close(() => { onClose && onClose(); }); };
      document.getElementById("merchantEditBack").onclick = render;
      document.getElementById("merchantEditClose").onclick = closeAll;
      document.getElementById("merchantEditCancel").onclick = render;
      document.getElementById("merchantEditSave").onclick = () => {
        const saveBtn = document.getElementById("merchantEditSave");
        const name = document.getElementById("merchantFormName").value.trim();
        if (!name) return Toast.error("Nama merchant wajib diisi.");
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="btn-spinner"></span> Menyimpan...';
        DataStore.updateMerchant(username, mer.id, { name, logo: chosenLogo, updatedAt: new Date().toISOString() }).then(() => {
          mer.name = name; mer.logo = chosenLogo;
          Toast.success("Merchant berhasil diperbarui.");
          render();
        }).catch((err) => {
          console.error(err); Toast.error("Gagal menyimpan merchant. Coba lagi.");
          saveBtn.disabled = false;
          saveBtn.innerHTML = "Simpan";
        });
      };
      setTimeout(() => document.getElementById("merchantFormName").focus(), 100);
    }

    render();
  }

  function merchantLogoMarkup(merchant, size) {
    size = size || 30;
    if (merchant && merchant.logo) {
      return `<div class="account-logo" style="width:${size}px;height:${size}px;"><img src="${merchant.logo}" alt="${escapeHtml(merchant.name)}" loading="lazy"></div>`;
    }
    return `<div class="account-logo" style="width:${size}px;height:${size}px;"><i data-lucide="store"></i></div>`;
  }

  function exportPDF(w, username, txs, accounts, categories, savingsTargets) {
    const startEl = document.getElementById("exportStart");
    const endEl = document.getElementById("exportEnd");
    const accEl = document.getElementById("exportAccount");
    const catEl = document.getElementById("exportCategory");
    const typeEl = document.getElementById("exportType");
    if (!startEl || !endEl || !accEl || !catEl || !typeEl) { Toast.error("Modal ekspor sudah ditutup."); return; }
    const start = startEl.value;
    const end = endEl.value;
    const account = accEl.value;
    const category = catEl.value;
    const type = typeEl.value;

    const filtered = txs.filter((t) => {
      if (start && t.date < start) return false;
      if (end && t.date > end) return false;
      if (type !== "all" && t.type !== type) return false;
      if (account !== "all" && !(t.accountId === account || t.fromAccountId === account || t.toAccountId === account)) return false;
      if (category !== "all" && t.categoryId !== category) return false;
      return true;
    });

    if (filtered.length === 0) {
      Toast.error("Tidak ada transaksi untuk periode ini.");
      return;
    }

    let totalIncome = 0, totalExpense = 0;
    filtered.forEach((t) => {
      if (t.type === "income") totalIncome += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
    });
    const net = totalIncome - totalExpense;

    const accountData = accounts.map((a) => ({
      name: a.name,
      balance: DataStore.computeAccountBalance(txs, a)
    }));

    const catMap = {};
    [...(categories.income || []), ...(categories.expense || [])].forEach((c) => { catMap[c.id] = c; });

    const catData = {};
    filtered.filter((t) => t.type !== "transfer").forEach((t) => {
      const c = catMap[t.categoryId] || { name: t.categoryName || "Lainnya", icon: t.categoryEmoji || "📁", type: t.type };
      if (!catData[t.categoryId]) catData[t.categoryId] = { name: c.name, icon: c.icon || "📁", type: c.type, total: 0, subs: {} };
      catData[t.categoryId].total += t.amount;
      if (t.subcategoryName) {
        catData[t.categoryId].subs[t.subcategoryName] = (catData[t.categoryId].subs[t.subcategoryName] || 0) + t.amount;
      }
    });

    // Savings progress
    const savData = (savingsTargets || []).map((s) => {
      const savedFromTx = filtered.filter((t) => t.type === "transfer" && t.toSavingsId === s.id).reduce((sum, t) => sum + t.amount, 0);
      const totalSaved = (s.currentAmount || 0) + savedFromTx;
      const hasTarget = Number(s.targetAmount) > 0;
      const pct = hasTarget ? Math.min(100, Math.round((totalSaved / s.targetAmount) * 100)) : 100;
      return { ...s, totalSaved, pct, hasTarget };
    }).filter((s) => s.totalSaved > 0);
    const savStatus = (s) => {
      if (!s.hasTarget) return '<span class="sav-badge sav-flex">Fleksibel</span>';
      if (s.pct >= 100) return '<span class="sav-badge sav-done">✓ Tercapai</span>';
      if (s.pct >= 75) return '<span class="sav-badge sav-close">Hampir Tercapai</span>';
      return '<span class="sav-badge sav-track">On Track</span>';
    };
    const hasSavings = savData.length > 0;

    // Komparasi periode
    let cmpInc = null, cmpExp = null, cmpNet = null;
    if (start && end) {
      const dur = new Date(end) - new Date(start);
      const cmpEnd = new Date(start); cmpEnd.setDate(cmpEnd.getDate() - 1);
      const cmpStart = new Date(cmpEnd.getTime() - dur);
      const cs = cmpStart.toISOString().slice(0, 10), ce = cmpEnd.toISOString().slice(0, 10);
      let pi = 0, pe = 0;
      txs.forEach((t) => { if (t.date >= cs && t.date <= ce) { if (t.type === "income") pi += t.amount; if (t.type === "expense") pe += t.amount; } });
      if (totalIncome > 0 && pi > 0) cmpInc = ((totalIncome - pi) / pi) * 100;
      if (totalExpense > 0 && pe > 0) cmpExp = ((totalExpense - pe) / pe) * 100;
      const curNet = totalIncome - totalExpense;
      const prevNet = pi - pe;
      if (prevNet !== 0 && curNet !== 0) cmpNet = ((curNet - prevNet) / Math.abs(prevNet)) * 100;
    }
    const period = [start, end].filter(Boolean).join(" s.d. ") || "Semua waktu";
    const fmt = (v) => "Rp" + Number(v).toLocaleString("id-ID");
    const esc = (s) => { let d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; };

    // Filtered dates for chart
    const byDate = {};
    filtered.filter((t) => t.type === "income" || t.type === "expense").forEach((t) => {
      byDate[t.date] = byDate[t.date] || { income: 0, expense: 0 };
      byDate[t.date][t.type] += t.amount;
    });
    const chartDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));

    // Build chart in hidden canvas, get base64
    const chartWrap = document.createElement("div");
    chartWrap.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    chartWrap.innerHTML = '<canvas id="_pdfChart" width="800" height="300"></canvas>';
    document.body.appendChild(chartWrap);
    const cctx = document.getElementById("_pdfChart").getContext("2d");
    const hasChart = chartDates.length > 0;
    let chartImg = "";
    if (hasChart) {
      const ch = new Chart(cctx, {
        type: "line",
        data: {
          labels: chartDates.map((d) => { const p = d.split("-"); return p[2]+"/"+p[1]; }),
          datasets: [
            { label: "Pemasukan", data: chartDates.map((d) => byDate[d].income), borderColor: "#22C55E", backgroundColor: "rgba(34,197,94,.12)", tension: .35, fill: true, pointRadius: 2 },
            { label: "Pengeluaran", data: chartDates.map((d) => byDate[d].expense), borderColor: "#EF4444", backgroundColor: "rgba(239,68,68,.12)", tension: .35, fill: true, pointRadius: 2 },
          ]
        },
        options: {
          responsive: false, animation: false,
          plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 7, font: { size: 9 } } } },
          scales: { y: { ticks: { callback: (v) => "Rp" + v.toLocaleString("id-ID") } } }
        }
      });
      chartImg = cctx.canvas.toDataURL("image/png");
      ch.destroy();
    }
    chartWrap.remove();

    // Build donut chart for expense by category
    const donutWrap = document.createElement("div");
    donutWrap.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    donutWrap.innerHTML = '<canvas id="_pdfDonut" width="420" height="340"></canvas>';
    document.body.appendChild(donutWrap);
    const dctx = document.getElementById("_pdfDonut").getContext("2d");
    const expByCat = {};
    filtered.filter((t) => t.type === "expense").forEach((t) => {
      const c = catMap[t.categoryId] || { name: t.categoryName || "Lainnya" };
      expByCat[c.name] = (expByCat[c.name] || 0) + t.amount;
    });
    const donutLabels = Object.keys(expByCat);
    const donutData = donutLabels.map((l) => expByCat[l]);
    const hasDonut = donutLabels.length > 0;
    let donutImg = "";
    if (hasDonut) {
      const pal = ["#EF4444","#F97316","#FACC15","#22C55E","#14B8A6","#3B82F6","#6366F1","#A855F7","#EC4899","#64748B"];
      const dh = new Chart(dctx, {
        type: "doughnut",
        data: { labels: donutLabels, datasets: [{ data: donutData, backgroundColor: pal.slice(0, donutLabels.length), borderWidth: 1.5, borderColor: "#fff" }] },
        options: { responsive: false, animation: false, cutout: "30%", layout: { padding: { bottom: 22 } }, plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 12, font: { size: 11 }, padding: 10, usePointStyle: true, generateLabels: (c) => { const ds = c.data.datasets[0]; const t = ds.data.reduce((a, b) => a + b, 0); return c.data.labels.map((l, i) => ({ text: l + " (" + ((ds.data[i] / t) * 100).toFixed(0) + "%)", fillStyle: ds.backgroundColor[i], strokeStyle: "transparent", pointStyle: "circle", hidden: !ds.data[i], index: i })); } } }, tooltip: { enabled: false } } }
      });
      donutImg = dctx.canvas.toDataURL("image/png");
      dh.destroy();
    }
    donutWrap.remove();

    // Build monthly comparison bar chart
    const monthData = {};
    filtered.filter((t) => t.type === "income" || t.type === "expense").forEach((t) => {
      const m = t.date.slice(0, 7);
      monthData[m] = monthData[m] || { income: 0, expense: 0 };
      monthData[m][t.type] += t.amount;
    });
    const monthLabels = Object.keys(monthData).sort();
    const hasMonthChart = monthLabels.length > 1;
    let barChartImg = "";
    if (hasMonthChart) {
      const bw = document.createElement("div");
      bw.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
      bw.innerHTML = '<canvas id="_pdfBar" width="700" height="260"></canvas>';
      document.body.appendChild(bw);
      const bctx = document.getElementById("_pdfBar").getContext("2d");
      const mNames = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mei","06":"Jun","07":"Jul","08":"Agu","09":"Sep","10":"Okt","11":"Nov","12":"Des" };
      const bc = new Chart(bctx, {
        type: "bar",
        data: {
          labels: monthLabels.map((m) => { const p = m.split("-"); return (mNames[p[1]] || p[1]) + " " + p[0]; }),
          datasets: [
            { label: "Pemasukan", data: monthLabels.map((m) => monthData[m].income), backgroundColor: "rgba(34,197,94,.7)", borderRadius: 4 },
            { label: "Pengeluaran", data: monthLabels.map((m) => monthData[m].expense), backgroundColor: "rgba(239,68,68,.7)", borderRadius: 4 },
          ]
        },
        options: {
          responsive: false, animation: false,
          plugins: { legend: { display: true, position: "top", labels: { boxWidth: 10, font: { size: 9 }, padding: 8 } } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 8 } } } }
        }
      });
      barChartImg = bctx.canvas.toDataURL("image/png");
      bc.destroy();
      bw.remove();
    }

    // Build category rows HTML (split income / expense)
    const catEntries = Object.entries(catData);
    const incomeCats = catEntries.filter(([id, cd]) => cd.type === "income");
    const expenseCats = catEntries.filter(([id, cd]) => cd.type === "expense");
    const buildCatHtml = (entries) => entries.map(([id, cd]) => {
      const subRows = Object.entries(cd.subs).map(([sn, sa]) =>
        `<tr class="sub-row"><td class="sub-name">${esc(sn)}</td><td class="sub-val">${fmt(sa)}</td></tr>`
      ).join("");
      return `<tr class="cat-row"><td class="cat-name">${esc(cd.icon)} ${esc(cd.name)}</td><td class="cat-val">${fmt(cd.total)}</td></tr>${subRows}`;
    }).join("");
    const incomeCatsHtml = buildCatHtml(incomeCats);
    const expenseCatsHtml = buildCatHtml(expenseCats);
    const hasIncomeCats = incomeCats.length > 0;
    const hasExpenseCats = expenseCats.length > 0;

    // Build account rows HTML
    const accRows = accountData.map((a) =>
      `<tr><td class="acc-name">🏦 ${esc(a.name)}</td><td class="acc-val${a.balance < 0 ? ' neg' : ''}">${fmt(a.balance)}</td></tr>`
    ).join("");
    const hasAccs = accountData.length > 0;

    // Top 5 income & expense
    const topIncome = filtered.filter((t) => t.type === "income").sort((a, b) => b.amount - a.amount).slice(0, 5);
    const topExpense = filtered.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5);
    const hasTopIncome = topIncome.length > 0;
    const hasTopExpense = topExpense.length > 0;
    const topTxRow = (tx, rank) => {
      const c = catMap[tx.categoryId] || {};
      const icon = c.emoji || tx.categoryEmoji || "📄";
      const name = c.name || tx.categoryName || "";
      const sub = tx.subcategoryName || "";
      const sdate = tx.date ? tx.date.slice(5) : "";
      const cls = tx.type === "income" ? "inc" : "exp";
      const rankCls = rank === 1 ? "top-first" : rank <= 3 ? "top-top3" : "";
      return `<tr class="${rankCls}"><td class="top-rank">${rank}</td><td class="top-date">${sdate}</td><td class="top-cat">${icon}</td><td class="top-name">${esc(name)}${sub ? '<span class="top-note"> · ' + esc(sub) + '</span>' : ''}</td><td class="top-val ${cls}">${fmt(tx.amount)}</td></tr>`;
    };
    const topIncomeHtml = hasTopIncome ? topIncome.map((tx, i) => topTxRow(tx, i + 1)).join("") : "";
    const topExpenseHtml = hasTopExpense ? topExpense.map((tx, i) => topTxRow(tx, i + 1)).join("") : "";

    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const pageTitle = "Laporan Keuangan" + (period !== "Semua waktu" ? " - " + period : "");
    const pageHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${pageTitle}</title>
<style>
  @page { margin: 30mm 20mm 22mm; size: A4; orphans: 3; widows: 3; @bottom-right { content: "Halaman " counter(page); font: 8px Inter,sans-serif; color: #94a3b8; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', -apple-system, Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #1e293b; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ===== PAGE ===== */
  .page { position: relative; }

  /* ===== HEADER ===== */
  .hd { display: flex; align-items: stretch; justify-content: space-between; padding-bottom: 14px; border-bottom: 1.5px solid #e2e8f0; margin-bottom: 22px; }
  .hd-l { display: flex; align-items: center; gap: 14px; }
  .hd-logo { width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, #059669, #22C55E); color: #fff; font-size: 20pt; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 3px 10px rgba(34,197,94,.25); }
  .hd-info h1 { font-size: 22pt; font-weight: 800; color: #0f172a; letter-spacing: -.8px; margin: 0; line-height: 1.2; }
  .hd-period { display: inline-block; font-size: 7.5pt; font-weight: 600; color: #15803d; background: #dcfce7; padding: 2px 10px; border-radius: 20px; margin-top: 4px; letter-spacing: .2px; }
  .hd-r { text-align: right; font-size: 8pt; color: #94a3b8; display: flex; flex-direction: column; justify-content: flex-end; line-height: 1.6; }
  .hd-r .un { font-weight: 600; color: #475569; }

  /* ===== SUMMARY CARDS ===== */
  .sum { display: flex; gap: 16px; margin-bottom: 24px; page-break-inside: avoid; }
  .sum-c { flex: 1; border-radius: 14px; padding: 22px 16px 12px; position: relative; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.05); border: 1px solid rgba(255,255,255,.5); }
  .sum-c .accent { position: absolute; top: 0; left: 16px; right: 16px; height: 3px; border-radius: 0 0 3px 3px; }
  .sum-c .si { font-size: 26pt; margin-bottom: 4px; line-height: 1.2; }
  .sum-c .sl { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
  .sum-c .sv { font-size: 20pt; font-weight: 800; letter-spacing: -.5px; line-height: 1.2; }
  .cmp-pill { display: inline-block; font-size: 6.5pt; font-weight: 700; padding: 2px 8px; border-radius: 12px; vertical-align: middle; margin-left: 6px; line-height: 1.5; }
  .cmp-up { color: #15803d; background: #dcfce7; }
  .cmp-dn { color: #b91c1c; background: #fee2e2; }
  .sg { background: linear-gradient(180deg, #f0fdf4, #dcfce7); } .sg .accent { background: #22C55E; } .sg .sv { color: #15803d; }
  .sr { background: linear-gradient(180deg, #fef2f2, #fee2e2); } .sr .accent { background: #ef4444; } .sr .sv { color: #b91c1c; }
  .sb { background: linear-gradient(180deg, #f0f9ff, #e0f2fe); } .sb .accent { background: #0ea5e9; } .sb .sv { color: #0284c7; }
  .sb .sv.neg { color: #b91c1c; }

  /* ===== SECTIONS ===== */
  .sec { margin-bottom: 24px; page-break-inside: avoid; }
  .sec-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .sec-hd .sico { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13pt; color: #fff; flex-shrink: 0; }
  .sec-hd h2 { font-size: 12pt; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -.3px; }
  .sec-hd .sline { flex: 1; height: .5px; background: linear-gradient(90deg, #cbd5e1, transparent); }

  /* ===== CHARTS ===== */
  .chart-card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #fafafa; box-shadow: 0 1px 4px rgba(0,0,0,.03); height: 100%; }
  .chart-label { font-size: 9pt; font-weight: 700; color: #334155; margin-bottom: 10px; }
  .donut-card { padding-top: 24px; padding-bottom: 4px; }
  .donut-card .chart-label { font-size: 12pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin-bottom: 14px; padding: 0 4px; }
  .chart-wrap { text-align: center; }
  .chart-wrap img { max-width: 100%; height: auto; border-radius: 6px; }

  /* ===== TABLES (base) ===== */
  .twrap { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #f1f5f9; }
  .twrap.sg { background: linear-gradient(180deg, #ecfdf5, #bbf7d0); }
  .twrap.sr { background: linear-gradient(180deg, #fef2f2, #fecaca); }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  table td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; }
  table tr:last-child td { border-bottom: none; }

  /* ===== TOP TRANSACTIONS ===== */
  .top-grid { display: flex; gap: 16px; }
  .top-col { flex: 1; min-width: 0; }
  .top-subhd { font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 8px; padding: 0 4px; text-transform: uppercase; letter-spacing: .8px; }
  .top-rank { width: 24px; font-size: 8pt; font-weight: 700; color: #94a3b8; text-align: center; }
  .top-date { font-size: 7pt; color: #94a3b8; width: 1%; white-space: nowrap; }
  .top-cat { font-size: 10pt; width: 1%; }
  .top-name { color: #1e293b; font-weight: 600; }
  .top-note { font-size: 7.5pt; color: #94a3b8; font-weight: 400; }
  .top-val { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 9pt; white-space: nowrap; }
  .top-val.inc { color: #15803d; }
  .top-val.exp { color: #b91c1c; }
  .top-first td { background: #fdfbf7; }
  .top-first .top-rank { color: #f59e0b; font-size: 9pt; }
  .top-top3 .top-rank { color: #64748b; }

  /* ===== ACCOUNTS ===== */
  .acc-name { font-weight: 600; font-size: 10pt; }
  .acc-val { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 9.5pt; }
  .acc-val.neg { color: #dc2626; }

  /* ===== CATEGORIES ===== */
  .cat-row td { padding: 10px 12px 4px; font-weight: 700; font-size: 10pt; border-bottom: none; color: #0f172a; }
  .cat-val { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10pt; }
  .cat-total td { padding: 10px 12px; font-weight: 800; font-size: 10.5pt; border-top: 2px solid #cbd5e1; border-bottom: none; color: #0f172a; }
  .sub-row td { padding: 2px 12px 2px 40px; color: #64748b; font-size: 8.5pt; border-bottom: 1px solid #f1f5f9; }
  .sub-val { text-align: right; font-weight: 500; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 8.5pt; }

  /* ===== SAVINGS ===== */
  .sav-card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; background: #fafafa; }
  .sav-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .sav-hd .sav-icon { font-size: 20pt; }
  .sav-hd .sav-name { font-weight: 700; font-size: 11pt; color: #0f172a; }
  .sav-hd .sav-due { font-size: 7.5pt; color: #94a3b8; margin-left: auto; }
  .sav-bar { height: 18px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin: 6px 0 8px; }
  .sav-bar-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #ec4899, #f472b6); transition: none; }
  .sav-meta { display: flex; justify-content: space-between; align-items: center; font-size: 9pt; }
  .sav-meta .sav-amt { font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; color: #0f172a; }
  .sav-meta .sav-pct { font-weight: 600; color: #475569; }
  .sav-badge { display: inline-block; font-size: 7pt; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
  .sav-track { background: #eff6ff; color: #2563eb; }
  .sav-close { background: #fef3c7; color: #b45309; }
  .sav-done { background: #dcfce7; color: #15803d; }
  .sav-flex { background: #f1f5f9; color: #64748b; }

  /* ===== MONTHLY TABLE ===== */
  .mo-name { font-weight: 600; font-size: 9pt; color: #1e293b; }
  .mo-val { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 9pt; }
  .mo-val.neg { color: #dc2626; }

  /* ===== PAGE BREAK ===== */
  .pb { page-break-before: always; }

  /* ===== WATERMARK ===== */
  .wm { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-35deg); font-size: 60pt; font-weight: 900; color: rgba(0,0,0,.035); letter-spacing: 8px; white-space: nowrap; pointer-events: none; z-index: 0; text-align: center; width: 110%; }

  /* ===== NO DATA ===== */
  .no-data { color: #94a3b8; font-style: italic; font-size: 9.5pt; padding: 14px 0; text-align: center; }

  /* ===== FOOTER ===== */
  .ft { margin-top: 30px; padding-top: 14px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 7pt; color: #94a3b8; }
  .ft strong { color: #22C55E; font-weight: 700; }
  .ft-l { text-align: left; }
  .ft-c { text-align: center; }
  .ft-r { font-family: 'JetBrains Mono', 'Courier New', monospace; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head>
<body>
<div class="page">
<div class="wm">CashFlowZ</div>

  <!-- ===== HEADER ===== -->
  <div class="hd">
    <div class="hd-l">
      <div class="hd-logo">C</div>
      <div class="hd-info">
        <h1>Laporan Keuangan</h1>
        <span class="hd-period">${esc(period)}</span>
      </div>
    </div>
    <div class="hd-r">
      <span class="un">${esc(username)}</span>
      <span>Dicetak: ${today}</span>
    </div>
  </div>

  <!-- ===== RINGKASAN ===== -->
  <div class="sum">
    <div class="sum-c sg">
      <div class="accent"></div>
      <div class="si">📈</div>
      <div class="sl">Pemasukan</div>
      <div class="sv">${fmt(totalIncome)}${cmpInc != null ? `<span class="cmp-pill ${cmpInc >= 0 ? 'cmp-up' : 'cmp-dn'}">${cmpInc >= 0 ? '↗' : '↘'} ${Math.abs(cmpInc).toFixed(1)}%</span>` : ''}</div>
    </div>
    <div class="sum-c sr">
      <div class="accent"></div>
      <div class="si">📉</div>
      <div class="sl">Pengeluaran</div>
      <div class="sv">${fmt(totalExpense)}${cmpExp != null ? `<span class="cmp-pill ${cmpExp > 0 ? 'cmp-dn' : 'cmp-up'}">${cmpExp > 0 ? '↗' : '↘'} ${Math.abs(cmpExp).toFixed(1)}%</span>` : ''}</div>
    </div>
    <div class="sum-c sb">
      <div class="accent"></div>
      <div class="si">💰</div>
      <div class="sl">Saldo Bersih</div>
      <div class="sv${net < 0 ? ' neg' : ''}">${fmt(net)}${cmpNet != null ? `<span class="cmp-pill ${cmpNet >= 0 ? 'cmp-up' : 'cmp-dn'}">${cmpNet >= 0 ? '↗' : '↘'} ${Math.abs(cmpNet).toFixed(1)}%</span>` : ''}</div>
    </div>
  </div>

  <!-- ===== TRANSAKSI TERBESAR ===== -->
  ${hasTopIncome || hasTopExpense ? `<div class="sec">
    <div class="sec-hd"><div class="sico" style="background:linear-gradient(135deg,#f59e0b,#fbbf24);">🔥</div><h2>Transaksi Terbesar</h2><div class="sline"></div></div>
    <div class="twrap"><div class="top-grid">
      ${hasTopIncome ? `<div class="top-col"><div class="top-subhd">📈 Pemasukan</div><table><tbody>${topIncomeHtml}</tbody></table></div>` : ''}
      ${hasTopExpense ? `<div class="top-col"><div class="top-subhd">📉 Pengeluaran</div><table><tbody>${topExpenseHtml}</tbody></table></div>` : ''}
    </div></div>
  </div>` : ''}

  <!-- ===== GRAFIK ===== -->
  ${hasChart || hasDonut ? `<div class="sec">
    <div class="sec-hd"><div class="sico" style="background:linear-gradient(135deg,#059669,#22C55E);">📊</div><h2>Grafik</h2><div class="sline"></div></div>
    <div style="display:flex;gap:24px;align-items:stretch;">
      ${hasChart ? `<div style="flex:3;min-width:0;">
        <div class="chart-card">
          <div class="chart-label">📈 Arus Kas</div>
          <div class="chart-wrap"><img src="${chartImg}" alt="Grafik Cashflow"></div>
        </div>
      </div>` : ''}
      ${hasDonut ? `<div style="flex:1;min-width:0;">
        <div class="chart-card donut-card">
          <div class="chart-label">🍩 Distribusi Pengeluaran</div>
          <div class="chart-wrap"><img src="${donutImg}" alt="Pengeluaran per Kategori"></div>
        </div>
      </div>` : ''}
    </div>
    ${hasMonthChart ? `<div class="chart-card" style="margin-top:16px;">
      <div class="chart-label">📊 Perbandingan Bulanan</div>
      <div class="chart-wrap"><img src="${barChartImg}" alt="Perbandingan Bulanan"></div>
    </div>` : ''}
  </div>` : ''}

  <!-- ===== SALDO PER AKUN ===== -->
  <div class="sec">
    <div class="sec-hd"><div class="sico" style="background:linear-gradient(135deg,#6366f1,#818cf8);">🏦</div><h2>Saldo Per Akun</h2><div class="sline"></div></div>
    ${hasAccs ? `<div class="twrap"><table><tbody>${accRows}</tbody></table></div>` : '<p class="no-data">Belum ada akun.</p>'}
  </div>

  <!-- ===== KATEGORI PEMASUKAN ===== -->
  ${hasIncomeCats ? `<div class="sec">
    <div class="sec-hd"><div class="sico" style="background:linear-gradient(135deg,#22C55E,#6EE7B7);">📈</div><h2>Kategori Pemasukan</h2><div class="sline"></div></div>
    <div class="twrap sg"><table><tbody>${incomeCatsHtml}<tr class="cat-total"><td class="cat-name">Total Pemasukan</td><td class="cat-val">${fmt(totalIncome)}</td></tr></tbody></table></div>
  </div>` : ''}

  <!-- ===== KATEGORI PENGELUARAN ===== -->
  ${hasExpenseCats ? `<div class="sec">
    <div class="sec-hd"><div class="sico" style="background:linear-gradient(135deg,#ef4444,#fca5a5);">📉</div><h2>Kategori Pengeluaran</h2><div class="sline"></div></div>
    <div class="twrap sr"><table><tbody>${expenseCatsHtml}<tr class="cat-total"><td class="cat-name">Total Pengeluaran</td><td class="cat-val">${fmt(totalExpense)}</td></tr></tbody></table></div>
  </div>` : ''}

  <!-- ===== RINGKASAN TABUNGAN ===== -->
  ${hasSavings ? `<div class="sec pb">
    <div class="sec-hd"><div class="sico" style="background:linear-gradient(135deg,#ec4899,#f472b6);">🎯</div><h2>Ringkasan Tabungan</h2><div class="sline"></div></div>
    ${savData.map((s) => `
    <div class="sav-card">
      <div class="sav-hd">
        <span class="sav-icon">${esc(s.icon || "🎯")}</span>
        <span class="sav-name">${esc(s.name)}</span>
        ${s.dueDate ? `<span class="sav-due">Target: ${esc(s.dueDate)}</span>` : ''}
        ${savStatus(s)}
      </div>
      <div class="sav-bar"><div class="sav-bar-fill" style="width:${s.pct}%"></div></div>
      <div class="sav-meta">
        <span class="sav-amt">${fmt(s.totalSaved)}${s.hasTarget ? ' / ' + fmt(s.targetAmount) : ''}</span>
        <span class="sav-pct">${s.hasTarget ? s.pct + '%' : 'Fleksibel'}</span>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <!-- ===== FOOTER ===== -->
  <div class="ft">
    <span class="ft-l">Dicetak: ${today}</span>
    <span class="ft-c">Dibuat oleh <strong>CashFlowZ</strong></span>
    <span class="ft-r">v1.6</span>
  </div>

</div>
</body></html>`;

    if (!w || w.closed) { Toast.error("Pop-up ditutup. Coba lagi."); return; }
    w.document.write(pageHtml);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  return { openAccountManager, openCategoryManager, openSavingsModal, openMerchantManager, openExportModal };
})();

