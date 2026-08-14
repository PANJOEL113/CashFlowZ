const ProfileView = (function () {
  function render(root, session) {
    const username = session.username;
    root.innerHTML = `
      <div class="topbar">
        <div class="topbar-title"><h1>Profil</h1><p>Kelola akun dan pengaturan</p></div>
      </div>
      <div class="card">
        <div id="profileContent"></div>
      </div>`;

    Promise.all([DataStore.getProfile(username), DataStore.getSettings(username)])
      .then(([profile, settings]) => {
        const content = document.getElementById("profileContent");
        if (!content) return;
        content.innerHTML = buildProfileHTML(profile, settings);
        wire(content, username);
        refreshIcons();
      })
      .catch((err) => {
        console.error("[ProfileView] render error:", err);
        Toast.error("Gagal memuat data profil.");
      });
  }

  function buildProfileHTML(profile, settings) {
    const status = ConnectionStatus.getStatus();
    const pending = ConnectionStatus.getPendingCount();
    return `
      <div class="profile-page-head">
        <button type="button" id="ppAvatarBtn" class="pp-avatar-btn">
          ${profile.photo ? `<img class="pp-avatar" src="${profile.photo}" alt="avatar">` : `<div class="pp-avatar pp-avatar-fallback">${escapeHtml((profile.name || "U").charAt(0).toUpperCase())}</div>`}
        </button>
        <div class="pp-info">
          <div class="pp-name">${escapeHtml(profile.name)}</div>
          <div class="pp-email">${escapeHtml(profile.email || "")}</div>
          ${statusBadgeHtml(status, pending)}
        </div>
        <div class="pp-photo-actions" id="ppPhotoActions">
          <button type="button" class="btn btn-sm" data-action="photo">Ganti Foto</button>
          <button type="button" class="btn btn-sm btn-outline" data-action="clear-photo">Hapus</button>
        </div>
      </div>
      <button type="button" class="btn btn-primary" id="editProfileBtn" style="margin-top:10px;width:100%;"><i data-lucide="pencil"></i> Edit Profil</button>

      <div class="divider"></div>

      <div class="pp-section">
        <h4 class="pp-section-label">Menu Profil</h4>
        <button type="button" class="pp-menu-item" data-action="manage-account"><i data-lucide="wallet-cards"></i><span>Dompet</span><i data-lucide="chevron-right"></i></button>
        <button type="button" class="pp-menu-item" data-action="manage-category"><i data-lucide="tags"></i><span>Kategori</span><i data-lucide="chevron-right"></i></button>
        <button type="button" class="pp-menu-item" data-action="manage-merchant"><i data-lucide="store"></i><span>Merchant</span><i data-lucide="chevron-right"></i></button>
        <button type="button" class="pp-menu-item" data-action="savings"><i data-lucide="piggy-bank"></i><span>Tabungan</span><i data-lucide="chevron-right"></i></button>
      </div>

      <div class="pp-section">
        <h4 class="pp-section-label">Preferensi</h4>
        <div class="pp-menu-item toggle-item">
          <span><i data-lucide="moon"></i> Dark Mode</span>
          <label class="switch"><input type="checkbox" id="ppDarkSwitch" ${settings.theme === "dark" ? "checked" : ""}><span class="slider"></span></label>
        </div>
        <button type="button" class="pp-menu-item" data-action="export"><i data-lucide="download"></i><span>Ekspor Data</span><i data-lucide="chevron-right"></i></button>
      </div>

      <div class="pp-section">
        <h4 class="pp-section-label">Aktivitas</h4>
        <button type="button" class="pp-menu-item" data-action="activity-log"><i data-lucide="history"></i><span>Activity Log</span><i data-lucide="chevron-right"></i></button>
      </div>

      <div class="divider"></div>
      <button type="button" class="pp-menu-item danger" data-action="logout"><i data-lucide="log-out"></i><span>Logout</span></button>
      <input type="file" id="ppPhotoInput" accept="image/*" style="display:none;">
    `;
  }

  function statusBadgeHtml(status, pending) {
    const map = {
      online: { label: "Online", cls: "st-online", icon: "circle-dot" },
      offline: { label: "Offline", cls: "st-offline", icon: "circle" },
      syncing: { label: "Syncing...", cls: "st-syncing", icon: "loader-2" },
      pending: { label: pending > 0 ? `${pending} pending` : "Pending Sync", cls: "st-pending", icon: "clock" },
    };
    const s = map[status] || map.online;
    return `<span class="status-badge ${s.cls}"><i data-lucide="${s.icon}" class="${status === "syncing" ? "spin-icon" : ""}"></i>${s.label}</span>`;
  }

  function wire(container, username) {
    const photoInput = container.querySelector("#ppPhotoInput");
    const photoActions = container.querySelector("#ppPhotoActions");
    const avatarBtn = container.querySelector("#ppAvatarBtn");
    const darkSwitch = container.querySelector("#ppDarkSwitch");

    if (!photoInput || !photoActions) {
      console.warn("[ProfileView] photoInput/photoActions tidak ditemukan di DOM");
      return;
    }

    const editBtn = container.querySelector("#editProfileBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => ProfileMenu.openEditProfileModal(username));
    }

    if (avatarBtn) {
      avatarBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoActions.classList.toggle("show");
      });
    }

    if (darkSwitch) darkSwitch.addEventListener("change", () => toggleTheme(username));

    const photoBtn = container.querySelector('[data-action="photo"]');
    if (photoBtn) {
      photoBtn.addEventListener("click", () => photoInput.click());
    }

    const clearBtn = container.querySelector('[data-action="clear-photo"]');
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const session = currentSession;
        DataStore.saveProfile(username, { photo: null })
          .then(() => {
            Toast.success("Foto profil dihapus.");
            if (session) render(document.getElementById("viewRoot"), session);
          })
          .catch((err) => {
            console.error("[ProfileView] clear photo error:", err);
            Toast.error("Gagal menghapus foto. Coba lagi.");
          });
      });
    }

    photoInput.addEventListener("change", handlePhotoChange);

    async function handlePhotoChange(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        if (!file.type || !file.type.startsWith("image/")) {
          Toast.error("File harus berupa gambar (JPG/PNG/dll).");
          photoInput.value = "";
          return;
        }

        const img = await readImageFromFile(file);
        const displayUrl = img.src;
        const cropArea = await showCropModal(displayUrl, img);
        if (!cropArea) {
          photoInput.value = "";
          return;
        }

        console.log("[ProfileView] crop area:", cropArea);
        const resultDataUrl = await cropFromOriginal(img, cropArea, 300);

        console.log("[ProfileView] result size:", Math.round(resultDataUrl.length / 1024), "KB");

        await DataStore.saveProfile(username, { photo: resultDataUrl });
        Toast.success("Foto profil berhasil diperbarui.");
        photoInput.value = "";
        updateAvatarDisplay(resultDataUrl);
      } catch (err) {
        console.error("[ProfileView] upload error:", err);
        const msg = (err && err.message) || "Gagal mengunggah foto. Coba lagi.";
        Toast.error(msg);
        photoInput.value = "";
      }
    }

    const menuActions = [
      "manage-account", "manage-category", "manage-merchant", "savings", "export", "activity-log", "logout",
    ];
    menuActions.forEach((action) => {
      const el = container.querySelector(`[data-action="${action}"]`);
      if (!el) return;
      if (action === "logout") {
        el.addEventListener("click", () => {
          Modal.confirmDialog({
            title: "Keluar dari akun ini?",
            message: "Kamu bisa masuk kembali kapan saja.",
            confirmLabel: "Keluar",
            onConfirm: doLogout,
          });
        });
      } else {
        el.addEventListener("click", () => openMenuAction(action, username));
      }
    });

    const unsub = ConnectionStatus.onChange((status, pending) => {
      const badge = container.querySelector(".status-badge");
      if (badge) {
        badge.outerHTML = statusBadgeHtml(status, pending);
        refreshIcons();
      }
    });

    document.addEventListener("profileViewCleanup", () => {
      if (unsub) unsub();
    }, { once: true });
  }

  function showCropModal(dataUrl, img) {
    return new Promise((resolve) => {
      const VW = 280;
      const VH = 280;
      const CS = Math.round(VW * 0.55);

      const scale = Math.min(VW / img.naturalWidth, VH / img.naturalHeight);
      const dispW = Math.round(img.naturalWidth * scale);
      const dispH = Math.round(img.naturalHeight * scale);
      const imgOffX = Math.round((VW - dispW) / 2);
      const imgOffY = Math.round((VH - dispH) / 2);
      const imgRight = imgOffX + dispW;
      const imgBottom = imgOffY + dispH;

      let cx = Math.round((VW - CS) / 2);
      let cy = Math.round((VH - CS) / 2);

      function constrain(x, y) {
        return {
          x: Math.max(imgOffX, Math.min(imgRight - CS, x)),
          y: Math.max(imgOffY, Math.min(imgBottom - CS, y)),
        };
      }

      const html = `
        <div class="modal-head"><h3>Atur Foto Profil</h3></div>
        <div class="modal-body" style="text-align:center;">
          <div style="position:relative;width:${VW}px;height:${VH}px;margin:0 auto;overflow:hidden;border-radius:8px;background:#111;">
            <img src="${dataUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;pointer-events:none;">
            <div id="ppCropWindow" style="position:absolute;width:${CS}px;height:${CS}px;border:2px solid #fff;border-radius:50%;cursor:grab;top:${cy}px;left:${cx}px;box-shadow:0 0 0 9999px rgba(0,0,0,0.55);touch-action:none;"></div>
          </div>
          <p style="margin-top:8px;font-size:12px;color:var(--text-muted);">Seret lingkaran untuk memilih area foto</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="ppCropCancel">Batal</button>
          <button class="btn btn-primary" id="ppCropSave">Simpan</button>
        </div>`;
      Modal.open(html, { small: true });

      const win = document.getElementById("ppCropWindow");
      if (win) setupDrag(win, constrain, (x, y) => { cx = x; cy = y; });

      document.getElementById("ppCropCancel").onclick = () => Modal.close(() => resolve(null));
      document.getElementById("ppCropSave").onclick = () => {
        const natCropX = (cx - imgOffX) / scale;
        const natCropY = (cy - imgOffY) / scale;
        const natCropSize = CS / scale;
        Modal.close(() => resolve({ x: natCropX, y: natCropY, size: natCropSize }));
      };
    });
  }

  function setupDrag(el, constrainFn, onMove) {
    let dragging = false;
    let startX, startY, startLeft, startTop;

    function pointerDown(e) {
      dragging = true;
      const rect = el.getBoundingClientRect();
      startLeft = el.offsetLeft;
      startTop = el.offsetTop;
      if (e.type.startsWith("touch")) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        document.addEventListener("touchmove", pointerMove, { passive: false });
        document.addEventListener("touchend", pointerUp);
      } else {
        startX = e.clientX;
        startY = e.clientY;
        document.addEventListener("mousemove", pointerMove);
        document.addEventListener("mouseup", pointerUp);
        e.preventDefault();
      }
    }

    function pointerMove(e) {
      if (!dragging) return;
      const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const pos = constrainFn(startLeft + dx, startTop + dy);
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      if (e.type.startsWith("touch")) e.preventDefault();
    }

    function pointerUp() {
      if (!dragging) return;
      dragging = false;
      const left = parseInt(el.style.left, 10);
      const top = parseInt(el.style.top, 10);
      if (!isNaN(left) && !isNaN(top) && onMove) onMove(left, top);
      document.removeEventListener("mousemove", pointerMove);
      document.removeEventListener("mouseup", pointerUp);
      document.removeEventListener("touchmove", pointerMove);
      document.removeEventListener("touchend", pointerUp);
    }

    el.addEventListener("mousedown", pointerDown);
    el.addEventListener("touchstart", pointerDown, { passive: true });
  }

  function cropFromOriginal(img, cropArea, outputSize) {
    return new Promise((resolve, reject) => {
      try {
        const srcX = cropArea.x;
        const srcY = cropArea.y;
        const srcSize = cropArea.size;

        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        reject(new Error("Gagal memproses foto. Coba lagi."));
      }
    });
  }

  function updateAvatarDisplay(dataUrl) {
    const avatarBtn = document.getElementById("ppAvatarBtn");
    if (avatarBtn) {
      avatarBtn.innerHTML = `<img class="pp-avatar" src="${dataUrl}" alt="avatar">`;
    }
    const photoActions = document.getElementById("ppPhotoActions");
    if (photoActions) photoActions.classList.remove("show");
  }

  function openMenuAction(action, username) {
    switch (action) {
      case "manage-account": SettingView.openAccountManager(username); break;
      case "manage-category": SettingView.openCategoryManager(username); break;
      case "manage-merchant": SettingView.openMerchantManager(username); break;
      case "savings": SettingView.openSavingsModal(username); break;
      case "export": SettingView.openExportModal(username); break;
      case "activity-log": openActivityLogModal(username); break;
    }
  }

  function openActivityLogModal(username) {
    DataStore.getActivityLogs(username).then((logs) => {
      const rows = logs.length === 0
        ? `<p class="acc-mgmt-empty">Belum ada aktivitas yang tercatat.</p>`
        : logs.map((log) => {
            const time = new Date(log.timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
            const icon = { created: "plus-circle", updated: "pencil", deleted: "trash-2", exported: "download", imported: "upload" }[log.action] || "info";
            const color = { created: "var(--brand-500)", updated: "var(--info-500)", deleted: "var(--coral-500)", exported: "var(--text-muted)", imported: "var(--gold-500)" }[log.action] || "var(--text-muted)";
            return `<div class="acc-mgmt-row" style="cursor:default;border-color:transparent;">
              <i data-lucide="${icon}" style="width:15px;height:15px;flex-shrink:0;color:${color};"></i>
              <span class="mgmt-name">${escapeHtml(log.detail)}</span>
              <span class="mgmt-sub">${time}</span>
            </div>`;
          }).join("");

      Modal.open(`
        <div class="modal-head"><h3>Activity Log</h3><button class="modal-close" id="activityLogClose"><i data-lucide="x"></i></button></div>
        <div class="modal-body" style="padding:8px 12px;">
          <div class="acc-mgmt-list">${rows}</div>
        </div>`);
      document.getElementById("activityLogClose").onclick = Modal.close;
      refreshIcons();
    }).catch((err) => {
      console.error("[Profile] activity log error:", err);
      Toast.error("Gagal memuat activity log.");
    });
  }

  return { render };
})();
