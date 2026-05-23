/* ===== OVERVIEW PAGE ===== */
function renderOverview() {
  const panel = document.getElementById('page-overview');
  const income = getMonthlyIncome();
  const expenses = getMonthlyExpenses();
  const netProfit = income.total - expenses;
  const taxReserve = getTaxReserve(income.total);
  const healthScore = getBusinessHealthScore();
  const goal = AppData.settings.monthlyGoal;
  const goalProgress = Math.min((income.total / goal) * 100, 100);
  const savingsAmt = netProfit * (AppData.settings.savingsRate / 100);

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Command Center</h1>
      <p class="page-subtitle">Your complete financial overview — updated in real time.</p>
    </div>

    <!-- KPI Stats -->
    <div class="stats-grid">
      <div class="stat-card" style="--card-accent: var(--accent)">
        <div class="stat-label">Total Monthly Income</div>
        <div class="stat-value">${formatCurrency(income.total)}</div>
        <div class="stat-delta up">↑ 12.4% vs last month</div>
        <div class="progress-bar" style="margin-top:12px"><div class="progress-fill" style="width:${goalProgress}%"></div></div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${Math.round(goalProgress)}% of ${formatCurrency(goal)} goal</div>
      </div>
      <div class="stat-card" style="--card-accent: var(--green)">
        <div class="stat-label">Net Profit</div>
        <div class="stat-value">${formatCurrency(netProfit)}</div>
        <div class="stat-delta up">After ${formatCurrency(expenses)} expenses</div>
      </div>
      <div class="stat-card" style="--card-accent: var(--red)">
        <div class="stat-label">Tax Reserve</div>
        <div class="stat-value">${formatCurrency(taxReserve)}</div>
        <div class="stat-delta neutral">${AppData.taxes.taxReserveRate * 100}% of income</div>
      </div>
      <div class="stat-card" style="--card-accent: var(--yellow)">
        <div class="stat-label">Savings</div>
        <div class="stat-value">${formatCurrency(savingsAmt)}</div>
        <div class="stat-delta neutral">${AppData.settings.savingsRate}% savings rate</div>
      </div>
    </div>

    <!-- Income Breakdown + Donut -->
    <div class="two-col" style="margin-bottom:20px">
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Income by Stream</div>
            <div class="section-sub">This month's breakdown</div>
          </div>
        </div>
        <div style="display:flex;gap:20px;align-items:center">
          <div class="chart-container" style="height:160px;width:160px;flex-shrink:0">
            <canvas id="chart-income-donut"></canvas>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:12px">
            <div class="stream-row" style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:10px;height:10px;border-radius:2px;background:rgba(167,139,250,0.8)"></div>
                <span style="font-size:13px;color:var(--text-secondary)">Writing / B2B</span>
              </div>
              <div style="text-align:right">
                <div style="font-size:14px;font-weight:600">${formatCurrency(income.writing)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${income.total > 0 ? Math.round(income.writing/income.total*100) : 0}%</div>
              </div>
            </div>
            <div class="stream-row" style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:10px;height:10px;border-radius:2px;background:rgba(52,211,153,0.8)"></div>
                <span style="font-size:13px;color:var(--text-secondary)">Insurance</span>
              </div>
              <div style="text-align:right">
                <div style="font-size:14px;font-weight:600">${formatCurrency(income.insurance)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${income.total > 0 ? Math.round(income.insurance/income.total*100) : 0}%</div>
              </div>
            </div>
            <div class="stream-row" style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:10px;height:10px;border-radius:2px;background:rgba(251,146,60,0.8)"></div>
                <span style="font-size:13px;color:var(--text-secondary)">Lyft</span>
              </div>
              <div style="text-align:right">
                <div style="font-size:14px;font-weight:600">${formatCurrency(income.lyft)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${income.total > 0 ? Math.round(income.lyft/income.total*100) : 0}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Business Health Score -->
      <div class="card" style="display:flex;flex-direction:column;gap:20px">
        <div class="section-header">
          <div>
            <div class="section-title">Business Health</div>
            <div class="section-sub">Overall operating score</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:24px">
          <div class="health-score-ring">
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border)" stroke-width="7"/>
              <circle cx="45" cy="45" r="38" fill="none" stroke="${healthScore >= 70 ? 'var(--green)' : healthScore >= 40 ? 'var(--yellow)' : 'var(--red)'}"
                stroke-width="7" stroke-linecap="round"
                stroke-dasharray="${2 * Math.PI * 38}"
                stroke-dashoffset="${2 * Math.PI * 38 * (1 - healthScore/100)}"/>
            </svg>
            <div class="health-score-value">
              ${healthScore}
              <span class="health-score-label">Score</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;flex:1">
            ${renderHealthItem('Goal Progress', goalProgress)}
            ${renderHealthItem('Stream Diversity', income.total > 0 ? [income.writing,income.insurance,income.lyft].filter(v=>v>0).length/3*100 : 0)}
            ${renderHealthItem('Active Clients', Math.min((AppData.writing.clients.filter(c=>c.status==='active').length + AppData.insurance.clients.filter(c=>c.status==='active').length)/8*100, 100))}
          </div>
        </div>
        <div class="divider" style="margin:0"></div>
        <div style="display:flex;gap:16px">
          <div style="flex:1;text-align:center">
            <div style="font-size:18px;font-weight:700">${AppData.writing.clients.filter(c=>c.status==='active').length + AppData.insurance.clients.filter(c=>c.status==='active').length}</div>
            <div style="font-size:11px;color:var(--text-muted)">Active Clients</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:18px;font-weight:700">3</div>
            <div style="font-size:11px;color:var(--text-muted)">Income Streams</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:18px;font-weight:700">${formatCurrency(income.total * 12)}</div>
            <div style="font-size:11px;color:var(--text-muted)">Annual Run Rate</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly Trend Chart -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">
        <div>
          <div class="section-title">6-Month Income Trend</div>
          <div class="section-sub">Stacked by income stream</div>
        </div>
      </div>
      <div class="chart-container chart-container-lg">
        <canvas id="chart-income-overview"></canvas>
      </div>
    </div>

    <!-- Upcoming + Quick Actions -->
    <div class="two-col">
      <div class="card">
        <div class="section-header">
          <div class="section-title">Upcoming Payments</div>
        </div>
        ${renderUpcomingPayments()}
      </div>
      <div class="card">
        <div class="section-header">
          <div class="section-title">Quick Actions</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary" style="justify-content:flex-start" onclick="App.navigate('writing')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 14l2-2 8-8 2 2-8 8-2 2H4v-2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Log Writing Income
          </button>
          <button class="btn btn-secondary" style="justify-content:flex-start" onclick="App.navigate('lyft')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/></svg>
            Add Lyft Trip
          </button>
          <button class="btn btn-secondary" style="justify-content:flex-start" onclick="App.navigate('insurance')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 2l6 3v5c0 4-3 7-6 8C7 17 4 14 4 10V5l6-3z" stroke="currentColor" stroke-width="1.5"/></svg>
            Add Insurance Client
          </button>
          <button class="btn btn-secondary" style="justify-content:flex-start" onclick="App.navigate('taxes')">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5"/></svg>
            Log Expense
          </button>
        </div>
      </div>
    </div>
  `;

  renderDonutChart('chart-income-donut',
    ['Writing', 'Insurance', 'Lyft'],
    [income.writing, income.insurance, income.lyft],
    ['rgba(167,139,250,0.8)', 'rgba(52,211,153,0.8)', 'rgba(251,146,60,0.8)']
  );
  renderIncomeChart('chart-income-overview');
}

function renderHealthItem(label, pct) {
  const p = Math.round(pct);
  const color = p >= 70 ? 'green' : p >= 40 ? 'yellow' : 'red';
  return `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--text-secondary)">${label}</span>
        <span style="color:var(--text-muted)">${p}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${color}" style="width:${p}%"></div></div>
    </div>`;
}

function renderUpcomingPayments() {
  const upcoming = AppData.writing.invoices
    .filter(inv => inv.status === 'outstanding')
    .map(inv => {
      const client = AppData.writing.clients.find(c => c.id === inv.clientId);
      return { name: client ? client.name : 'Unknown', amount: inv.amount, date: inv.dueDate, type: 'Invoice' };
    });

  const renewals = AppData.insurance.clients
    .filter(c => c.status === 'active')
    .map(c => ({ name: c.name, amount: c.premium, date: c.renewalDate, type: 'Renewal' }))
    .filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      const diff = (d - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 60;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const all = [...upcoming, ...renewals].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (all.length === 0) return `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-title">All clear!</div></div>`;

  return all.map(item => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:13px;font-weight:500">${item.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${item.type} · ${formatDate(item.date)}</div>
      </div>
      <span class="badge badge-${item.type === 'Invoice' ? 'yellow' : 'blue'}">${formatCurrency(item.amount)}</span>
    </div>
  `).join('');
}
