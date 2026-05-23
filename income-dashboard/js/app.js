/* ===== MAIN APP ===== */
const pageRenderers = {
  overview: renderOverview,
  analytics: renderAnalytics,
  writing: renderWriting,
  insurance: renderInsurance,
  lyft: renderLyft,
  taxes: renderTaxes,
  clients: renderClients,
  settings: renderSettings
};

const pageTitles = {
  overview: 'Dashboard',
  analytics: 'Analytics',
  writing: 'Writing / B2B',
  insurance: 'Insurance',
  lyft: 'Lyft',
  taxes: 'Taxes & Expenses',
  clients: 'Clients',
  settings: 'Settings'
};

let currentPage = 'overview';

const App = {
  navigate(page) {
    if (!pageRenderers[page]) return;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    document.querySelectorAll('.page-panel').forEach(el => {
      el.classList.toggle('active', el.id === `page-${page}`);
    });

    document.getElementById('breadcrumbCurrent').textContent = pageTitles[page] || page;
    currentPage = page;

    pageRenderers[page]();

    // close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  },

  openModal(title, bodyHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalOverlay').classList.add('open');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span style="font-size:14px">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }
};

/* ===== INIT ===== */
function init() {
  loadData();

  // Date display
  const now = new Date();
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // Nav click handlers
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      App.navigate(el.dataset.page);
    });
  });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    AppData.settings.theme = next;
    saveData();
  });

  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Mobile menu
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', () => App.closeModal());
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) App.closeModal();
  });

  // Add Entry button — context-sensitive
  document.getElementById('addEntryBtn').addEventListener('click', () => {
    const actions = {
      overview: () => App.navigate('writing'),
      writing: () => WritingModule.openAddClient(),
      insurance: () => InsuranceModule.openAddClient(),
      lyft: () => LyftModule.openAddTrip(),
      taxes: () => TaxModule.openAddExpense(),
      clients: () => WritingModule.openAddClient(),
      analytics: () => App.navigate('overview')
    };
    const fn = actions[currentPage];
    if (fn) fn();
  });

  // Apply saved theme
  if (AppData.settings.theme) {
    document.documentElement.setAttribute('data-theme', AppData.settings.theme);
  }

  // Render initial page
  App.navigate('overview');
}

document.addEventListener('DOMContentLoaded', init);
