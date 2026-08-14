let activeCharts = [];
function trackChart(c) { activeCharts.push(c); return c; }
function destroyActiveCharts() { activeCharts.forEach((c) => { try { if (c && typeof c.destroy === 'function') c.destroy(); } catch (e) { console.error('[Chart] destroy error:', e); } }); activeCharts = []; }
function isDarkTheme() { return document.documentElement.getAttribute("data-theme") === "dark"; }
function chartPalette(n) {
  const light = ["#29AC6B","#38BDF8","#3B82F6","#14B8A6","#8B5CF6","#F472B6","#F59E0B","#FACC15","#60A5FA","#34D399"];
  const dark  = ["#3FB882","#6FA0DC","#9A86DB","#42C2B2","#E4B96F","#E88B90","#7FA9E0","#7FD4A0","#8B9BB7","#C9A85C"];
  const pal = isDarkTheme() ? dark : light;
  const colors = [];
  for (let i = 0; i < n; i++) colors.push(pal[i % pal.length]);
  return colors;
}
function chartGrid(v) { return isDarkTheme() ? "rgba(255,255,255,0.07)" : v; }
function chartIncomeColor(light) { return isDarkTheme() ? "#3FB882" : light; }
function chartExpenseColor(light) { return isDarkTheme() ? "#E3544F" : light; }
function chartIncomeFill() { return isDarkTheme() ? "rgba(63,184,130,0.14)" : "rgba(34,197,94,0.12)"; }
function chartExpenseFill() { return isDarkTheme() ? "rgba(227,84,79,0.12)" : "rgba(239,68,68,0.12)"; }
function chartIncomeBar() { return isDarkTheme() ? "rgba(63,184,130,0.70)" : "rgba(16,185,129,0.75)"; }
function chartExpenseBar() { return isDarkTheme() ? "rgba(227,84,79,0.70)" : "rgba(212,83,80,0.75)"; }

