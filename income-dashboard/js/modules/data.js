/* ===== DATA LAYER ===== */
const DB_KEY = 'incomeOS_v1';

const DEFAULT_DATA = {
  writing: {
    clients: [
      { id: 'w1', name: 'Apex Marketing Co.', status: 'active', monthlyValue: 2200, projectType: 'B2B Content', startDate: '2025-01-15', email: 'contact@apexmktg.com' },
      { id: 'w2', name: 'TechFlow SaaS', status: 'active', monthlyValue: 1800, projectType: 'Email Sequences', startDate: '2025-02-01', email: 'ops@techflow.io' },
      { id: 'w3', name: 'Growth Labs', status: 'pending', monthlyValue: 1500, projectType: 'Case Studies', startDate: '2025-03-10', email: 'hello@growthlabs.com' }
    ],
    invoices: [
      { id: 'inv1', clientId: 'w1', amount: 2200, status: 'paid', dueDate: '2025-05-01', issueDate: '2025-04-15' },
      { id: 'inv2', clientId: 'w2', amount: 1800, status: 'paid', dueDate: '2025-05-05', issueDate: '2025-04-20' },
      { id: 'inv3', clientId: 'w3', amount: 1500, status: 'outstanding', dueDate: '2025-05-20', issueDate: '2025-05-01' },
      { id: 'inv4', clientId: 'w1', amount: 2200, status: 'paid', dueDate: '2025-04-01', issueDate: '2025-03-15' }
    ]
  },
  insurance: {
    clients: [
      { id: 'i1', name: 'Marcus Johnson', policy: 'Blue Shield PPO', carrier: 'Blue Shield', premium: 420, commission: 63, renewalDate: '2026-01-15', status: 'active' },
      { id: 'i2', name: 'Sarah Williams', policy: 'Aetna HMO', carrier: 'Aetna', premium: 310, commission: 46.5, renewalDate: '2026-03-20', status: 'active' },
      { id: 'i3', name: 'David Chen', policy: 'United Gold', carrier: 'United Healthcare', premium: 580, commission: 87, renewalDate: '2025-11-10', status: 'active' },
      { id: 'i4', name: 'Emma Torres', policy: 'Cigna Value', carrier: 'Cigna', premium: 290, commission: 43.5, renewalDate: '2026-06-01', status: 'active' },
      { id: 'i5', name: 'Robert Kim', policy: 'Humana Plus', carrier: 'Humana', premium: 465, commission: 69.75, renewalDate: '2025-12-15', status: 'pending' }
    ],
    commissionHistory: [
      { month: 'Jan 2025', amount: 245 },
      { month: 'Feb 2025', amount: 263 },
      { month: 'Mar 2025', amount: 278 },
      { month: 'Apr 2025', amount: 290 },
      { month: 'May 2025', amount: 309.75 }
    ]
  },
  lyft: {
    trips: [
      { id: 'l1', date: '2026-05-20', earnings: 112.40, hours: 5.5, miles: 87, fuel: 14.20 },
      { id: 'l2', date: '2026-05-18', earnings: 98.75, hours: 4.75, miles: 74, fuel: 12.10 },
      { id: 'l3', date: '2026-05-16', earnings: 134.60, hours: 7.0, miles: 102, fuel: 16.80 },
      { id: 'l4', date: '2026-05-14', earnings: 88.30, hours: 4.0, miles: 65, fuel: 10.60 },
      { id: 'l5', date: '2026-05-12', earnings: 145.20, hours: 7.5, miles: 118, fuel: 19.20 },
      { id: 'l6', date: '2026-05-10', earnings: 76.50, hours: 3.5, miles: 58, fuel: 9.40 },
      { id: 'l7', date: '2026-05-08', earnings: 119.80, hours: 6.0, miles: 93, fuel: 15.20 },
      { id: 'l8', date: '2026-05-06', earnings: 91.25, hours: 4.5, miles: 70, fuel: 11.40 }
    ],
    maintenance: [
      { id: 'm1', date: '2026-05-01', type: 'Oil Change', cost: 65 },
      { id: 'm2', date: '2026-04-10', type: 'Tire Rotation', cost: 30 }
    ]
  },
  taxes: {
    expenses: [
      { id: 'e1', category: 'Software & Tools', description: 'Grammarly Pro', amount: 12, date: '2026-05-01', recurring: true },
      { id: 'e2', category: 'Marketing', description: 'LinkedIn Premium', amount: 39.99, date: '2026-05-01', recurring: true },
      { id: 'e3', category: 'Home Office', description: 'Internet (50%)', amount: 50, date: '2026-05-01', recurring: true },
      { id: 'e4', category: 'Vehicle', description: 'Lyft Maintenance', amount: 95, date: '2026-05-01', recurring: false },
      { id: 'e5', category: 'Professional Dev', description: 'Course - Copywriting', amount: 297, date: '2026-04-15', recurring: false }
    ],
    taxReserveRate: 0.28,
    quarterlyPayments: [
      { quarter: 'Q1 2025', amount: 420, paid: true, dueDate: '2025-04-15' },
      { quarter: 'Q2 2025', amount: 510, paid: false, dueDate: '2025-06-15' }
    ]
  },
  trading: {
    sessions: [
      { id: 't1', date: '2026-05-20', instrument: 'MES', contracts: 2, pnl: 185, trades: 4, notes: 'Clean trend day' },
      { id: 't2', date: '2026-05-18', instrument: 'MNQ', contracts: 1, pnl: -62, trades: 3, notes: 'Choppy, stopped early' },
      { id: 't3', date: '2026-05-16', instrument: 'MES', contracts: 2, pnl: 310, trades: 5, notes: 'Strong momentum' },
      { id: 't4', date: '2026-05-14', instrument: 'MES', contracts: 1, pnl: -95, trades: 4, notes: '' },
      { id: 't5', date: '2026-05-12', instrument: 'MNQ', contracts: 1, pnl: 220, trades: 3, notes: 'CPI day — good setup' },
      { id: 't6', date: '2026-05-10', instrument: 'MES', contracts: 2, pnl: 140, trades: 2, notes: '' }
    ],
    startingBalance: 5000
  },
  market: {
    products: [
      { id: 'p1', name: 'Lavender Sugar Scrub', price: 14, cost: 3.50, unit: '8oz jar' },
      { id: 'p2', name: 'Citrus Glow Scrub', price: 14, cost: 3.50, unit: '8oz jar' },
      { id: 'p3', name: 'Rose Vanilla Scrub', price: 16, cost: 4.00, unit: '8oz jar' },
      { id: 'p4', name: 'Scrub Bundle (3-pack)', price: 36, cost: 9.50, unit: 'Bundle' }
    ],
    events: [
      { id: 'e1', date: '2026-05-18', location: 'Downtown Farmers Market', revenue: 210, expenses: 25, unitsSold: 14, notes: 'Great foot traffic' },
      { id: 'e2', date: '2026-05-11', location: 'Riverside Weekend Market', revenue: 168, expenses: 20, unitsSold: 11, notes: '' }
    ]
  },
  settings: {
    name: 'Business Owner',
    monthlyGoal: 8000,
    savingsRate: 20,
    theme: 'dark'
  }
};

