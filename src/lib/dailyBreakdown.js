const shopify = require('./shopify');
const metaAds = require('./metaAds');

const CACHE_MS = 5 * 60 * 1000;
let cache = { data: null, expiresAt: 0 };

async function getDailyBreakdown(days = 14) {
    if (cache.data && Date.now() < cache.expiresAt) return cache.data;

  const [orders, ads] = await Promise.all([
        shopify.getRecentOrders(250).catch(() => []),
        metaAds.getAdPerformance().catch(() => ({ configured: false, daily: [] })),
      ]);

  const byDate = {};
    const dateKey = (iso) => iso.slice(0, 10);

  for (const order of orders) {
        const key = dateKey(order.createdAt);
        if (!byDate[key]) byDate[key] = { date: key, orders: 0, revenue: 0, spend: 0 };
        byDate[key].orders += 1;
        byDate[key].revenue += order.total;
  }

  if (ads.configured) {
        for (const d of ads.daily) {
                const key = d.date;
                if (!byDate[key]) byDate[key] = { date: key, orders: 0, revenue: 0, spend: 0 };
                byDate[key].spend += d.spend;
        }
  }

  const rows = Object.values(byDate)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days)
      .map((r) => ({
              ...r,
              roas: r.spend > 0 ? r.revenue / r.spend : null,
      }));

  const result = { configured: ads.configured, currency: ads.currency || 'EUR', rows };
    cache = { data: result, expiresAt: Date.now() + CACHE_MS };
    return result;
}

module.exports = { getDailyBreakdown };
