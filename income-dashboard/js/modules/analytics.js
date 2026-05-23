/* ===== ANALYTICS MODULE ===== */
function renderAnalytics() {
  const panel = document.getElementById('page-analytics');
  const income = getMonthlyIncome();
  const trend = getMonthlyTrend();
  const lyft = getLyftMonthly();
  const expenses = getMonthlyExpenses();

  const topStream = Object.entries({ Writing: income.writing, Insurance: income.insurance, Lyft: income.lyft })
    .sort((a, b) => b[1] - a[1])[0];

  const consistencyScore = income.insurance > 0 ? 'High' : income.writing > 0 ? 'Medium' : 'Low';
  const burnRate = expenses / income.total * 100;

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Analytics</h1>
      <p class="page-subtitle">Financial intelligence, forecasts, and growth insights.</p>
    </div>

    <!-- Insight Cards -->
    <div class="three-col" style="margin-bottom:20px">
      <div class="card" style="border-left:3px solid var(--writing-color)">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">TOP INCOME STREAM</div>
        <div style="font-size:18px;font-weight:700">${topStream[0]}</div>
        <div style="font-size:13px;color:var(--text-secondary)">${formatCurrency(topStream[1])}/month</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${income.total > 0 ? Math.round(topStream[1]/income.total*100) : 0}% of total income</div>
      </div>
      <div class="card" style="border-left:3px solid var(--green)">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">INCOME CONSISTENCY</div>
        <div style="font-size:18px;font-weight:700">${consistencyScore}</div>
        <div style="font-size:13px;color:var(--text-secondary)">
          ${income.insurance > 0 ? 'Strong recurring base' : 'Project-dependent'}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${formatCurrency(income.insurance)}/mo recurring</div>
      </div>
      <div class="card" style="border-left:3px solid var(--yellow)">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">BURN RATE</div>
        <div style="font-size:18px;font-weight:700">${burnRate.toFixed(1)}%</div>
        <div style="font-size:13px;color:var(--text-secondary)">${formatCurrency(expenses)} / ${formatCurrency(income.total)}</div>
        <div style="font-size:11px;color:var(--${burnRate < 20 ? 'green' : burnRate < 35 ? 'yellow' : 'red'})">${burnRate < 20 ? 'Excellent' : burnRate < 35 ? 'Healthy' : 'Review expenses'}</div>
      </div>
    </div>

    <!-- Income Trend -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">
        <div>
          <div class="section-title">Revenue Growth</div>
          <div class="section-sub">6-month trend by stream</div>
        </div>
      </div>
      <div class="chart-container chart-container-lg">
        <canvas id="chart-analytics-trend"></canvas>
      </div>
    </div>

    <div class="two-col">
      <!-- Projections -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">12-Month Projection</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${renderProjection(income)}
        </div>
      </div>

      <!-- KPIs -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">Key Performance Indicators</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${renderKPI('Revenue per Active Client', formatCurrency(income.total / Math.max(1, AppData.writing.clients.filter(c=>c.status==='active').length + AppData.insurance.clients.filter(c=>c.status==='active').length)))}
          ${renderKPI('Lyft $/Hour', formatCurrencyFull(lyft.perHour))}
          ${renderKPI('Lyft $/Mile', formatCurrencyFull(lyft.perMile))}
          ${renderKPI('Avg Invoice Value', formatCurrency(AppData.writing.invoices.length ? AppData.writing.invoices.reduce((s,i)=>s+i.amount,0)/AppData.writing.invoices.length : 0))}
          ${renderKPI('Insurance Avg Commission', formatCurrencyFull(AppData.insurance.clients.length ? AppData.insurance.clients.reduce((s,c)=>s+c.commission,0)/AppData.insurance.clients.length : 0))}
          ${renderKPI('Monthly Goal Progress', Math.round(income.total / AppData.settings.monthlyGoal * 100) + '%')}
        </div>
      </div>
    </div>

    <!-- AI Insights -->
    <div class="card" style="margin-top:20px;border:1px solid var(--accent-glow);background:linear-gradient(135deg,var(--bg-card),rgba(124,109,250,0.05))">
      <div class="section-header">
        <div class="section-title">◈ Smart Insights</div>
        <span class="badge badge-purple">AI-Ready</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${generateInsights(income, lyft, expenses).map(ins => `
          <div style="display:flex;gap:12px;padding:10px;background:var(--bg-input);border-radius:var(--radius-sm)">
            <span style="font-size:16px;flex-shrink:0">${ins.icon}</span>
            <div>
              <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${ins.title}</div>
              <div style="font-size:12.5px;color:var(--text-secondary);margin-top:2px">${ins.body}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const labels = trend.map(t => t.label);
  renderLineChart('chart-analytics-trend', labels, [
    { label: 'Writing', data: trend.map(t => t.writing), borderColor: 'rgba(167,139,250,0.9)', backgroundColor: 'rgba(167,139,250,0.05)', fill: true },
    { label: 'Insurance', data: trend.map(t => t.insurance), borderColor: 'rgba(52,211,153,0.9)', backgroundColor: 'transparent' },
    { label: 'Lyft', data: trend.map(t => t.lyft), borderColor: 'rgba(251,146,60,0.9)', backgroundColor: 'transparent' }
  ]);
}

function renderProjection(income) {
  const growthRate = 0.08;
  const milestones = [
    { label: 'Q3 2026', months: 1, growth: 0 },
    { label: 'Q4 2026', months: 3, growth: growthRate },
    { label: 'Q1 2027', months: 6, growth: growthRate * 2 },
    { label: 'Q2 2027', months: 9, growth: growthRate * 3 }
  ];
  return milestones.map(m => {
    const proj = income.total * (1 + m.growth);
    const pct = Math.min(proj / AppData.settings.monthlyGoal * 100, 100);
    return `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:12.5px;color:var(--text-secondary)">${m.label}</span>
          <span style="font-size:13px;font-weight:600">${formatCurrency(proj)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${pct >= 100 ? 'green' : pct >= 70 ? '' : 'yellow'}" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderKPI(label, value) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:var(--text-secondary)">${label}</span>
      <span style="font-size:14px;font-weight:600">${value}</span>
    </div>
  `;
}

function generateInsights(income, lyft, expenses) {
  const insights = [];
  const burnRate = income.total > 0 ? expenses / income.total : 0;

  if (income.writing > income.insurance * 3) {
    insights.push({ icon: '📝', title: 'Writing is your primary revenue engine', body: `At ${formatCurrency(income.writing)}/mo, B2B writing drives ${Math.round(income.writing/income.total*100)}% of income. One new retainer client could push you past your monthly goal.` });
  }
  if (income.insurance < 500) {
    insights.push({ icon: '🛡️', title: 'Insurance commissions have high growth potential', body: `Adding 3-4 more active health insurance clients could add ${formatCurrency(240)}-${formatCurrency(360)}/mo in passive recurring income.` });
  }
  if (lyft.perHour < 20) {
    insights.push({ icon: '🚗', title: 'Optimize Lyft driving days and times', body: `Your current rate of ${formatCurrencyFull(lyft.perHour)}/hr has room to improve. Focus on Fri/Sat evenings and airport surges for peak earnings.` });
  }
  if (burnRate > 0.2) {
    insights.push({ icon: '💸', title: 'Review recurring subscriptions', body: `Expenses are at ${Math.round(burnRate*100)}% of income. Auditing monthly tools could free up ${formatCurrency(expenses * 0.2)}/mo.` });
  }
  insights.push({ icon: '📈', title: 'Diversification score: Strong', body: `Operating 3 income streams reduces risk significantly. Consider adding a 4th passive stream (course, template, digital product) to hit ${formatCurrency(AppData.settings.monthlyGoal * 1.5)}/mo.` });
  return insights.slice(0, 4);
}
