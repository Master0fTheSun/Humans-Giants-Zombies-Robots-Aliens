/* ===== FARMERS MARKET MODULE ===== */
function renderMarket() {
  const panel = document.getElementById('page-market');
  const stats = getMarketMonthly();
  const events = [...(AppData.market?.events || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const products = AppData.market?.products || [];
  const allEvents = AppData.market?.events || [];
  const totalRevenue = allEvents.reduce((s, e) => s + e.revenue, 0);
  const totalExpenses = allEvents.reduce((s, e) => s + e.expenses, 0);
  const avgPerEvent = events.length > 0 ? stats.revenue / Math.max(stats.events, 1) : 0;

  panel.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Farmers Market</h1>
      <p class="page-subtitle">Sugar scrubs, weekend events, product sales, and profit tracking.</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:20px">
      <div class="stat-card" style="--card-accent:#f472b6">
        <div class="stat-label">Monthly Revenue</div>
        <div class="stat-value">${formatCurrency(stats.revenue)}</div>
        <div class="stat-delta neutral">${stats.events} market${stats.events !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">Net Profit</div>
        <div class="stat-value">${formatCurrency(stats.netProfit)}</div>
        <div class="stat-delta neutral">After ${formatCurrency(stats.expenses)} costs</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--yellow)">
        <div class="stat-label">Units Sold</div>
        <div class="stat-value">${stats.unitsSold}</div>
        <div class="stat-delta neutral">This month</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent)">
        <div class="stat-label">Avg Per Market</div>
        <div class="stat-value">${formatCurrency(avgPerEvent)}</div>
        <div class="stat-delta neutral">Revenue per event</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--blue)">
        <div class="stat-label">All-Time Revenue</div>
        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
        <div class="stat-delta neutral">${allEvents.length} total events</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green)">
        <div class="stat-label">All-Time Profit</div>
        <div class="stat-value">${formatCurrency(totalRevenue - totalExpenses)}</div>
        <div class="stat-delta up">Cumulative</div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:20px">
      <!-- Revenue Chart -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">Revenue Per Market</div>
        </div>
        ${events.length < 2
          ? `<div class="empty-state"><div class="empty-state-title">Log 2+ events to see chart</div></div>`
          : `<div class="chart-container"><canvas id="chart-market-events"></canvas></div>`
        }
      </div>

      <!-- Best day / top insights -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">Market Insights</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${stats.bestEvent ? `
            <div style="background:var(--bg-input);border-radius:var(--radius);padding:14px">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">BEST MARKET DAY</div>
              <div style="font-size:16px;font-weight:700;color:var(--green)">${formatCurrency(stats.bestEvent.revenue)}</div>
              <div style="font-size:12px;color:var(--text-secondary)">${stats.bestEvent.location} · ${formatDate(stats.bestEvent.date)}</div>
            </div>
          ` : ''}
          <div style="background:var(--bg-input);border-radius:var(--radius);padding:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">PROFIT MARGIN</div>
            <div style="font-size:16px;font-weight:700">${stats.revenue > 0 ? Math.round(stats.netProfit / stats.revenue * 100) : 0}%</div>
            <div style="font-size:12px;color:var(--text-secondary)">After booth fees & supplies</div>
          </div>
          <div style="background:var(--bg-input);border-radius:var(--radius);padding:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">ANNUAL RUN RATE</div>
            <div style="font-size:16px;font-weight:700">${formatCurrency(stats.netProfit * 12)}</div>
            <div style="font-size:12px;color:var(--text-secondary)">Based on this month</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Products -->
    <div class="card" style="margin-bottom:20px">
      <div class="section-header">
        <div>
          <div class="section-title">Products</div>
          <div class="section-sub">${products.length} items in lineup</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="MarketModule.openAddProduct()">+ Add Product</button>
      </div>
      ${products.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">🧴</div><div class="empty-state-title">Add your products</div></div>`
        : `<div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>Product</th><th>Unit</th><th>Price</th><th>Cost to Make</th><th>Profit/Unit</th><th>Margin</th><th></th></tr></thead>
              <tbody>
                ${products.map(p => {
                  const profit = p.price - p.cost;
                  const margin = Math.round(profit / p.price * 100);
                  return `
                    <tr>
                      <td>${p.name}</td>
                      <td style="color:var(--text-muted)">${p.unit}</td>
                      <td style="font-weight:600">${formatCurrencyFull(p.price)}</td>
                      <td style="color:var(--red)">${formatCurrencyFull(p.cost)}</td>
                      <td style="font-weight:600;color:var(--green)">${formatCurrencyFull(profit)}</td>
                      <td><span class="badge ${margin >= 70 ? 'badge-green' : margin >= 50 ? 'badge-yellow' : 'badge-red'}">${margin}%</span></td>
                      <td><button class="btn btn-danger btn-sm btn-icon" onclick="MarketModule.deleteProduct('${p.id}')">✕</button></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>

    <!-- Event Log -->
    <div class="card">
      <div class="section-header">
        <div>
          <div class="section-title">Market Event Log</div>
          <div class="section-sub">${allEvents.length} events total</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="MarketModule.openAddEvent()">+ Log Market Day</button>
      </div>
      ${events.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">🌿</div>
            <div class="empty-state-title">No events logged yet</div>
            <div class="empty-state-sub">Log your first market day after the weekend</div>
          </div>`
        : `<div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Location</th><th>Revenue</th><th>Expenses</th><th>Net</th><th>Units</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                ${events.map(e => `
                  <tr>
                    <td>${formatDate(e.date)}</td>
                    <td style="font-weight:500">${e.location}</td>
                    <td style="color:var(--green);font-weight:600">${formatCurrency(e.revenue)}</td>
                    <td style="color:var(--red)">${formatCurrency(e.expenses)}</td>
                    <td style="font-weight:700">${formatCurrency(e.revenue - e.expenses)}</td>
                    <td style="text-align:center">${e.unitsSold || '—'}</td>
                    <td style="color:var(--text-muted);font-size:12px">${e.notes || '—'}</td>
                    <td><button class="btn btn-danger btn-sm btn-icon" onclick="MarketModule.deleteEvent('${e.id}')">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>
  `;

  // Render events chart
  if (events.length >= 2) {
    const sorted = [...events].reverse().slice(-8);
    const labels = sorted.map(e => {
      const d = new Date(e.date + 'T00:00:00');
      return (d.getMonth()+1) + '/' + d.getDate();
    });
    destroyChart('chart-market-events');
    renderLineChart('chart-market-events', labels, [{
      label: 'Revenue',
      data: sorted.map(e => e.revenue),
      borderColor: 'rgba(244,114,182,0.9)',
      backgroundColor: 'rgba(244,114,182,0.1)',
      fill: true
    }]);
  }
}

const MarketModule = {
  openAddEvent() {
    App.openModal('Log Market Day', `
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" id="mk-date" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label">Market / Location</label>
        <input class="form-input" id="mk-location" placeholder="Downtown Farmers Market" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Total Revenue ($)</label>
          <input class="form-input" id="mk-revenue" type="number" step="0.01" placeholder="200" />
        </div>
        <div class="form-group">
          <label class="form-label">Expenses ($) <span style="color:var(--text-muted);font-weight:400">(booth fee, supplies)</span></label>
          <input class="form-input" id="mk-expenses" type="number" step="0.01" placeholder="25" value="0" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Units Sold</label>
        <input class="form-input" id="mk-units" type="number" placeholder="12" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input class="form-input" id="mk-notes" placeholder="Weather, crowd size, best seller..." />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="MarketModule.saveEvent()">Log Event</button>
      </div>
    `);
    document.getElementById('mk-date').value = new Date().toISOString().split('T')[0];
  },

  saveEvent() {
    const date = document.getElementById('mk-date').value;
    const location = document.getElementById('mk-location').value.trim();
    const revenue = parseFloat(document.getElementById('mk-revenue').value);
    const expenses = parseFloat(document.getElementById('mk-expenses').value) || 0;
    const unitsSold = parseInt(document.getElementById('mk-units').value) || 0;
    const notes = document.getElementById('mk-notes').value.trim();
    if (!date || !location || isNaN(revenue)) { App.toast('Fill in date, location, and revenue.', 'error'); return; }
    if (!AppData.market) AppData.market = { products: [], events: [] };
    AppData.market.events.push({ id: uid(), date, location, revenue, expenses, unitsSold, notes });
    saveData();
    App.closeModal();
    App.toast('Market day logged! 🌿', 'success');
    renderMarket();
  },

  openAddProduct() {
    App.openModal('Add Product', `
      <div class="form-group">
        <label class="form-label">Product Name</label>
        <input class="form-input" id="pr-name" placeholder="Lavender Sugar Scrub" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Selling Price ($)</label>
          <input class="form-input" id="pr-price" type="number" step="0.01" placeholder="14" />
        </div>
        <div class="form-group">
          <label class="form-label">Cost to Make ($)</label>
          <input class="form-input" id="pr-cost" type="number" step="0.01" placeholder="3.50" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Unit / Size</label>
        <input class="form-input" id="pr-unit" placeholder="8oz jar, 4oz tin..." />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="MarketModule.saveProduct()">Add Product</button>
      </div>
    `);
  },

  saveProduct() {
    const name = document.getElementById('pr-name').value.trim();
    const price = parseFloat(document.getElementById('pr-price').value);
    const cost = parseFloat(document.getElementById('pr-cost').value);
    const unit = document.getElementById('pr-unit').value.trim();
    if (!name || isNaN(price) || isNaN(cost)) { App.toast('Fill all fields.', 'error'); return; }
    if (!AppData.market) AppData.market = { products: [], events: [] };
    AppData.market.products.push({ id: uid(), name, price, cost, unit: unit || 'Unit' });
    saveData();
    App.closeModal();
    App.toast('Product added!', 'success');
    renderMarket();
  },

  deleteEvent(id) {
    AppData.market.events = AppData.market.events.filter(e => e.id !== id);
    saveData();
    App.toast('Event removed.', 'info');
    renderMarket();
  },

  deleteProduct(id) {
    AppData.market.products = AppData.market.products.filter(p => p.id !== id);
    saveData();
    App.toast('Product removed.', 'info');
    renderMarket();
  }
};
