/* ===== WRITING / B2B MODULE ===== */
function renderWriting() {
  const panel = document.getElementById('page-writing');
  const clients = AppData.writing.clients;
  const invoices = AppData.writing.invoices;
  const activeRevenue = clients.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyValue, 0);
  const outstanding = invoices.filter(i => i.status === 'outstanding').reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Writing / B2B</h1>
      <p class="page-subtitle">Clients, contracts, invoices, and recurring revenue.</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-card" style="--card-accent:var(--writing-color)">
        <div class="stat-label">Monthly Recurring</div>
        <div class="stat-value">${formatCurrency(activeRevenue)}</div>
        <div class="stat-delta neutral">${clients.filter(c=>c.status==='active').length} active clients</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--yellow)">
        <div class="stat-label">Outstanding</div>
        <div class="stat-value">${formatCurrency(outstanding)}</div>
        <div class="stat-delta neutral">${invoices.filter(i=>i.status==='outstanding').length} invoices</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">Collected</div>
        <div class="stat-value">${formatCurrency(paidThisMonth)}</div>
        <div class="stat-delta up">This period</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--blue)">
        <div class="stat-label">Annual Run Rate</div>
        <div class="stat-value">${formatCurrency(activeRevenue * 12)}</div>
        <div class="stat-delta neutral">Projected</div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:20px">
      <!-- Clients Table -->
      <div class="card" style="grid-column:1/-1">
        <div class="section-header">
          <div>
            <div class="section-title">Clients</div>
            <div class="section-sub">${clients.length} total</div>
          </div>
          <div class="section-actions">
            <button class="btn btn-primary btn-sm" onclick="WritingModule.openAddClient()">+ Add Client</button>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table" id="writing-clients-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Monthly Value</th>
                <th>Status</th>
                <th>Started</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => `
                <tr>
                  <td>
                    <div style="font-weight:500">${c.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${c.email}</div>
                  </td>
                  <td>${c.projectType}</td>
                  <td style="font-weight:600;color:var(--text-primary)">${formatCurrency(c.monthlyValue)}</td>
                  <td><span class="badge ${c.status === 'active' ? 'badge-green' : 'badge-yellow'}">${c.status}</span></td>
                  <td>${formatDate(c.startDate)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-ghost btn-sm" onclick="WritingModule.openAddInvoice('${c.id}')">Invoice</button>
                      <button class="btn btn-danger btn-sm btn-icon" onclick="WritingModule.deleteClient('${c.id}')">✕</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Invoices -->
    <div class="card">
      <div class="section-header">
        <div>
          <div class="section-title">Invoices</div>
          <div class="section-sub">${invoices.length} total</div>
        </div>
        <div class="section-actions">
          <button class="btn btn-ghost btn-sm" onclick="WritingModule.openAddInvoice(null)">+ New Invoice</button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr><th>Client</th><th>Amount</th><th>Issued</th><th>Due</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${invoices.map(inv => {
              const client = clients.find(c => c.id === inv.clientId);
              return `
                <tr>
                  <td>${client ? client.name : '—'}</td>
                  <td style="font-weight:600">${formatCurrency(inv.amount)}</td>
                  <td>${formatDate(inv.issueDate)}</td>
                  <td>${formatDate(inv.dueDate)}</td>
                  <td><span class="badge ${inv.status === 'paid' ? 'badge-green' : 'badge-yellow'}">${inv.status}</span></td>
                  <td>
                    ${inv.status === 'outstanding'
                      ? `<button class="btn btn-ghost btn-sm" onclick="WritingModule.markPaid('${inv.id}')">Mark Paid</button>`
                      : '<span style="font-size:12px;color:var(--text-muted)">✓ Paid</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

const WritingModule = {
  openAddClient() {
    App.openModal('Add Client', `
      <div class="form-group"><label class="form-label">Client Name</label><input class="form-input" id="wc-name" placeholder="Acme Corp" /></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="wc-email" type="email" placeholder="contact@company.com" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Monthly Value ($)</label><input class="form-input" id="wc-value" type="number" placeholder="1500" /></div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="wc-status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Project Type</label><input class="form-input" id="wc-type" placeholder="B2B Content, Email Copy..." /></div>
      <div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="wc-start" type="date" /></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="WritingModule.saveClient()">Add Client</button>
      </div>
    `);
    document.getElementById('wc-start').value = new Date().toISOString().split('T')[0];
  },

  saveClient() {
    const name = document.getElementById('wc-name').value.trim();
    const email = document.getElementById('wc-email').value.trim();
    const value = parseFloat(document.getElementById('wc-value').value);
    const status = document.getElementById('wc-status').value;
    const type = document.getElementById('wc-type').value.trim();
    const start = document.getElementById('wc-start').value;
    if (!name || !value) { App.toast('Please fill in required fields.', 'error'); return; }
    AppData.writing.clients.push({ id: uid(), name, email, monthlyValue: value, status, projectType: type || 'General', startDate: start });
    saveData();
    App.closeModal();
    App.toast('Client added!', 'success');
    renderWriting();
  },

  openAddInvoice(clientId) {
    const clients = AppData.writing.clients;
    App.openModal('Create Invoice', `
      <div class="form-group">
        <label class="form-label">Client</label>
        <select class="form-select" id="wi-client">
          ${clients.map(c => `<option value="${c.id}" ${c.id === clientId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Amount ($)</label><input class="form-input" id="wi-amount" type="number" placeholder="2200" /></div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="wi-status">
            <option value="outstanding">Outstanding</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Issue Date</label><input class="form-input" id="wi-issue" type="date" /></div>
        <div class="form-group"><label class="form-label">Due Date</label><input class="form-input" id="wi-due" type="date" /></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="WritingModule.saveInvoice()">Create Invoice</button>
      </div>
    `);
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('wi-issue').value = today;
    const due = new Date(); due.setDate(due.getDate() + 14);
    document.getElementById('wi-due').value = due.toISOString().split('T')[0];
    if (clientId) {
      const c = AppData.writing.clients.find(cl => cl.id === clientId);
      if (c) document.getElementById('wi-amount').value = c.monthlyValue;
    }
  },

  saveInvoice() {
    const clientId = document.getElementById('wi-client').value;
    const amount = parseFloat(document.getElementById('wi-amount').value);
    const status = document.getElementById('wi-status').value;
    const issueDate = document.getElementById('wi-issue').value;
    const dueDate = document.getElementById('wi-due').value;
    if (!clientId || !amount) { App.toast('Please fill all fields.', 'error'); return; }
    AppData.writing.invoices.push({ id: uid(), clientId, amount, status, issueDate, dueDate });
    saveData();
    App.closeModal();
    App.toast('Invoice created!', 'success');
    renderWriting();
  },

  markPaid(invoiceId) {
    const inv = AppData.writing.invoices.find(i => i.id === invoiceId);
    if (inv) { inv.status = 'paid'; saveData(); App.toast('Invoice marked as paid!', 'success'); renderWriting(); }
  },

  deleteClient(clientId) {
    if (!confirm('Remove this client?')) return;
    AppData.writing.clients = AppData.writing.clients.filter(c => c.id !== clientId);
    saveData();
    App.toast('Client removed.', 'info');
    renderWriting();
  }
};
