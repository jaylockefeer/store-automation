const REFRESH_MS = 15000;
const ADS_REFRESH_MS = 60000; // ads data is cached server-side for 5min anyway

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const envBadge = document.getElementById('env-badge');
const manifestList = document.getElementById('manifest-list');
const activityList = document.getElementById('activity-list');
const uptimeText = document.getElementById('uptime-text');
const kpiSpend = document.getElementById('kpi-spend');
const kpiPurchases = document.getElementById('kpi-purchases');
const kpiOrders = document.getElementById('kpi-orders');
const kpiLowStock = document.getElementById('kpi-lowstock');
const adsContent = document.getElementById('ads-content');

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderManifest(modules) {
  manifestList.innerHTML = modules
    .map(
      (m) => `
      <li class="manifest__item">
        <span class="manifest__num">${m.id}</span>
        <span class="manifest__name ${m.live ? '' : 'manifest__name--pending'}">${m.name}</span>
        <span class="manifest__state ${m.live ? 'manifest__state--live' : 'manifest__state--pending'}">
          ${m.live ? 'live' : 'planned'}
        </span>
      </li>`
    )
    .join('');
}

function renderActivity(events) {
  if (!events.length) {
    activityList.innerHTML = '<p class="activity__empty">Waiting for the first event…</p>';
    return;
  }
  activityList.innerHTML = events
    .map(
      (e) => `
      <div class="stub">
        <span class="stub__time">${formatTime(e.at)}</span>
        <span class="stub__tag stub__tag--${e.type}">${e.type.replace('_', ' ')}</span>
        <span class="stub__msg">${escapeHtml(e.message)}</span>
      </div>`
    )
    .join('');

  kpiOrders.textContent = events.filter((e) => e.type === 'order').length;
  kpiLowStock.textContent = events.filter((e) => e.type === 'low_stock').length;
}

// Draws a filled gold-gradient area chart from a daily spend series.
// No chart library — just an SVG path computed from the data points.
function renderSparkline(daily, currency) {
  const width = 480;
  const height = 130;
  const pad = 6;

  if (!daily.length) return '<p class="ads-empty">No spend data for this period.</p>';

  const max = Math.max(...daily.map((d) => d.spend), 1);
  const stepX = (width - pad * 2) / Math.max(daily.length - 1, 1);

  const points = daily.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (d.spend / max) * (height - pad * 2);
    return [x, y];
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${height - pad} L ${points[0][0].toFixed(1)} ${height - pad} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="spend-chart" preserveAspectRatio="none" style="width:100%;height:130px;">
      <defs>
        <linearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#C9A227" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#C9A227" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#goldFade)" />
      <path d="${linePath}" fill="none" stroke="#E4C15C" stroke-width="1.75" />
    </svg>
  `;
}

function renderAds(data) {
  if (!data.configured) {
    adsContent.innerHTML = `
      <p class="ads-empty">
        Meta Ads isn't connected yet. Add <code>META_ACCESS_TOKEN</code> and <code>META_AD_ACCOUNT_ID</code>
        as environment variables to light this panel up.
      </p>`;
    kpiSpend.textContent = '—';
    kpiPurchases.textContent = '—';
    return;
  }

  if (data.error) {
    adsContent.innerHTML = '<p class="ads-empty">Couldn\u2019t reach the Meta Ads API right now — will retry automatically.</p>';
    return;
  }

  kpiSpend.textContent = formatMoney(data.totalSpend, data.currency);
  kpiPurchases.textContent = data.totalPurchases;

  const campaignRows = data.campaigns.length
    ? data.campaigns
        .map((c) => {
          const roasClass = c.roas && c.roas >= 2 ? 'roas good' : 'roas';
          const roasText = c.roas ? `${c.roas.toFixed(2)}x` : '—';
          return `
          <div class="campaign-row">
            <span class="campaign-row__name">${escapeHtml(c.name)}</span>
            <span class="campaign-row__stats">
              <span>${formatMoney(c.spend, data.currency)}</span>
              <span>${c.purchases} sold</span>
              <span class="${roasClass}">${roasText}</span>
            </span>
          </div>`;
        })
        .join('')
    : '<p class="ads-empty">No active campaigns in this window.</p>';

  adsContent.innerHTML = `
    <div class="ads-body">
      <div class="chart-wrap">
        <div class="chart-total">${formatMoney(data.totalSpend, data.currency)}<span>spent, last 7 days</span></div>
        ${renderSparkline(data.daily, data.currency)}
      </div>
      <div class="campaigns">${campaignRows}</div>
    </div>
  `;
}

async function refreshCore() {
  try {
    const [statusRes, eventsRes] = await Promise.all([fetch('/api/status'), fetch('/api/events')]);
    if (!statusRes.ok || !eventsRes.ok) throw new Error('bad response');

    const status = await statusRes.json();
    const { events } = await eventsRes.json();

    statusDot.className = 'status-dot live';
    statusText.textContent = 'online';
    envBadge.textContent = status.env;
    uptimeText.textContent = `Uptime ${formatUptime(status.uptimeSeconds)}`;
    renderManifest(status.modules);
    renderActivity(events);
  } catch {
    statusDot.className = 'status-dot down';
    statusText.textContent = 'unreachable';
  }
}

async function refreshAds() {
  try {
    const res = await fetch('/api/ads');
    if (!res.ok) throw new Error('bad response');
    renderAds(await res.json());
  } catch {
    adsContent.innerHTML = '<p class="ads-empty">Couldn\u2019t reach the Meta Ads API right now — will retry automatically.</p>';
  }
}

refreshCore();
refreshAds();
setInterval(refreshCore, REFRESH_MS);
setInterval(refreshAds, ADS_REFRESH_MS);
