// ─── State ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'entrepreneur_dashboard_v1';

const DEFAULT_STATE = {
  monthlyTarget: 6000,
  streams: [
    { id: 's1', name: 'Writing + LinkedIn',    target: 2500, current: 0, color: '#6366f1' },
    { id: 's2', name: 'Discord Paid Tier',     target: 1500, current: 0, color: '#8b5cf6' },
    { id: 's3', name: 'B2B Ghostwriting',      target: 1500, current: 0, color: '#3b82f6' },
    { id: 's4', name: 'Trading',               target: 500,  current: 0, color: '#10b981' },
    { id: 's5', name: 'Lyft',                  target: 1200, current: 0, color: '#f59e0b' },
  ],
  clients: [],
  services: [
    {
      id: 'svc1', name: 'LinkedIn Build-Out (Full)', price: 1200, type: 'fixed', active: true,
      description: 'Complete LinkedIn presence build for finance professionals.',
      includes: ['Profile audit & full rewrite', 'Positioning statement', '5 content pillars', '90-day content roadmap', '5 posts written & formatted', '60-min strategy call']
    },
    {
      id: 'svc2', name: 'LinkedIn Build-Out (Starter)', price: 750, type: 'fixed', active: true,
      description: 'Profile + roadmap without post writing.',
      includes: ['Profile audit & full rewrite', 'Positioning statement', '5 content pillars', '90-day content roadmap']
    },
    {
      id: 'svc3', name: 'LinkedIn Retainer', price: 300, type: 'monthly', active: true,
      description: 'Ongoing post writing — 3-4 posts per week.',
      includes: ['12–16 posts/month', 'Topic research', 'Formatted & ready to publish', 'Monthly content review call']
    },
    {
      id: 'svc4', name: 'Offer Packaging Sprint', price: 500, type: 'fixed', active: true,
      description: 'Clarify and articulate exactly what you sell and how to pitch it.',
      includes: ['2x strategy sessions', 'Written offer document', 'Pricing recommendation', 'Cold DM / pitch copy']
    },
    {
      id: 'svc5', name: 'Revenue Stack Session', price: 250, type: 'fixed', active: true,
      description: 'Map your income streams and design a path to your monthly target.',
      includes: ['1x deep strategy session', 'Revenue stack document', 'Priority action list']
    },
    {
      id: 'svc6', name: 'Content OS Setup', price: 550, type: 'fixed', active: true,
      description: 'Full content workflow system so you never wonder "what do I post."',
      includes: ['Editorial calendar', 'Content pillars', 'Repurposing templates', 'Posting SOPs']
    },
    {
      id: 'svc7', name: 'Discord Architecture', price: 750, type: 'fixed', active: true,
      description: 'Community build from scratch — structure, onboarding, monetization.',
      includes: ['Channel structure design', 'Onboarding flow', 'Paid tier setup', 'Welcome sequences & rules']
    },
  ],
  posts: [],
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Navigation ───────────────────────────────────────────────────────────────

let activeTab = 'overview';
let contentFilter = 'all';

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${activeTab}`).classList.add('active');
    render();
  });
});

document.getElementById('month-label').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// ─── Modal ────────────────────────────────────────────────────────────────────

const overlay  = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody  = document.getElementById('modal-body');

function openModal(title, bodyHTML, onSubmit) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  overlay.classList.remove('hidden');

  const form = modalBody.querySelector('form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      onSubmit(new FormData(form));
      closeModal();
    });
  }
}

function closeModal() {
  overlay.classList.add('hidden');
  modalBody.innerHTML = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

// ─── Overview ─────────────────────────────────────────────────────────────────

function renderOverview() {
  const total = state.streams.reduce((s, r) => s + r.current, 0);
  const pct   = Math.min(Math.round((total / state.monthlyTarget) * 100), 100);
  const barClass = pct >= 100 ? 'over' : pct >= 60 ? 'on-track' : 'warning';

  const activeClients = state.clients.filter(c => c.stage === 'active').length;
  const pipelineVal   = state.clients
    .filter(c => ['lead','discovery','proposal'].includes(c.stage))
    .reduce((s, c) => s + (c.value || 0), 0);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const publishedThisMonth = state.posts.filter(p => p.status === 'published' && p.date && p.date.startsWith(thisMonth)).length;

  const streamsHTML = state.streams.map(r => {
    const p = r.target > 0 ? Math.min(Math.round((r.current / r.target) * 100), 100) : 0;
    return `
      <div class="stream-row">
        <div class="stream-name">
          <span class="stream-dot" style="background:${r.color}"></span>
          ${esc(r.name)}
        </div>
        <div class="stream-amount">
          <span class="editable-amount" data-stream-id="${r.id}" title="Click to update">$${r.current.toLocaleString()}</span>
        </div>
        <div class="stream-target td-muted">$${r.target.toLocaleString()}</div>
        <div class="stream-mini-bar">
          <div class="mini-bar-outer">
            <div class="mini-bar-inner" style="width:${p}%; background:${r.color}"></div>
          </div>
          <span class="mini-bar-pct">${p}%</span>
        </div>
        <div>
          <button class="btn btn-ghost btn-sm edit-stream-btn" data-id="${r.id}">Edit</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('revenue-overview').innerHTML = `
    <div class="revenue-hero">
      <div class="revenue-total">
        <div class="revenue-total-label">Total This Month</div>
        <div class="revenue-total-amount">$${total.toLocaleString()}</div>
        <div class="revenue-total-target">of $${state.monthlyTarget.toLocaleString()} goal</div>
        <div class="progress-bar-outer">
          <div class="progress-bar-inner ${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="revenue-pct">${pct}% to goal</div>
      </div>
      <div class="quick-stats">
        <div class="stat-card">
          <div class="stat-label">Active Clients</div>
          <div class="stat-value">${activeClients}</div>
          <div class="stat-sub">in progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pipeline Value</div>
          <div class="stat-value">$${pipelineVal.toLocaleString()}</div>
          <div class="stat-sub">potential</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Posts Published</div>
          <div class="stat-value">${publishedThisMonth}</div>
          <div class="stat-sub">this month</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Monthly Target</div>
          <div class="stat-value" style="font-size:20px;cursor:pointer" id="edit-target-btn">$${state.monthlyTarget.toLocaleString()}</div>
          <div class="stat-sub">click to change</div>
        </div>
      </div>
    </div>

    <div class="streams-table">
      <div class="streams-table-header">
        <span>Income Stream</span>
        <span>This Month</span>
        <span>Target</span>
        <span>Progress</span>
        <span></span>
      </div>
      ${streamsHTML}
    </div>`;

  // Inline edit: click current amount
  document.querySelectorAll('.editable-amount').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.streamId;
      const stream = state.streams.find(s => s.id === id);
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'amount-edit-input';
      input.value = stream.current;
      el.replaceWith(input);
      input.focus();
      input.select();
      const commit = () => {
        const val = parseFloat(input.value) || 0;
        stream.current = val;
        save();
        renderOverview();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });
    });
  });

  // Edit target
  document.getElementById('edit-target-btn')?.addEventListener('click', () => {
    openModal('Monthly Target', `
      <form>
        <div class="form-group">
          <label>Target Amount ($)</label>
          <input type="number" name="target" value="${state.monthlyTarget}" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`, fd => {
      state.monthlyTarget = parseFloat(fd.get('target')) || 6000;
      save();
      renderOverview();
    });
  });

  // Edit stream modal
  document.querySelectorAll('.edit-stream-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const stream = state.streams.find(s => s.id === btn.dataset.id);
      openModal(`Edit: ${stream.name}`, `
        <form>
          <div class="form-group">
            <label>Stream Name</label>
            <input type="text" name="name" value="${esc(stream.name)}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Monthly Target ($)</label>
              <input type="number" name="target" value="${stream.target}" required>
            </div>
            <div class="form-group">
              <label>This Month ($)</label>
              <input type="number" name="current" value="${stream.current}" required>
            </div>
          </div>
          <div class="form-group">
            <label>Color</label>
            <input type="text" name="color" value="${stream.color}" placeholder="#6366f1">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-danger btn-sm" id="del-stream-btn">Delete</button>
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>`, fd => {
        stream.name    = fd.get('name');
        stream.target  = parseFloat(fd.get('target')) || 0;
        stream.current = parseFloat(fd.get('current')) || 0;
        stream.color   = fd.get('color') || stream.color;
        save();
        renderOverview();
      });

      document.getElementById('del-stream-btn')?.addEventListener('click', () => {
        if (confirm(`Delete "${stream.name}"?`)) {
          state.streams = state.streams.filter(s => s.id !== stream.id);
          save(); closeModal(); renderOverview();
        }
      });
    });
  });
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const STAGES = ['lead','discovery','proposal','active','complete','lost'];
const STAGE_LABELS = { lead:'Lead', discovery:'Discovery', proposal:'Proposal', active:'Active', complete:'Complete', lost:'Lost' };

