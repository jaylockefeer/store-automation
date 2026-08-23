const REFRESH_MS = 15000;

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const envBadge = document.getElementById('env-badge');
const manifestList = document.getElementById('manifest-list');
const activityList = document.getElementById('activity-list');
const statUptime = document.getElementById('stat-uptime');
const statOrders = document.getElementById('stat-orders');
const statLowStock = document.getElementById('stat-lowstock');

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const orders = events.filter((e) => e.type === 'order').length;
  const lowStock = events.filter((e) => e.type === 'low_stock').length;
  statOrders.textContent = orders;
  statLowStock.textContent = lowStock;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function refresh() {
  try {
    const [statusRes, eventsRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/events'),
    ]);
    if (!statusRes.ok || !eventsRes.ok) throw new Error('bad response');

    const status = await statusRes.json();
    const { events } = await eventsRes.json();

    statusDot.className = 'status-dot live';
    statusText.textContent = 'online';
    envBadge.textContent = status.env;
    statUptime.textContent = formatUptime(status.uptimeSeconds);
    renderManifest(status.modules);
    renderActivity(events);
  } catch (err) {
    statusDot.className = 'status-dot down';
    statusText.textContent = 'unreachable';
  }
}

refresh();
setInterval(refresh, REFRESH_MS);
