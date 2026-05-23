/* ===== CHART HELPERS ===== */
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#55556a' : '#9090a8',
    tooltip: isDark ? '#16161f' : '#ffffff',
    tooltipBorder: isDark ? '#2a2a3a' : '#e2e2ea'
  };
}

function baseOptions(extra = {}) {
  const c = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.tooltip,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        titleColor: '#f0f0f5',
        bodyColor: '#8888aa',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: ctx => ' ' + formatCurrency(ctx.parsed.y ?? ctx.parsed)
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: c.text, font: { size: 11, family: 'Inter' } }
      },
      y: {
        grid: { color: c.grid, drawBorder: false },
        border: { display: false, dash: [4, 4] },
        ticks: { color: c.text, font: { size: 11, family: 'Inter' }, callback: v => formatCurrency(v) }
      }
    },
    ...extra
  };
}

function renderIncomeChart(canvasId) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const trend = getMonthlyTrend();
  const labels = trend.map(t => t.label);
  const totals = trend.map(t => t.writing + t.insurance + t.lyft);
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Writing',
          data: trend.map(t => t.writing),
          backgroundColor: 'rgba(167,139,250,0.7)',
          borderRadius: 4,
          stack: 'income'
        },
        {
          label: 'Insurance',
          data: trend.map(t => t.insurance),
          backgroundColor: 'rgba(52,211,153,0.7)',
          borderRadius: 4,
          stack: 'income'
        },
        {
          label: 'Lyft',
          data: trend.map(t => t.lyft),
          backgroundColor: 'rgba(251,146,60,0.7)',
          borderRadius: 4,
          stack: 'income'
        }
      ]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: getChartColors().text,
            font: { size: 11, family: 'Inter' },
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 3,
            padding: 16
          }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        }
      }
    }
  });
}

function renderDonutChart(canvasId, labels, data, colors) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getChartColors().tooltip,
          borderColor: getChartColors().tooltipBorder,
          borderWidth: 1,
          titleColor: '#f0f0f5',
          bodyColor: '#8888aa',
          padding: 12,
          cornerRadius: 8,
          callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` }
        }
      }
    }
  });
}

function renderLineChart(canvasId, labels, datasets) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const c = getChartColors();
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...baseOptions(),
      plugins: { ...baseOptions().plugins, legend: { display: false } },
      elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 5 } }
    }
  });
}

function renderLyftChart(canvasId) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const trips = [...AppData.lyft.trips].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-8);
  const labels = trips.map(t => {
    const d = new Date(t.date + 'T00:00:00');
    return (d.getMonth() + 1) + '/' + d.getDate();
  });
  renderLineChart(canvasId, labels, [{
    label: 'Earnings',
    data: trips.map(t => t.earnings),
    borderColor: 'rgba(251,146,60,0.9)',
    backgroundColor: 'rgba(251,146,60,0.1)',
    fill: true
  }]);
}

function reRenderAllCharts() {
  Object.keys(chartInstances).forEach(id => {
    const fn = chartRerenderMap[id];
    if (fn) fn(id);
  });
}

const chartRerenderMap = {
  'chart-income-overview': renderIncomeChart,
  'chart-lyft-trend': renderLyftChart
};
