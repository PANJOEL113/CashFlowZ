const InsightDetailView = (function () {
  let state = { range: "month", customStart: null, customEnd: null };
  let sort = "date_desc";
  let search = "";
  let cache = { tx: [], accounts: [], categories: { income: [], expense: [] } };

  function render(root, session, params) {
    const username = session.username;
    const kind = params.get("kind");
    const id = params.get("id");

    Promise.all([DataStore.getTransactions(username), DataStore.getAccounts(username), DataStore.getCategories(username), DataStore.getMerchants(username)])
      .then(([tx, accounts, categories, merchants]) => {
        cache = { tx, accounts, categories, username, merchants };
        const catMap = flattenCategories(categories);
        let title, icon;
        if (kind === "account") {
          const acc = accounts.find((a) => a.id === id);
          title = acc ? acc.name : "Akun";
          icon = acc && acc.logo ? `<img src="${acc.logo}" alt="">` : `<i data-lucide="wallet"></i>`;
        } else if (kind === "merchant") {
          const mer = merchants.find((m) => m.id === id);
          title = mer ? mer.name : "Merchant";
          icon = mer && mer.logo ? `<img src="${mer.logo}" alt="">` : `<i data-lucide="store"></i>`;
        } else {
          const cat = catMap[id];
          title = cat ? cat.name : "Kategori";
          icon = `<span class="emo" style="font-size:18px;">${cat ? cat.emoji : "🏷️"}</span>`;
        }

        root.innerHTML = `
          <a class="back-link" href="#/insight"><i data-lucide="arrow-left"></i> Kembali ke Insight</a>
          <div class="topbar topbar-stacked">
            <div class="topbar-title" style="display:flex;align-items:center;gap:10px;">
              <div class="account-logo" style="width:34px;height:34px;">${icon}</div>
              <div><h1 style="font-size:17px;">${escapeHtml(title)}</h1><p>Riwayat transaksi terkait</p></div>
            </div>
            <div class="topbar-actions">${renderSortFilter(sort, TX_SORT_OPTIONS, "txSort")}${renderPeriodFilter(state)}</div>
          </div>
          <div class="card mb">
            <div class="search-box"><i data-lucide="search"></i><input type="text" class="form-control" id="detailSearch" placeholder="Cari catatan atau kategori..." value="${escapeHtml(search)}"></div>
          </div>
          ${kind === "category" ? `
          <div class="card mb">
            <div class="section-head"><h3>Insight Kategori</h3></div>
            <div id="categoryInsightSummary"></div>
            <div id="categoryBreakdownRincian" style="margin-top:10px;"></div>
          </div>` : kind === "merchant" ? `
          <div class="card mb">
            <div class="section-head"><h3>Insight Merchant</h3></div>
            <div id="categoryInsightSummary"></div>
            <div id="categoryBreakdownRincian" style="margin-top:10px;"></div>
          </div>
          <div class="card">
            <div class="section-head"><h3>Daftar Transaksi</h3><span class="badge neutral" id="detailCountBadge">0 transaksi</span></div>
            <div class="tx-list" id="detailTxList"></div>
          </div>` : `
          <div class="card">
            <div class="section-head"><h3>Daftar Transaksi</h3><span class="badge neutral" id="detailCountBadge">0 transaksi</span></div>
            <div class="tx-list" id="detailTxList"></div>
          </div>`}`;

        wirePeriodFilter(root, state, () => renderList(kind, id));
        wireSortFilter(root, (s) => { sort = s; renderList(kind, id); }, "txSort", TX_SORT_OPTIONS);
        const searchInput = document.getElementById("detailSearch");
        if (searchInput) searchInput.addEventListener("input", (e) => { search = e.target.value.trim().toLowerCase(); renderList(kind, id); });
        refreshIcons();
        renderList(kind, id);
      }).catch((err) => {
        console.error("[InsightDetail] load error:", err);
        Toast.error("Gagal memuat data detail.");
      });
  }

  // Period filter + entity filter (account/category) + search are applied
  // once here; the raw transaction list and the category "Rincian" insight
  // both read from this same `base` array so they can never disagree.
  function baseFilteredList(kind, id, catMap) {
    let list = cache.tx.filter((t) => isWithinRange(t.date, state.range, state.customStart, state.customEnd));
    if (kind === "account") {
      list = list.filter((t) => t.accountId === id || t.fromAccountId === id || t.toAccountId === id);
    } else if (kind === "merchant") {
      list = list.filter((t) => t.merchantId === id);
    } else {
      list = list.filter((t) => t.categoryId === id);
    }
    if (search) {
      list = list.filter((t) => buildSearchHaystack(t, catMap).includes(search));
    }
    return list;
  }

  function renderCategoryInsight(base, id, catMap, accountsById) {
    const summaryEl = document.getElementById("categoryInsightSummary");
    const listEl = document.getElementById("categoryBreakdownRincian");
    if (!summaryEl || !listEl) return;
    const cat = catMap[id];
    if (base.length === 0) {
      summaryEl.innerHTML = `<p class="muted-note">Tidak ada transaksi untuk filter ini.</p>`;
      listEl.innerHTML = "";
      return;
    }
    const total = base.reduce((sum, t) => sum + t.amount, 0);
    const label = cat ? `${cat.emoji} ${cat.name}` : "Kategori";

    // Main category accordion — click to expand all transactions
    summaryEl.innerHTML = `
      <div class="acc-item" id="mainCatAcc">
        <button class="acc-header" type="button">
          <div class="acc-header-info">
            <strong>${escapeHtml(label)}</strong>
            <span>Total ${formatRupiah(total)} · ${base.length} Transaksi</span>
          </div>
          <i data-lucide="chevron-down" class="acc-chev"></i>
        </button>
        <div class="acc-body">
          <div class="tx-list">${base.map((t) => txRowHtml(t, catMap, accountsById)).join("")}</div>
        </div>
      </div>`;

    summaryEl.querySelector(".acc-header").addEventListener("click", () => {
      summaryEl.querySelector(".acc-item").classList.toggle("open");
    });

    // Group by subcategory; fall back to note, then "Lainnya"
    const groups = {};
    base.forEach((t) => {
      const key = t.subcategoryName || t.note || "Lainnya";
      if (!groups[key]) groups[key] = { name: key, count: 0, total: 0, txs: [] };
      groups[key].count += 1;
      groups[key].total += t.amount;
      groups[key].txs.push(t);
    });

    const arr = Object.values(groups).sort((a, b) => b.count - a.count);
    if (arr.length === 0) { listEl.innerHTML = ""; refreshIcons(); return; }

    // Sub-category accordions — one open at a time
    listEl.innerHTML = arr.map((g, i) => `
      <div class="acc-item">
        <button class="acc-header" type="button">
          <div class="acc-header-info">
            <strong>${i + 1}. ${escapeHtml(g.name)}</strong>
            <span>${g.count} transaksi · ${formatRupiah(g.total)}</span>
          </div>
          <i data-lucide="chevron-down" class="acc-chev"></i>
        </button>
        <div class="acc-body">
          <div class="tx-list">${g.txs.map((t) => txRowHtml(t, catMap, accountsById)).join("")}</div>
        </div>
      </div>`).join("");

    listEl.querySelectorAll(".acc-item").forEach((item) => {
      item.querySelector(".acc-header").addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        listEl.querySelectorAll(".acc-item").forEach((i) => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });

    refreshIcons();
  }

  function renderMerchantInsight(base, id, catMap, accountsById) {
    const merchants = cache.merchants || [];
    const merchant = merchants.find((m) => m.id === id);
    const summaryEl = document.getElementById("categoryInsightSummary");
    const listEl = document.getElementById("categoryBreakdownRincian");
    if (!summaryEl || !listEl) return;
    if (base.length === 0) {
      summaryEl.innerHTML = `<p class="muted-note">Tidak ada transaksi untuk filter ini.</p>`;
      listEl.innerHTML = "";
      return;
    }

    const total = base.reduce((sum, t) => sum + t.amount, 0);
    const income = base.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = base.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const maxTx = base.reduce((max, t) => (t.amount > max ? t.amount : max), 0);
    const avg = Math.round(total / base.length);
    const firstDate = base.length ? base.reduce((earliest, t) => (t.date < earliest ? t.date : earliest), base[0].date) : "";
    const lastTx = base.length ? base.reduce((latest, t) => (t.date > latest ? t.date : latest), base[0].date) : "";

    const logo = merchant && merchant.logo
      ? `<div class="account-logo" style="width:48px;height:48px;"><img src="${merchant.logo}" alt="${escapeHtml(merchant.name || "")}" loading="lazy"></div>`
      : `<div class="account-logo" style="width:48px;height:48px;"><i data-lucide="store" style="width:22px;height:22px;"></i></div>`;

    summaryEl.innerHTML = `
      <div class="cat-acc-info">
        ${logo}
        <div class="cat-acc-bal">${formatRupiah(total)}</div>
        <div class="cat-acc-sub">${base.length} transaksi</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
        <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg);text-align:center;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">Pemasukan</div>
          <div style="font-size:13px;font-weight:700;color:#22C55E;margin-top:4px;">${formatRupiah(income)}</div>
        </div>
        <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg);text-align:center;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">Pengeluaran</div>
          <div style="font-size:13px;font-weight:700;color:#EF4444;margin-top:4px;">${formatRupiah(expense)}</div>
        </div>
        <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg);text-align:center;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">Tertinggi</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-top:4px;font-family:var(--font-mono);">${formatRupiah(maxTx)}</div>
        </div>
        <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg);text-align:center;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;">Rata-rata</div>
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-top:4px;font-family:var(--font-mono);">${formatRupiah(avg)}</div>
        </div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--text-muted);">
        <div>Pertama: ${firstDate ? formatDateID(firstDate) : "—"}</div>
        <div>Terakhir: ${lastTx ? formatDateID(lastTx) : "—"}</div>
      </div>
      <div style="margin-top:12px;">
        <div class="acc-item" id="merchantTxAcc">
          <button class="acc-header" type="button">
            <div class="acc-header-info">
              <strong>Semua Transaksi</strong>
              <span>${base.length} transaksi · Total ${formatRupiah(total)}</span>
            </div>
            <i data-lucide="chevron-down" class="acc-chev"></i>
          </button>
          <div class="acc-body">
            <div class="tx-list">${base.map((t) => txRowHtml(t, catMap, accountsById)).join("")}</div>
          </div>
        </div>
      </div>`;
    refreshIcons();
    const acc = document.getElementById("merchantTxAcc");
    if (acc) acc.querySelector(".acc-header").addEventListener("click", () => { acc.classList.toggle("open"); });

    listEl.innerHTML = "";
  }

  function renderList(kind, id) {
    const catMap = flattenCategories(cache.categories);
    const accountsById = {}; cache.accounts.forEach((a) => (accountsById[a.id] = a));

    const base = baseFilteredList(kind, id, catMap);

    // Category kind: all output goes through accordion — no separate list
    if (kind === "category") {
      renderCategoryInsight(base, id, catMap, accountsById);
      return;
    }

    // Merchant kind: show merchant insight + transaction list
    if (kind === "merchant") {
      renderMerchantInsight(base, id, catMap, accountsById);
      renderTxList(base, kind, id, catMap, accountsById);
      return;
    }

    // Account kind: show sortable transaction list
    renderTxList(base, kind, id, catMap, accountsById);
  }

  function renderTxList(base, kind, id, catMap, accountsById) {
    const list = base.slice().sort((a, b) => {
      if (sort === "date_asc") return a.date.localeCompare(b.date);
      if (sort === "amount_desc") return b.amount - a.amount;
      if (sort === "amount_asc") return a.amount - b.amount;
      return b.date.localeCompare(a.date); // date_desc (default)
    });

    const countBadge = document.getElementById("detailCountBadge");
    if (countBadge) countBadge.textContent = `${list.length} transaksi`;
    const container = document.getElementById("detailTxList");
    if (!container) return;
    if (list.length === 0) {
      container.innerHTML = emptyStateHtml("search-x", "Tidak ada transaksi.", "Tidak ada transaksi yang cocok dengan pencarian atau filter ini.");
      refreshIcons(); return;
    }
    container.innerHTML = list.map((t) => txRowHtml(t, catMap, accountsById)).join("");
    refreshIcons();
    wireTxRowActions(container, cache.username, cache.accounts, cache.categories, () => {
      DataStore.getTransactions(cache.username).then((tx) => { cache.tx = tx; renderList(kind, id); });
    });
  }

  return { render };
})();

