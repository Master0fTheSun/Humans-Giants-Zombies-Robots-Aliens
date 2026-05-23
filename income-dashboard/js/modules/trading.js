/* ===== TRADING MODULE ===== */
function renderTrading() {
  const panel = document.getElementById('page-trading');
  const stats = getTradingMonthly();
  const sessions = [...(AppData.trading?.sessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const startingBalance = AppData.trading?.startingBalance || 5000;

  // Build running equity from all sessions sorted by date ascending
  const allSorted = [...sessions].reverse();
  let equity = startingBalance;
  const equityData = [{ date: 'Start', value: equity }];
  allSorted.forEach(s => {
    equity += s.pnl;
    equityData.push({ date: s.date, value: Math.round(equity * 100) / 100 });
  });
  const currentBalance = equity;
  const totalGrowth = currentBalance - startingBalance;

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Trading</h1>
      <p class="page-subtitle">Micro futures P&L, win rate, and account growth.</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:20px">
      <div class="stat-card" style="--card-accent:${stats.netPnl >= 0 ? 'var(--green)' : 'var(--red)'}">
        <div class="stat-label">Monthly P&L</div>
        <div class="stat-value" style="color:${stats.netPnl >= 0 ? 'var(--green)' : 'var(--red)'}">${stats.netPnl >= 0 ? '+' : ''}${formatCurrency(stats.netPnl)}</div>
        <div class="stat-delta neutral">${stats.totalSessions} sessions</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent)">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value">${stats.winRate.toFixed(0)}%</div>
        <div class="stat-delta neutral">${stats.wins}W / ${stats.losses}L</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">Best Day</div>
        <div class="stat-value" style="color:var(--green)">+${formatCurrency(stats.bestDay)}</div>
        <div class="stat-delta neutral">Avg win: ${formatCurrency(stats.avgWin)}</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--red)">
        <div class="stat-label">Worst Day</div>
        <div class="stat-value" style="color:var(--red)">${formatCurrency(stats.worstDay)}</div>
        <div class="stat-delta neutral">Avg loss: ${formatCurrency(stats.avgLoss)}</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--blue)">
        <div class="stat-label">Account Balance</div>
        <div class="stat-value">${formatCurrency(currentBalance)}</div>
        <div class="stat-delta ${totalGrowth >= 0 ? 'up' : 'down'}">${totalGrowth >= 0 ? '↑' : '↓'} ${formatCurrency(Math.abs(totalGrowth))} total</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--yellow)">
        <div class="stat-label">Total Trades</div>
        <div class="stat-value">${stats.totalTrades}</div>
        <div class="stat-delta neutral">This month</div>
      </div>
    </div>

    <!-- Equity Curve -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">
        <div>
          <div class="section-title">Equity Curve</div>
          <div class="section-sub">Account growth over time</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--text-muted)">Starting:</span>
          <span style="font-size:13px;font-weight:600">${formatCurrency(startingBalance)}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:8px">Current:</span>
          <span style="font-size:13px;font-weight:600;color:${totalGrowth >= 0 ? 'var(--green)' : 'var(--red)'}">${formatCurrency(currentBalance)}</span>
        </div>
      </div>
      <div class="chart-container chart-container-lg">
        <canvas id="chart-trading-equity"></canvas>
      </div>
    </div>

    <!-- Session Log -->
    <div class="card">
      <div class="section-header">
        <div>
          <div class="section-title">Session Log</div>
          <div class="section-sub">${sessions.length} sessions recorded</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="TradingModule.openSetBalance()">Set Balance</button>
          <button class="btn btn-primary btn-sm" onclick="TradingModule.openAddSession()">+ Log Session</button>
        </div>
      </div>

      ${sessions.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">📈</div>
            <div class="empty-state-title">No sessions logged yet</div>
            <div class="empty-state-sub">Tap "+ Log Session" after each trading day</div>
          </div>`
        : `<div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr><th>Date</th><th>Instrument</th><th>Contracts</th><th>Trades</th><th>P&L</th><th>Result</th><th>Notes</th><th></th></tr>
              </thead>
              <tbody>
                ${sessions.map(s => `
                  <tr>
                    <td>${formatDate(s.date)}</td>
                    <td><span class="badge badge-blue">${s.instrument || 'MES'}</span></td>
                    <td style="text-align:center">${s.contracts}</td>
                    <td style="text-align:center">${s.trades}</td>
                    <td style="font-weight:700;color:${s.pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${s.pnl >= 0 ? '+' : ''}${formatCurrency(s.pnl)}</td>
                    <td><span class="badge ${s.pnl >= 0 ? 'badge-green' : 'badge-red'}">${s.pnl >= 0 ? 'Win' : 'Loss'}</span></td>
                    <td style="color:var(--text-muted);font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.notes || '—'}</td>
                    <td><button class="btn btn-danger btn-sm btn-icon" onclick="TradingModule.deleteSession('${s.id}')">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>
  `;

  // Render equity chart
  destroyChart('chart-trading-equity');
  const ctx = document.getElementById('chart-trading-equity');
  if (ctx && equityData.length > 1) {
    const labels = equityData.map((d, i) => i === 0 ? 'Start' : (() => { const dt = new Date(d.date + 'T00:00:00'); return (dt.getMonth()+1)+'/'+dt.getDate(); })());
    const values = equityData.map(d => d.value);
    const isUp = values[values.length - 1] >= values[0];
    const color = isUp ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)';
    const fillColor = isUp ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
    renderLineChart('chart-trading-equity', labels, [{
      label: 'Balance',
      data: values,
      borderColor: color,
      backgroundColor: fillColor,
      fill: true
    }]);
  }
}

const TradingModule = {
  openAddSession() {
    App.openModal('Log Trading Session', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" id="tr-date" type="date" />
        </div>
        <div class="form-group">
          <label class="form-label">Instrument</label>
          <select class="form-select" id="tr-instrument">
            <option value="MES">MES (Micro S&P 500)</option>
            <option value="MNQ">MNQ (Micro Nasdaq)</option>
            <option value="MYM">MYM (Micro Dow)</option>
            <option value="M2K">M2K (Micro Russell)</option>
            <option value="MCL">MCL (Micro Crude)</option>
            <option value="MGC">MGC (Micro Gold)</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Contracts Traded</label>
          <input class="form-input" id="tr-contracts" type="number" min="1" value="1" />
        </div>
        <div class="form-group">
          <label class="form-label">Number of Trades</label>
          <input class="form-input" id="tr-trades" type="number" min="1" value="1" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Net P&L ($) — use negative for a loss</label>
        <input class="form-input" id="tr-pnl" type="number" step="0.01" placeholder="e.g. 250 or -85" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input class="form-input" id="tr-notes" placeholder="Trend day, news event, choppy..." />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="TradingModule.saveSession()">Log Session</button>
      </div>
    `);
    document.getElementById('tr-date').value = new Date().toISOString().split('T')[0];
  },

  saveSession() {
    const date = document.getElementById('tr-date').value;
    const instrument = document.getElementById('tr-instrument').value;
    const contracts = parseInt(document.getElementById('tr-contracts').value);
    const trades = parseInt(document.getElementById('tr-trades').value);
    const pnl = parseFloat(document.getElementById('tr-pnl').value);
    const notes = document.getElementById('tr-notes').value.trim();
    if (!date || isNaN(pnl)) { App.toast('Fill in date and P&L.', 'error'); return; }
    if (!AppData.trading) AppData.trading = { sessions: [], startingBalance: 5000 };
    AppData.trading.sessions.push({ id: uid(), date, instrument, contracts: contracts || 1, trades: trades || 1, pnl, notes });
    saveData();
    App.closeModal();
    App.toast(pnl >= 0 ? 'Win logged! 🟢' : 'Loss logged. Stay disciplined.', pnl >= 0 ? 'success' : 'info');
    renderTrading();
  },

  openSetBalance() {
    const current = AppData.trading?.startingBalance || 5000;
    App.openModal('Set Starting Balance', `
      <div class="form-group">
        <label class="form-label">Starting / Current Account Balance ($)</label>
        <input class="form-input" id="tr-balance" type="number" value="${current}" />
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">This is your baseline for the equity curve</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="TradingModule.saveBalance()">Save</button>
      </div>
    `);
  },

  saveBalance() {
    const balance = parseFloat(document.getElementById('tr-balance').value);
    if (isNaN(balance)) { App.toast('Enter a valid amount.', 'error'); return; }
    if (!AppData.trading) AppData.trading = { sessions: [], startingBalance: balance };
    AppData.trading.startingBalance = balance;
    saveData();
    App.closeModal();
    App.toast('Balance updated!', 'success');
    renderTrading();
  },

  deleteSession(id) {
    AppData.trading.sessions = AppData.trading.sessions.filter(s => s.id !== id);
    saveData();
    App.toast('Session removed.', 'info');
    renderTrading();
  }
};
