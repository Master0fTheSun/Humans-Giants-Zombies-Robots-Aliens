/* ===== LYFT MODULE ===== */
function renderLyft() {
  const panel = document.getElementById('page-lyft');
  const lyft = getLyftMonthly();
  const trips = [...AppData.lyft.trips].sort((a, b) => new Date(b.date) - new Date(a.date));

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Lyft</h1>
      <p class="page-subtitle">Trip earnings, mileage, fuel, and profit tracking.</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div class="stat-card" style="--card-accent:var(--lyft-color)">
        <div class="stat-label">Gross Earnings</div>
        <div class="stat-value">${formatCurrency(lyft.gross)}</div>
        <div class="stat-delta neutral">This month</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">Net Profit</div>
        <div class="stat-value">${formatCurrency(lyft.net)}</div>
        <div class="stat-delta neutral">After fuel & maint.</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent)">
        <div class="stat-label">Per Hour</div>
        <div class="stat-value">${formatCurrencyFull(lyft.perHour)}</div>
        <div class="stat-delta neutral">${lyft.hours.toFixed(1)} hrs driven</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--blue)">
        <div class="stat-label">Per Mile</div>
        <div class="stat-value">${formatCurrencyFull(lyft.perMile)}</div>
        <div class="stat-delta neutral">${lyft.miles} miles</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--red)">
        <div class="stat-label">Fuel Cost</div>
        <div class="stat-value">${formatCurrency(lyft.fuel)}</div>
        <div class="stat-delta down">${lyft.gross > 0 ? Math.round(lyft.fuel/lyft.gross*100) : 0}% of gross</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--yellow)">
        <div class="stat-label">Trips</div>
        <div class="stat-value">${lyft.trips}</div>
        <div class="stat-delta neutral">This month</div>
      </div>
    </div>

    <!-- Chart -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">
        <div class="section-title">Earnings Trend (Last 8 Sessions)</div>
      </div>
      <div class="chart-container">
        <canvas id="chart-lyft-trend"></canvas>
      </div>
    </div>

    <div class="two-col">
      <!-- Trip Log -->
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Trip Log</div>
            <div class="section-sub">${trips.length} sessions</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="LyftModule.openAddTrip()">+ Add Trip</button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Earnings</th><th>Hrs</th><th>Miles</th><th>Fuel</th><th>Net</th><th></th></tr></thead>
            <tbody>
              ${trips.map(t => `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td style="color:var(--green);font-weight:500">${formatCurrency(t.earnings)}</td>
                  <td>${t.hours}h</td>
                  <td>${t.miles}</td>
                  <td style="color:var(--red)">${formatCurrency(t.fuel)}</td>
                  <td style="font-weight:600">${formatCurrency(t.earnings - t.fuel)}</td>
                  <td><button class="btn btn-danger btn-sm btn-icon" onclick="LyftModule.deleteTrip('${t.id}')">✕</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Maintenance Log -->
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-title">Maintenance Log</div>
            <div class="section-sub">Vehicle costs</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="LyftModule.openAddMaintenance()">+ Add</button>
        </div>
        ${AppData.lyft.maintenance.length === 0
          ? '<div class="empty-state"><div class="empty-state-title">No maintenance logged</div></div>'
          : `<table class="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Cost</th><th></th></tr></thead>
              <tbody>
                ${AppData.lyft.maintenance.map(m => `
                  <tr>
                    <td>${formatDate(m.date)}</td>
                    <td>${m.type}</td>
                    <td style="color:var(--red)">${formatCurrency(m.cost)}</td>
                    <td><button class="btn btn-danger btn-sm btn-icon" onclick="LyftModule.deleteMaintenance('${m.id}')">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:var(--text-secondary)">Total Maintenance</span>
          <span style="font-weight:600;color:var(--red)">${formatCurrency(AppData.lyft.maintenance.reduce((s,m)=>s+m.cost,0))}</span>
        </div>

        <!-- Best Day Analysis -->
        <div class="divider"></div>
        <div class="section-title" style="margin-bottom:12px">Best Driving Days</div>
        ${renderBestDays()}
      </div>
    </div>
  `;

  renderLyftChart('chart-lyft-trend');
}

function renderBestDays() {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = {};
  AppData.lyft.trips.forEach(t => {
    const day = new Date(t.date + 'T00:00:00').getDay();
    if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
    byDay[day].total += t.earnings;
    byDay[day].count++;
  });
  const sorted = Object.entries(byDay)
    .map(([day, d]) => ({ day: parseInt(day), avg: d.total / d.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);
  if (sorted.length === 0) return '<p style="font-size:13px;color:var(--text-muted)">Add trips to see trends.</p>';
  return sorted.map((d, i) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:11px;font-weight:600;color:var(--text-muted);width:24px">#${i+1}</span>
      <span style="font-size:13px;font-weight:500;width:32px">${dayNames[d.day]}</span>
      <div class="progress-bar" style="flex:1"><div class="progress-fill lyft-fill" style="width:${Math.round(d.avg/sorted[0].avg*100)}%;background:var(--lyft-color)"></div></div>
      <span style="font-size:13px;font-weight:600;width:52px;text-align:right">${formatCurrency(d.avg)}</span>
    </div>
  `).join('');
}

const LyftModule = {
  openAddTrip() {
    App.openModal('Log Lyft Trip', `
      <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="lt-date" type="date" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Gross Earnings ($)</label><input class="form-input" id="lt-earn" type="number" step="0.01" placeholder="120.00" /></div>
        <div class="form-group"><label class="form-label">Hours Worked</label><input class="form-input" id="lt-hours" type="number" step="0.25" placeholder="5.5" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Miles Driven</label><input class="form-input" id="lt-miles" type="number" placeholder="90" /></div>
        <div class="form-group"><label class="form-label">Fuel Cost ($)</label><input class="form-input" id="lt-fuel" type="number" step="0.01" placeholder="15.00" /></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="LyftModule.saveTrip()">Log Trip</button>
      </div>
    `);
    document.getElementById('lt-date').value = new Date().toISOString().split('T')[0];
  },

  saveTrip() {
    const date = document.getElementById('lt-date').value;
    const earnings = parseFloat(document.getElementById('lt-earn').value);
    const hours = parseFloat(document.getElementById('lt-hours').value);
    const miles = parseInt(document.getElementById('lt-miles').value);
    const fuel = parseFloat(document.getElementById('lt-fuel').value);
    if (!date || isNaN(earnings)) { App.toast('Please fill required fields.', 'error'); return; }
    AppData.lyft.trips.push({ id: uid(), date, earnings, hours: hours||0, miles: miles||0, fuel: fuel||0 });
    saveData();
    App.closeModal();
    App.toast('Trip logged!', 'success');
    renderLyft();
  },

  openAddMaintenance() {
    App.openModal('Log Maintenance', `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="lm-date" type="date" /></div>
        <div class="form-group"><label class="form-label">Cost ($)</label><input class="form-input" id="lm-cost" type="number" step="0.01" /></div>
      </div>
      <div class="form-group"><label class="form-label">Type</label><input class="form-input" id="lm-type" placeholder="Oil Change, Tire Rotation..." /></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="LyftModule.saveMaintenance()">Save</button>
      </div>
    `);
    document.getElementById('lm-date').value = new Date().toISOString().split('T')[0];
  },

  saveMaintenance() {
    const date = document.getElementById('lm-date').value;
    const cost = parseFloat(document.getElementById('lm-cost').value);
    const type = document.getElementById('lm-type').value.trim();
    if (!date || isNaN(cost)) { App.toast('Fill required fields.', 'error'); return; }
    AppData.lyft.maintenance.push({ id: uid(), date, cost, type: type || 'Maintenance' });
    saveData();
    App.closeModal();
    App.toast('Logged!', 'success');
    renderLyft();
  },

  deleteTrip(id) {
    AppData.lyft.trips = AppData.lyft.trips.filter(t => t.id !== id);
    saveData();
    App.toast('Trip removed.', 'info');
    renderLyft();
  },

  deleteMaintenance(id) {
    AppData.lyft.maintenance = AppData.lyft.maintenance.filter(m => m.id !== id);
    saveData();
    App.toast('Removed.', 'info');
    renderLyft();
  }
};
