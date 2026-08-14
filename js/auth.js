/* App bootstrap */

// Shared logout used by both the sidebar profile menu (layout.js) and the
// mobile profile page (views/profile.js).
let _cachedSessionUnsub = null;

function doLogout() {
  if (_cachedSessionUnsub) { _cachedSessionUnsub(); _cachedSessionUnsub = null; }
  const username = currentSession && currentSession.username;
  window.FBAuth.logout().catch((err) => console.error("[Auth] logout error:", err));
  if (username) DataStore.stopSync(username);
  SessionStore.clear();
  currentSession = null;
  showLogin();
}

function hideAuthViews() {
  const splash = document.getElementById("splashView");
  const welcome = document.getElementById("welcomeView");
  const login = document.getElementById("loginView");
  if (splash) splash.hidden = true;
  if (welcome) welcome.hidden = true;
  if (login) login.hidden = true;
}

function showSplash() {
  const shell = document.getElementById("appShell");
  const nav = document.getElementById("bottomNav");
  hideAuthViews();
  if (shell) shell.hidden = true;
  if (nav) nav.hidden = true;
  const view = document.getElementById("splashView");
  if (!view) return;
  view.classList.remove("exit");
  view.hidden = false;
}

function showLogin() {
  const shell = document.getElementById("appShell");
  const nav = document.getElementById("bottomNav");
  hideAuthViews();
  if (shell) shell.hidden = true;
  if (nav) nav.hidden = true;
  const view = document.getElementById("loginView");
  if (!view) return;
  view.hidden = false;
  restartCardAnimation(view.querySelector(".auth-card"));
  applyTheme("light");
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const rememberMe = document.getElementById("rememberMe");
  if (form) form.reset();
  if (rememberMe) rememberMe.checked = true;
  if (errorBox) errorBox.classList.remove("show");
}

// Re-triggers the CSS fade+scale entrance animation each time a card is
// shown again (toggling `hidden` alone won't replay a CSS animation).
function restartCardAnimation(card) {
  if (!card) return;
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";
}

function showApp(session) {
  currentSession = session;
  Router.block();
  hideAuthViews();
  const shell = document.getElementById("appShell");
  if (shell) shell.hidden = false;
  initThemeFromStorage(session.username);
  Layout.renderChrome(session).then(() => {
    renderRoute();
    Router.unblock();
  }).catch((err) => {
    console.error("[Auth] renderChrome error:", err);
    Toast.error("Gagal memuat tampilan. Coba refresh halaman.");
    Router.unblock();
  });
}

function wireResetPasswordModal() {
  const modal       = document.getElementById("resetPasswordModal");
  const closeBtn    = document.getElementById("resetModalClose");
  const cancelBtn   = document.getElementById("resetCancelBtn");
  const submitBtn   = document.getElementById("resetSubmitBtn");
  const emailInput  = document.getElementById("resetEmail");
  const errorBox    = document.getElementById("resetError");
  const btnLabel    = document.getElementById("resetBtnLabel");
  const btnSpinner  = document.getElementById("resetBtnSpinner");

  if (!submitBtn || !emailInput || !errorBox || !modal || !btnLabel || !btnSpinner) {
    console.error('[Auth] Reset password elements not found');
    return;
  }

  function openModal() {
    emailInput.value = "";
    errorBox.classList.remove("show");
    errorBox.textContent = "";
    modal.classList.add("open");
    setTimeout(() => emailInput.focus(), 80);
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.classList.add("closing");
    setTimeout(() => {
      modal.classList.remove("closing");
    }, 150);
  }

  const fpBtn = document.getElementById("forgotPasswordBtn");
  if (fpBtn) fpBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  submitBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    errorBox.classList.remove("show");
    errorBox.textContent = "";

    if (!email) {
      errorBox.textContent = "Email tidak boleh kosong.";
      errorBox.classList.add("show");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorBox.textContent = "Format email tidak valid.";
      errorBox.classList.add("show");
      return;
    }

    submitBtn.disabled = true;
    btnLabel.textContent = "Mengirim...";
    btnSpinner.hidden = false;

    try {
      await window.FBAuth.resetPassword(email);
      closeModal();
      Toast.show("✅ Link reset password berhasil dikirim. Silakan cek Inbox atau folder Spam pada email Anda.", "success");
    } catch (err) {
      console.error("[Auth] resetPassword error:", err);
      let msg = "Gagal mengirim email. Coba lagi.";
      if (err.code === "auth/user-not-found")         msg = "Email tidak ditemukan.";
      else if (err.code === "auth/invalid-email")     msg = "Format email tidak valid.";
      else if (err.code === "auth/network-request-failed") msg = "Terjadi kesalahan jaringan. Periksa koneksi Anda.";
      errorBox.textContent = msg;
      errorBox.classList.add("show");
    } finally {
      submitBtn.disabled = false;
      btnLabel.textContent = "Kirim Link Reset";
      btnSpinner.hidden = true;
    }
  });
}

