/* ===== CLIENTS PAGE ===== */
function renderClients() {
  const panel = document.getElementById('page-clients');
  const writingClients = AppData.writing.clients.map(c => ({ ...c, stream: 'writing' }));
  const insuranceClients = AppData.insurance.clients.map(c => ({ ...c, stream: 'insurance', monthlyValue: c.commission }));
  const all = [...writingClients, ...insuranceClients];

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">All Clients</h1>
      <p class="page-subtitle">${all.length} clients across all income streams.</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px">
      <div class="stat-card" style="--card-accent:var(--accent)">
        <div class="stat-label">Total Clients</div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-delta neutral">${all.filter(c=>c.status==='active').length} active</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--writing-color)">
        <div class="stat-label">Writing Clients</div>
        <div class="stat-value">${writingClients.length}</div>
        <div class="stat-delta neutral">${formatCurrency(writingClients.filter(c=>c.status==='active').reduce((s,c)=>s+c.monthlyValue,0))}/mo</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--insurance-color)">
        <div class="stat-label">Insurance Clients</div>
        <div class="stat-value">${insuranceClients.length}</div>
        <div class="stat-delta neutral">${formatCurrency(insuranceClients.filter(c=>c.status==='active').reduce((s,c)=>s+c.commission,0))}/mo commissions</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">Total Monthly Value</div>
        <div class="stat-value">${formatCurrency(all.filter(c=>c.status==='active').reduce((s,c)=>s+(c.monthlyValue||c.commission||0),0))}</div>
        <div class="stat-delta up">Active only</div>
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <div class="section-title">Client Directory</div>
        <div class="section-actions">
          <div class="tabs" style="margin-bottom:0">
            <button class="tab active" onclick="ClientsModule.filter('all', this)">All</button>
            <button class="tab" onclick="ClientsModule.filter('writing', this)">Writing</button>
            <button class="tab" onclick="ClientsModule.filter('insurance', this)">Insurance</button>
          </div>
        </div>
      </div>
      <div id="clients-table-wrap" style="overflow-x:auto">
        ${renderClientsTable(all)}
      </div>
    </div>
  `;
}

function renderClientsTable(clients) {
  if (clients.length === 0) return `<div class="empty-state"><div class="empty-state-title">No clients found.</div></div>`;
  return `
    <table class="data-table">
      <thead>
        <tr><th>Name</th><th>Stream</th><th>Monthly Value</th><th>Status</th><th>Type/Policy</th></tr>
      </thead>
      <tbody>
        ${clients.map(c => `
          <tr>
            <td>
              <div style="font-weight:500">${c.name}</div>
              ${c.email ? `<div style="font-size:11px;color:var(--text-muted)">${c.email}</div>` : ''}
            </td>
            <td><span class="stream-pill ${c.stream}"><span class="stream-dot"></span>${c.stream === 'writing' ? 'Writing' : 'Insurance'}</span></td>
            <td style="font-weight:600">${formatCurrency(c.monthlyValue || c.commission || 0)}</td>
            <td><span class="badge ${c.status === 'active' ? 'badge-green' : 'badge-yellow'}">${c.status}</span></td>
            <td style="color:var(--text-secondary)">${c.projectType || c.policy || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

const ClientsModule = {
  filter(stream, btn) {
    document.querySelectorAll('#page-clients .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const writingClients = AppData.writing.clients.map(c => ({ ...c, stream: 'writing' }));
    const insuranceClients = AppData.insurance.clients.map(c => ({ ...c, stream: 'insurance', monthlyValue: c.commission }));
    const all = stream === 'all' ? [...writingClients, ...insuranceClients]
      : stream === 'writing' ? writingClients : insuranceClients;
    document.getElementById('clients-table-wrap').innerHTML = renderClientsTable(all);
  }
};