/* ===== STATE ===== */
let AppData = {};

function loadData() {
  try {
    const stored = localStorage.getItem(DB_KEY);
    AppData = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_DATA));
  } catch {
    AppData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveData() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(AppData));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

const EMPTY_DATA = {
  writing: { clients: [], invoices: [] },
  insurance: { clients: [], commissionHistory: [] },
  lyft: { trips: [], maintenance: [] },
  taxes: { expenses: [], taxReserveRate: 0.28, quarterlyPayments: [] },
  trading: { sessions: [], startingBalance: 5000 },
  market: { products: [], events: [] },
  settings: {
    name: '',
    monthlyGoal: 8000,
    savingsRate: 20,
    theme: AppData?.settings?.theme || 'dark'
  }
};

function resetData() {
  const theme = AppData?.settings?.theme || 'dark';
  AppData = JSON.parse(JSON.stringify(EMPTY_DATA));
  AppData.settings.theme = theme;
  saveData();
}

/* ===== COMPUTED METRICS ===== */
function getMonthlyIncome() {
  const writingRevenue = AppData.writing.clients
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.monthlyValue, 0);

  const insuranceCommissions = AppData.insurance.clients
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.commission, 0);

  const lyftThisMonth = getLyftMonthly();
  const tradingThisMonth = getTradingMonthly().netPnl;
  const marketThisMonth = getMarketMonthly().netProfit;

  return {
    writing: writingRevenue,
    insurance: insuranceCommissions,
    lyft: lyftThisMonth.net,
    trading: tradingThisMonth,
    market: marketThisMonth,
    total: writingRevenue + insuranceCommissions + lyftThisMonth.net + Math.max(0, tradingThisMonth) + marketThisMonth
  };
}