function wireLoginForm() {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const togglePass = document.getElementById("togglePass");
  const welcomeEnterBtn = document.getElementById("welcomeEnterBtn");

  if (!form || !errorBox || !emailInput || !passInput || !togglePass || !welcomeEnterBtn) {
    console.error('[Auth] Required login elements not found');
    return;
  }

  welcomeEnterBtn.addEventListener("click", showLogin);

  togglePass.addEventListener("click", () => {
    const isPass = passInput.type === "password";
    passInput.type = isPass ? "text" : "password";
    togglePass.innerHTML = `<i data-lucide="${isPass ? "eye-off" : "eye"}"></i>`;
    refreshIcons();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value;
    const remember = document.getElementById("rememberMe").checked;

    errorBox.classList.remove("show");
    Loading.show();

    // Firebase Authentication itself verifies the email/password pair --
    // this app never checks credentials on its own.
    window.FBAuth.login(email, password, remember)
      .then((user) => {
        SessionStore.set(user.uid);
        return DataStore.initUser(user.uid, user.email);
      })
      .then(() => {
        setTimeout(() => { Loading.hide(); showApp(SessionStore.get()); }, 350);
      })
      .catch((err) => {
        console.error("[Auth] login error:", err);
        Loading.hide();
        if (err.code) {
          const wrongCredential = [
            "auth/wrong-password",
            "auth/user-not-found",
            "auth/invalid-credential",
            "auth/invalid-login-credentials",
          ].includes(err.code);
          if (wrongCredential) {
            errorBox.textContent = "Email atau password salah.";
          } else if (err.code.startsWith("auth/")) {
            errorBox.textContent = "Gagal terhubung ke server. Coba lagi.";
          } else {
            errorBox.textContent = "Gagal memuat data akun. Periksa koneksi internet Anda dan coba lagi.";
          }
        } else {
          errorBox.textContent = "Gagal memuat data akun. Periksa koneksi internet Anda dan coba lagi.";
        }
        errorBox.classList.add("show");
      });
  });
}

document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "s") {
    e.preventDefault();
    const saveBtn = document.getElementById("txSaveBtn") || document.getElementById("editProfileSave");
    if (saveBtn) saveBtn.click();
  }
  if (ctrl && e.key === "f") {
    const search = document.getElementById("searchInput");
    if (search) { e.preventDefault(); search.focus(); search.select(); }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  wireLoginForm();
  wireResetPasswordModal();
  refreshIcons();
  showSplash();

  // 1) Jika ada cached session, langsung show app (offline-first).
  //    Firebase Auth tetap jalan di background — jika user beneran logout
  //    (bukan cuma offline), nanti redirect ke login.
  const cached = SessionStore.get();
  if (cached) {
    showApp(cached);
    // Tetap subscribe auth state listener untuk deteksi logout server-side
    _cachedSessionUnsub = window.FBAuth.onChange((user) => {
      if (!user && currentSession) {
        if (_cachedSessionUnsub) { _cachedSessionUnsub(); _cachedSessionUnsub = null; }
        SessionStore.clear();
        DataStore.stopSync(currentSession.username);
        currentSession = null;
        showLogin();
        Toast.error("Sesi Anda telah berakhir. Silakan login ulang.");
      }
    });
    return;
  }

  const splashDelay = 3800;

  const unsubscribe = window.FBAuth.onChange((user) => {
    unsubscribe();
    setTimeout(() => {
      const splash = document.getElementById("splashView");
      splash.classList.add("exit");
      setTimeout(() => {
        if (user) {
          SessionStore.set(user.uid);
          DataStore.initUser(user.uid, user.email).then(() => showApp(SessionStore.get())).catch(() => {
            // Offline or error — coba pake cache dulu
            const existing = SessionStore.get();
            if (existing) {
              showApp(existing);
            } else {
              SessionStore.clear();
              showLogin();
              Toast.error("Gagal memuat data. Periksa koneksi Anda.");
            }
          });
        } else {
          // Firebase auth null — cek apakah kita lagi offline
          if (!navigator.onLine) {
            // Offline dan ga ada cached session — tetap show login aja
            showLogin();
          } else {
            SessionStore.clear();
            showLogin();
          }
        }
      }, 450);
    }, splashDelay);
  });
});
