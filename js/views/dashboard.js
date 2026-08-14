const DashboardView = (function () {
  let state = { range: "month", customStart: null, customEnd: null };

  function render(root, session) {
    const username = session.username;
    root.innerHTML = `
      <div class="topbar hide-mobile" style="display:flex">
        <div class="topbar-title"><h1>Dashboard</h1><p>Ringkasan keuanganmu</p></div>
        <div class="topbar-actions" style="margin-left:auto">
          <button class="btn btn-primary hide-mobile" id="addTxBtnDashboard" type="button"><i data-lucide="plus"></i> Tambah</button>
        </div>
      </div>
      <div class="db-greeting" id="dbGreeting">
        <img class="db-logo" src="asset/logo/logofull.svg" alt="CashFlowZ">
        <div class="db-greeting-text" id="greetingText"></div>
        <div class="db-date" id="dateText"></div>
        <div class="db-time" id="timeText"></div>
      </div>
      <div class="db-summary-card">
        <div class="dsc-left">
          <div class="dsc-head-row">
            <div class="dsc-icon-wrap"><span>💰</span></div>
            <div class="dsc-label">Saldo Saat Ini</div>
          </div>
          <div class="dsc-balance" id="dscBalance">Rp0</div>
          <div class="dsc-compare" id="dscCompare"></div>
          <div class="dsc-accent"></div>
        </div>
        <div class="dsc-vr"></div>
        <div class="dsc-right">
          <div class="dsc-income">
            <div class="dsc-io-head">
              <div class="dsc-icon-wrap sm"><span>📈</span></div>
              <span class="dsc-io-label">Pemasukan</span>
            </div>
            <span class="dsc-io-value" id="dscIncome">Rp0</span>
            <span class="dsc-io-sub">Pemasukan bulan ini</span>
          </div>
          <div class="dsc-hr"></div>
          <div class="dsc-expense">
            <div class="dsc-io-head">
              <div class="dsc-icon-wrap sm"><span>📉</span></div>
              <span class="dsc-io-label">Pengeluaran</span>
            </div>
            <span class="dsc-io-value" id="dscExpense">Rp0</span>
            <span class="dsc-io-sub">Pengeluaran bulan ini</span>
          </div>
        </div>
      </div>
      <div class="grid-2col">
        <div class="stack-cards">
          <div class="card">
            <div class="section-head"><h3>Grafik Cashflow</h3></div>
            <div class="chart-canvas-wrap" id="chartWrap"><canvas id="dashboardChart"></canvas></div>
          </div>
          <div class="card">
            <div class="section-head"><h3>Transaksi Terbaru</h3><a class="link-more" href="#/transaction">Lihat semua</a></div>
            <div class="tx-list" id="recentTxList"></div>
          </div>
        </div>
        <div class="stack-cards">
          <div class="card">
            <div class="section-head"><h3>Saldo Akun</h3></div>
            <div class="account-list" id="dashboardAccountList"></div>
          </div>
          <div class="card">
            <div class="section-head"><h3>Preview Target Tabungan</h3></div>
            <div class="savings-preview" id="savingsPreview"></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-head"><h3>Insight Keuangan</h3></div>
        <div class="insight-list" id="insightList"></div>
      </div>`;

    DataStore.getProfile(username).then((profile) => {
      updateGreeting(profile.name);
    }).catch((err) => {
      console.error("[Dashboard] greeting error:", err);
    });
    startClock();

    const addBtn = document.getElementById("addTxBtnDashboard");
    if (addBtn) addBtn.addEventListener("click", () => window.openAddTransaction());

    refreshIcons();
    loadAndRender(username);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return { text: "Pagi", emoji: "👋" };
    if (h >= 11 && h < 15) return { text: "Siang", emoji: "☀️" };
    if (h >= 15 && h < 18) return { text: "Sore", emoji: "🌇" };
    return { text: "Malam", emoji: "🌙" };
  }

  function updateGreeting(name) {
    const g = getGreeting();
    const el = document.getElementById("greetingText");
    if (el) el.textContent = `Selamat ${g.text}, ${name} ${g.emoji}`;
  }

  function formatDate() {
    const d = new Date();
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} WIB`;
  }

  function startClock() {
    if (window.__dashboardClockInterval) { clearInterval(window.__dashboardClockInterval); }
    const tick = () => {
      const dateEl = document.getElementById("dateText");
      const timeEl = document.getElementById("timeText");
      if (!dateEl || !timeEl) { clearInterval(window.__dashboardClockInterval); window.__dashboardClockInterval = null; return; }
      const now = new Date();
      dateEl.textContent = formatDate();
      timeEl.textContent = formatTime();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        const grel = document.getElementById("greetingText");
        if (grel) {
          const name = grel.textContent.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "").split(",").pop().trim();
          updateGreeting(name);
        }
      }
    };
    tick();
    window.__dashboardClockInterval = setInterval(tick, 10000);
  }

  function loadAndRender(username) {
    destroyActiveCharts();
    Promise.all([DataStore.getTransactions(username), DataStore.getAccounts(username), DataStore.getCategories(username), DataStore.getSavingsTargets(username), DataStore.getMerchants(username)])
      .then(([allTx, accounts, categories, savingsTargets, merchants]) => {
        const catMap = flattenCategories(categories);
        const accountsById = {}; accounts.forEach((a) => (accountsById[a.id] = a));
        const filtered = allTx.filter((t) => isWithinRange(t.date, state.range, state.customStart, state.customEnd));
        renderStats(allTx, filtered, accounts);
        renderChart(filtered);
        renderSavingsPreview(allTx, savingsTargets, username);
        renderAccountBalances(allTx, accounts);
        renderRecent(allTx, catMap, accountsById, username, accounts, categories);
        renderInsights(filtered, allTx, savingsTargets, merchants);
        refreshIcons();
      }).catch((err) => {
        console.error("[Dashboard] load error:", err);
        Toast.error("Gagal memuat data dashboard.");
      });
  }

  function prevPeriodRange(range, customStart, customEnd) {
    const now = new Date();
    if (range === "today") {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      const s = d.toISOString().slice(0, 10);
      return [s, s];
    }
    if (range === "week") {
      const end = new Date(now); end.setDate(end.getDate() - 1);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
    }
    if (range === "month") {
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
    }
    if (range === "year") {
      const y = now.getFullYear() - 1;
      return [`${y}-01-01`, `${y}-12-31`];
    }
    if (range === "custom" && customStart && customEnd) {
      const dur = new Date(customEnd) - new Date(customStart);
      const end = new Date(customStart);
      end.setDate(end.getDate() - 1);
      const start = new Date(end.getTime() - dur);
      return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
    }
    return null;
  }

  function renderStats(allTx, filtered, accounts) {
    let income = 0, expense = 0;
    filtered.forEach((t) => { if (t.type === "income") income += t.amount; if (t.type === "expense") expense += t.amount; });

    const initialTotal = (accounts || []).reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    let allIncome = 0, allExpense = 0;
    allTx.forEach((t) => { if (t.type === "income") allIncome += t.amount; if (t.type === "expense") allExpense += t.amount; });
    const currentBalance = initialTotal + allIncome - allExpense;

    const balanceEl = document.getElementById("dscBalance");
    const incomeEl = document.getElementById("dscIncome");
    const expenseEl = document.getElementById("dscExpense");
    if (balanceEl) animateCountUp(balanceEl, currentBalance, 800);
    if (incomeEl) animateCountUp(incomeEl, income, 600);
    if (expenseEl) animateCountUp(expenseEl, expense, 600);

    const compareEl = document.getElementById("dscCompare");
    if (compareEl && allTx) {
      const bal = income - expense;
      const prevRange = prevPeriodRange(state.range, state.customStart, state.customEnd);
      if (prevRange) {
        const prev = allTx.filter((t) => t.date >= prevRange[0] && t.date <= prevRange[1]);
        let prevIncome = 0, prevExpense = 0;
        prev.forEach((t) => { if (t.type === "income") prevIncome += t.amount; if (t.type === "expense") prevExpense += t.amount; });
        const prevBal = prevIncome - prevExpense;
        if (prevBal !== 0 && bal !== 0) {
          const pct = Math.abs(prevBal) === 0 ? 0 : ((bal - prevBal) / Math.abs(prevBal)) * 100;
          const up = pct >= 0;
          compareEl.innerHTML = `<span class="dsc-cmp-arrow ${up ? "up" : "down"}">${up ? "↗" : "↘"}</span><span class="dsc-cmp-pct ${up ? "up" : "down"}">${Math.abs(pct).toFixed(1)}%</span><span class="dsc-cmp-label">dibanding periode lalu</span>`;
        } else {
          compareEl.innerHTML = `<span class="dsc-cmp-label">Belum ada data perbandingan</span>`;
        }
      } else {
        compareEl.innerHTML = "";
      }
    }
  }

  function renderChart(filtered) {
    const wrap = document.getElementById("chartWrap");
    if (!wrap) return;
    const relevant = filtered.filter((t) => t.type === "income" || t.type === "expense");
    if (relevant.length === 0) {
      wrap.innerHTML = emptyStateHtml("line-chart", "Belum ada transaksi.", "Tambahkan transaksi pertamamu untuk melihat grafik tren keuangan.");
      refreshIcons();
      return;
    }
    if (!document.getElementById("dashboardChart")) wrap.innerHTML = `<canvas id="dashboardChart"></canvas>`;
    const byDate = {};
    relevant.forEach((t) => { byDate[t.date] = byDate[t.date] || { income: 0, expense: 0 }; byDate[t.date][t.type] += t.amount; });
    const dates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));
    const canvas = document.getElementById("dashboardChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates.map(formatDateShort),
        datasets: [
          { label: "Pemasukan", data: dates.map((d) => byDate[d].income), borderColor: chartIncomeColor("#22C55E"), backgroundColor: chartIncomeFill(), tension: 0.35, fill: true, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: chartIncomeColor("#22C55E") },
          { label: "Pengeluaran", data: dates.map((d) => byDate[d].expense), borderColor: chartExpenseColor("#EF4444"), backgroundColor: chartExpenseFill(), tension: 0.35, fill: true, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: chartExpenseColor("#EF4444") },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: "easeOutQuart" },
        transitions: { show: { animations: { x: { from: 0 }, y: { from: 0 } } } },
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, font: { size: 11 }, padding: 12 } }, tooltip: { backgroundColor: "rgba(0,0,0,0.8)", titleFont: { size: 12 }, bodyFont: { size: 11 }, padding: 10, cornerRadius: 8 } },
        scales: { y: { ticks: { callback: (v) => "Rp" + v.toLocaleString("id-ID"), font: { size: 10 } }, grid: { color: chartGrid("rgba(0,0,0,0.04)") } }, x: { ticks: { font: { size: 10 } }, grid: { display: false } } },
        hover: { mode: "index", intersect: false },
      },
    });
    trackChart(chart);
  }

  function renderSavingsPreview(allTx, savingsTargets, username) {
    const el = document.getElementById("savingsPreview");
    const transfers = allTx.filter((t) => t.type === "transfer" && t.toSavingsId);
    if (!savingsTargets || savingsTargets.length === 0) {
      el.innerHTML = emptyStateHtml("piggy-bank", "Belum ada target tabungan.", "Buat target tabungan untuk mulai menabung melalui transfer.", `<button type="button" class="btn btn-primary btn-sm" id="setSavingsTargetBtn">Buat Tabungan</button>`);
      const btn = document.getElementById("setSavingsTargetBtn");
      if (btn) btn.addEventListener("click", () => {
        if (typeof SettingView === "undefined") {
          loadScript("js/views/setting.js").then(() => SettingView.openSavingsModal(username)).catch(() => Toast.error("Gagal membuka pengaturan tabungan."));
        } else {
          SettingView.openSavingsModal(username);
        }
      });
      return;
    }

    const targetsWithProgress = savingsTargets.map((target) => {
      const saved = (target.currentAmount || 0) + transfers.filter((t) => t.toSavingsId === target.id).reduce((sum, t) => sum + t.amount, 0);
      const hasTarget = Number(target.targetAmount) > 0;
      const pct = hasTarget ? Math.min(100, Math.round((saved / target.targetAmount) * 100)) : 100;
      return { ...target, saved, pct, remaining: hasTarget ? Math.max(0, target.targetAmount - saved) : 0, hasTarget };
    });

    el.innerHTML = targetsWithProgress.map((target) => `
      <div class="savings-preview" style="animation:dbFadeIn 0.4s ease-out">
        <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">${escapeHtml(target.icon || "🎯")}</span><strong>${escapeHtml(target.name)}</strong></div>
        <div class="savings-progress" style="--progress-width:${target.pct}%"><span></span></div>
        <div class="savings-meta"><span>${formatRupiah(target.saved)}${target.hasTarget ? ` / ${formatRupiah(target.targetAmount)}` : ""}</span><span>${target.hasTarget ? `${target.pct}%` : "Fleksibel"}</span></div>
        <div class="savings-meta"><span>${target.dueDate ? `Target ${formatDateID(target.dueDate)}` : "Target fleksibel"}</span><span>${target.hasTarget ? `Sisa ${formatRupiah(target.remaining)}` : ""}</span></div>
      </div>`).join("");
  }

  function renderAccountBalances(allTx, accounts) {
    const list = document.getElementById("dashboardAccountList");
    if (!list) return;
    if (accounts.length === 0) {
      list.innerHTML = emptyStateHtml("wallet", "Belum ada akun.", "Tambahkan akun untuk melihat saldo di sini.");
      refreshIcons();
      return;
    }
    list.innerHTML = accounts.map((a) => {
      const bal = DataStore.computeAccountBalance(allTx, a);
      return `
        <div class="account-row" style="animation:dbFadeIn 0.3s ease-out">
          ${accountLogoMarkup(a, 30)}
          <div class="account-info"><div class="acc-name">${escapeHtml(a.name)}</div><div class="acc-type">Akun</div></div>
          <div class="account-balance ${bal < 0 ? "neg" : ""}">${formatRupiah(bal)}</div>
        </div>`;
    }).join("");
  }

  function renderRecent(allTx, catMap, accountsById, username, allAccounts, allCategories) {
    const list = document.getElementById("recentTxList");
    if (allTx.length === 0) {
      list.innerHTML = emptyStateHtml("inbox", "Belum ada transaksi.", "Tambahkan transaksi pertamamu.");
      return;
    }
    const recent = allTx.slice(0, 5);
    list.innerHTML = recent.map((t) => txRowHtml(t, catMap, accountsById)).join("");
    wireTxRowActions(list, username, allAccounts, allCategories, () => loadAndRender(username));
  }

  function renderInsights(filtered, allTx, savingsTargets, merchants) {
    const list = document.getElementById("insightList");
    if (filtered.length === 0) {
      list.innerHTML = emptyStateHtml("sparkles", "Belum ada insight.", "Tambahkan transaksi untuk melihat ringkasan otomatis.");
      return;
    }

    const income = filtered.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const net = income - expense;

    const expenseByCat = {};
    filtered.filter((t) => t.type === "expense").forEach((t) => {
      const catName = t.categoryName || "Lainnya";
      expenseByCat[catName] = (expenseByCat[catName] || 0) + t.amount;
    });
    const sortedCats = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]);
    const topCats = sortedCats.slice(0, 3);

    const prevRange = prevPeriodRange(state.range, state.customStart, state.customEnd);
    let prevIncome = 0, prevExpense = 0;
    const prevExpenseByCat = {};
    if (prevRange && allTx) {
      allTx.filter((t) => t.date >= prevRange[0] && t.date <= prevRange[1]).forEach((t) => {
        if (t.type === "income") prevIncome += t.amount;
        if (t.type === "expense") {
          prevExpense += t.amount;
          const catName = t.categoryName || "Lainnya";
          prevExpenseByCat[catName] = (prevExpenseByCat[catName] || 0) + t.amount;
        }
      });
    }
    const prevNet = prevIncome - prevExpense;
    const hasPrevData = prevRange && (prevIncome > 0 || prevExpense > 0);

    const items = [];

    if (hasPrevData && prevNet !== 0) {
      const pct = ((net - prevNet) / Math.abs(prevNet)) * 100;
      const up = pct >= 0;
      items.push({
        title: up ? "Cashflow membaik" : "Cashflow menurun",
        body: `Saldo bersih periode ini ${formatRupiah(Math.abs(net))}${net < 0 ? " (minus)" : ""}, ${up ? "naik" : "turun"} ${Math.abs(pct).toFixed(1)}% dibanding periode lalu.`,
      });
    } else {
      items.push({
        title: net >= 0 ? "Saldo bersih positif" : "Pengeluaran perlu dikontrol",
        body: net >= 0 ? `Saldo bersih periode ini positif sebesar ${formatRupiah(net)}.` : `Saldo bersih periode ini negatif sebesar ${formatRupiah(Math.abs(net))}.`,
      });
    }

    if (income > 0) {
      const burnPct = Math.round((expense / income) * 100);
      let burnBody;
      if (burnPct >= 100) burnBody = `Pengeluaran sudah melebihi pemasukan (${burnPct}% dari income periode ini).`;
      else if (burnPct >= 80) burnBody = `${burnPct}% dari pemasukan sudah terpakai untuk pengeluaran, sisa ruang gerak menipis.`;
      else burnBody = `${burnPct}% dari pemasukan terpakai untuk pengeluaran, sisanya masih aman.`;
      items.push({ title: "Rasio Pengeluaran", body: burnBody });
    }

    if (topCats.length > 0) {
      const body = topCats.map(([name, amt]) => `${name} ${formatRupiah(amt)} (${expense > 0 ? Math.round((amt / expense) * 100) : 0}%)`).join(", ");
      items.push({ title: topCats.length > 1 ? "Kategori pengeluaran teratas" : "Pengeluaran tertinggi", body });
    }

    if (topCats.length > 0 && hasPrevData) {
      const [topName, topAmt] = topCats[0];
      const prevAmt = prevExpenseByCat[topName] || 0;
      if (prevAmt > 0) {
        const catPct = ((topAmt - prevAmt) / prevAmt) * 100;
        if (catPct >= 30) {
          items.push({ title: "Kenaikan pengeluaran signifikan", body: `${topName} naik ${catPct.toFixed(0)}% dibanding periode lalu (${formatRupiah(prevAmt)} \u2192 ${formatRupiah(topAmt)}).` });
        }
      }
    }

    if (savingsTargets && savingsTargets.length > 0) {
      const savedThisPeriod = filtered.filter((t) => t.type === "transfer" && t.toSavingsId).reduce((sum, t) => sum + t.amount, 0);
      if (savedThisPeriod > 0) {
        items.push({ title: "Tabungan bertambah", body: `Kamu menabung ${formatRupiah(savedThisPeriod)} ke target tabungan pada periode ini.` });
      } else {
        items.push({ title: "Belum ada setoran tabungan", body: `Belum ada transfer ke target tabungan pada periode ini.` });
      }
    }

    // Merchant insights
    const merchantsList = merchants || [];
    if (merchantsList.length > 0) {
      const merchantExpenses = {};
      filtered.filter((t) => t.type === "expense" && t.merchantId).forEach((t) => {
        merchantExpenses[t.merchantId] = merchantExpenses[t.merchantId] || { total: 0, count: 0, name: t.merchantName || "Merchant" };
        merchantExpenses[t.merchantId].total += t.amount;
        merchantExpenses[t.merchantId].count += 1;
      });
      const merArr = Object.entries(merchantExpenses).sort((a, b) => b[1].total - a[1].total);
      if (merArr.length > 0) {
        const top = merArr[0][1];
        items.push({ title: "Merchant Teratas", body: `${top.name} — ${top.count} transaksi, total ${formatRupiah(top.total)}.` });
        const lastUsed = filtered.filter((t) => t.merchantId).sort((a, b) => b.date.localeCompare(a.date));
        if (lastUsed.length > 0) {
          const lastMerchantName = lastUsed[0].merchantName || "Merchant";
          items.push({ title: "Merchant Terakhir", body: `Transaksi terakhir: ${lastMerchantName} pada ${formatDateID(lastUsed[0].date)}.` });
        }
        if (merArr.length > 1) {
          items.push({ title: "Total Merchant", body: `${merArr.length} merchant digunakan pada periode ini.` });
        }
      }
    }

    list.innerHTML = items.map((item, i) => `<div class="insight-item" style="animation:dbFadeIn 0.3s ease-out ${i * 0.1}s both"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.body)}</span></div>`).join("");
  }

  return { render };
})();
