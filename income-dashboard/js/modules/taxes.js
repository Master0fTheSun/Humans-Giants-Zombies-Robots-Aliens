/* ===== TAXES & EXPENSES MODULE ===== */
function renderTaxes() {
  const panel = document.getElementById('page-taxes');
  const expenses = AppData.taxes.expenses;
  const income = getMonthlyIncome();
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const taxReserve = getTaxReserve(income.total);
  const netProfit = income.total - totalExpenses;
  const payments = AppData.taxes.quarterlyPayments;

  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Taxes & Expenses</h1>
      <p class="page-subtitle">Business expense tracking and tax reserve management.</p>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">Net Profit</div>
        <div class="stat-value">${formatCurrency(netProfit)}</div>
        <div class="stat-delta neutral">After all expenses</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--red)">
        <div class="stat-label">Tax Reserve</div>
        <div class="stat-value">${formatCurrency(taxReserve)}</div>
        <div class="stat-delta neutral">${AppData.taxes.taxReserveRate * 100}% rate</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--yellow)">
        <div class="stat-label">Monthly Expenses</div>
        <div class="stat-value">${formatCurrency(totalExpenses)}</div>
        <div class="stat-delta neutral">${expenses.length} items</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--blue)">
        <div class="stat-label">Annual Tax Est.</div>
        <div class="stat-value">${formatCurrency(taxReserve * 12)}</div>
        <div class="stat-delta neutral">Projected</div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:20px">
      <!-- Expense Categories -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">By Category</div>
        </div>
        <div class="chart-container" style="height:180px;margin-bottom:16px">
          <canvas id="chart-expense-donut"></canvas>
        </div>
        ${Object.entries(byCategory).map(([cat, amt]) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
            <span style="color:var(--text-secondary)">${cat}</span>
            <span style="font-weight:500">${formatCurrency(amt)}</span>
          </div>
        `).join('')}
      </div>

      <!-- Tax Summary -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">Tax Summary</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
          <div style="background:var(--bg-input);border-radius:var(--radius);padding:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Gross Income (Month)</div>
            <div style="font-size:20px;font-weight:700">${formatCurrency(income.total)}</div>
          </div>
          <div style="background:var(--red-dim);border-radius:var(--radius);padding:14px;border:1px solid rgba(239,68,68,0.2)">
            <div style="font-size:11px;color:var(--red);margin-bottom:4px">Estimated Tax (${AppData.taxes.taxReserveRate*100}%)</div>
            <div style="font-size:20px;font-weight:700;color:var(--red)">${formatCurrency(taxReserve)}</div>
          </div>
          <div style="background:var(--green-dim);border-radius:var(--radius);padding:14px;border:1px solid rgba(34,197,94,0.2)">
            <div style="font-size:11px;color:var(--green);margin-bottom:4px">Take-Home After Tax + Expenses</div>
            <div style="font-size:20px;font-weight:700;color:var(--green)">${formatCurrency(netProfit - taxReserve)}</div>
          </div>
        </div>

        <div class="section-title" style="margin-bottom:12px">Quarterly Payments</div>
        ${payments.map(p => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:500">${p.quarter}</div>
              <div style="font-size:11px;color:var(--text-muted)">Due ${formatDate(p.dueDate)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:600">${formatCurrency(p.amount)}</span>
              <span class="badge ${p.paid ? 'badge-green' : 'badge-red'}">${p.paid ? 'Paid' : 'Due'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Expense Log -->
    <div class="card">
      <div class="section-header">
        <div>
          <div class="section-title">Expense Log</div>
          <div class="section-sub">Deductible business expenses</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="TaxModule.openAddExpense()">+ Add Expense</button>
      </div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Description</th><th>Category</th><th>Amount</th><th>Date</th><th>Recurring</th><th></th></tr></thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td>${e.description}</td>
                <td><span class="badge badge-blue">${e.category}</span></td>
                <td style="font-weight:600;color:var(--red)">${formatCurrencyFull(e.amount)}</td>
                <td>${formatDate(e.date)}</td>
                <td>${e.recurring ? '<span class="badge badge-green">Monthly</span>' : '<span class="badge badge-purple">One-time</span>'}</td>
                <td><button class="btn btn-danger btn-sm btn-icon" onclick="TaxModule.deleteExpense('${e.id}')">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const cats = Object.keys(byCategory);
  const catColors = ['rgba(59,130,246,0.8)','rgba(167,139,250,0.8)','rgba(52,211,153,0.8)','rgba(245,158,11,0.8)','rgba(239,68,68,0.8)'];
  renderDonutChart('chart-expense-donut', cats, Object.values(byCategory), catColors.slice(0, cats.length));
}

const TaxModule = {
  openAddExpense() {
    const categories = ['Software & Tools','Marketing','Home Office','Vehicle','Professional Dev','Meals & Entertainment','Insurance','Other'];
    App.openModal('Add Expense', `
      <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="te-desc" placeholder="Grammarly Pro" /></div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="te-cat">
            ${categories.map(c => `<option>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Amount ($)</label><input class="form-input" id="te-amount" type="number" step="0.01" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="te-date" type="date" /></div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:4px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" id="te-recurring" />
            Monthly recurring
          </label>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="TaxModule.saveExpense()">Add Expense</button>
      </div>
    `);
    document.getElementById('te-date').value = new Date().toISOString().split('T')[0];
  },

  saveExpense() {
    const desc = document.getElementById('te-desc').value.trim();
    const cat = document.getElementById('te-cat').value;
    const amount = parseFloat(document.getElementById('te-amount').value);
    const date = document.getElementById('te-date').value;
    const recurring = document.getElementById('te-recurring').checked;
    if (!desc || isNaN(amount)) { App.toast('Fill required fields.', 'error'); return; }
    AppData.taxes.expenses.push({ id: uid(), description: desc, category: cat, amount, date, recurring });
    saveData();
    App.closeModal();
    App.toast('Expense added!', 'success');
    renderTaxes();
  },

  deleteExpense(id) {
    AppData.taxes.expenses = AppData.taxes.expenses.filter(e => e.id !== id);
    saveData();
    App.toast('Removed.', 'info');
    renderTaxes();
  }
};
