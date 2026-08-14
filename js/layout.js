const Layout = (function () {
  const NAV_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "transaction", label: "Transaksi", icon: "arrow-left-right" },
    { key: "insight", label: "Insight", icon: "pie-chart" },
    { key: "profile", label: "Profil", icon: "user" },
  ];
  const TOPBAR_TITLES = { dashboard: "Dashboard", transaction: "Transaksi", insight: "Insight", profile: "Profil" };

  // ---- Bottom-nav FAB speed-dial ----
  let fabMenuOpen = false;
  let fabOutsideWired = false;

  function toggleFabMenu() {
    fabMenuOpen = !fabMenuOpen;
    renderFabMenu();
  }

  function renderFabMenu() {
    const wrap = document.querySelector(".bn-fab-wrap");
    if (!wrap) return;
    if (fabMenuOpen) {
      if (wrap.querySelector(".fab-mini-stack")) return;
      wrap.insertAdjacentHTML("beforeend", `
        <div class="fab-mini-stack">
          <button type="button" class="fab-mini" data-action="manual" aria-label="Tambah manual"><i data-lucide="pencil"></i> Manual</button>
        </div>`);
      refreshIcons();
      wrap.querySelectorAll(".fab-mini").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          closeFabMenu();
          if (action === "manual") {
            window.openAddTransaction();
          }
        });
      });
    } else {
      closeFabMenu();
    }
  }

  function closeFabMenu() {
    fabMenuOpen = false;
    const stack = document.querySelector(".fab-mini-stack");
    if (stack) {
      stack.classList.add("closing");
      setTimeout(() => stack.remove(), 160);
    }
  }

  function wireFabOutsideClick() {
    if (fabOutsideWired) return;
    fabOutsideWired = true;
    document.addEventListener("click", (e) => {
      if (fabMenuOpen && !e.target.closest(".bn-fab-wrap")) {
        closeFabMenu();
      }
    });
  }
  wireFabOutsideClick();

  function renderChrome(session) {
    return DataStore.getProfile(session.username).then((profile) => {
      renderSidebar(profile);
      renderMobileTopbar(profile, session);
      renderBottomNav();
      wireProfileTriggers(session.username);
      setActive(currentTopKey());
      refreshIcons();
    }).catch((err) => {
      console.error("[Layout] renderChrome error:", err);
      Toast.error("Gagal memuat data profil.");
    });
  }

  function currentTopKey() {
    const path = Router.parseHash().path;
    return path.startsWith("insight") && path !== "profile" ? "insight" : (path === "profile" ? "profile" : path);
  }

  function setActive(activeKey) {
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.key === activeKey));
    document.querySelectorAll(".bn-item[data-key]").forEach((el) => el.classList.toggle("active", el.dataset.key === activeKey));
    const titleEl = document.getElementById("mobileTopbarTitle");
    if (titleEl) titleEl.textContent = TOPBAR_TITLES[activeKey] || "Dashboard";
  }

  function renderSidebar(profile) {
    const root = document.getElementById("sidebar");
    const navHtml = NAV_ITEMS.map((item) => `
      <a class="nav-item" href="#/${item.key}" data-key="${item.key}">
        <i data-lucide="${item.icon}"></i><span>${item.label}</span>
      </a>`).join("");
    root.innerHTML = `
      <div class="sidebar-brand">
        <img src="asset/logo/logofull.svg" alt="CashFlowZ" style="width:100%;max-width:220px;height:auto;">
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <button class="sidebar-profile" id="sidebarProfileTrigger" type="button">
        ${profile.photo ? `<img class="avatar" src="${profile.photo}" alt="avatar">` : `<div class="avatar">${escapeHtml((profile.name || "U").charAt(0).toUpperCase())}</div>`}
        <div class="profile-meta">
          <div class="profile-name">${escapeHtml(profile.name)}</div>
        </div>
      </button>`;
  }

  function renderMobileTopbar(profile, session) {
    const root = document.getElementById("mobileTopbar");
    root.innerHTML = `
      <div class="mt-strip">
        <span class="mt-title" id="mobileTopbarTitle">Dashboard</span>
        <div class="mt-actions"></div>
      </div>`;
  }

  function renderBottomNav() {
    const root = document.getElementById("bottomNav");
    if (!root) return;
    fabMenuOpen = false;
    root.hidden = false;
    const left = NAV_ITEMS.slice(0, 2), right = NAV_ITEMS.slice(2);
    const item = (i) => `<a class="bn-item" href="#/${i.key}" data-key="${i.key}"><i data-lucide="${i.icon}"></i></a>`;
    root.innerHTML = `
      ${left.map(item).join("")}
      <div class="bn-fab-wrap"><button class="bn-fab" id="bnFabBtn" type="button"><i data-lucide="plus"></i></button></div>
      ${right.map(item).join("")}`;
    const fabBtn = document.getElementById("bnFabBtn");
    if (fabBtn) {
      fabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFabMenu();
      });
    }
  }

  function wireProfileTriggers(username) {
    const sidebarTrigger = document.getElementById("sidebarProfileTrigger");
    if (sidebarTrigger) sidebarTrigger.addEventListener("click", () => ProfileMenu.open(username, sidebarTrigger));
  }

  return { renderChrome, setActive, currentTopKey };
})();

