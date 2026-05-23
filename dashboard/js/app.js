'use strict';

const App = (() => {
  let currentPage = 'overview';

  const routes = {
    overview:  { module: OverviewModule,  label: 'Overview',         icon: 'layout-dashboard' },
    writing:   { module: WritingModule,   label: 'Writing & B2B',    icon: 'pen-tool' },
    insurance: { module: InsuranceModule, label: 'Health Insurance', icon: 'shield' },
    lyft:      { module: LyftModule,      label: 'Lyft Driving',     icon: 'car' },
    analytics: { module: AnalyticsModule, label: 'Analytics',        icon: 'bar-chart-2' }
  };

  function navigate(page) {
    if (!routes[page]) return;
    currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Destroy any active charts before re-rendering
    Charts.destroyAll();

    // Render module
    const container = document.getElementById('main-content');
    routes[page].module.render(container);

    // Re-initialize Lucide icons after render
    if (window.lucide) lucide.createIcons();

    // Update page title
    document.title = routes[page].label + ' — IncomOS';

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  }

  function toggleTheme() {
    const root    = document.documentElement;
    const current = root.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    DataStore.updateSettings({ theme: next });
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = next === 'dark'
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';
    if (window.lucide) lucide.createIcons();
  }

  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  }

  function buildNav() {
    const nav = document.getElementById('nav-items');
    nav.innerHTML = Object.entries(routes).map(([key, r]) => `
      <button class="nav-item ${key === currentPage ? 'active' : ''}" data-page="${key}" onclick="App.navigate('${key}')">
        <i data-lucide="${r.icon}"></i>
        <span>${r.label}</span>
      </button>`).join('');
  }

  function buildHeader() {
    const settings = DataStore.getSettings();
    const header = document.getElementById('app-header');
    header.innerHTML = `
      <button class="hamburger" onclick="App.toggleSidebar()" id="hamburger">
        <i data-lucide="menu"></i>
      </button>
      <div class="header-brand">
        <span class="header-logo">⬡</span>
        <span class="header-title">IncomOS</span>
      </div>
      <div class="header-spacer"></div>
      <div class="header-right">
        <span class="header-date">${formatDate()}</span>
        <button class="icon-btn" id="theme-toggle" onclick="App.toggleTheme()" title="Toggle theme">
          <i data-lucide="${settings.theme === 'dark' ? 'sun' : 'moon'}"></i>
        </button>
      </div>
    `;
  }

  function formatDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function init() {
    const settings = DataStore.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    buildHeader();
    buildNav();
    navigate('overview');
  }

  return { navigate, toggleTheme, toggleSidebar, init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
