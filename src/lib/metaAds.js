const axios = require('axios');
const config = require('../config');

const GRAPH_VERSION = 'v21.0';

const CACHE_MS = 5 * 60 * 1000;
let cache = { data: null, expiresAt: 0 };

async function getAdPerformance() {
    if (cache.data && Date.now() < cache.expiresAt) return cache.data;

  if (!config.meta.accessToken || !config.meta.adAccountId) {
        return { configured: false };
  }

  const base = `https://graph.facebook.com/${GRAPH_VERSION}/act_${config.meta.adAccountId}`;
    const auth = { access_token: config.meta.accessToken };

  const [dailyRes, campaignRes] = await Promise.all([
        axios.get(`${base}/insights`, {
                params: {
                          ...auth,
                          fields: 'spend,impressions,clicks',
                          time_increment: 1,
                          date_preset: 'last_7d',
                },
        }),
        axios.get(`${base}/insights`, {
                params: {
                          ...auth,
                          level: 'campaign',
                          fields: 'campaign_name,spend,purchase_roas,actions',
                          date_preset: 'last_7d',
                },
        }),
      ]);

  const daily = (dailyRes.data.data || []).map((d) => ({
        date: d.date_start,
        spend: parseFloat(d.spend || 0),
  }));

  const campaigns = (campaignRes.data.data || [])
      .map((c) => {
              const purchaseAction = (c.actions || []).find((a) => a.action_type === 'purchase');
              const roas = (c.purchase_roas || [])[0]?.value;
              return {
                        name: c.campaign_name,
                        spend: parseFloat(c.spend || 0),
                        purchases: purchaseAction ? parseInt(purchaseAction.value, 10) : 0,
                        roas: roas ? parseFloat(roas) : null,
              };
      })
      .sort((a, b) => b.spend - a.spend);

  const totalSpend = daily.reduce((sum, d) => sum + d.spend, 0);
    const totalPurchases = campaigns.reduce((sum, c) => sum + c.purchases, 0);

  const result = {
        configured: true,
        currency: config.meta.currency,
        totalSpend,
        totalPurchases,
        daily,
        campaigns,
  };

  cache = { data: result, expiresAt: Date.now() + CACHE_MS };
    return result;
}

module.exports = { getAdPerformance };
