'use strict';

const AnalyticsModule = (() => {
  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function fmtDec(n) { return '$' + n.toFixed(2); }

  function render(container) {
    const history  = DataStore.getMonthlyHistory();
    const settings = DataStore.getSettings();
    const current  = DataStore.getCurrentMonth();
    const currStats = DataStore.computeMonthStats(current);

    // YTD calculation (2025 months)
    const ytd = history.filter(h => h.month.startsWith('2025'));
    const ytdGross   = ytd.reduce((s, h) => s + h.writing + h.insurance + h.lyft, 0);
    const ytdExpenses = ytd.reduce((s, h) => s + h.writingExpenses + h.insuranceExpenses + h.lyftExpenses + h.otherExpenses, 0);
    const ytdNet     = ytdGross - ytdExpenses;
    const ytdTax     = ytdNet * settings.taxRate;

    // Forecast (3-month projection based on trend)
    const last3 = history.slice(-3);
    const avgGrowth = last3.reduce((s, h, i) => {
      if (i === 0) return s;
      const prev = last3[i - 1];
      const pGross = prev.writing + prev.insurance + prev.lyft;
      const cGross = h.writing + h.insurance + h.lyft;
      return s + (pGross > 0 ? (cGross - pGross) / pGross : 0);
    }, 0) / (last3.length - 1);

    const projections = [1, 2, 3].map(i => Math.round(currStats.gross * Math.pow(1 + avgGrowth, i)));

    // Stream contribution
    const totalGross = current.writing + current.insurance + current.lyft;
    const streams = [
      { name: 'Writing / B2B',     value: current.writing,   pct: (current.writing / totalGross * 100).toFixed(1),   color: 'accent' },
      { name: 'Health Insurance',  value: current.insurance, pct: (current.insurance / totalGross * 100).toFixed(1), color: 'green' },
      { name: 'Lyft Driving',      value: current.lyft,      pct: (current.lyft / totalGross * 100).toFixed(1),      color: 'orange' }
    ].sort((a, b) => b.value - a.value);

    // Quarterly tax estimate
    const qTax = ytdNet / ytd.length * 3 * settings.taxRate;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Intelligence</h1>
          <p class="page-subtitle">Analytics, forecasting, and tax planning</p>
        </div>
      </div>

      <!-- YTD Stats -->
      <div class="section-label">Year to Date — 2025</div>
      <div class="kpi-grid kpi-grid--4">
        ${mini('YTD Gross',       fmt(ytdGross),   ytd.length + ' months tracked', 'accent')}
        ${mini('YTD Net Profit',  fmt(ytdNet),      'After all expenses',           'green')}
        ${mini('YTD Tax Owed',    fmt(ytdTax),      settings.taxRate*100 + '% est. rate',  'amber')}
        ${mini('Quarterly Est.',  fmt(qTax),        'Q2 tax reserve target',        'red')}
      </div>

      <!-- Trend Charts -->
      <div class="chart-row">
        <div class="card chart-card chart-card--wide">
          <div class="card-header">
            <h3 class="card-title">Gross vs Net — 12 Months</h3>
          </div>
          <div class="chart-container" style="height:240px">
            <canvas id="chart-analytics-trend"></canvas>
          </div>
        </div>
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">Stream Comparison</h3>
            <span class="card-subtitle">Last 6 months</span>
          </div>
          <div class="chart-container" style="height:240px">
            <canvas id="chart-stream-compare"></canvas>
          </div>
        </div>
      </div>

      <!-- Revenue Intelligence -->
      <div class="bottom-row">
        ${renderStreamAnalysis(streams, currStats)}
        ${renderForecast(projections, avgGrowth, currStats)}
      </div>

      <!-- Tax Planner -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Tax Planner</h3>
          <span class="card-subtitle">Estimated based on ${settings.taxRate * 100}% effective rate</span>
        </div>
        ${renderTaxPlanner(ytdNet, ytdTax, settings, qTax)}
      </div>

      <!-- KPIs -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Business KPIs</h3>
        </div>
        ${renderKPITable(history, currStats)}
      </div>
    `;

    requestAnimationFrame(() => {
      Charts.createAnalyticsComparison('chart-analytics-trend', history);
      Charts.createStreamComparisonBar('chart-stream-compare', history);
    });
  }

  function mini(label, value, sub, color) {
    return `
      <div class="card mini-kpi">
        <div class="mini-kpi-value text-${color}">${value}</div>
        <div class="mini-kpi-label">${label}</div>
        <div class="mini-kpi-sub">${sub}</div>
      </div>`;
  }

  function renderStreamAnalysis(streams, currStats) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Revenue Mix</h3>
          <span class="card-subtitle">Current month</span>
        </div>
        <div class="stream-analysis">
          ${streams.map((s, i) => `
            <div class="stream-analysis-item">
              <div class="stream-rank">#${i+1}</div>
              <div class="stream-analysis-body">
                <div class="stream-analysis-name">
                  <span class="stream-dot stream-dot--${s.color}"></span>
                  ${s.name}
                </div>
                <div class="progress-bar" style="margin:6px 0">
                  <div class="progress-fill progress-fill--${s.color}" style="width:${s.pct}%"></div>
                </div>
                <div class="stream-analysis-meta">
                  <span class="text-primary">${fmt(s.value)}</span>
                  <span class="cell-muted">${s.pct}% of revenue</span>
                </div>
              </div>
            </div>`).join('')}
        </div>
        <div class="stream-total" style="margin-top:16px">
          <span>Total Net Profit</span>
          <strong class="text-green">${fmt(currStats.net)}</strong>
        </div>
      </div>`;
  }

  function renderForecast(projections, avgGrowth, currStats) {
    const months = ['Jun 2025', 'Jul 2025', 'Aug 2025'];
    const growthLabel = (avgGrowth * 100).toFixed(1) + '% avg monthly growth';
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">3-Month Forecast</h3>
          <span class="card-subtitle">${growthLabel}</span>
        </div>
        <div class="forecast-list">
          ${projections.map((p, i) => `
            <div class="forecast-item">
              <div class="forecast-month">${months[i]}</div>
              <div class="forecast-bar-wrap">
                <div class="progress-bar">
                  <div class="progress-fill progress-fill--accent" style="width:${Math.min(100, p / projections[projections.length-1] * 90 + 10)}%"></div>
                </div>
              </div>
              <div class="forecast-value">${fmt(p)}</div>
            </div>`).join('')}
        </div>
        <div class="forecast-note">
          <i data-lucide="info" style="width:14px;height:14px"></i>
          Based on trend extrapolation. Actual results may vary.
        </div>
      </div>`;
  }

  function renderTaxPlanner(ytdNet, ytdTax, settings, qTax) {
    const saved   = ytdNet * 0.10; // assumption: 10% already set aside
    const gap     = Math.max(0, ytdTax - saved);
    const pctSaved = ytdTax > 0 ? Math.min(100, (saved / ytdTax * 100)).toFixed(0) : 0;

    return `
      <div class="tax-planner">
        <div class="tax-grid">
          <div class="tax-item">
            <div class="tax-label">YTD Net Income</div>
            <div class="tax-value">${fmt(ytdNet)}</div>
          </div>
          <div class="tax-item">
            <div class="tax-label">Effective Rate</div>
            <div class="tax-value">${(settings.taxRate * 100).toFixed(0)}%</div>
          </div>
          <div class="tax-item">
            <div class="tax-label">Total Tax Owed</div>
            <div class="tax-value text-amber">${fmt(ytdTax)}</div>
          </div>
          <div class="tax-item">
            <div class="tax-label">Next Quarter Est.</div>
            <div class="tax-value text-red">${fmt(qTax)}</div>
          </div>
        </div>
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span class="cell-muted">Tax reserve progress</span>
            <span class="text-amber">${pctSaved}% reserved</span>
          </div>
          <div class="progress-bar progress-bar--lg">
            <div class="progress-fill progress-fill--amber" style="width:${pctSaved}%"></div>
          </div>
          ${gap > 0 ? `<div class="tax-alert">Set aside an additional <strong>${fmt(gap)}</strong> to meet your estimated tax obligation.</div>` : `<div class="tax-ok">You're on track with your tax reserves.</div>`}
        </div>
        <div class="tax-disclaimer">
          This is an estimate only. Consult a tax professional for accurate advice. Does not account for deductions, credits, or self-employment tax adjustments.
        </div>
      </div>`;
  }

  function renderKPITable(history, currStats) {
    const last6 = history.slice(-6);
    const kpis = last6.map(h => {
      const gross = h.writing + h.insurance + h.lyft;
      const exp   = h.writingExpenses + h.insuranceExpenses + h.lyftExpenses + h.otherExpenses;
      const net   = gross - exp;
      const margin = gross > 0 ? (net / gross * 100).toFixed(1) : 0;
      const savingsRate = gross > 0 ? (h.savings / gross * 100).toFixed(1) : 0;
      return { month: h.month, gross, net, margin, savings: h.savings, savingsRate };
    });

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Gross Income</th>
              <th>Net Profit</th>
              <th>Margin</th>
              <th>Savings</th>
              <th>Savings Rate</th>
            </tr>
          </thead>
          <tbody>
            ${kpis.map(k => `
              <tr>
                <td>${months[parseInt(k.month.split('-')[1], 10) - 1]} ${k.month.split('-')[0]}</td>
                <td class="cell-number">${fmt(k.gross)}</td>
                <td class="cell-number text-green">${fmt(k.net)}</td>
                <td class="cell-number">${k.margin}%</td>
                <td class="cell-number">${fmt(k.savings)}</td>
                <td class="cell-number ${parseFloat(k.savingsRate) >= 20 ? 'text-green' : 'text-amber'}">${k.savingsRate}%</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return { render };
})();
