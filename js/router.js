const Router = (function () {
  let _blocked = false;
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
    const [path, qs] = raw.split("?");
    return { path, params: new URLSearchParams(qs || "") };
  }
  function navigate(path, params) {
    let h = "#/" + path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) h += "?" + qs;
    }
    if (location.hash === h) { window.dispatchEvent(new HashChangeEvent("hashchange")); }
    else location.hash = h;
  }
  function block() { _blocked = true; }
  function unblock() { _blocked = false; }
  function isBlocked() { return _blocked; }
  return { parseHash, navigate, block, unblock, isBlocked };
})();

let currentSession = null;
let _lastPath = null;

const VIEW_SCRIPTS = {
  dashboard: { src: "js/views/dashboard.js", ready: () => typeof DashboardView !== "undefined" },
  transaction: { src: "js/views/transaction.js", ready: () => typeof TransactionView !== "undefined" },
  insight: { src: "js/views/insight.js", ready: () => typeof InsightView !== "undefined" },
  "insight-detail": { src: "js/views/insight-detail.js", ready: () => typeof InsightDetailView !== "undefined" },
  profile: { src: "js/views/profile.js", ready: () => typeof ProfileView !== "undefined" },
};

async function renderRoute() {
  if (!currentSession || Router.isBlocked()) return;
  const { path, params } = Router.parseHash();
  Layout.setActive(Layout.currentTopKey());
  const root = document.getElementById("viewRoot");
  const isNav = path !== _lastPath;
  const prevPath = _lastPath;
  _lastPath = path;
  if (prevPath === "profile") {
    window.dispatchEvent(new CustomEvent("profileViewCleanup"));
  }

  const entry = VIEW_SCRIPTS[path];
  if (entry) {
    try {
      if (!entry.ready()) {
        await loadScript(entry.src);
      }
      if (path === "profile" && typeof SettingView === "undefined") {
        await loadScript("js/views/setting.js").catch(() => {});
      }
    } catch (e) {
      console.error("[Router] Gagal load view:", e);
      root.innerHTML = '<div class="empty-state"><div class="empty-illustration"><i data-lucide="alert-triangle"></i></div><h4>Gagal memuat halaman</h4><p>Coba refresh atau periksa koneksi.</p></div>';
      refreshIcons();
      return;
    }
  }

  if (root.innerHTML.trim() !== "" && isNav && !root.classList.contains("view-exit")) {
    root.classList.remove("view-root");
    root.classList.add("view-exit");
    void root.offsetWidth;

    requestAnimationFrame(() => {
      setTimeout(() => {
        doRender(root, path, params, true);
      }, 130);
    });
  } else {
    doRender(root, path, params, isNav);
  }
}

function doRender(root, path, params, hasAnim) {
  destroyActiveCharts();
  if (window.__dashboardClockInterval) { clearInterval(window.__dashboardClockInterval); window.__dashboardClockInterval = null; }
  root.classList.remove("view-exit");
  root.classList.remove("view-root");
  if (hasAnim) {
    void root.offsetWidth;
    root.classList.add("view-root");
  }

  switch (path) {
    case "dashboard": DashboardView.render(root, currentSession); break;
    case "transaction": TransactionView.render(root, currentSession); break;
    case "insight": InsightView.render(root, currentSession); break;
    case "insight-detail": InsightDetailView.render(root, currentSession, params); break;
    case "profile": ProfileView.render(root, currentSession); break;
    default: DashboardView.render(root, currentSession); break;
  }
}

window.addEventListener("hashchange", renderRoute);

window.openAddTransaction = async function (defaultType) {
  const session = currentSession || SessionStore.get();
  if (!session) return;
  if (typeof TxModal === "undefined") {
    try {
      await loadScript("js/modals/transaction.js");
    } catch (e) {
      console.error("[Router] Gagal load modal transaksi:", e);
      Toast.error("Gagal membuka form transaksi.");
      return;
    }
  }
  try {
    const accounts = await DataStore.getAccounts(session.username);
    if (accounts.length === 0) {
      Toast.error("Tambahkan akun terlebih dahulu di Manajemen Akun (buka lewat menu profil).");
      try {
        if (typeof SettingView === "undefined") {
          await loadScript("js/views/setting.js");
        }
        SettingView.openAccountManager(session.username);
      } catch (e) {
        console.error("[Router] Gagal load setting:", e);
      }
      return;
    }
    TxModal.open(session.username, { defaultType, onSaved: renderRoute });
  } catch (err) {
    console.error("[Router] getAccounts error:", err);
    Toast.error("Gagal memuat data akun.");
  }
};
