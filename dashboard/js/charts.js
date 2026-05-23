'use strict';

const Charts = (() => {
  const instances = {};

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  function destroyAll() {
    Object.keys(instances).forEach(destroy);
  }

  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      text:       style.getPropertyValue('--text-secondary').trim(),
      border:     style.getPropertyValue('--border-strong').trim(),
      card:       style.getPropertyValue('--bg-card').trim(),
      accent:     style.getPropertyValue('--accent').trim() || '#6366f1',
      green:      style.getPropertyValue('--green').trim()  || '#22c55e',
      amber:      style.getPropertyValue('--amber').trim()  || '#f59e0b',
      red:        style.getPropertyValue('--red').trim()    || '#ef4444',
      purple:     style.getPropertyValue('--purple').trim() || '#a855f7',
      cyan:       style.getPropertyValue('--cyan').trim()   || '#06b6d4',
      orange:     style.getPropertyValue('--orange').trim() || '#f97316',
    };
  }

  function baseChartDefaults() {
    const c = getThemeColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: c.text, font: { family: 'inherit', size: 12 }, boxWidth: 12, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#f0f0f8',
          bodyColor: '#9090a8',
          borderColor: '#2c2c42',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y ?? ctx.parsed;
              if (typeof v === 'number') {
                return ` $${v.toLocaleString()}`;
              }
              return ` ${v}`;
            }
          }
        }
      }
    };
  }

  function monthLabels(history, count = 6) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return history.slice(-count).map(h => {
      const [, m] = h.month.split('-');
      return months[parseInt(m, 10) - 1];
    });
  }

  function createIncomeLineChart(canvasId, history) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const data = history.slice(-6);
    const labels = monthLabels(history, 6);

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Writing',
            data: data.map(d => d.writing),
            borderColor: c.accent,
            backgroundColor: c.accent + '20',
            tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
          },
          {
            label: 'Insurance',
            data: data.map(d => d.insurance),
            borderColor: c.green,
            backgroundColor: c.green + '20',
            tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
          },
          {
            label: 'Lyft',
            data: data.map(d => d.lyft),
            borderColor: c.orange,
            backgroundColor: c.orange + '20',
            tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
          }
        ]
      },
      options: {
        ...baseChartDefaults(),
        scales: {
          x: { grid: { color: c.border + '40' }, ticks: { color: c.text } },
          y: {
            grid: { color: c.border + '40' }, ticks: {
              color: c.text,
              callback: v => '$' + v.toLocaleString()
            }
          }
        }
      }
    });
  }

  function createIncomeDonut(canvasId, stats) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const current = DataStore.getCurrentMonth();

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Writing', 'Insurance', 'Lyft'],
        datasets: [{
          data: [current.writing, current.insurance, current.lyft],
          backgroundColor: [c.accent + 'cc', c.green + 'cc', c.orange + 'cc'],
          borderColor: [c.accent, c.green, c.orange],
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        ...baseChartDefaults(),
        cutout: '72%',
        plugins: {
          ...baseChartDefaults().plugins,
          legend: {
            position: 'bottom',
            labels: { color: c.text, font: { family: 'inherit', size: 12 }, boxWidth: 10, padding: 16 }
          }
        }
      }
    });
  }

  function createCashFlowBar(canvasId, history) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const data = history.slice(-6);
    const labels = monthLabels(history, 6);

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Gross Income',
            data: data.map(d => d.writing + d.insurance + d.lyft),
            backgroundColor: c.accent + '99',
            borderColor: c.accent,
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Expenses',
            data: data.map(d => d.writingExpenses + d.insuranceExpenses + d.lyftExpenses + d.otherExpenses),
            backgroundColor: c.red + '99',
            borderColor: c.red,
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        ...baseChartDefaults(),
        scales: {
          x: { grid: { color: c.border + '40' }, ticks: { color: c.text } },
          y: { grid: { color: c.border + '40' }, ticks: { color: c.text, callback: v => '$' + v.toLocaleString() } }
        }
      }
    });
  }

  function createLyftEarningsChart(canvasId, entries) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const recent = entries.slice(0, 14).reverse();

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: recent.map(e => {
          const d = new Date(e.date);
          return (d.getMonth() + 1) + '/' + d.getDate();
        }),
        datasets: [
          {
            label: 'Earnings',
            data: recent.map(e => e.earnings),
            backgroundColor: c.orange + 'bb',
            borderColor: c.orange,
            borderWidth: 1,
            borderRadius: 5
          },
          {
            label: 'Expenses',
            data: recent.map(e => e.fuel + e.maintenance),
            backgroundColor: c.red + '88',
            borderColor: c.red,
            borderWidth: 1,
            borderRadius: 5
          }
        ]
      },
      options: {
        ...baseChartDefaults(),
        scales: {
          x: { grid: { color: c.border + '30' }, ticks: { color: c.text, font: { size: 11 } } },
          y: { grid: { color: c.border + '30' }, ticks: { color: c.text, callback: v => '$' + v } }
        }
      }
    });
  }

  function createLyftTrendLine(canvasId, entries) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const recent = entries.filter(e => e.hours > 0).slice(0, 14).reverse();

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: recent.map(e => {
          const d = new Date(e.date);
          return (d.getMonth() + 1) + '/' + d.getDate();
        }),
        datasets: [{
          label: 'Profit/Hour',
          data: recent.map(e => {
            const profit = e.earnings - e.fuel - e.maintenance;
            return e.hours > 0 ? parseFloat((profit / e.hours).toFixed(2)) : 0;
          }),
          borderColor: c.green,
          backgroundColor: c.green + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        ...baseChartDefaults(),
        plugins: {
          ...baseChartDefaults().plugins,
          tooltip: {
            ...baseChartDefaults().plugins.tooltip,
            callbacks: { label: ctx => ` $${ctx.parsed.y}/hr` }
          }
        },
        scales: {
          x: { grid: { color: c.border + '30' }, ticks: { color: c.text, font: { size: 11 } } },
          y: { grid: { color: c.border + '30' }, ticks: { color: c.text, callback: v => '$' + v + '/hr' } }
        }
      }
    });
  }

  function createAnalyticsComparison(canvasId, history) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const labels = monthLabels(history, 12);
    const data   = history.slice(-12);

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Gross',
            data: data.map(d => d.writing + d.insurance + d.lyft),
            borderColor: c.accent, backgroundColor: c.accent + '15',
            fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2
          },
          {
            label: 'Net Profit',
            data: data.map(d => {
              const gross = d.writing + d.insurance + d.lyft;
              const exp   = d.writingExpenses + d.insuranceExpenses + d.lyftExpenses + d.otherExpenses;
              return gross - exp;
            }),
            borderColor: c.green, backgroundColor: c.green + '15',
            fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2
          }
        ]
      },
      options: {
        ...baseChartDefaults(),
        scales: {
          x: { grid: { color: c.border + '40' }, ticks: { color: c.text } },
          y: { grid: { color: c.border + '40' }, ticks: { color: c.text, callback: v => '$' + v.toLocaleString() } }
        }
      }
    });
  }

  function createStreamComparisonBar(canvasId, history) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const c = getThemeColors();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data   = history.slice(-6);
    const labels = data.map(h => months[parseInt(h.month.split('-')[1], 10) - 1]);

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Writing',   data: data.map(d => d.writing),   backgroundColor: c.accent + 'aa',  borderRadius: 4 },
          { label: 'Insurance', data: data.map(d => d.insurance), backgroundColor: c.green + 'aa',   borderRadius: 4 },
          { label: 'Lyft',      data: data.map(d => d.lyft),      backgroundColor: c.orange + 'aa',  borderRadius: 4 }
        ]
      },
      options: {
        ...baseChartDefaults(),
        scales: {
          x: { stacked: false, grid: { color: c.border + '30' }, ticks: { color: c.text } },
          y: { grid: { color: c.border + '30' }, ticks: { color: c.text, callback: v => '$' + v.toLocaleString() } }
        }
      }
    });
  }

  return {
    destroy, destroyAll,
    createIncomeLineChart,
    createIncomeDonut,
    createCashFlowBar,
    createLyftEarningsChart,
    createLyftTrendLine,
    createAnalyticsComparison,
    createStreamComparisonBar
  };
})();