const ProfileMenu = (function () {
  const MOBILE_BREAKPOINT = 900;

  function open(username, anchorEl) {
    Promise.all([DataStore.getProfile(username), DataStore.getSettings(username)]).then(([profile, settings]) => {
      const html = buildContent(profile, settings);
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        Modal.open(html, { small: true });
        const box = document.getElementById("modalBox");
        const closeProfile = () => {
          return new Promise((resolve) => {
            if (box && box._unsubStatus) box._unsubStatus();
            Modal.close(resolve);
          });
        };
        wire(box, username, closeProfile);
        enableSwipeToDismiss(box, closeProfile);
      } else {
        openDropdown(anchorEl, html, username);
      }
    }).catch((err) => {
      console.error("[ProfileMenu] load error:", err);
      Toast.error("Gagal memuat menu profil.");
    });
  }

  function statusBadgeHtml(status) {
    const map = {
      online: { label: "Online", cls: "st-online", icon: "circle-dot" },
      offline: { label: "Offline", cls: "st-offline", icon: "circle" },
      syncing: { label: "Syncing...", cls: "st-syncing", icon: "loader-2" },
      pending: { label: "Pending Sync", cls: "st-pending", icon: "clock" },
    };
    const s = map[status] || map.online;
    return `<span class="status-badge ${s.cls}"><i data-lucide="${s.icon}" class="${status === "syncing" ? "spin-icon" : ""}"></i>${s.label}</span>`;
  }

  function buildContent(profile, settings) {
    return `
      <div class="profile-menu">
        <div class="sheet-handle"></div>

        <div class="profile-menu-head">
          ${profile.photo ? `<button type="button" id="pmAvatarBtn" class="pm-avatar-btn"><img class="pm-avatar" src="${profile.photo}" alt="avatar"></button>` : `<button type="button" id="pmAvatarBtn" class="pm-avatar-btn"><div class="pm-avatar pm-avatar-fallback">${escapeHtml((profile.name || "U").charAt(0).toUpperCase())}</div></button>`}
          <div class="pm-name">${escapeHtml(profile.name)}</div>
          <div class="pm-email">${escapeHtml(profile.email || "")}</div>
          ${statusBadgeHtml(ConnectionStatus.getStatus())}
          <div class="pm-photo-actions" id="pmPhotoActions">
            <button type="button" data-action="photo">Ganti Foto</button>
            <button type="button" data-action="clear-photo">Hapus Foto</button>
          </div>
        </div>
        <div class="divider"></div>

        <div class="pm-section-label">Menu Profil</div>
        <button type="button" class="profile-menu-item" data-action="manage-account"><i data-lucide="wallet-cards"></i><span>Dompet</span><i data-lucide="chevron-right" class="pm-chev"></i></button>
        <button type="button" class="profile-menu-item" data-action="manage-category"><i data-lucide="tags"></i><span>Kategori</span><i data-lucide="chevron-right" class="pm-chev"></i></button>
        <button type="button" class="profile-menu-item" data-action="manage-merchant"><i data-lucide="store"></i><span>Merchant</span><i data-lucide="chevron-right" class="pm-chev"></i></button>
        <button type="button" class="profile-menu-item" data-action="savings"><i data-lucide="piggy-bank"></i><span>Tabungan</span><i data-lucide="chevron-right" class="pm-chev"></i></button>

        <div class="pm-section-label">Preferensi</div>
        <div class="profile-menu-item toggle-item">
          <span><i data-lucide="moon"></i> Dark Mode</span>
          <label class="switch"><input type="checkbox" id="pmDarkSwitch" ${settings.theme === "dark" ? "checked" : ""}><span class="slider"></span></label>
        </div>
        <button type="button" class="profile-menu-item" data-action="export"><i data-lucide="download"></i><span>Ekspor Data</span><i data-lucide="chevron-right" class="pm-chev"></i></button>

        <div class="divider"></div>
        <button type="button" class="profile-menu-item danger" data-action="logout"><i data-lucide="log-out"></i><span>Logout</span></button>
        <input type="file" id="pmPhotoInput" accept="image/*" style="display:none;">
      </div>`;
  }

  function wire(container, username, closeFn) {
    refreshIcons();

    const unsub = ConnectionStatus.onChange((status, pending) => {
      const badge = container.querySelector(".status-badge");
      if (badge) {
        const label = status === "pending" && pending > 0 ? `${pending} pending` : undefined;
        const map = {
          online: { label: "Online", cls: "st-online", icon: "circle-dot" },
          offline: { label: "Offline", cls: "st-offline", icon: "circle" },
          syncing: { label: "Syncing...", cls: "st-syncing", icon: "loader-2" },
          pending: { label: label || "Pending Sync", cls: "st-pending", icon: "clock" },
        };
        const s = map[status] || map.online;
        badge.outerHTML = `<span class="status-badge ${s.cls}"><i data-lucide="${s.icon}" class="${status === "syncing" ? "spin-icon" : ""}"></i>${s.label}</span>`;
        refreshIcons();
      }
    });

    container._unsubStatus = unsub;

    const darkSwitch = container.querySelector("#pmDarkSwitch");
    if (darkSwitch) darkSwitch.addEventListener("change", () => toggleTheme(username));

    const photoInput = container.querySelector("#pmPhotoInput");
    const photoActions = container.querySelector("#pmPhotoActions");
    const avatarBtn = container.querySelector("#pmAvatarBtn");

    // Toggle photo actions when avatar is clicked
    if (avatarBtn) {
      avatarBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoActions.classList.toggle("show");
      });
    }

    // Photo actions
    const pmPhotoBtn = container.querySelector('[data-action="photo"]');
    const pmClearBtn = container.querySelector('[data-action="clear-photo"]');
    if (pmPhotoBtn) pmPhotoBtn.addEventListener("click", () => photoInput.click());
    if (pmClearBtn) {
      pmClearBtn.addEventListener("click", () => {
        DataStore.saveProfile(username, { photo: null })
          .then(() => {
            Toast.success("Foto profil dihapus.");
            closeFn();
            Layout.renderChrome(currentSession);
          })
          .catch((err) => {
            console.error("[ProfileMenu] clear photo error:", err);
            Toast.error("Gagal menghapus foto. Coba lagi.");
          });
      });
    }
    photoInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        if (!file.type || !file.type.startsWith("image/")) {
          Toast.error("File harus berupa gambar (JPG/PNG/dll).");
          photoInput.value = "";
          return;
        }
        const img = await readImageFromFile(file);
        const cropArea = await showCropModal(img.src, img);
        if (!cropArea) {
          photoInput.value = "";
          return;
        }
        const jpeg = await cropFromImg(img, cropArea, 300);
        console.log("[ProfileMenu] result size:", Math.round(jpeg.length / 1024), "KB");
        await DataStore.saveProfile(username, { photo: jpeg });
        Toast.success("Foto profil berhasil diperbarui.");
        photoInput.value = "";
        closeFn();
        Layout.renderChrome(currentSession);
      } catch (err) {
        console.error("[ProfileMenu] upload error:", err);
        const msg = (err && err.message) || "Gagal mengunggah foto. Coba lagi.";
        Toast.error(msg);
        photoInput.value = "";
      }
    });

    const wireAction = (sel, fn) => { const el = container.querySelector(sel); if (el) el.addEventListener("click", fn); };
    const withSettingView = (fn) => {
      return async () => {
        if (typeof SettingView === "undefined") {
          try {
            await loadScript("js/views/setting.js");
          } catch (e) {
            console.error("[ProfileMenu] Gagal load setting:", e);
            Toast.error("Gagal memuat halaman pengaturan.");
            return;
          }
        }
        await fn();
      };
    };
    wireAction('[data-action="manage-account"]', withSettingView(async () => { await closeFn(); SettingView.openAccountManager(username); }));
    wireAction('[data-action="manage-category"]', withSettingView(async () => { await closeFn(); SettingView.openCategoryManager(username); }));
    wireAction('[data-action="manage-merchant"]', withSettingView(async () => { await closeFn(); SettingView.openMerchantManager(username); }));
    wireAction('[data-action="savings"]', withSettingView(async () => { await closeFn(); SettingView.openSavingsModal(username); }));
    wireAction('[data-action="export"]', withSettingView(async () => { await closeFn(); SettingView.openExportModal(username); }));

    const logoutEl = container.querySelector('[data-action="logout"]');
    if (logoutEl) logoutEl.addEventListener("click", () => {
      closeFn();
      Modal.confirmDialog({
        title: "Keluar dari akun ini?", message: "Kamu bisa masuk kembali kapan saja.", confirmLabel: "Keluar",
        onConfirm: doLogout,
      });
    });
  }

  function openEditProfileModal(username) {
    DataStore.getProfile(username).then((profile) => {
      Modal.open(`
        <div class="modal-head"><h3>Edit Profil</h3><button class="modal-close" id="editProfileClose"><i data-lucide="x"></i></button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Foto Profil</label>
            <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
              ${profile.photo ? `<img src="${profile.photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">` : `<div style="width:48px;height:48px;border-radius:50%;background:var(--brand-300);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">${escapeHtml((profile.name || "U").charAt(0).toUpperCase())}</div>`}
              <button type="button" class="btn btn-sm btn-outline" id="editProfilePhotoBtn">Ganti</button>
            </div>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label>Nama Pengguna</label>
            <input type="text" class="form-control" id="editProfileName" value="${escapeHtml(profile.name || "")}" placeholder="Masukkan nama" maxlength="30">
            <span style="font-size:10.5px;color:var(--text-muted);margin-top:2px;display:block;" id="nameCharCount">${(profile.name || "").length}/30</span>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="form-control" id="editProfileEmail" value="${escapeHtml(profile.email || "")}" readonly style="opacity:.6;cursor:not-allowed;background:var(--bg-elevated);">
          </div>
          <div class="form-error" id="editProfileError" style="display:none;"></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="editProfileCancel" type="button">Batal</button>
          <button class="btn btn-primary" id="editProfileSave" type="button"><span id="editProfileSaveLabel">Simpan</span><span id="editProfileSaveSpinner" class="spinner" hidden></span></button>
        </div>
        <input type="file" id="editProfilePhotoInput" accept="image/*" style="display:none;">`, { small: true });
      refreshIcons();
      document.getElementById("editProfileClose").onclick = Modal.close;
      document.getElementById("editProfileCancel").onclick = Modal.close;

      const nameInput = document.getElementById("editProfileName");
      const saveBtn = document.getElementById("editProfileSave");
      const saveLabel = document.getElementById("editProfileSaveLabel");
      const saveSpinner = document.getElementById("editProfileSaveSpinner");
      const errorEl = document.getElementById("editProfileError");
      const charCount = document.getElementById("nameCharCount");

      nameInput.addEventListener("input", () => {
        charCount.textContent = `${nameInput.value.length}/30`;
      });

      saveBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        if (!name || name.length < 3) {
          errorEl.textContent = "Nama minimal 3 karakter.";
          errorEl.style.display = "block";
          return;
        }
        if (name.length > 30) {
          errorEl.textContent = "Nama maksimal 30 karakter.";
          errorEl.style.display = "block";
          return;
        }
        errorEl.style.display = "none";
        saveBtn.disabled = true;
        saveLabel.textContent = "Menyimpan...";
        saveSpinner.hidden = false;

        Promise.all([
          DataStore.saveProfile(username, { name }),
          window.FBAuth.updateProfileDisplayName(name).catch((err) => {
            console.error('[EditProfile] updateDisplayName failed:', err);
          }),
        ]).then(() => {
          Modal.close();
          Toast.success("Profil berhasil diperbarui.");
          Layout.renderChrome(currentSession);
        }).catch((err) => {
          console.error("[EditProfile]", err);
          errorEl.textContent = "Gagal menyimpan. Coba lagi.";
          errorEl.style.display = "block";
          saveBtn.disabled = false;
          saveLabel.textContent = "Simpan";
          saveSpinner.hidden = true;
        });
      });

      // Photo change (dengan resize + error handling)
      const photoBtn = document.getElementById("editProfilePhotoBtn");
      const photoInput = document.getElementById("editProfilePhotoInput");
      if (photoBtn) photoBtn.addEventListener("click", () => photoInput.click());
      if (photoInput) {
        photoInput.addEventListener("change", async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try {
            if (!file.type || !file.type.startsWith("image/")) {
              Toast.error("File harus berupa gambar (JPG/PNG/dll).");
              photoInput.value = "";
              return;
            }
            const img = await readImageFromFile(file);
            const cropArea = await showCropModal(img.src, img);
            if (!cropArea) {
              photoInput.value = "";
              return;
            }
            const jpeg = await cropFromImg(img, cropArea, 300);

            console.log("[EditProfile] result size:", Math.round(jpeg.length / 1024), "KB");

            await DataStore.saveProfile(username, { photo: jpeg });
            Toast.success("Foto profil berhasil diperbarui.");
            photoInput.value = "";
            Modal.close();
            Layout.renderChrome(currentSession);
          } catch (err) {
            console.error("[EditProfile] photo upload error:", err);
            const msg = (err && err.message) || "Gagal mengunggah foto. Coba lagi.";
            Toast.error(msg);
            photoInput.value = "";
          }
        });
      }
    });
  }

  // ==== Crop modal interaktif (geser lingkaran) ====

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
            <div id="pmCropWindow" style="position:absolute;width:${CS}px;height:${CS}px;border:2px solid #fff;border-radius:50%;cursor:grab;top:${cy}px;left:${cx}px;box-shadow:0 0 0 9999px rgba(0,0,0,0.55);touch-action:none;"></div>
          </div>
          <p style="margin-top:8px;font-size:12px;color:var(--text-muted);">Seret lingkaran untuk memilih area foto</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" id="pmCropCancel">Batal</button>
          <button class="btn btn-primary" id="pmCropSave">Simpan</button>
        </div>`;
      Modal.open(html, { small: true });

      const win = document.getElementById("pmCropWindow");
      if (win) setupDrag(win, constrain, (x, y) => { cx = x; cy = y; });

      document.getElementById("pmCropCancel").onclick = () => Modal.close(() => resolve(null));
      document.getElementById("pmCropSave").onclick = () => {
        const natX = (cx - imgOffX) / scale;
        const natY = (cy - imgOffY) / scale;
        const natS = CS / scale;
        Modal.close(() => resolve({ x: natX, y: natY, size: natS }));
      };
    }).catch((err) => {
      console.error("[EditProfile] load error:", err);
      Toast.error("Gagal memuat data profil.");
    });
  }

  function setupDrag(el, constrainFn, onMove) {
    let dragging = false;
    let startX, startY, startLeft, startTop;

    function pointerDown(e) {
      dragging = true;
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
      const cx = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
      const cy = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;
      const pos = constrainFn(startLeft + (cx - startX), startTop + (cy - startY));
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

  function cropFromImg(img, cropArea, outputSize) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.size, cropArea.size, 0, 0, outputSize, outputSize);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (err) {
        reject(new Error("Gagal memproses foto. Coba lagi."));
      }
    });
  }

  // ---- Swipe-to-dismiss (mobile bottom sheet only; drag from the handle) ----
  function enableSwipeToDismiss(box, onDismiss) {
    const handle = box.querySelector(".sheet-handle");
    if (!handle) return;
    let startY = 0, dragY = 0, dragging = false;
    handle.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; dragging = true; box.style.transition = "none"; }, { passive: true });
    handle.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      dragY = Math.max(0, e.touches[0].clientY - startY);
      box.style.transform = `translateY(${dragY}px)`;
    }, { passive: true });
    handle.addEventListener("touchend", () => {
      dragging = false;
      box.style.transition = "";
      if (dragY > 90) { onDismiss(); } else { box.style.transform = ""; }
      dragY = 0;
    });
  }

  // ---- Dropdown (desktop): positions itself relative to whichever avatar
  // trigger was clicked — opens upward/left-aligned near the sidebar's
  // bottom avatar, or downward/right-aligned near the top-right avatar.
  function closeDropdown() {
    const el = document.getElementById("profileDropdown");
    if (el) {
      if (el._outsideHandler) document.removeEventListener("click", el._outsideHandler);
      if (el._unsubStatus) el._unsubStatus();
      el.remove();
    }
    document.removeEventListener("keydown", escHandler);
  }
  function escHandler(e) { if (e.key === "Escape") closeDropdown(); }

  function openDropdown(anchorEl, html, username) {
    closeDropdown();
    const rect = anchorEl.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "profile-dropdown";
    el.id = "profileDropdown";
    el.innerHTML = html;

    const openUpward = rect.top > window.innerHeight / 2;
    if (openUpward) { el.style.bottom = (window.innerHeight - rect.top + 8) + "px"; el.style.transformOrigin = "bottom left"; }
    else { el.style.top = (rect.bottom + 8) + "px"; el.style.transformOrigin = "top right"; }

    const nearRightEdge = rect.left > window.innerWidth / 2;
    if (nearRightEdge) el.style.right = (window.innerWidth - rect.right) + "px";
    else el.style.left = rect.left + "px";

    document.body.appendChild(el);
    wire(el, username, closeDropdown);

    function outsideHandler(e) { if (!el.contains(e.target) && !anchorEl.contains(e.target)) closeDropdown(); }
    el._outsideHandler = outsideHandler;
    setTimeout(() => { document.addEventListener("click", outsideHandler); document.addEventListener("keydown", escHandler); }, 0);
  }

  return { open, openEditProfileModal };
})();

