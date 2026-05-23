'use strict';

const InsuranceModule = (() => {
  function fmt(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function render(container) {
    const clients = DataStore.getInsuranceClients();
    const active  = clients.filter(c => c.status !== 'cancelled');
    const mrr     = active.reduce((s, c) => s + c.premium * c.commissionRate, 0);
    const totalPremium = active.reduce((s, c) => s + c.premium, 0);
    const renewalsDue  = clients.filter(c => {
      if (!c.renewalDate) return false;
      const diff = (new Date(c.renewalDate) - new Date()) / 86400000;
      return diff <= 45 && diff >= -7;
    });

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Health Insurance</h1>
          <p class="page-subtitle">Commissions, policies, and renewals</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="InsuranceModule.openModal()">
            <i data-lucide="plus"></i> Add Client
          </button>
        </div>
      </div>

      <div class="kpi-grid kpi-grid--4">
        ${mini('Monthly Commissions', fmt(mrr),         'Total MRR',           'green')}
        ${mini('Active Policies',     active.length,    'Enrolled clients',    'accent')}
        ${mini('Total Premium Volume',fmt(totalPremium),'Under management',    'purple')}
        ${mini('Renewals Due',        renewalsDue.length,'Next 45 days',       renewalsDue.length > 0 ? 'amber' : 'muted')}
      </div>

      ${renewalsDue.length > 0 ? renewalAlert(renewalsDue) : ''}

      <div class="card" style="margin-top:0">
        <div class="card-header">
          <h3 class="card-title">Policy Book</h3>
          <div class="filter-tabs" id="ins-filter-tabs">
            <button class="filter-tab active" data-filter="all"         onclick="InsuranceModule.filter('all', this)">All</button>
            <button class="filter-tab" data-filter="active"             onclick="InsuranceModule.filter('active', this)">Active</button>
            <button class="filter-tab" data-filter="renewal-due"        onclick="InsuranceModule.filter('renewal-due', this)">Renewal Due</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table" id="ins-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Carrier</th>
                <th>Plan</th>
                <th>Premium/mo</th>
                <th>Commission</th>
                <th>Renewal</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => clientRow(c)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Commission Breakdown -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Commission Breakdown</h3>
          <span class="card-subtitle">All active policies</span>
        </div>
        <div class="commission-grid">
          ${active.map(c => commissionBar(c, mrr)).join('')}
        </div>
        <div class="commission-total">
          <span>Total Monthly Commissions</span>
          <strong class="text-green">${fmt(mrr)}</strong>
        </div>
      </div>

      ${clientModal()}
    `;
  }

  function mini(label, value, sub, color) {
    return `
      <div class="card mini-kpi">
        <div class="mini-kpi-value text-${color}">${value}</div>
        <div class="mini-kpi-label">${label}</div>
        <div class="mini-kpi-sub">${sub}</div>
      </div>`;
  }

  function renewalAlert(renewals) {
    return `
      <div class="alert alert-amber">
        <i data-lucide="alert-triangle"></i>
        <div>
          <strong>${renewals.length} policy renewal${renewals.length > 1 ? 's' : ''} upcoming:</strong>
          ${renewals.map(c => c.name).join(', ')}
        </div>
      </div>`;
  }

  function clientRow(c) {
    const commission = c.premium * c.commissionRate;
    const daysToRenewal = c.renewalDate ? Math.round((new Date(c.renewalDate) - new Date()) / 86400000) : null;
    const renewalDisplay = daysToRenewal !== null
      ? (daysToRenewal < 0 ? `<span class="text-red">${c.renewalDate} (overdue)</span>` :
         daysToRenewal <= 45 ? `<span class="text-amber">${c.renewalDate} (${daysToRenewal}d)</span>` :
         c.renewalDate)
      : '—';

    return `
      <tr data-status="${c.status}">
        <td>
          <div class="cell-primary">${c.name}</div>
          <div class="cell-secondary">${c.phone} · ${c.email}</div>
        </td>
        <td>${c.carrier}</td>
        <td><span class="badge badge-neutral">${c.plan}</span></td>
        <td class="cell-number">${fmt(c.premium)}</td>
        <td class="cell-number text-green">${fmt(commission)}</td>
        <td>${renewalDisplay}</td>
        <td>${statusBadge(c.status)}</td>
        <td class="cell-actions">
          <button class="icon-btn" title="Edit" onclick="InsuranceModule.openModal('${c.id}')"><i data-lucide="edit-2"></i></button>
          <button class="icon-btn icon-btn--danger" title="Delete" onclick="InsuranceModule.deleteClient('${c.id}')"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  function commissionBar(c, totalMrr) {
    const comm = c.premium * c.commissionRate;
    const pct  = totalMrr > 0 ? (comm / totalMrr * 100).toFixed(0) : 0;
    return `
      <div class="commission-item">
        <div class="commission-name">${c.name}</div>
        <div class="commission-bar-wrap">
          <div class="progress-bar progress-bar--sm">
            <div class="progress-fill progress-fill--green" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="commission-amt text-green">${fmt(comm)}</div>
        <div class="commission-pct cell-muted">${pct}%</div>
      </div>`;
  }

  function statusBadge(status) {
    const map = { active: 'green', 'renewal-due': 'amber', cancelled: 'red' };
    const labels = { active: 'active', 'renewal-due': 'renewal due', cancelled: 'cancelled' };
    return `<span class="badge badge-${map[status] || 'neutral'}">${labels[status] || status}</span>`;
  }

  function clientModal(id) {
    return `
      <div class="modal-overlay" id="ins-modal" style="display:none" onclick="InsuranceModule.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Add / Edit Client</h3>
            <button class="icon-btn" onclick="InsuranceModule.closeModal()"><i data-lucide="x"></i></button>
          </div>
          <form id="ins-form" onsubmit="InsuranceModule.save(event)">
            <input type="hidden" name="id" value="">
            <div class="form-grid">
              <div class="form-group form-group--full">
                <label>Client Name</label>
                <input type="text" name="name" required placeholder="Full name or family name">
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" placeholder="555-0100">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="client@email.com">
              </div>
              <div class="form-group">
                <label>Carrier</label>
                <select name="carrier">
                  <option>UnitedHealthcare</option>
                  <option>Blue Cross Blue Shield</option>
                  <option>Aetna</option>
                  <option>Cigna</option>
                  <option>Humana</option>
                  <option>Kaiser Permanente</option>
                  <option>Molina Healthcare</option>
                  <option>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Plan Type</label>
                <select name="plan">
                  <option>Bronze HSA</option>
                  <option>Silver HMO</option>
                  <option>Silver PPO</option>
                  <option>Gold HMO</option>
                  <option>Gold PPO</option>
                  <option>Platinum PPO</option>
                </select>
              </div>
              <div class="form-group">
                <label>Monthly Premium ($)</label>
                <input type="number" name="premium" required min="0" step="1" placeholder="0">
              </div>
              <div class="form-group">
                <label>Commission Rate (%)</label>
                <input type="number" name="commissionRate" required min="0" max="100" step="0.1" value="5">
              </div>
              <div class="form-group">
                <label>Effective Date</label>
                <input type="date" name="effectiveDate">
              </div>
              <div class="form-group">
                <label>Renewal Date</label>
                <input type="date" name="renewalDate">
              </div>
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  <option value="active">Active</option>
                  <option value="renewal-due">Renewal Due</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" onclick="InsuranceModule.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Client</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function filter(status, btn) {
    document.querySelectorAll('#ins-filter-tabs .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#ins-table tbody tr').forEach(row => {
      row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
    });
  }

  function openModal(id) {
    const modal = document.getElementById('ins-modal');
    if (!modal) return;
    if (id) {
      const c = DataStore.getInsuranceClients().find(x => x.id === id);
      if (c) {
        modal.querySelector('[name="id"]').value            = c.id;
        modal.querySelector('[name="name"]').value          = c.name;
        modal.querySelector('[name="phone"]').value         = c.phone || '';
        modal.querySelector('[name="email"]').value         = c.email || '';
        modal.querySelector('[name="carrier"]').value       = c.carrier;
        modal.querySelector('[name="plan"]').value          = c.plan;
        modal.querySelector('[name="premium"]').value       = c.premium;
        modal.querySelector('[name="commissionRate"]').value = c.commissionRate * 100;
        modal.querySelector('[name="effectiveDate"]').value = c.effectiveDate || '';
        modal.querySelector('[name="renewalDate"]').value   = c.renewalDate || '';
        modal.querySelector('[name="status"]').value        = c.status;
      }
    } else {
      modal.querySelector('form').reset();
      modal.querySelector('[name="id"]').value = '';
      modal.querySelector('[name="commissionRate"]').value = '5';
    }
    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  }

  function closeModal() {
    const m = document.getElementById('ins-modal');
    if (m) m.style.display = 'none';
  }

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      carrier: fd.get('carrier'),
      plan: fd.get('plan'),
      premium: parseFloat(fd.get('premium')),
      commissionRate: parseFloat(fd.get('commissionRate')) / 100,
      effectiveDate: fd.get('effectiveDate'),
      renewalDate: fd.get('renewalDate'),
      status: fd.get('status')
    };
    const id = fd.get('id');
    if (id) { DataStore.updateInsuranceClient(id, data); }
    else     { DataStore.addInsuranceClient(data); }
    closeModal();
    App.navigate('insurance');
  }

  function deleteClient(id) {
    if (confirm('Remove this client from your book? This cannot be undone.')) {
      DataStore.deleteInsuranceClient(id);
      App.navigate('insurance');
    }
  }

  return { render, filter, openModal, closeModal, save, deleteClient };
})();