function getMarketMonthly() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const events = (AppData.market?.events || []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const revenue = events.reduce((s, e) => s + e.revenue, 0);
  const expenses = events.reduce((s, e) => s + e.expenses, 0);
  const unitsSold = events.reduce((s, e) => s + (e.unitsSold || 0), 0);
  const bestEvent = events.length > 0 ? events.reduce((best, e) => e.revenue > best.revenue ? e : best, events[0]) : null;
  return { revenue, expenses, netProfit: revenue - expenses, unitsSold, events: events.length, bestEvent };
}

function getTradingMonthly() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const sessions = (AppData.trading?.sessions || []).filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const netPnl = sessions.reduce((sum, s) => sum + s.pnl, 0);
  const wins = sessions.filter(s => s.pnl > 0).length;
  const totalSessions = sessions.length;
  const totalTrades = sessions.reduce((sum, s) => sum + (s.trades || 0), 0);
  const avgWin = wins > 0 ? sessions.filter(s => s.pnl > 0).reduce((sum, s) => sum + s.pnl, 0) / wins : 0;
  const losses = sessions.filter(s => s.pnl < 0).length;
  const avgLoss = losses > 0 ? Math.abs(sessions.filter(s => s.pnl < 0).reduce((sum, s) => sum + s.pnl, 0) / losses) : 0;
  const bestDay = sessions.length > 0 ? Math.max(...sessions.map(s => s.pnl)) : 0;
  const worstDay = sessions.length > 0 ? Math.min(...sessions.map(s => s.pnl)) : 0;
  return { netPnl, wins, losses, totalSessions, totalTrades, avgWin, avgLoss, bestDay, worstDay, winRate: totalSessions > 0 ? (wins / totalSessions) * 100 : 0 };
}

function getLyftMonthly() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const trips = AppData.lyft.trips.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const gross = trips.reduce((s, t) => s + t.earnings, 0);
  const fuel = trips.reduce((s, t) => s + t.fuel, 0);
  const maintenance = AppData.lyft.maintenance
    .filter(m => {
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((s, m) => s + m.cost, 0);
  const hours = trips.reduce((s, t) => s + t.hours, 0);
  const miles = trips.reduce((s, t) => s + t.miles, 0);
  return {
    gross, fuel, maintenance,
    net: gross - fuel - maintenance,
    hours, miles, trips: trips.length,
    perHour: hours > 0 ? (gross - fuel) / hours : 0,
    perMile: miles > 0 ? (gross - fuel) / miles : 0
  };
}

function getMonthlyExpenses() {
  return AppData.taxes.expenses.reduce((s, e) => s + e.amount, 0);
}

function getTaxReserve(income) {
  return income * AppData.taxes.taxReserveRate;
}

function getBusinessHealthScore() {
  const income = getMonthlyIncome();
  const goal = AppData.settings.monthlyGoal;
  const progress = Math.min(income.total / goal, 1);
  const activeClients = AppData.writing.clients.filter(c => c.status === 'active').length +
    AppData.insurance.clients.filter(c => c.status === 'active').length;
  const streamDiversity = income.total > 0
    ? Object.values({ w: income.writing, i: income.insurance, l: income.lyft })
        .filter(v => v > 0).length / 3
    : 0;
  const score = Math.round((progress * 50 + streamDiversity * 30 + Math.min(activeClients / 8, 1) * 20));
  return Math.max(0, Math.min(100, score));
}

function getMonthlyTrend() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = months[d.getMonth()];
    const insuranceMonth = AppData.insurance.commissionHistory.find(h => h.month.startsWith(label));
    const insurance = insuranceMonth ? insuranceMonth.amount : 240 + Math.random() * 80;
    const writing = 3800 + (5 - i) * 200 + Math.random() * 300;
    const lyft = 400 + Math.random() * 250;
    result.push({ label, writing: Math.round(writing), insurance: Math.round(insurance), lyft: Math.round(lyft) });
  }
  result[result.length - 1].writing = AppData.writing.clients.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyValue, 0);
  result[result.length - 1].insurance = AppData.insurance.clients.filter(c => c.status === 'active').reduce((s, c) => s + c.commission, 0);
  result[result.length - 1].lyft = Math.round(getLyftMonthly().net);
  return result;
}

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCurrencyFull(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
