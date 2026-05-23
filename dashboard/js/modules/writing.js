'use strict';

const WritingModule = (() => {
  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }

  function render(container) {
    const clients  = DataStore.getWritingClients();
    const invoices = DataStore.getWritingInvoices();
    const active   = clients.filter(c => c.status === 'active');
    const mrr      = active.reduce((s, c) => s + c.monthlyRetainer, 0);
    const outstanding = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
    const totalBalance = clients.reduce((s, c) => s + (c.balance || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Writing & B2B</h1>
          <p class="page-subtitle">Clients, contracts, and invoices</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="WritingModule.openClientModal()">
            <i data-lucide="plus"></i> Add Client
          </button>
        </div>
      </div>

      <div class="kpi-grid kpi-grid--4">
        ${mini('Monthly Retainers', fmt(mrr),         'MRR from active',     'accent')}
        ${mini('Active Clients',    active.length,     'B2B + freelance',     'green')}
        ${mini('Outstanding',       fmt(outstanding),  'Pending invoices',    'amber')}
        ${mini('Overdue Balance',   fmt(totalBalance), 'Owed to you',         'red')}
      </div>

      <!-- Client Table -->
      <div class="card" style="margin-top:0">
        <div class="card-header">
          <h3 class="card-title">Clients</h3>
          <div class="filter-tabs" id="client-filter-tabs">
            <button class="filter-tab active" data-filter="all" onclick="WritingModule.filterClients('all', this)">All</button>
            <button class="filter-tab" data-filter="active"   onclick="WritingModule.filterClients('active', this)">Active</button>
            <button class="filter-tab" data-filter="prospect" onclick="WritingModule.filterClients('prospect', this)">Prospects</button>
            <button class="filter-tab" data-filter="inactive" onclick="WritingModule.filterClients('inactive', this)">Inactive</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table" id="writing-client-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Retainer/mo</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Since</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => clientRow(c)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Invoices -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recent Invoices</h3>
          <button class="btn btn-ghost btn-sm" onclick="WritingModule.openInvoiceModal()">
            <i data-lucide="plus"></i> New Invoice
          </button>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Date</th><th>Due</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${invoices.map(i => invoiceRow(i, clients)).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modals -->
      ${clientModal()}
      ${invoiceModal(clients)}
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

  function clientRow(c) {
    const tags = (c.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <tr data-status="${c.status}">
        <td>
          <div class="cell-primary">${c.name}</div>
          <div class="cell-secondary">${c.contactName} · ${c.email}</div>
        </td>
        <td><span class="badge badge-neutral">${c.type}</span></td>
        <td class="cell-number">${c.monthlyRetainer > 0 ? '$' + c.monthlyRetainer.toLocaleString() : '—'}</td>
        <td class="cell-number ${c.balance > 0 ? 'text-amber' : ''}">${c.balance > 0 ? '$' + c.balance.toLocaleString() : '—'}</td>
        <td>${statusBadge(c.status)}</td>
        <td class="cell-muted">${c.startDate || '—'}</td>
        <td class="cell-actions">
          <button class="icon-btn" title="Edit" onclick="WritingModule.openClientModal('${c.id}')"><i data-lucide="edit-2"></i></button>
          <button class="icon-btn icon-btn--danger" title="Delete" onclick="WritingModule.deleteClient('${c.id}')"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`;
  }

  function invoiceRow(inv, clients) {
    const client = clients.find(c => c.id === inv.clientId);
    const isOverdue = inv.status === 'pending' && new Date(inv.dueDate) < new Date();
    return `
      <tr>
        <td class="cell-mono">${inv.id}</td>
        <td>${client ? client.name : '—'}</td>
        <td class="cell-number">${'$' + inv.amount.toLocaleString()}</td>
        <td class="cell-muted">${inv.date}</td>
        <td class="cell-muted ${isOverdue ? 'text-red' : ''}">${inv.dueDate}</td>
        <td>${invoiceStatusBadge(inv.status, isOverdue)}</td>
        <td class="cell-actions">
          ${inv.status === 'pending' ? `<button class="btn btn-ghost btn-sm" onclick="WritingModule.markPaid('${inv.id}')">Mark Paid</button>` : ''}
        </td>
      </tr>`;
  }

  function statusBadge(status) {
    const map = { active: 'green', prospect: 'amber', inactive: 'neutral' };
    return `<span class="badge badge-${map[status] || 'neutral'}">${status}</span>`;
  }

  function invoiceStatusBadge(status, overdue) {
    if (overdue) return `<span class="badge badge-red">overdue</span>`;
    const map = { paid: 'green', pending: 'amber' };
    return `<span class="badge badge-${map[status] || 'neutral'}">${status}</span>`;
  }

  function clientModal(id) {
    const c = id ? DataStore.getWritingClients().find(x => x.id === id) : null;
    return `
      <div class="modal-overlay" id="client-modal" style="display:none" onclick="WritingModule.closeModal('client-modal')">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${c ? 'Edit Client' : 'Add Client'}</h3>
            <button class="icon-btn" onclick="WritingModule.closeModal('client-modal')"><i data-lucide="x"></i></button>
          </div>
          <form id="client-form" onsubmit="WritingModule.saveClient(event)">
            <input type="hidden" name="id" value="${c ? c.id : ''}">
            <div class="form-grid">
              <div class="form-group form-group--full">
                <label>Client Name</label>
                <input type="text" name="name" required placeholder="Company or person name" value="${c ? c.name : ''}">
              </div>
              <div class="form-group">
                <label>Contact Name</label>
                <input type="text" name="contactName" placeholder="Primary contact" value="${c ? c.contactName : ''}">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="contact@company.com" value="${c ? c.email : ''}">
              </div>
              <div class="form-group">
                <label>Type</label>
                <select name="type">
                  <option value="b2b"      ${c && c.type === 'b2b'      ? 'selected' : ''}>B2B Contract</option>
                  <option value="freelance" ${c && c.type === 'freelance' ? 'selected' : ''}>Freelance</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select name="status">
                  <option value="active"   ${!c || c.status === 'active'   ? 'selected' : ''}>Active</option>
                  <option value="prospect" ${c && c.status === 'prospect' ? 'selected' : ''}>Prospect</option>
                  <option value="inactive" ${c && c.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
              <div class="form-group">
                <label>Monthly Retainer ($)</label>
                <input type="number" name="monthlyRetainer" min="0" step="50" placeholder="0" value="${c ? c.monthlyRetainer : '0'}">
              </div>
              <div class="form-group">
                <label>Outstanding Balance ($)</label>
                <input type="number" name="balance" min="0" step="1" placeholder="0" value="${c ? c.balance : '0'}">
              </div>
              <div class="form-group">
                <label>Start Date</label>
                <input type="date" name="startDate" value="${c && c.startDate ? c.startDate : ''}">
              </div>
              <div class="form-group form-group--full">
                <label>Description</label>
                <textarea name="description" rows="2" placeholder="Scope of work...">${c ? c.description : ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" onclick="WritingModule.closeModal('client-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Client</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function invoiceModal(clients) {
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    return `
      <div class="modal-overlay" id="invoice-modal" style="display:none" onclick="WritingModule.closeModal('invoice-modal')">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>New Invoice</h3>
            <button class="icon-btn" onclick="WritingModule.closeModal('invoice-modal')"><i data-lucide="x"></i></button>
          </div>
          <form id="invoice-form" onsubmit="WritingModule.saveInvoice(event)">
            <div class="form-grid">
              <div class="form-group form-group--full">
                <label>Client</label>
                <select name="clientId" required>
                  <option value="">— Select Client —</option>
                  ${clients.filter(c => c.status === 'active').map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Amount ($)</label>
                <input type="number" name="amount" required min="1" step="1" placeholder="0">
              </div>
              <div class="form-group">
                <label>Invoice Date</label>
                <input type="date" name="date" required value="${today}">
              </div>
              <div class="form-group">
                <label>Due Date</label>
                <input type="date" name="dueDate" required value="${due}">
              </div>
              <div class="form-group form-group--full">
                <label>Description</label>
                <input type="text" name="description" placeholder="Services rendered...">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" onclick="WritingModule.closeModal('invoice-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Invoice</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function filterClients(status, btn) {
    document.querySelectorAll('#client-filter-tabs .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#writing-client-table tbody tr').forEach(row => {
      row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
    });
  }

  function openClientModal(id) {
    const modal = document.getElementById('client-modal');
    if (!modal) return;
    // Re-inject the modal with proper data if editing
    if (id) {
      const c = DataStore.getWritingClients().find(x => x.id === id);
      if (c) {
        modal.querySelector('[name="id"]').value       = c.id;
        modal.querySelector('[name="name"]').value     = c.name;
        modal.querySelector('[name="contactName"]').value = c.contactName;
        modal.querySelector('[name="email"]').value    = c.email;
        modal.querySelector('[name="type"]').value     = c.type;
        modal.querySelector('[name="status"]').value   = c.status;
        modal.querySelector('[name="monthlyRetainer"]').value = c.monthlyRetainer;
        modal.querySelector('[name="balance"]').value  = c.balance || 0;
        modal.querySelector('[name="startDate"]').value = c.startDate || '';
        modal.querySelector('[name="description"]').value = c.description || '';
        modal.querySelector('.modal-header h3').textContent = 'Edit Client';
      }
    } else {
      modal.querySelector('form').reset();
      modal.querySelector('[name="id"]').value = '';
      modal.querySelector('.modal-header h3').textContent = 'Add Client';
    }
    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  }

  function openInvoiceModal() {
    const modal = document.getElementById('invoice-modal');
    if (modal) { modal.style.display = 'flex'; if (window.lucide) lucide.createIcons(); }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  }

  function saveClient(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get('name'),
      contactName: fd.get('contactName'),
      email: fd.get('email'),
      type: fd.get('type'),
      status: fd.get('status'),
      monthlyRetainer: parseFloat(fd.get('monthlyRetainer')) || 0,
      balance: parseFloat(fd.get('balance')) || 0,
      startDate: fd.get('startDate') || null,
      description: fd.get('description'),
      tags: [fd.get('type'), fd.get('status')]
    };
    const id = fd.get('id');
    if (id) { DataStore.updateWritingClient(id, data); }
    else     { DataStore.addWritingClient(data); }
    closeModal('client-modal');
    App.navigate('writing');
  }

  function saveInvoice(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    DataStore.addWritingInvoice({
      clientId: fd.get('clientId'),
      amount: parseFloat(fd.get('amount')),
      status: 'pending',
      date: fd.get('date'),
      dueDate: fd.get('dueDate'),
      description: fd.get('description')
    });
    closeModal('invoice-modal');
    App.navigate('writing');
  }

  function markPaid(id) {
    DataStore.updateInvoiceStatus(id, 'paid');
    App.navigate('writing');
  }

  function deleteClient(id) {
    if (confirm('Delete this client? This cannot be undone.')) {
      DataStore.deleteWritingClient(id);
      App.navigate('writing');
    }
  }

  return { render, filterClients, openClientModal, openInvoiceModal, closeModal, saveClient, saveInvoice, markPaid, deleteClient };
})();
