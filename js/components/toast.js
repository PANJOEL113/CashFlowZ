const Toast = (function () {
  const ICONS = { success: "check-circle-2", error: "alert-circle", info: "info" };
  const MAX_TOASTS = 5;

  function show(message, type) {
    type = type || "info";
    const stack = document.getElementById("toastStack");
    if (!stack) return;

    const existing = stack.querySelectorAll('.toast');
    if (existing.length >= MAX_TOASTS) {
      existing[0].remove();
    }

    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon"><i data-lucide="${ICONS[type] || "info"}"></i></div>
      <div class="toast-msg">${escapeHtml(message)}</div>
      <button class="toast-close" type="button" aria-label="Close"><i data-lucide="x"></i></button>`;
    stack.appendChild(el);
    refreshIcons();

    const closeBtn = el.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        el.classList.add("hide");
        setTimeout(() => el.remove(), 240);
      });
    }

    const duration = type === 'error' ? 5000 : 3500;
    setTimeout(() => {
      el.classList.add("hide");
      setTimeout(() => el.remove(), 240);
    }, duration);
  }

  return { success: (m) => show(m, "success"), error: (m) => show(m, "error"), info: (m) => show(m, "info") };
})();

const Loading = {
  show() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("open");
  },
  hide() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("open");
  },
};
