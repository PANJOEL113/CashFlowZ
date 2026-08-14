const InsightView = (function () {
  let state = { range: "month", customStart: null, customEnd: null };
  let sort = "date_desc";
  let cache = { tx: [], accounts: [], categories: { income: [], expense: [] } };

  function render(root, session) {
    const username = session.username;
    root.innerHTML = `
      <div class="topbar topbar-stacked">
        <div class="topbar-title"><h1>Insight</h1><p>Analisis mendalam kebiasaan finansialmu</p></div>
        <div class="topbar-actions">${renderSortFilter(sort, SORT_OPTIONS, "insightSort")}${renderPeriodFilter(state)}</div>
      </div>
      <div id="insightEmptyState"></div>
      <div id="insightContent">
        <div class="grid-2col">
          <div class="card"><div class="section-head"><h3>Tren Pemasukan vs Pengeluaran</h3></div><div class="chart-canvas-wrap" id="lineWrap"><canvas id="lineChart"></canvas></div></div>
          <div class="card"><div class="section-head"><h3>Pengeluaran per Kategori</h3></div><div class="chart-canvas-wrap" id="donutWrap"><canvas id="donutChart"></canvas></div></div>
        </div>
        <div class="grid-2col">
          <div class="card"><div class="section-head"><h3>Pemasukan per Kategori</h3></div><div class="chart-canvas-wrap" id="pieWrap"><canvas id="pieChart"></canvas></div></div>
          <div class="card"><div class="section-head"><h3>Tren Saldo Kumulatif</h3></div><div class="chart-canvas-wrap" id="trendWrap"><canvas id="trendChart"></canvas></div></div>
        </div>
        <div class="card mb"><div class="section-head"><h3>Perbandingan Bulanan</h3></div><div class="chart-canvas-wrap" id="comparisonWrap"><canvas id="comparisonChart"></canvas></div></div>
        <div class="grid-2col">
          <div class="card"><div class="section-head"><h3>Berdasarkan Kategori</h3></div><div class="account-list" id="categoryBreakdownList"></div></div>
          <div class="stack-cards">
            <div class="card"><div class="section-head"><h3>Berdasarkan Akun</h3></div><div class="account-list" id="accountBreakdownList"></div></div>
            <div class="card">
              <div class="section-head"><h3>Berdasarkan Merchant</h3></div>
              <div class="account-list" id="merchantBreakdownList"></div>
            </div>
          </div>
        </div>
      </div>`;

    wirePeriodFilter(root, state, () => renderContent());
    wireSortFilter(root, (s) => { sort = s; renderContent(); }, "insightSort", SORT_OPTIONS);
    refreshIcons();
    load(username);
  }

  function load(username) {
    Promise.all([DataStore.getTransactions(username), DataStore.getAccounts(username), DataStore.getCategories(username)])
      .then(([tx, accounts, categories]) => { cache = { tx, accounts, categories, username }; renderContent(); })
      .catch((err) => {
        console.error("[Insight] load error:", err);
        Toast.error("Gagal memuat data insight.");
      });
  }

  function filteredTx() {
    return cache.tx.filter((t) => isWithinRange(t.date, state.range, state.customStart, state.customEnd));
  }

  function renderContent() {
    destroyActiveCharts();
    if (cache.tx.length === 0) {
      document.getElementById("insightContent").style.display = "none";
      document.getElementById("insightEmptyState").innerHTML = `<div class="card">${emptyStateHtml("pie-chart", "Belum ada transaksi.", "Grafik akan muncul otomatis setelah kamu mulai menambahkan transaksi.")}</div>`;
      refreshIcons();
      return;
    }
    document.getElementById("insightContent").style.display = "block";
    document.getElementById("insightEmptyState").innerHTML = "";
    const data = filteredTx();
    const catMap = flattenCategories(cache.categories);
    renderLineChart(data);
    renderDonutChart(data, catMap);
    renderPieChart(data, catMap);
    renderTrendChart(data);
    renderComparisonChart(data);
    renderCategoryBreakdown(data, catMap);
    renderAccountBreakdown(data);
    renderMerchantBreakdown(data);
    refreshIcons();
  }

  function chartOrEmpty(wrapId, canvasId, hasData) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return null;
    if (!hasData) { wrap.innerHTML = emptyStateHtml("bar-chart-2", "Tidak ada data.", "Tidak ada transaksi pada periode ini."); return null; }
    if (!document.getElementById(canvasId)) wrap.innerHTML = `<canvas id="${canvasId}"></canvas>`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function renderLineChart(data) {
    const rel = data.filter((t) => t.type === "income" || t.type === "expense");
    const ctx = chartOrEmpty("lineWrap", "lineChart", rel.length > 0);
    if (!ctx) return;
    const byDate = {};
    rel.forEach((t) => { byDate[t.date] = byDate[t.date] || { income: 0, expense: 0 }; byDate[t.date][t.type] += t.amount; });
    const dates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));
    trackChart(new Chart(ctx, {
      type: "line",
      data: { labels: dates.map(formatDateShort), datasets: [
        { label: "Pemasukan", data: dates.map((d) => byDate[d].income), borderColor: chartIncomeColor("#22C55E"), backgroundColor: chartIncomeFill(), tension: .35, fill: true, pointRadius: 2 },
        { label: "Pengeluaran", data: dates.map((d) => byDate[d].expense), borderColor: chartExpenseColor("#EF4444"), backgroundColor: chartExpenseFill(), tension: .35, fill: true, pointRadius: 2 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: "easeOutQuart" }, plugins: { legend: { position: "bottom", labels: { boxWidth: 7, font: { size: 11 } } }, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", cornerRadius: 8, padding: 10 } }, scales: { y: { grid: { color: chartGrid("rgba(0,0,0,0.04)") } }, x: { grid: { display: false } } }, hover: { mode: "index", intersect: false } },
    }));
  }

  function renderDonutChart(data, catMap) {
    const exp = data.filter((t) => t.type === "expense");
    const ctx = chartOrEmpty("donutWrap", "donutChart", exp.length > 0);
    if (!ctx) return;
    const byCat = {};
    exp.forEach((t) => { const c = resolveCategory(t, catMap); byCat[c.name] = (byCat[c.name] || 0) + t.amount; });
    const labels = Object.keys(byCat);
    trackChart(new Chart(ctx, { type: "doughnut", data: { labels, datasets: [{ data: labels.map((l) => byCat[l]), backgroundColor: chartPalette(labels.length), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: "easeOutQuart" }, plugins: { legend: { position: "bottom", labels: { boxWidth: 7, font: { size: 10 } } }, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", cornerRadius: 8, padding: 10 } } } }));
  }

  function renderPieChart(data, catMap) {
    const inc = data.filter((t) => t.type === "income");
    const ctx = chartOrEmpty("pieWrap", "pieChart", inc.length > 0);
    if (!ctx) return;
    const byCat = {};
    inc.forEach((t) => { const c = resolveCategory(t, catMap); byCat[c.name] = (byCat[c.name] || 0) + t.amount; });
    const labels = Object.keys(byCat);
    trackChart(new Chart(ctx, { type: "pie", data: { labels, datasets: [{ data: labels.map((l) => byCat[l]), backgroundColor: chartPalette(labels.length), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: "easeOutQuart" }, plugins: { legend: { position: "bottom", labels: { boxWidth: 7, font: { size: 10 } } }, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", cornerRadius: 8, padding: 10 } } } }));
  }

  function renderTrendChart(data) {
    const rel = data.filter((t) => t.type === "income" || t.type === "expense").slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const ctx = chartOrEmpty("trendWrap", "trendChart", rel.length > 0);
    if (!ctx) return;

    // Saldo kumulatif harus "nyambung", bukan reset ke 0 tiap ganti filter
    // periode. Titik awal = saldo awal semua akun + seluruh transaksi
    // (income/expense) SEBELUM tanggal mulai periode yang sedang difilter.
    const initialTotal = (cache.accounts || []).reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    const bounds = _rangeBoundsISO(state.range, state.customStart, state.customEnd);
    let running = initialTotal;
    if (bounds) {
      (cache.tx || []).forEach((t) => {
        if ((t.type === "income" || t.type === "expense") && String(t.date).slice(0, 10) < bounds.start) {
          running += t.type === "income" ? t.amount : -t.amount;
        }
      });
    }

    const points = rel.map((t) => { running += t.type === "income" ? t.amount : -t.amount; return { x: t.date, y: running }; });
    trackChart(new Chart(ctx, { type: "line", data: { labels: points.map((p) => formatDateShort(p.x)), datasets: [{ label: "Saldo Kumulatif", data: points.map((p) => p.y), borderColor: chartIncomeColor("#22C55E"), backgroundColor: chartIncomeFill(), tension: .3, fill: true, pointRadius: 3, pointHoverRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: "easeOutQuart" }, plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", cornerRadius: 8, padding: 10 } }, scales: { y: { grid: { color: chartGrid("rgba(0,0,0,0.04)") } }, x: { grid: { display: false } } }, hover: { mode: "index", intersect: false } } }));
  }

  function renderComparisonChart(data) {
    const rel = data.filter((t) => t.type === "income" || t.type === "expense");
    const ctx = chartOrEmpty("comparisonWrap", "comparisonChart", rel.length > 0);
    if (!ctx) return;
    const byMonth = {};
    rel.forEach((t) => { const key = t.date.slice(0, 7); byMonth[key] = byMonth[key] || { income: 0, expense: 0 }; byMonth[key][t.type] += t.amount; });
    const months = Object.keys(byMonth).sort();
    const monthLabel = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" }); };
    trackChart(new Chart(ctx, { type: "bar", data: { labels: months.map(monthLabel), datasets: [
      { label: "Pemasukan", data: months.map((m) => byMonth[m].income), backgroundColor: chartIncomeBar(), borderRadius: 5, hoverBackgroundColor: chartIncomeBar() },
      { label: "Pengeluaran", data: months.map((m) => byMonth[m].expense), backgroundColor: chartExpenseBar(), borderRadius: 5, hoverBackgroundColor: chartExpenseBar() },
    ] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: "easeOutQuart" }, plugins: { legend: { position: "bottom", labels: { boxWidth: 7, font: { size: 11 } } }, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", cornerRadius: 8, padding: 10 } }, scales: { y: { grid: { color: chartGrid("rgba(0,0,0,0.04)") } }, x: { grid: { display: false } } }, hover: { mode: "index", intersect: false } } }));
  }

  function renderCategoryBreakdown(data, catMap) {
    const list = document.getElementById("categoryBreakdownList");
    const rel = data.filter((t) => t.type !== "transfer");
    const byId = {};
    rel.forEach((t) => {
      const c = resolveCategory(t, catMap);
      byId[c.id] = byId[c.id] || { total: 0, type: t.type, name: c.name, emoji: c.emoji };
      byId[c.id].total += t.amount;
    });
    const ids = Object.keys(byId);
    if (ids.length === 0) { list.innerHTML = `<p class="muted-note">Tidak ada data untuk filter ini.</p>`; return; }
    const arr = ids.map((id) => ({ id, ...byId[id] }));
    const sortFn = (a, b) => {
      if (sort === "amount_desc") return b.total - a.total;
      if (sort === "amount_asc") return a.total - b.total;
      if (sort === "name_asc") return a.name.localeCompare(b.name, "id");
      if (sort === "name_desc") return b.name.localeCompare(a.name, "id");
      return b.total - a.total;
    };
    const rowHtml = (item) => `
      <div class="account-row clickable" data-cat-id="${item.id}">
        <div class="account-logo"><span class="emo">${item.emoji}</span></div>
        <div class="account-info"><div class="acc-name">${escapeHtml(item.name)}</div><div class="acc-type">${item.type === "income" ? "Pemasukan" : "Pengeluaran"}</div></div>
        <div class="account-balance">${formatRupiah(item.total)}</div>
      </div>`;
    const groupLabel = (label, count) => `<div class="cat-group-label">${escapeHtml(label)} <span>${count}</span></div>`;
    const income = arr.filter((i) => i.type === "income").sort(sortFn);
    const expense = arr.filter((i) => i.type === "expense").sort(sortFn);
    let html = "";
    if (income.length) html += groupLabel("Pemasukan", income.length) + income.map(rowHtml).join("");
    if (expense.length) html += groupLabel("Pengeluaran", expense.length) + expense.map(rowHtml).join("");
    list.innerHTML = html;
    list.querySelectorAll("[data-cat-id]").forEach((row) => {
      row.addEventListener("click", () => Router.navigate("insight-detail", { kind: "category", id: row.dataset.catId }));
    });
  }

  function renderAccountBreakdown(data) {
    const list = document.getElementById("accountBreakdownList");
    if (cache.accounts.length === 0) { list.innerHTML = `<p class="muted-note">Belum ada akun.</p>`; return; }
    const arr = cache.accounts.map((a) => {
      const bal = DataStore.computeAccountBalance(cache.tx, a);
      return { ...a, bal };
    });
    if (sort === "amount_desc") arr.sort((a, b) => b.bal - a.bal);
    else if (sort === "amount_asc") arr.sort((a, b) => a.bal - b.bal);
    else if (sort === "name_asc") arr.sort((a, b) => a.name.localeCompare(b.name, "id"));
    else if (sort === "name_desc") arr.sort((a, b) => b.name.localeCompare(a.name, "id"));
    list.innerHTML = arr.map((a) => {
      return `<div class="account-row clickable" data-acc-id="${a.id}">${accountLogoMarkup(a)}<div class="account-info"><div class="acc-name">${escapeHtml(a.name)}</div><div class="acc-type">Akun</div></div><div class="account-balance ${a.bal < 0 ? "neg" : ""}">${formatRupiah(a.bal)}</div></div>`;
    }).join("");
    list.querySelectorAll("[data-acc-id]").forEach((row) => {
      row.addEventListener("click", () => Router.navigate("insight-detail", { kind: "account", id: row.dataset.accId }));
    });
  }

  function renderMerchantBreakdown(data) {
    const username = cache.username;
    const list = document.getElementById("merchantBreakdownList");
    if (!list) return;
    DataStore.getMerchants(username).then((merchants) => {
      if (!merchants || merchants.length === 0) {
        list.innerHTML = `<p class="muted-note">Belum ada merchant.</p>`;
        return;
      }
      const expenses = data.filter((t) => t.type === "expense" && t.merchantId);
      const byMerchant = {};
      expenses.forEach((t) => {
        byMerchant[t.merchantId] = byMerchant[t.merchantId] || { total: 0, count: 0, name: t.merchantName || "Merchant" };
        byMerchant[t.merchantId].total += t.amount;
        byMerchant[t.merchantId].count += 1;
      });
      const ids = Object.keys(byMerchant);
      if (ids.length === 0) {
        list.innerHTML = `<p class="muted-note">Tidak ada pengeluaran dengan merchant pada periode ini.</p>`;
        return;
      }
      const arr = ids.map((id) => ({ id, ...byMerchant[id], merchant: merchants.find((m) => m.id === id) }));
      const totalExpense = arr.reduce((sum, item) => sum + item.total, 0);

      // List
      if (sort === "amount_desc") arr.sort((a, b) => b.total - a.total);
      else if (sort === "amount_asc") arr.sort((a, b) => a.total - b.total);
      else if (sort === "name_asc") arr.sort((a, b) => a.name.localeCompare(b.name, "id"));
      else if (sort === "name_desc") arr.sort((a, b) => b.name.localeCompare(a.name, "id"));
      else arr.sort((a, b) => b.total - a.total);

      list.innerHTML = arr.map((item) => {
        const logo = item.merchant && item.merchant.logo
          ? `<div class="account-logo" style="width:30px;height:30px;"><img src="${item.merchant.logo}" alt="${escapeHtml(item.name)}" loading="lazy"></div>`
          : `<div class="account-logo" style="width:30px;height:30px;"><i data-lucide="store"></i></div>`;
        const pct = totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0;
        return `<div class="account-row clickable" data-merchant-id="${item.id}">
          ${logo}
          <div class="account-info"><div class="acc-name">${escapeHtml(item.name)}</div><div class="acc-type">${item.count} transaksi · ${pct}%</div></div>
          <div class="account-balance">${formatRupiah(item.total)}</div>
        </div>`;
      }).join("");
      list.querySelectorAll("[data-merchant-id]").forEach((row) => {
        row.addEventListener("click", () => Router.navigate("insight-detail", { kind: "merchant", id: row.dataset.merchantId }));
      });
    }).catch((err) => {
      console.error("[Insight] load merchants error:", err);
    });
  }

  return { render };
})();

