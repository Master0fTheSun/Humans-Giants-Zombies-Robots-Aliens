'use strict';

const DataStore = (() => {
  const STORAGE_KEY = 'incomeOS_v1';

  const defaultData = {
    settings: {
      theme: 'dark',
      currency: 'USD',
      taxRate: 0.25,
      savingsGoalRate: 0.20,
      name: 'My Business'
    },

    monthlyHistory: [
      { month: '2024-06', writing: 2100, insurance: 980,  lyft: 1240, writingExpenses: 120, insuranceExpenses: 40, lyftExpenses: 290, otherExpenses: 150, savings: 600 },
      { month: '2024-07', writing: 2400, insurance: 1050, lyft: 1380, writingExpenses: 150, insuranceExpenses: 40, lyftExpenses: 320, otherExpenses: 150, savings: 700 },
      { month: '2024-08', writing: 2200, insurance: 1050, lyft: 1200, writingExpenses: 130, insuranceExpenses: 40, lyftExpenses: 280, otherExpenses: 150, savings: 650 },
      { month: '2024-09', writing: 2800, insurance: 1100, lyft: 1320, writingExpenses: 180, insuranceExpenses: 40, lyftExpenses: 310, otherExpenses: 150, savings: 800 },
      { month: '2024-10', writing: 3100, insurance: 1150, lyft: 1450, writingExpenses: 200, insuranceExpenses: 45, lyftExpenses: 340, otherExpenses: 160, savings: 900 },
      { month: '2024-11', writing: 2900, insurance: 1200, lyft: 1100, writingExpenses: 190, insuranceExpenses: 45, lyftExpenses: 260, otherExpenses: 160, savings: 820 },
      { month: '2024-12', writing: 3400, insurance: 1350, lyft: 950,  writingExpenses: 220, insuranceExpenses: 50, lyftExpenses: 225, otherExpenses: 200, savings: 1000 },
      { month: '2025-01', writing: 2600, insurance: 1200, lyft: 1150, writingExpenses: 170, insuranceExpenses: 45, lyftExpenses: 270, otherExpenses: 160, savings: 750 },
      { month: '2025-02', writing: 2900, insurance: 1250, lyft: 1280, writingExpenses: 185, insuranceExpenses: 50, lyftExpenses: 300, otherExpenses: 165, savings: 820 },
      { month: '2025-03', writing: 3200, insurance: 1300, lyft: 1420, writingExpenses: 210, insuranceExpenses: 50, lyftExpenses: 335, otherExpenses: 170, savings: 920 },
      { month: '2025-04', writing: 3500, insurance: 1380, lyft: 1350, writingExpenses: 230, insuranceExpenses: 55, lyftExpenses: 320, otherExpenses: 175, savings: 1050 },
      { month: '2025-05', writing: 3800, insurance: 1450, lyft: 1580, writingExpenses: 250, insuranceExpenses: 55, lyftExpenses: 375, otherExpenses: 180, savings: 1200 }
    ],

    writingClients: [
      { id: 'wc-001', name: 'Apex Digital Media',     type: 'b2b',      status: 'active',   contactName: 'Sarah Chen',    email: 'sarah@apexdigital.com',  monthlyRetainer: 1500, startDate: '2024-03-01', description: 'Monthly blog posts and email newsletter content',    balance: 0,   tags: ['retainer','content'] },
      { id: 'wc-002', name: 'TechVault Startup',       type: 'b2b',      status: 'active',   contactName: 'Marcus Rivera',  email: 'marcus@techvault.io',    monthlyRetainer: 800,  startDate: '2024-06-15', description: 'Technical documentation and case studies',           balance: 800, tags: ['retainer','technical'] },
      { id: 'wc-003', name: 'GreenPath Wellness',      type: 'freelance', status: 'active',   contactName: 'Lisa Park',      email: 'lisa@greenpath.co',      monthlyRetainer: 0,    startDate: '2025-01-10', description: 'Ad hoc articles and social content',                balance: 450, tags: ['freelance','health'] },
      { id: 'wc-004', name: 'Meridian Finance Group',  type: 'b2b',      status: 'active',   contactName: 'Tom Bradley',    email: 'tom@meridianfg.com',     monthlyRetainer: 1200, startDate: '2024-09-01', description: 'Financial content, whitepapers, thought leadership', balance: 0,   tags: ['retainer','finance'] },
      { id: 'wc-005', name: 'Urban Eats Magazine',     type: 'freelance', status: 'prospect', contactName: 'Dana Kim',       email: 'dana@urbaneats.com',     monthlyRetainer: 0,    startDate: null,          description: 'Food & lifestyle article pitches',                   balance: 0,   tags: ['prospect','lifestyle'] },
      { id: 'wc-006', name: 'CoreBuild Agency',        type: 'b2b',      status: 'inactive', contactName: 'Jay Williams',   email: 'jay@corebuild.io',       monthlyRetainer: 0,    startDate: '2024-01-01', description: 'Project ended — SEO content pack',                  balance: 0,   tags: ['inactive'] }
    ],

    writingInvoices: [
      { id: 'inv-001', clientId: 'wc-001', amount: 1500, status: 'paid',    date: '2025-05-01', dueDate: '2025-05-15', description: 'May retainer' },
      { id: 'inv-002', clientId: 'wc-002', amount: 800,  status: 'pending', date: '2025-05-01', dueDate: '2025-05-30', description: 'May retainer' },
      { id: 'inv-003', clientId: 'wc-003', amount: 450,  status: 'pending', date: '2025-05-10', dueDate: '2025-06-01', description: 'Article pack x3' },
      { id: 'inv-004', clientId: 'wc-004', amount: 1200, status: 'paid',    date: '2025-05-01', dueDate: '2025-05-15', description: 'May retainer' },
      { id: 'inv-005', clientId: 'wc-001', amount: 1500, status: 'paid',    date: '2025-04-01', dueDate: '2025-04-15', description: 'April retainer' },
      { id: 'inv-006', clientId: 'wc-004', amount: 1200, status: 'paid',    date: '2025-04-01', dueDate: '2025-04-15', description: 'April retainer' }
    ],

    insuranceClients: [
      { id: 'ic-001', name: 'Robert & Amy Johnson',   carrier: 'UnitedHealthcare',      plan: 'Gold PPO',     premium: 680,  commissionRate: 0.05,  effectiveDate: '2024-01-01', renewalDate: '2026-01-01', status: 'active',      phone: '555-0101', email: 'johnson@email.com' },
      { id: 'ic-002', name: 'Maria Gonzalez',          carrier: 'Blue Cross Blue Shield', plan: 'Silver HMO',   premium: 420,  commissionRate: 0.05,  effectiveDate: '2024-03-01', renewalDate: '2025-08-01', status: 'active',      phone: '555-0102', email: 'mgonzalez@email.com' },
      { id: 'ic-003', name: 'David Chen Family',       carrier: 'Aetna',                 plan: 'Platinum PPO', premium: 1240, commissionRate: 0.04,  effectiveDate: '2024-06-01', renewalDate: '2025-06-15', status: 'renewal-due', phone: '555-0103', email: 'dchen@email.com' },
      { id: 'ic-004', name: 'Patricia Moore',          carrier: 'Cigna',                 plan: 'Bronze HSA',   premium: 310,  commissionRate: 0.05,  effectiveDate: '2024-02-01', renewalDate: '2025-09-01', status: 'active',      phone: '555-0104', email: 'pmoore@email.com' },
      { id: 'ic-005', name: 'James & Linda Williams', carrier: 'Humana',                plan: 'Gold HMO',     premium: 890,  commissionRate: 0.05,  effectiveDate: '2024-08-01', renewalDate: '2025-08-01', status: 'active',      phone: '555-0105', email: 'jwilliams@email.com' },
      { id: 'ic-006', name: 'Kevin Thompson',          carrier: 'UnitedHealthcare',      plan: 'Silver PPO',   premium: 480,  commissionRate: 0.05,  effectiveDate: '2024-11-01', renewalDate: '2025-11-01', status: 'active',      phone: '555-0106', email: 'kthompson@email.com' },
      { id: 'ic-007', name: 'Sandra Martinez',         carrier: 'Blue Cross Blue Shield', plan: 'Gold PPO',     premium: 550,  commissionRate: 0.05,  effectiveDate: '2025-01-01', renewalDate: '2026-01-01', status: 'active',      phone: '555-0107', email: 'smartinez@email.com' },
      { id: 'ic-008', name: 'Frank & Carol Davis',    carrier: 'Kaiser Permanente',     plan: 'Gold HMO',     premium: 760,  commissionRate: 0.045, effectiveDate: '2024-04-01', renewalDate: '2025-06-10', status: 'renewal-due', phone: '555-0108', email: 'fdavis@email.com' }
    ],

    lyftEntries: [
      { id: 'ly-001', date: '2025-05-22', earnings: 142, hours: 5.5, miles: 78,  fuel: 16, maintenance: 0  },
      { id: 'ly-002', date: '2025-05-20', earnings: 168, hours: 7,   miles: 95,  fuel: 20, maintenance: 0  },
      { id: 'ly-003', date: '2025-05-19', earnings: 195, hours: 8,   miles: 112, fuel: 24, maintenance: 0  },
      { id: 'ly-004', date: '2025-05-18', earnings: 88,  hours: 3.5, miles: 48,  fuel: 10, maintenance: 0  },
      { id: 'ly-005', date: '2025-05-16', earnings: 176, hours: 7.5, miles: 102, fuel: 22, maintenance: 0  },
      { id: 'ly-006', date: '2025-05-15', earnings: 155, hours: 6,   miles: 85,  fuel: 18, maintenance: 0  },
      { id: 'ly-007', date: '2025-05-14', earnings: 134, hours: 5,   miles: 73,  fuel: 15, maintenance: 0  },
      { id: 'ly-008', date: '2025-05-13', earnings: 210, hours: 9,   miles: 124, fuel: 26, maintenance: 45 },
      { id: 'ly-009', date: '2025-05-12', earnings: 98,  hours: 4,   miles: 55,  fuel: 12, maintenance: 0  },
      { id: 'ly-010', date: '2025-05-10', earnings: 182, hours: 7,   miles: 98,  fuel: 21, maintenance: 0  },
      { id: 'ly-011', date: '2025-05-09', earnings: 145, hours: 6,   miles: 82,  fuel: 17, maintenance: 0  },
      { id: 'ly-012', date: '2025-05-08', earnings: 127, hours: 5,   miles: 70,  fuel: 15, maintenance: 0  },
      { id: 'ly-013', date: '2025-05-07', earnings: 165, hours: 7,   miles: 94,  fuel: 20, maintenance: 0  },
      { id: 'ly-014', date: '2025-05-06', earnings: 188, hours: 8,   miles: 107, fuel: 23, maintenance: 0  },
      { id: 'ly-015', date: '2025-05-05', earnings: 115, hours: 4.5, miles: 63,  fuel: 13, maintenance: 0  },
      { id: 'ly-016', date: '2025-05-03', earnings: 172, hours: 7,   miles: 97,  fuel: 21, maintenance: 0  },
      { id: 'ly-017', date: '2025-05-02', earnings: 143, hours: 5.5, miles: 79,  fuel: 17, maintenance: 0  },
      { id: 'ly-018', date: '2025-05-01', earnings: 136, hours: 5.5, miles: 77,  fuel: 16, maintenance: 0  },
      { id: 'ly-019', date: '2025-04-29', earnings: 194, hours: 8,   miles: 110, fuel: 23, maintenance: 0  },
      { id: 'ly-020', date: '2025-04-28', earnings: 158, hours: 6.5, miles: 89,  fuel: 19, maintenance: 0  },
      { id: 'ly-021', date: '2025-04-26', earnings: 147, hours: 6,   miles: 83,  fuel: 18, maintenance: 0  },
      { id: 'ly-022', date: '2025-04-25', earnings: 163, hours: 7,   miles: 93,  fuel: 20, maintenance: 0  },
      { id: 'ly-023', date: '2025-04-24', earnings: 178, hours: 7.5, miles: 101, fuel: 22, maintenance: 0  },
      { id: 'ly-024', date: '2025-04-23', earnings: 131, hours: 5,   miles: 72,  fuel: 15, maintenance: 0  },
      { id: 'ly-025', date: '2025-04-21', earnings: 112, hours: 4.5, miles: 62,  fuel: 13, maintenance: 0  },
      { id: 'ly-026', date: '2025-04-19', earnings: 185, hours: 7.5, miles: 105, fuel: 22, maintenance: 30 },
      { id: 'ly-027', date: '2025-04-17', earnings: 142, hours: 6,   miles: 80,  fuel: 17, maintenance: 0  },
      { id: 'ly-028', date: '2025-04-15', earnings: 168, hours: 7,   miles: 95,  fuel: 20, maintenance: 0  }
    ]
  };

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(defaultData));
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  let state = load();

  const getSettings      = () => state.settings;
  const getMonthlyHistory = () => state.monthlyHistory;
  const getCurrentMonth  = () => state.monthlyHistory[state.monthlyHistory.length - 1];
  const getPreviousMonth = () => state.monthlyHistory[state.monthlyHistory.length - 2];
  const getWritingClients  = () => state.writingClients;
  const getWritingInvoices = () => state.writingInvoices;
  const getInsuranceClients = () => state.insuranceClients;
  const getLyftEntries   = () => state.lyftEntries;

  function computeMonthStats(month) {
    const gross    = month.writing + month.insurance + month.lyft;
    const expenses = month.writingExpenses + month.insuranceExpenses + month.lyftExpenses + month.otherExpenses;
    const net      = gross - expenses;
    const tax      = net * state.settings.taxRate;
    const savingsRate = gross > 0 ? (month.savings / gross * 100) : 0;
    return { gross, expenses, net, tax, savingsRate };
  }

  function getOverviewStats() {
    const current   = getCurrentMonth();
    const previous  = getPreviousMonth();
    const curr      = computeMonthStats(current);
    const prev      = computeMonthStats(previous);
    const growthPct = prev.gross > 0 ? ((curr.gross - prev.gross) / prev.gross * 100).toFixed(1) : 0;

    const pendingInvoices = state.writingInvoices
      .filter(i => i.status === 'pending')
      .reduce((s, i) => s + i.amount, 0);

    const monthlyCommission = state.insuranceClients
      .filter(c => c.status === 'active' || c.status === 'renewal-due')
      .reduce((s, c) => s + c.premium * c.commissionRate, 0);

    const today = new Date();
    const renewalsDue = state.insuranceClients.filter(c => {
      if (!c.renewalDate) return false;
      const diff = (new Date(c.renewalDate) - today) / 86400000;
      return diff <= 45 && diff >= -7;
    });

    const healthScore = Math.min(100, Math.round(
      (curr.net > 0          ? 25 : 0) +
      (parseFloat(growthPct) > 0 ? 25 : 5) +
      (pendingInvoices < 1500 ? 20 : 10) +
      (current.savings / Math.max(curr.gross, 1) > 0.15 ? 30 : 15)
    ));

    return { current, curr, previous, prev, growthPct, pendingInvoices, monthlyCommission, renewalsDue, healthScore };
  }

  function addWritingClient(client) {
    client.id = 'wc-' + Date.now();
    state.writingClients.push(client);
    save(state);
    return client;
  }
  function updateWritingClient(id, updates) {
    const idx = state.writingClients.findIndex(c => c.id === id);
    if (idx !== -1) { state.writingClients[idx] = { ...state.writingClients[idx], ...updates }; save(state); }
  }
  function deleteWritingClient(id) {
    state.writingClients = state.writingClients.filter(c => c.id !== id); save(state);
  }

  function addWritingInvoice(invoice) {
    invoice.id = 'inv-' + Date.now();
    state.writingInvoices.push(invoice);
    save(state);
    return invoice;
  }
  function updateInvoiceStatus(id, status) {
    const idx = state.writingInvoices.findIndex(i => i.id === id);
    if (idx !== -1) { state.writingInvoices[idx].status = status; save(state); }
  }

  function addInsuranceClient(client) {
    client.id = 'ic-' + Date.now();
    state.insuranceClients.push(client);
    save(state);
    return client;
  }
  function updateInsuranceClient(id, updates) {
    const idx = state.insuranceClients.findIndex(c => c.id === id);
    if (idx !== -1) { state.insuranceClients[idx] = { ...state.insuranceClients[idx], ...updates }; save(state); }
  }
  function deleteInsuranceClient(id) {
    state.insuranceClients = state.insuranceClients.filter(c => c.id !== id); save(state);
  }

  function addLyftEntry(entry) {
    entry.id = 'ly-' + Date.now();
    state.lyftEntries.unshift(entry);
    save(state);
    return entry;
  }
  function deleteLyftEntry(id) {
    state.lyftEntries = state.lyftEntries.filter(e => e.id !== id); save(state);
  }

  function updateSettings(updates) {
    state.settings = { ...state.settings, ...updates }; save(state);
  }

  function resetToDefaults() {
    state = JSON.parse(JSON.stringify(defaultData));
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    getSettings, getMonthlyHistory, getCurrentMonth, getPreviousMonth,
    getWritingClients, getWritingInvoices, getInsuranceClients, getLyftEntries,
    computeMonthStats, getOverviewStats,
    addWritingClient, updateWritingClient, deleteWritingClient,
    addWritingInvoice, updateInvoiceStatus,
    addInsuranceClient, updateInsuranceClient, deleteInsuranceClient,
    addLyftEntry, deleteLyftEntry,
    updateSettings, resetToDefaults
  };
})();
