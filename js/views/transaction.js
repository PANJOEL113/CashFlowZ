const TransactionView = (function () {
  let state = { range: "month", customStart: null, customEnd: null };
  let filters = { type: "all", account: "all", category: "all", search: "", sort: "date_desc" };
  let cache = { tx: [], accounts: [], categories: { income: [], expense: [] } };
  let currentPage = 1;
  const PAGE_SIZE = 20;

  function render(root, session) {
    _lastRenderKey = "";
    const username = session.username;
    root.innerHTML = `
      <div class="topbar topbar-stacked">
        <div class="topbar-title"><h1>Transaksi</h1><p>Riwayat pemasukan, pengeluaran &amp; transfer</p></div>
        <div class="topbar-actions">
          ${renderSortFilter(filters.sort, TX_SORT_OPTIONS, "txSort")}
          ${renderPeriodFilter(state)}
          <button class="btn btn-primary hide-mobile" id="addTxBtn" type="button"><i data-lucide="plus"></i> Tambah</button>
        </div>
      </div>
      <div class="card mb">
        <div class="search-box mb"><i data-lucide="search"></i><input type="text" class="form-control" id="searchInput" placeholder="Cari catatan atau kategori..."></div>
        <div class="filter-pills mb" id="typeFilterPills">
          <button class="filter-pill active" data-type="all">Semua</button>
          <button class="filter-pill" data-type="income">Pemasukan</button>
          <button class="filter-pill" data-type="expense">Pengeluaran</button>
          <button class="filter-pill" data-type="transfer">Transfer</button>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;"><label>Akun</label><select class="form-control" id="accountFilterSelect"><option value="all">Semua Akun</option></select></div>
          <div class="form-group" style="margin-bottom:0;"><label>Kategori</label><select class="form-control" id="categoryFilterSelect"><option value="all">Semua Kategori</option></select></div>
        </div>
      </div>
      <div class="card">
        <div class="section-head"><h3>Daftar Transaksi</h3><span class="badge neutral" id="totalCountBadge">0 transaksi</span></div>
        <div class="tx-list" id="txListContainer"></div>
      </div>`;

    wirePeriodFilter(root, state, () => { currentPage = 1; renderList(); });
    wireSortFilter(root, (s) => { filters.sort = s; currentPage = 1; renderList(); }, "txSort", TX_SORT_OPTIONS);
    const addBtn = document.getElementById("addTxBtn");
    const searchInput = document.getElementById("searchInput");
    if (addBtn) addBtn.addEventListener("click", () => window.openAddTransaction());
    if (searchInput) searchInput.addEventListener("input", (e) => { filters.search = e.target.value.trim().toLowerCase(); currentPage = 1; renderList(); });
    document.querySelectorAll("#typeFilterPills .filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#typeFilterPills .filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active"); filters.type = pill.dataset.type; currentPage = 1; renderList();
      });
    });
    const accountSelect = document.getElementById("accountFilterSelect");
    const categorySelect = document.getElementById("categoryFilterSelect");
    if (accountSelect) accountSelect.addEventListener("change", (e) => { filters.account = e.target.value; currentPage = 1; renderList(); });
    if (categorySelect) categorySelect.addEventListener("change", (e) => { filters.category = e.target.value; currentPage = 1; renderList(); });

    refreshIcons();
    loadAndRender(username);
  }

  function refreshList(username, skipSkeleton) {
    const container = document.getElementById("txListContainer");
    if (!skipSkeleton && container) {
      container.innerHTML = Array.from({ length: 5 }, () => `
        <div class="skeleton-row">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton-lines">
            <div class="skeleton skeleton-line w80"></div>
            <div class="skeleton skeleton-line w50"></div>
          </div>
          <div class="skeleton skeleton-amount"></div>
        </div>`).join("");
    }
    Promise.all([DataStore.getTransactions(username), DataStore.getAccounts(username), DataStore.getCategories(username)])
      .then(([tx, accounts, categories]) => {
        cache = { tx, accounts, categories, username };
        populateFilterSelects();
        renderList();
      }).catch((err) => {
        console.error("[Transaction] load error:", err);
        Toast.error("Gagal memuat data transaksi.");
      });
  }

  function loadAndRender(username) {
    refreshList(username, false);
  }

  function populateFilterSelects() {
    const accSel = document.getElementById("accountFilterSelect");
    const preservedAcc = filters.account;
    accSel.innerHTML = `<option value="all">Semua Akun</option>` + cache.accounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("");
    accSel.value = preservedAcc;

    const catSel = document.getElementById("categoryFilterSelect");
    const preservedCat = filters.category;
    const allCats = [...(cache.categories.income || []), ...(cache.categories.expense || [])];
    catSel.innerHTML = `<option value="all">Semua Kategori</option>` + allCats.map((c) => `<option value="${c.id}">${c.emoji} ${escapeHtml(c.name)}</option>`).join("");
    catSel.value = preservedCat;
  }

  // Filter, then sort — both read from the same `cache.tx` and the same
  // catMap, so Filter + Sorting + Search + the count badge can never disagree
  // with each other or require re-deriving data separately.
  function applyFilters(list, catMap) {
    return list.filter((t) => {
      if (!isWithinRange(t.date, state.range, state.customStart, state.customEnd)) return false;
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.account !== "all") {
        const matches = t.accountId === filters.account || t.fromAccountId === filters.account || t.toAccountId === filters.account;
        if (!matches) return false;
      }
      if (filters.category !== "all" && t.categoryId !== filters.category) return false;
      if (filters.search && !buildSearchHaystack(t, catMap).includes(filters.search)) return false;
      return true;
    });
  }

  function sortTransactions(list, sortKey, catMap) {
    const sorted = list.slice();
    switch (sortKey) {
      case "date_asc": sorted.sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || "")); break;
      case "amount_desc": sorted.sort((a, b) => b.amount - a.amount); break;
      case "amount_asc": sorted.sort((a, b) => a.amount - b.amount); break;
      case "name_asc": sorted.sort((a, b) => getTxTitle(a, catMap).localeCompare(getTxTitle(b, catMap), "id")); break;
      case "name_desc": sorted.sort((a, b) => getTxTitle(b, catMap).localeCompare(getTxTitle(a, catMap), "id")); break;
      case "date_desc":
      default: sorted.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || ""));
    }
    return sorted;
  }

  let _lastRenderKey = "";
  function renderList() {
    const cacheKey = [
      cache.tx.length, cache.tx[0]?.id, cache.tx[cache.tx.length - 1]?.id,
      filters.type, filters.account, filters.category, filters.search, filters.sort,
      state.range, state.customStart, state.customEnd, currentPage,
    ].join("|");
    if (cacheKey === _lastRenderKey) return;
    _lastRenderKey = cacheKey;

    const catMap = flattenCategories(cache.categories);
    const accountsById = {}; cache.accounts.forEach((a) => (accountsById[a.id] = a));
    const filtered = applyFilters(cache.tx, catMap);
    const sorted = sortTransactions(filtered, filters.sort, catMap);
    const container = document.getElementById("txListContainer");
    document.getElementById("totalCountBadge").textContent = `${sorted.length} transaksi`;

    if (cache.tx.length === 0) {
      container.innerHTML = emptyStateHtml("inbox", "Belum ada transaksi.", "Tambahkan transaksi pertamamu menggunakan tombol Tambah di atas.");
      refreshIcons(); return;
    }
    if (sorted.length === 0) {
      container.innerHTML = emptyStateHtml("search-x", "Tidak ditemukan.", "Coba ubah kata kunci pencarian atau filter yang digunakan.");
      refreshIcons(); return;
    }
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const showPagination = sorted.length > PAGE_SIZE;
    const paginationHtml = showPagination ? `
      <div class="pagination">
        <span class="pagination-info">${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sorted.length)} dari ${sorted.length}</span>
        <div class="pagination-btns">
          <button class="page-btn" id="pgPrev" ${currentPage === 1 ? "disabled" : ""}>‹ Prev</button>
          <button class="page-btn cur" disabled>${currentPage} / ${totalPages}</button>
          <button class="page-btn" id="pgNext" ${currentPage === totalPages ? "disabled" : ""}>Next ›</button>
        </div>
      </div>` : "";
    container.innerHTML = paged.map((t) => txRowHtml(t, catMap, accountsById)).join("") + paginationHtml;
    refreshIcons();
    wireTxRowActions(container, cache.username, cache.accounts, cache.categories, () => refreshList(cache.username, true));
    if (showPagination) {
      const prev = document.getElementById("pgPrev");
      const next = document.getElementById("pgNext");
      if (prev) prev.addEventListener("click", () => { currentPage--; renderList(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      if (next) next.addEventListener("click", () => { currentPage++; renderList(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    }
  }

  return { render };
})();

