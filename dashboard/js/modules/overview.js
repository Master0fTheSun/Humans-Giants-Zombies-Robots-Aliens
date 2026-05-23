'use strict';

const OverviewModule = (() => {
  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function pct(n) { return (n > 0 ? '+' : '') + n + '%'; }

  function render(container) {
    const stats   = DataStore.getOverviewStats();
    const history = DataStore.getMonthlyHistory();
    const { current, curr, growthPct, pendingInvoices, monthlyCommission, renewalsDue, healthScore } = stats;

    const healthColor = healthScore >= 80 ? 'green' : healthScore >= 55 ? 'amber' : 'red';
    const growthColor = parseFloat(growthPct) >= 0 ? 'green' : 'red';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Command Center</h1>
          <p class="page-subtitle">Overview for ${formatMonthLabel(current.month)}</p>
        </div>
        <div class="header-actions">
          <span class="badge badge-${healthColor}">Health Score: ${healthScore}/100</span>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="kpi-grid">
        ${kpiCard('Total Income', fmt(curr.gross), pct(growthPct), growthColor, 'trending-up', 'accent')}
        ${kpiCard('Net Profit',   fmt(curr.net),   'after expenses', 'muted', 'dollar-sign', 'green')}
        ${kpiCard('Monthly Growth', pct(growthPct), 'vs last month', growthColor, 'activity', growthColor)}
        ${kpiCard('Business Health', healthScore + '/100', healthColor + ' status', healthColor, 'heart', healthColor)}
      </div>

      <!-- Charts Row -->
      <div class="chart-row">
        <div class="card chart-card chart-card--wide">
          <div class="card-header">
            <h3 class="card-title">Income Trends</h3>
            <span class="card-subtitle">Last 6 months by stream</span>
          </div>
          <div class="chart-container" style="height:240px">
            <canvas id="chart-income-trend"></canvas>
          </div>
        </div>
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">Revenue Split</h3>
            <span class="card-subtitle">This month</span>
          </div>
          <div class="chart-container" style="height:240px">
            <canvas id="chart-income-donut"></canvas>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        ${statCard('Tax Reserve', fmt(curr.tax), 'Set aside ' + DataStore.getSettings().taxRate * 100 + '%', 'amber', 'percent')}
        ${statCard('Savings Rate', curr.savingsRate.toFixed(1) + '%', fmt(current.savings) + ' saved', 'cyan', 'piggy-bank')}
        ${statCard('Pending Invoices', fmt(pendingInvoices), 'Outstanding writing', 'red', 'file-text')}
        ${statCard('Insurance MRR', fmt(monthlyCommission), 'Monthly commissions', 'green', 'shield')}
      </div>

      <!-- Cash Flow Chart -->
      <div class="card chart-card chart-card--full" style="margin-top:0">
        <div class="card-header">
          <h3 class="card-title">Cash Flow</h3>
          <span class="card-subtitle">Income vs expenses — 6 months</span>
        </div>
        <div class="chart-container" style="height:200px">
          <canvas id="chart-cashflow"></canvas>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="bottom-row">
        ${renderUpcomingEvents(renewalsDue)}
        ${renderStreamSummary(current, curr)}
      </div>
    `;

    requestAnimationFrame(() => {
      Charts.createIncomeLineChart('chart-income-trend', history);
      Charts.createIncomeDonut('chart-income-donut', curr);
      Charts.createCashFlowBar('chart-cashflow', history);
    });
  }

  function kpiCard(label, value, sub, subColor, icon, accent) {
    return `
      <div class="kpi-card kpi-card--${accent}">
        <div class="kpi-icon kpi-icon--${accent}">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${label}</div>
          <div class="kpi-sub kpi-sub--${subColor}">${sub}</div>
        </div>
      </div>`;
  }

  function statCard(label, value, sub, color, icon) {
    return `
      <div class="card stat-card">
        <div class="stat-icon stat-icon--${color}"><i data-lucide="${icon}"></i></div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
        <div class="stat-sub text-${color}">${sub}</div>
      </div>`;
  }

  function renderUpcomingEvents(renewalsDue) {
    const items = renewalsDue.length
      ? renewalsDue.map(c => `
          <div class="event-item">
            <div class="event-dot event-dot--amber"></div>
            <div class="event-body">
              <div class="event-title">${c.name}</div>
              <div class="event-sub">Policy renewal — ${c.renewalDate}</div>
            </div>
            <span class="badge badge-amber">Renew</span>
          </div>`)
      : ['<div class="empty-state-sm">No upcoming renewals</div>'];

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Upcoming Events</h3>
          <i data-lucide="calendar" style="color:var(--text-muted);width:16px;height:16px"></i>
        </div>
        <div class="event-list">${items.join('')}</div>
      </div>`;
  }

  function renderStreamSummary(current, curr) {
    const total = curr.gross;
    const streams = [
      { name: 'Writing / B2B', value: current.writing, color: 'accent', pctVal: (current.writing / total * 100).toFixed(0) },
      { name: 'Health Insurance', value: current.insurance, color: 'green', pctVal: (current.insurance / total * 100).toFixed(0) },
      { name: 'Lyft',            value: current.lyft,      color: 'orange', pctVal: (current.lyft / total * 100).toFixed(0) }
    ];

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Stream Breakdown</h3>
          <span class="card-subtitle">${formatMonthLabel(current.month)}</span>
        </div>
        <div class="stream-list">
          ${streams.map(s => `
            <div class="stream-item">
              <div class="stream-name">
                <span class="stream-dot stream-dot--${s.color}"></span>
                ${s.name}
              </div>
              <div class="stream-right">
                <span class="stream-value">$${s.value.toLocaleString()}</span>
                <div class="progress-bar">
                  <div class="progress-fill progress-fill--${s.color}" style="width:${s.pctVal}%"></div>
                </div>
                <span class="stream-pct">${s.pctVal}%</span>
              </div>
            </div>`).join('')}
        </div>
        <div class="stream-total">
          <span>Net Profit</span>
          <strong>$${Math.round(curr.net).toLocaleString()}</strong>
        </div>
      </div>`;
  }

  function formatMonthLabel(monthStr) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y, m] = monthStr.split('-');
    return months[parseInt(m, 10) - 1] + ' ' + y;
  }

  return { render };
})();
