const SORT_OPTIONS = [
  ["date_desc", "Terbaru"],
  ["date_asc", "Terlama"],
  ["amount_desc", "Nominal Tertinggi"],
  ["amount_asc", "Nominal Terendah"],
];
// Full sort options for the main Transaction list (adds A-Z / Z-A by name).
const TX_SORT_OPTIONS = [
  ["date_desc", "Terbaru"],
  ["date_asc", "Terlama"],
  ["amount_desc", "Nominal Terbesar"],
  ["amount_asc", "Nominal Terkecil"],
  ["name_asc", "A-Z"],
  ["name_desc", "Z-A"],
];
// idPrefix lets a single page render more than one independent sort dropdown
// without id collisions.
function renderSortOptsHtml(opts, current) {
  return opts.map(([k, l]) => `<button type="button" class="period-opt ${current === k ? "active" : ""}" data-sort="${k}">${l}${current === k ? '<i data-lucide="check"></i>' : ""}</button>`).join("");
}
function renderSortFilter(current, options, idPrefix) {
  const opts = options || SORT_OPTIONS;
  const prefix = idPrefix || "sort";
  const label = (opts.find((o) => o[0] === current) || opts[0])[1];
  return `
    <div class="period-filter sort-filter" id="${prefix}Filter">
      <button class="period-trigger" id="${prefix}Trigger" type="button">
        <i data-lucide="arrow-up-down" class="cal"></i>
        <span id="${prefix}TriggerLabel">${label}</span>
        <i data-lucide="chevron-down" class="chev"></i>
      </button>
      <div class="sort-panel" id="${prefix}Panel">${renderSortOptsHtml(opts, current)}</div>
    </div>`;
}
// Event delegation on the panel (not per-button listeners) so re-rendering
// the panel's innerHTML after a click — to move the active state / checkmark
// to the newly picked option — never loses its click handler.
// Module-level handle so previous listener is removed before adding a new one
// on every view render, preventing accumulation (memory leak).
let _sortOutsideRef = null;

function wireSortFilter(root, onChange, idPrefix, options) {
  // Remove stale handler from previous render
  if (_sortOutsideRef) { document.removeEventListener("click", _sortOutsideRef); }

  const prefix = idPrefix || "sort";
  const opts = options || SORT_OPTIONS;
  const wrap = root.querySelector("#" + prefix + "Filter");
  if (!wrap) return;
  const trigger = wrap.querySelector("#" + prefix + "Trigger");
  const labelEl = wrap.querySelector("#" + prefix + "TriggerLabel");
  const panel = wrap.querySelector("#" + prefix + "Panel");
  trigger.addEventListener("click", (e) => { e.stopPropagation(); wrap.classList.toggle("open"); });
  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sort]");
    if (!btn) return;
    const key = btn.dataset.sort;
    wrap.classList.remove("open");
    const found = opts.find((o) => o[0] === key);
    if (labelEl) labelEl.textContent = found ? found[1] : key;
    panel.innerHTML = renderSortOptsHtml(opts, key);
    refreshIcons();
    onChange(key);
  });
  _sortOutsideRef = (e) => {
    if (!document.contains(wrap)) { document.removeEventListener("click", _sortOutsideRef); _sortOutsideRef = null; return; }
    if (!wrap.contains(e.target)) wrap.classList.remove("open");
  };
  document.addEventListener("click", _sortOutsideRef);
}

