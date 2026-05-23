'use strict';

const LyftModule = (() => {
  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function fmtDec(n) { return '$' + n.toFixed(2); }

  function render(container) {
    const entries = DataStore.getLyftEntries();
    const today   = new Date().toISOString().split('T')[0].slice(0, 7); // YYYY-MM
    const thisMonth = entries.filter(e => e.date.startsWith(today) && e.earnings > 0);
    const lastMonth = entries.filter(e => {
      const [y, m] = e.date.split('-');
      const d = new Date(parseInt(y), parseInt(m) - 2, 1);
      return e.date.startsWith(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) && e.earnings > 0;
    });

    const stats = computeStats(thisMonth);
    const prevStats = computeStats(lastMonth);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Lyft Driving</h1>
          <p class="page-subtitle">Earnings, expenses, and efficiency</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="LyftModule.openModal()">
            <i data-lucide="plus"></i> Log Session
          </button>
        </div>
      </div>

      <div class="kpi-grid kpi-grid--4">
        ${kpi('This Month', fmt(stats.earnings), `${fmt(prevStats.earnings)} prev`, stats.earnings >= prevStats.earnings ? 'green' : 'red', 'orange')}
        ${kpi('Net Profit', fmt(stats.profit), `after ${fmt(stats.expenses)} expenses`, 'muted', 'green')}
        ${kpi('Hours Driven', stats.hours.toFixed(1) + 'h', `${stats.sessions} sessions`, 'muted', 'accent')}
        ${kpi('Profit / Hour', fmtDec(stats.profitPerHour), 'effective rate', stats.profitPerHour >= 20 ? 'green' : 'amber', 'cyan')}
      </div>

      <!-- Charts -->
      <div class="chart-row">
        <div class="card chart-card chart-card--wide">
          <div class="card-header">
            <h3 class="card-title">Daily Earnings vs Expenses</h3>
            <span class="card-subtitle">Last 14 sessions</span>
          </div>
          <div class="chart-container" style="height:220px">
            <canvas id="chart-lyft-bar"></canvas>
          </div>
        </div>
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">Profit / Hour Trend</h3>
            <span class="card-subtitle">Efficiency over time</span>
          </div>
          <div class="chart-container" style="height:220px">
            <canvas id="chart-lyft-trend"></canvas>
          </div>
        </div>
      </div>

      <!-- Efficiency Stats -->
      <div class="stats-row stats-row--3">
        ${effStat('Profit/Mile', '$' + (stats.profitPerMile || 0).toFixed(3), 'After fuel & maintenance', 'green')}
        ${effStat('Total Miles', stats.miles.toLocaleString() + ' mi', 'This month', 'cyan')}
        ${effStat('Fuel Cost', fmt(stats.fuel), 'This month', 'amber')}
      </div>

      <!-- Log Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Session Log</h3>
          <span class="card-subtitle">${entries.length} total entries</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Earnings</th>
                <th>Hours</th>
                <th>Miles</th>
                <th>Fuel</th>
                <th>Maint.</th>
                <th>Net</th>
                <th>$/hr</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${entries.filter(e => e.earnings > 0).map(e => entryRow(e)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${entryModal()}
    `;

    requestAnimationFrame(() => {
      Charts.createLyftEarningsChart('chart-lyft-bar', entries);
      Charts.createLyftTrendLine('chart-lyft-trend', entries);
    });
  }

  function computeStats(entries) {
    const earnings     = entries.reduce((s, e) => s + e.earnings, 0);
    const hours        = entries.reduce((s, e) => s + e.hours, 0);
    const miles        = entries.reduce((s, e) => s + e.miles, 0);
    const fuel         = entries.reduce((s, e) => s + e.fuel, 0);
    const maintenance  = entries.reduce((s, e) => s + e.maintenance, 0);
    const expenses     = fuel + maintenance;
    const profit       = earnings - expenses;
    const profitPerHour = hours > 0 ? profit / hours : 0;
    const profitPerMile = miles > 0 ? profit / miles : 0;
    return { earnings, hours, miles, fuel, maintenance, expenses, profit, profitPerHour, profitPerMile, sessions: entries.length };
  }

  function kpi(label, value, sub, subColor, accent) {
    return `
      <div class="kpi-card kpi-card--${accent}">
        <div class="kpi-body">
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${label}</div>
          <div class="kpi-sub kpi-sub--${subColor}">${sub}</div>
        </div>
      </div>`;
  }

  function effStat(label, value, sub, color) {
    return `
      <div class="card stat-card">
        <div class="stat-value text-${color}">${value}</div>
        <div class="stat-label">${label}</div>
        <div class="stat-sub">${sub}</div>
      </div>`;
  }

  function entryRow(e) {
    const net           = e.earnings - e.fuel - e.maintenance;
    const perHour       = e.hours > 0 ? (net / e.hours).toFixed(2) : '—';
    const profitClass   = net > 0 ? 'text-green' : 'text-red';
    return `
      <tr>
        <td>${e.date}</td>
        <td class="cell-number text-orange">${fmt(e.earnings)}</td>
        <td class="cell-number">${e.hours}h</td>
        <td class="cell-number">${e.miles} mi</td>
        <td class="cell-number text-amber">${fmt(e.fuel)}</td>
        <td class="cell-number ${e.maintenance > 0 ? 'text-red' : 'cell-muted'}">${e.maintenance > 0 ? fmt(e.maintenance) : '—'}</td>
        <td class="cell-number ${profitClass}">${fmt(net)}</td>
        <td class="cell-number cell-muted">${e.hours > 0 ? '$' + perHour : '—'}</td>
        <td class="cell-actions">
          <button class="icon-btn icon-btn--danger" title="Delete" onclick="LyftModule.deleteEntry('${e.id}')"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  function entryModal() {
    const today = new Date().toISOString().split('T')[0];
    return `
      <div class="modal-overlay" id="lyft-modal" style="display:none" onclick="LyftModule.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Log Driving Session</h3>
            <button class="icon-btn" onclick="LyftModule.closeModal()"><i data-lucide="x"></i></button>
          </div>
          <form id="lyft-form" onsubmit="LyftModule.save(event)">
            <div class="form-grid">
              <div class="form-group">
                <label>Date</label>
                <input type="date" name="date" required value="${today}">
              </div>
              <div class="form-group">
                <label>Gross Earnings ($)</label>
                <input type="number" name="earnings" required min="0" step="0.01" placeholder="0.00">
              </div>
              <div class="form-group">
                <label>Hours Driven</label>
                <input type="number" name="hours" required min="0" step="0.5" placeholder="0">
              </div>
              <div class="form-group">
                <label>Miles Driven</label>
                <input type="number" name="miles" required min="0" step="1" placeholder="0">
              </div>
              <div class="form-group">
                <label>Fuel Cost ($)</label>
                <input type="number" name="fuel" min="0" step="0.01" placeholder="0.00" value="0">
              </div>
              <div class="form-group">
                <label>Maintenance ($)</label>
                <input type="number" name="maintenance" min="0" step="0.01" placeholder="0.00" value="0">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" onclick="LyftModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Log Session</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function openModal() {
    const m = document.getElementById('lyft-modal');
    if (m) { m.style.display = 'flex'; if (window.lucide) lucide.createIcons(); }
  }

  function closeModal() {
    const m = document.getElementById('lyft-modal');
    if (m) m.style.display = 'none';
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    DataStore.addLyftEntry({
      date:        fd.get('date'),
      earnings:    parseFloat(fd.get('earnings'))    || 0,
      hours:       parseFloat(fd.get('hours'))       || 0,
      miles:       parseFloat(fd.get('miles'))       || 0,
      fuel:        parseFloat(fd.get('fuel'))        || 0,
      maintenance: parseFloat(fd.get('maintenance')) || 0
    });
    closeModal();
    App.navigate('lyft');
  }

  function deleteEntry(id) {
    if (confirm('Delete this session log?')) {
      DataStore.deleteLyftEntry(id);
      App.navigate('lyft');
    }
  }

  return { render, openModal, closeModal, save, deleteEntry };
})();
