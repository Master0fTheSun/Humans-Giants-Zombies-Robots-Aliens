/* ===== INSURANCE MODULE ===== */
function renderInsurance() {
  const panel = document.getElementById('page-insurance');
  const clients = AppData.insurance.clients;
  const active = clients.filter(c => c.status === 'active');
  const totalCommissions = active.reduce((s, c) => s + c.commission, 0);
  const totalPremiums = active.reduce((s, c) => s + c.premium, 0);
  const history = AppData.insurance.commissionHistory;

  const now = new Date();
  const renewals90 = clients.filter(c => {
    const d = new Date(c.renewalDate);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  }).sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Health Insurance</h1>
      <p class="page-subtitle">Commissions, renewals, and client policy management.</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-card" style="--card-accent:var(--insurance-color)">
        <div class="stat-label">Monthly Commissions</div>
        <div class="stat-value">${formatCurrency(totalCommissions)}</div>
        <div class="stat-delta up">Recurring residuals</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent)">
        <div class="stat-label">Active Clients</div>
        <div class="stat-value">${active.length}</div>
        <div class="stat-delta neutral">${clients.length} total</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--blue)">
        <div class="stat-label">Total Premiums</div>
        <div class="stat-value">${formatCurrency(totalPremiums)}</div>
        <div class="stat-delta neutral">Under management</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--yellow)">
        <div class="stat-label">Annual Residuals</div>
        <div class="stat-value">${formatCurrency(totalCommissions * 12)}</div>
        <div class="stat-delta neutral">Projected</div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:20px">
      <!-- Commission Trend -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">Commission History</div>
        </div>
        <div class="chart-container">
          <canvas id="chart-insurance-commissions"></canvas>
        </div>
      </div>

      <!-- Upcoming Renewals -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">Renewals (Next 90 Days)</div>
          <span class="badge badge-yellow">${renewals90.length}</span>
        </div>
        ${renewals90.length === 0
          ? '<div class="empty-state"><div class="empty-state-title">No upcoming renewals</div></div>'
          : renewals90.map(c => {
              const d = new Date(c.renewalDate);
              const daysLeft = Math.round((d - now) / (1000 * 60 * 60 * 24));
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <div>
                    <div style="font-size:13px;font-weight:500">${c.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${c.carrier} · ${formatDate(c.renewalDate)}</div>
                  </div>
                  <span class="badge ${daysLeft <= 30 ? 'badge-red' : 'badge-yellow'}">${daysLeft}d left</span>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>

    <!-- Clients Table -->
    <div class="card">
      <div class="section-header">
        <div>
          <div class="section-title">Policy Holders</div>
          <div class="section-sub">${clients.length} clients</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="InsuranceModule.openAddClient()">+ Add Client</button>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Carrier</th><th>Policy</th><th>Premium</th><th>Commission</th><th>Renewal</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            ${clients.map(c => `
              <tr>
                <td>${c.name}</td>
                <td style="color:var(--text-secondary)">${c.carrier}</td>
                <td style="color:var(--text-secondary)">${c.policy}</td>
                <td>${formatCurrencyFull(c.premium)}</td>
                <td style="font-weight:600;color:var(--insurance-color)">${formatCurrencyFull(c.commission)}</td>
                <td>${formatDate(c.renewalDate)}</td>
                <td><span class="badge ${c.status === 'active' ? 'badge-green' : 'badge-yellow'}">${c.status}</span></td>
                <td><button class="btn btn-danger btn-sm btn-icon" onclick="InsuranceModule.deleteClient('${c.id}')">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Render commission history chart
  const labels = history.map(h => h.month.split(' ')[0]);
  renderLineChart('chart-insurance-commissions', labels, [{
    label: 'Commissions',
    data: history.map(h => h.amount),
    borderColor: 'rgba(52,211,153,0.9)',
    backgroundColor: 'rgba(52,211,153,0.1)',
    fill: true
  }]);
}

const InsuranceModule = {
  openAddClient() {
    App.openModal('Add Insurance Client', `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Client Name</label><input class="form-input" id="ic-name" placeholder="John Smith" /></div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="ic-status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Carrier</label><input class="form-input" id="ic-carrier" placeholder="Blue Shield" /></div>
        <div class="form-group"><label class="form-label">Policy Name</label><input class="form-input" id="ic-policy" placeholder="Gold PPO" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Monthly Premium ($)</label><input class="form-input" id="ic-premium" type="number" placeholder="450" /></div>
        <div class="form-group"><label class="form-label">Commission Rate (%)</label><input class="form-input" id="ic-rate" type="number" placeholder="15" value="15" /></div>
      </div>
      <div class="form-group"><label class="form-label">Renewal Date</label><input class="form-input" id="ic-renewal" type="date" /></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="InsuranceModule.saveClient()">Add Client</button>
      </div>
    `);
    const next = new Date(); next.setFullYear(next.getFullYear() + 1);
    document.getElementById('ic-renewal').value = next.toISOString().split('T')[0];
  },

  saveClient() {
    const name = document.getElementById('ic-name').value.trim();
    const carrier = document.getElementById('ic-carrier').value.trim();
    const policy = document.getElementById('ic-policy').value.trim();
    const premium = parseFloat(document.getElementById('ic-premium').value);
    const rate = parseFloat(document.getElementById('ic-rate').value) / 100;
    const renewal = document.getElementById('ic-renewal').value;
    const status = document.getElementById('ic-status').value;
    if (!name || !premium) { App.toast('Please fill required fields.', 'error'); return; }
    AppData.insurance.clients.push({ id: uid(), name, carrier: carrier || 'Unknown', policy: policy || 'Standard', premium, commission: premium * rate, renewalDate: renewal, status });
    saveData();
    App.closeModal();
    App.toast('Client added!', 'success');
    renderInsurance();
  },

  deleteClient(id) {
    if (!confirm('Remove this client?')) return;
    AppData.insurance.clients = AppData.insurance.clients.filter(c => c.id !== id);
    saveData();
    App.toast('Client removed.', 'info');
    renderInsurance();
  }
};
