const PERIOD_OPTS = [["today", "Hari Ini"], ["week", "Minggu Ini"], ["month", "Bulan Ini"], ["year", "Tahun Ini"], ["custom", "Custom"]];
function renderPeriodOptsHtml(current) {
  return PERIOD_OPTS.map(([k, l]) => `<button type="button" class="period-opt ${current === k ? "active" : ""}" data-range="${k}">${l}${current === k ? '<i data-lucide="check"></i>' : ""}</button>`).join("");
}
function renderPeriodFilter(state) {
  // state: { range, customStart, customEnd }
  return `
    <div class="period-filter" id="periodFilter">
      <button class="period-trigger" id="periodTrigger" type="button">
        <i data-lucide="calendar" class="cal"></i>
        <span id="periodTriggerLabel">${periodLabel(state.range)}</span>
        <i data-lucide="chevron-down" class="chev"></i>
      </button>
      <div class="period-panel" id="periodPanel">
        <div id="periodOptsList">${renderPeriodOptsHtml(state.range)}</div>
        <div class="period-custom-row" id="periodCustomRow" style="${state.range === "custom" ? "" : "display:none;"}">
          <div>
            <label>Dari Tanggal</label>
            <input type="date" id="periodCustomStart" value="${state.customStart || ""}">
          </div>
          <div>
            <label>Sampai Tanggal</label>
            <input type="date" id="periodCustomEnd" value="${state.customEnd || ""}">
          </div>
          <button class="btn btn-primary btn-sm period-apply" id="periodApplyBtn" type="button">Terapkan</button>
        </div>
      </div>
    </div>`;
}

// Uses event delegation on the (stable) options container instead of binding
// a listener per button. This way, re-rendering just the options' innerHTML
// after a click (to move the active state / checkmark) never loses its click
// handler and never has to guess how the icon library transforms <i
// data-lucide> markup into SVG (which previously caused stale checkmarks to
// pile up instead of moving).
// Module-level handle so previous listener is removed before adding a new one
// on every view render, preventing accumulation (memory leak).
let _periodOutsideRef = null;

function wirePeriodFilter(root, state, onChange) {
  // Remove stale handler from previous render
  if (_periodOutsideRef) { document.removeEventListener("click", _periodOutsideRef); }

  const wrap = root.querySelector("#periodFilter");
  if (!wrap) return;
  const trigger = wrap.querySelector("#periodTrigger");
  const optsList = wrap.querySelector("#periodOptsList");
  const customRow = wrap.querySelector("#periodCustomRow");
  const labelEl = wrap.querySelector("#periodTriggerLabel");

  function toggle(open) { wrap.classList.toggle("open", open); }

  trigger.addEventListener("click", (e) => { e.stopPropagation(); toggle(!wrap.classList.contains("open")); });

  optsList.addEventListener("click", (e) => {
    const btn = e.target.closest(".period-opt");
    if (!btn) return;
    const range = btn.dataset.range;
    state.range = range;
    labelEl.textContent = periodLabel(range);
    optsList.innerHTML = renderPeriodOptsHtml(range);
    refreshIcons();
    if (range === "custom") {
      customRow.style.display = "";
      return; // wait for Terapkan
    }
    customRow.style.display = "none";
    toggle(false);
    onChange(state);
  });

  const applyBtn = wrap.querySelector("#periodApplyBtn");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      state.customStart = wrap.querySelector("#periodCustomStart").value;
      state.customEnd = wrap.querySelector("#periodCustomEnd").value;
      if (!state.customStart || !state.customEnd) { Toast.error("Pilih rentang tanggal lengkap."); return; }
      toggle(false);
      onChange(state);
    });
  }

  _periodOutsideRef = (e) => {
    if (!document.contains(wrap)) { document.removeEventListener("click", _periodOutsideRef); _periodOutsideRef = null; return; }
    if (!wrap.contains(e.target)) toggle(false);
  };
  document.addEventListener("click", _periodOutsideRef);
}