function renderClients() {
  const counts = {};
  STAGES.forEach(s => counts[s] = state.clients.filter(c => c.stage === s).length);

  document.getElementById('pipeline-stats').innerHTML = STAGES.map(s => `
    <div class="pipeline-badge">
      <span class="pipeline-badge-dot" style="background:var(--stage-${s})"></span>
      <span>${STAGE_LABELS[s]}</span>
      <strong>${counts[s]}</strong>
    </div>`).join('');

  if (state.clients.length === 0) {
    document.getElementById('clients-table').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🤝</div>
        <div class="empty-state-text">No clients yet. Add your first lead.</div>
        <button class="btn btn-primary" onclick="document.getElementById('add-client-btn').click()">+ Add Client</button>
      </div>`;
    return;
  }

  const rows = [...state.clients]
    .sort((a,b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage))
    .map(c => {
      const svc = state.services.find(s => s.id === c.serviceId);
      return `
        <tr data-id="${c.id}" class="client-row">
          <td><strong>${esc(c.name)}</strong>${c.company ? `<br><span class="td-muted" style="font-size:11px">${esc(c.company)}</span>` : ''}</td>
          <td class="td-muted">${svc ? esc(svc.name) : (c.serviceLabel ? esc(c.serviceLabel) : '—')}</td>
          <td><span class="badge badge-${c.stage}">${STAGE_LABELS[c.stage]}</span></td>
          <td>${c.value ? `<strong>$${Number(c.value).toLocaleString()}</strong>` : '<span class="td-muted">—</span>'}</td>
          <td class="notes-cell td-muted">${c.notes ? esc(c.notes) : '—'}</td>
          <td class="actions">
            <button class="btn btn-ghost btn-sm edit-client-btn" data-id="${c.id}">Edit</button>
          </td>
        </tr>`;
    }).join('');

  document.getElementById('clients-table').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Client</th><th>Service</th><th>Stage</th><th>Value</th><th>Notes</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  document.querySelectorAll('.edit-client-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openClientModal(btn.dataset.id); });
  });
}

function clientFormHTML(c = {}) {
  const serviceOptions = state.services
    .map(s => `<option value="${s.id}" ${c.serviceId === s.id ? 'selected' : ''}>${esc(s.name)} — $${s.price}${s.type==='monthly'?'/mo':''}</option>`)
    .join('');
  const stageOptions = STAGES
    .map(s => `<option value="${s}" ${(c.stage||'lead') === s ? 'selected' : ''}>${STAGE_LABELS[s]}</option>`)
    .join('');

  return `
    <form>
      <div class="form-row">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" name="name" value="${esc(c.name||'')}" required placeholder="First Last">
        </div>
        <div class="form-group">
          <label>Company</label>
          <input type="text" name="company" value="${esc(c.company||'')}" placeholder="Optional">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Service</label>
          <select name="serviceId">
            <option value="">— Select —</option>
            ${serviceOptions}
            <option value="custom" ${c.serviceId==='custom'?'selected':''}>Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label>Stage</label>
          <select name="stage">${stageOptions}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Deal Value ($)</label>
          <input type="number" name="value" value="${c.value||''}" placeholder="0">
        </div>
        <div class="form-group">
          <label>Niche</label>
          <input type="text" name="niche" value="${esc(c.niche||'')}" placeholder="Finance, Fintech…">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" placeholder="Context, next steps, anything useful…">${esc(c.notes||'')}</textarea>
      </div>
      <div class="form-actions">
        ${c.id ? `<button type="button" class="btn btn-danger btn-sm" id="del-client-btn" data-id="${c.id}">Delete</button>` : ''}
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${c.id ? 'Save' : 'Add Client'}</button>
      </div>
    </form>`;
}

function openClientModal(id) {
  const c = id ? state.clients.find(x => x.id === id) : {};
  openModal(id ? 'Edit Client' : 'Add Client', clientFormHTML(c || {}), fd => {
    const data = {
      name: fd.get('name'),
      company: fd.get('company'),
      serviceId: fd.get('serviceId'),
      stage: fd.get('stage'),
      value: parseFloat(fd.get('value')) || 0,
      niche: fd.get('niche'),
      notes: fd.get('notes'),
    };
    if (id) {
      Object.assign(c, data, { updatedAt: new Date().toISOString() });
    } else {
      state.clients.push({ id: uid(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    save(); renderClients();
  });

  document.getElementById('del-client-btn')?.addEventListener('click', () => {
    const c2 = state.clients.find(x => x.id === id);
    if (confirm(`Delete ${c2?.name}?`)) {
      state.clients = state.clients.filter(x => x.id !== id);
      save(); closeModal(); renderClients();
    }
  });
}

document.getElementById('add-client-btn').addEventListener('click', () => openClientModal(null));

// ─── Services ─────────────────────────────────────────────────────────────────

function renderServices() {
  const cards = state.services.map(s => `
    <div class="service-card ${s.active ? '' : 'inactive'}">
      <div class="service-card-top">
        <div class="service-name">${esc(s.name)}</div>
        <span class="badge badge-${s.type}">${s.type === 'monthly' ? 'Monthly' : 'One-time'}</span>
      </div>
      <div class="service-price">$${s.price.toLocaleString()}${s.type==='monthly' ? '/mo' : ''}</div>
      <div class="service-desc">${esc(s.description)}</div>
      <ul class="service-includes">
        ${s.includes.map(i => `<li>${esc(i)}</li>`).join('')}
      </ul>
      <div class="service-card-footer">
        <span style="font-size:11px; color:${s.active ? 'var(--success)' : 'var(--text-muted)'}">
          ${s.active ? '● Active' : '○ Inactive'}
        </span>
        <button class="btn btn-ghost btn-sm edit-svc-btn" data-id="${s.id}">Edit</button>
      </div>
    </div>`).join('');

  document.getElementById('services-grid').innerHTML = `<div class="services-grid">${cards}</div>`;

  document.querySelectorAll('.edit-svc-btn').forEach(btn => {
    btn.addEventListener('click', () => openServiceModal(btn.dataset.id));
  });
}

function serviceFormHTML(s = {}) {
  const typeOpts = ['fixed','monthly'].map(t =>
    `<option value="${t}" ${(s.type||'fixed')===t?'selected':''}>${t === 'fixed' ? 'One-time' : 'Monthly'}</option>`
  ).join('');

  return `
    <form>
      <div class="form-group">
        <label>Service Name *</label>
        <input type="text" name="name" value="${esc(s.name||'')}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Price ($) *</label>
          <input type="number" name="price" value="${s.price||''}" required>
        </div>
        <div class="form-group">
          <label>Type</label>
          <select name="type">${typeOpts}</select>
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" name="description" value="${esc(s.description||'')}">
      </div>
      <div class="form-group">
        <label>What's Included (one per line)</label>
        <textarea name="includes" rows="5">${(s.includes||[]).join('\n')}</textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="active">
          <option value="true"  ${s.active!==false?'selected':''}>Active</option>
          <option value="false" ${s.active===false?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-actions">
        ${s.id ? `<button type="button" class="btn btn-danger btn-sm" id="del-svc-btn" data-id="${s.id}">Delete</button>` : ''}
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${s.id ? 'Save' : 'Add Service'}</button>
      </div>
    </form>`;
}

function openServiceModal(id) {
  const s = id ? state.services.find(x => x.id === id) : {};
  openModal(id ? 'Edit Service' : 'Add Service', serviceFormHTML(s || {}), fd => {
    const includesRaw = fd.get('includes') || '';
    const includes = includesRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const data = {
      name:        fd.get('name'),
      price:       parseFloat(fd.get('price')) || 0,
      type:        fd.get('type'),
      description: fd.get('description'),
      includes,
      active:      fd.get('active') !== 'false',
    };
    if (id) {
      Object.assign(s, data);
    } else {
      state.services.push({ id: uid(), ...data });
    }
    save(); renderServices();
  });

  document.getElementById('del-svc-btn')?.addEventListener('click', () => {
    const s2 = state.services.find(x => x.id === id);
    if (confirm(`Delete "${s2?.name}"?`)) {
      state.services = state.services.filter(x => x.id !== id);
      save(); closeModal(); renderServices();
    }
  });
}

document.getElementById('add-service-btn').addEventListener('click', () => openServiceModal(null));

// ─── Content ──────────────────────────────────────────────────────────────────

const POST_STATUSES = ['idea','draft','scheduled','published'];
const STATUS_LABELS = { idea:'Idea', draft:'Draft', scheduled:'Scheduled', published:'Published' };

function renderContent() {
  const filters = ['all', ...POST_STATUSES];
  document.getElementById('content-filters').innerHTML = filters.map(f => `
    <button class="filter-btn ${contentFilter === f ? 'active' : ''}" data-filter="${f}">
      ${f === 'all' ? 'All' : STATUS_LABELS[f]}
      ${f === 'all' ? `(${state.posts.length})` : `(${state.posts.filter(p => p.status === f).length})`}
    </button>`).join('');

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { contentFilter = btn.dataset.filter; renderContent(); });
  });

  const filtered = contentFilter === 'all'
    ? state.posts
    : state.posts.filter(p => p.status === contentFilter);

  const sorted = [...filtered].sort((a,b) => (b.date||'').localeCompare(a.date||''));

  if (sorted.length === 0) {
    document.getElementById('content-table').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✍️</div>
        <div class="empty-state-text">No posts yet. Start tracking your content.</div>
        <button class="btn btn-primary" onclick="document.getElementById('add-post-btn').click()">+ New Post</button>
      </div>`;
    return;
  }

  const rows = sorted.map(p => `
    <tr>
      <td class="td-muted">${p.date ? formatDate(p.date) : '—'}</td>
      <td><strong>${esc(p.topic)}</strong></td>
      <td><span class="badge badge-${p.status}">${STATUS_LABELS[p.status]}</span></td>
      <td>${p.impressions != null
        ? `<span class="impressions-val">${Number(p.impressions).toLocaleString()}</span>`
        : `<span class="impressions-empty">—</span>`}</td>
      <td class="notes-cell">${p.notes ? esc(p.notes) : ''}</td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm edit-post-btn" data-id="${p.id}">Edit</button>
      </td>
    </tr>`).join('');

  document.getElementById('content-table').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Topic</th><th>Status</th><th>Impressions</th><th>Notes</th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  document.querySelectorAll('.edit-post-btn').forEach(btn => {
    btn.addEventListener('click', () => openPostModal(btn.dataset.id));
  });
}

function postFormHTML(p = {}) {
  const statusOpts = POST_STATUSES.map(s =>
    `<option value="${s}" ${(p.status||'idea')===s?'selected':''}>${STATUS_LABELS[s]}</option>`
  ).join('');

  return `
    <form>
      <div class="form-group">
        <label>Topic / Title *</label>
        <input type="text" name="topic" value="${esc(p.topic||'')}" required placeholder="What's the post about?">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input type="date" name="date" value="${p.date||''}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">${statusOpts}</select>
        </div>
      </div>
      <div class="form-group">
        <label>Impressions</label>
        <input type="number" name="impressions" value="${p.impressions != null ? p.impressions : ''}" placeholder="Leave blank until published">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="notes" placeholder="Hook idea, angle, key point…">${esc(p.notes||'')}</textarea>
      </div>
      <div class="form-actions">
        ${p.id ? `<button type="button" class="btn btn-danger btn-sm" id="del-post-btn" data-id="${p.id}">Delete</button>` : ''}
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${p.id ? 'Save' : 'Add Post'}</button>
      </div>
    </form>`;
}

function openPostModal(id) {
  const p = id ? state.posts.find(x => x.id === id) : {};
  openModal(id ? 'Edit Post' : 'New Post', postFormHTML(p || {}), fd => {
    const impRaw = fd.get('impressions');
    const data = {
      topic:       fd.get('topic'),
      date:        fd.get('date'),
      status:      fd.get('status'),
      impressions: impRaw !== '' ? parseFloat(impRaw) : null,
      notes:       fd.get('notes'),
    };
    if (id) {
      Object.assign(p, data);
    } else {
      state.posts.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
    }
    save(); renderContent();
  });

  document.getElementById('del-post-btn')?.addEventListener('click', () => {
    if (confirm('Delete this post?')) {
      state.posts = state.posts.filter(x => x.id !== id);
      save(); closeModal(); renderContent();
    }
  });
}

document.getElementById('add-post-btn').addEventListener('click', () => openPostModal(null));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  if (activeTab === 'overview') renderOverview();
  if (activeTab === 'clients')  renderClients();
  if (activeTab === 'services') renderServices();
  if (activeTab === 'content')  renderContent();
}

render();
