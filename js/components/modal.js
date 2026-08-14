const Modal = (function () {
  function open(innerHtml, opts) {
    opts = opts || {};
    const ov = document.getElementById("modalOverlay");
    if (!ov) return;
    const box = document.getElementById("modalBox");
    if (!box) return;
    ov.classList.toggle("modal-sm", !!opts.small);
    box.innerHTML = innerHtml;
    ov.classList.add("open");
    refreshIcons();
    document.body.style.overflow = "hidden";
  }
  function close(cb) {
    const ov = document.getElementById("modalOverlay");
    const box = document.getElementById("modalBox");
    const callback = typeof cb === "function" ? cb : null;
    if (!ov || !ov.classList.contains("open")) {
      callback && callback();
      return;
    }
    ov.classList.remove("open");
    ov.classList.add("closing");
    setTimeout(() => {
      ov.classList.remove("closing");
      if (box) box.innerHTML = "";
      document.body.style.overflow = "";
      callback && callback();
    }, 150);
  }
  function confirmDialog({ title, message, confirmLabel, onConfirm, danger }) {
    const html = `
      <div class="modal-body">
        <div class="confirm-icon"><i data-lucide="${danger === false ? "help-circle" : "trash-2"}"></i></div>
        <h3 class="confirm-text">${escapeHtml(title)}</h3>
        <p class="confirm-sub">${escapeHtml(message)}</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="confirmCancelBtn">Batal</button>
        <button class="btn ${danger === false ? "btn-primary" : "btn-danger"}" id="confirmOkBtn">${escapeHtml(confirmLabel || "Hapus")}</button>
      </div>`;
    open(html, { small: true });
    document.getElementById("confirmCancelBtn").onclick = close;
    document.getElementById("confirmOkBtn").onclick = () => { close(() => { onConfirm && onConfirm(); }); };
  }
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  return { open, close, confirmDialog };
})();

