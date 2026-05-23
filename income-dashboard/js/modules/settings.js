/* ===== SETTINGS PAGE ===== */
function renderSettings() {
  const panel = document.getElementById('page-settings');
  const s = AppData.settings;

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Customize your dashboard, goals, and financial preferences.</p>
    </div>

    <!-- Profile -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <div>
          <div class="section-title">Profile</div>
          <div class="section-sub">Your name shown across the dashboard</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Your Name</label>
          <input class="form-input" id="s-name" value="${s.name || ''}" placeholder="Your Name" />
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end">
          <button class="btn btn-primary" onclick="SettingsModule.saveName()">Save Name</button>
        </div>
      </div>
    </div>

    <!-- Financial Goals -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <div>
          <div class="section-title">Financial Goals</div>
          <div class="section-sub">Used for progress tracking and projections</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monthly Income Goal ($)</label>
          <input class="form-input" id="s-goal" type="number" value="${s.monthlyGoal || 8000}" placeholder="8000" />
        </div>
        <div class="form-group">
          <label class="form-label">Savings Rate (%)</label>
          <input class="form-input" id="s-savings" type="number" value="${s.savingsRate || 20}" placeholder="20" min="0" max="100" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tax Reserve Rate (%)</label>
          <input class="form-input" id="s-tax" type="number" value="${(AppData.taxes.taxReserveRate || 0.28) * 100}" placeholder="28" min="0" max="60" />
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Recommended: 25–30% for self-employed</div>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end">
          <button class="btn btn-primary" onclick="SettingsModule.saveGoals()">Save Goals</button>
        </div>
      </div>
    </div>

    <!-- Appearance -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <div>
          <div class="section-title">Appearance</div>
          <div class="section-sub">Theme preference</div>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <button class="theme-option-btn ${s.theme !== 'light' ? 'active' : ''}" onclick="SettingsModule.setTheme('dark')"
          style="flex:1;padding:16px;border-radius:var(--radius);border:2px solid ${s.theme !== 'light' ? 'var(--accent)' : 'var(--border)'};background:var(--bg-input);cursor:pointer;transition:all var(--transition)">
          <div style="font-size:20px;margin-bottom:6px">🌙</div>
          <div style="font-size:13px;font-weight:500;color:var(--text-primary)">Dark Mode</div>
        </button>
        <button class="theme-option-btn ${s.theme === 'light' ? 'active' : ''}" onclick="SettingsModule.setTheme('light')"
          style="flex:1;padding:16px;border-radius:var(--radius);border:2px solid ${s.theme === 'light' ? 'var(--accent)' : 'var(--border)'};background:var(--bg-input);cursor:pointer;transition:all var(--transition)">
          <div style="font-size:20px;margin-bottom:6px">☀️</div>
          <div style="font-size:13px;font-weight:500;color:var(--text-primary)">Light Mode</div>
        </button>
      </div>
    </div>

    <!-- Data Management -->
    <div class="card" style="margin-bottom:16px">
      <div class="section-header">
        <div>
          <div class="section-title">Data Management</div>
          <div class="section-sub">Export or clear your dashboard data</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">

        <!-- Export -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--bg-input);border-radius:var(--radius);border:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:500">Export Data</div>
            <div style="font-size:12px;color:var(--text-muted)">Download all your data as a JSON file</div>
          </div>
          <button class="btn btn-secondary" onclick="SettingsModule.exportData()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Export
          </button>
        </div>

        <!-- Import -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--bg-input);border-radius:var(--radius);border:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:500">Import Data</div>
            <div style="font-size:12px;color:var(--text-muted)">Restore from a previously exported file</div>
          </div>
          <label class="btn btn-secondary" style="cursor:pointer">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 10V2M5 5l3-3 3 3M3 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Import
            <input type="file" accept=".json" id="importFile" style="display:none" onchange="SettingsModule.importData(event)" />
          </label>
        </div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="card" style="border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.03)">
      <div class="section-header">
        <div>
          <div class="section-title" style="color:var(--red)">Danger Zone</div>
          <div class="section-sub">Irreversible actions — use with caution</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--red-dim);border-radius:var(--radius);border:1px solid rgba(239,68,68,0.2)">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--red)">Clear All Data</div>
          <div style="font-size:12px;color:var(--text-muted)">Wipes everything and starts completely fresh. Cannot be undone.</div>
        </div>
        <button class="btn btn-danger" onclick="SettingsModule.confirmClear()">
          Clear All Data
        </button>
      </div>
    </div>
  `;
}

const SettingsModule = {
  saveName() {
    const name = document.getElementById('s-name').value.trim();
    if (!name) { App.toast('Enter a name first.', 'error'); return; }
    AppData.settings.name = name;
    saveData();
    App.toast('Name saved!', 'success');
  },

  saveGoals() {
    const goal = parseFloat(document.getElementById('s-goal').value);
    const savings = parseFloat(document.getElementById('s-savings').value);
    const tax = parseFloat(document.getElementById('s-tax').value);
    if (isNaN(goal) || isNaN(savings) || isNaN(tax)) { App.toast('Fill all fields.', 'error'); return; }
    AppData.settings.monthlyGoal = goal;
    AppData.settings.savingsRate = savings;
    AppData.taxes.taxReserveRate = tax / 100;
    saveData();
    App.toast('Goals saved!', 'success');
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppData.settings.theme = theme;
    saveData();
    renderSettings();
  },

  exportData() {
    const json = JSON.stringify(AppData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-os-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Data exported!', 'success');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        AppData = data;
        saveData();
        App.toast('Data imported successfully!', 'success');
        App.navigate('overview');
      } catch {
        App.toast('Invalid file. Please use an Income OS export.', 'error');
      }
    };
    reader.readAsText(file);
  },

  confirmClear() {
    App.openModal('Clear All Data', `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">Are you absolutely sure?</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:24px;line-height:1.6">
          This will permanently delete all your clients, trips, invoices, expenses, and settings.
          <br/><br/>
          <strong style="color:var(--red)">This cannot be undone.</strong>
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-secondary" onclick="App.closeModal()">Cancel — Keep My Data</button>
          <button class="btn btn-danger" onclick="SettingsModule.clearAll()">Yes, Delete Everything</button>
        </div>
      </div>
    `);
  },

  clearAll() {
    resetData();
    App.closeModal();
    App.toast('All data cleared. Starting fresh!', 'info');
    App.navigate('overview');
  }
};
