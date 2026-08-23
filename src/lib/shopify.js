const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

function verifyWebhookHmac(rawBody, hmacHeader) {
    if (!config.shopify.webhookSecret || !hmacHeader) return false;
    const digest = crypto
      .createHmac('sha256', config.shopify.webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64');
    try {
          return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
    } catch {
          return false;
    }
}

const SHOP = (config.shopify.storeDomain || '').replace(/\.myshopify\.com$/, '');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const res = await axios.post(
        `https://${SHOP}.myshopify.com/admin/oauth/access_token`,
        new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: config.shopify.clientId,
                client_secret: config.shopify.clientSecret,
        }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

  cachedToken = res.data.access_token;
    tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
    return cachedToken;
}

const admin = axios.create({
    baseURL: `https://${SHOP}.myshopify.com/admin/api/${config.shopify.apiVersion}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

admin.interceptors.request.use(async (req) => {
    req.headers['X-Shopify-Access-Token'] = await getAccessToken();
    return req;
});

async function graphql(query, variables = {}) {
    const res = await admin.post('/graphql.json', { query, variables });
    if (res.data.errors) {
          throw new Error(`Shopify GraphQL error: ${JSON.stringify(res.data.errors)}`);
    }
    return res.data.data;
}

async function registerWebhook(topic, callbackUrl) {
    return admin.post('/webhooks.json', {
          webhook: { topic, address: callbackUrl, format: 'json' },
    });
}

async function getRecentOrders(limit = 50) {
    const query = `
        query RecentOrders($first: Int!) {
              orders(first: $first, sortKey: CREATED_AT, reverse: true) {
                      edges {
                                node {
                                            name
                                                        createdAt
                                                                    displayFinancialStatus
                                                                                displayFulfillmentStatus
                                                                                            totalPriceSet { shopMoney { amount currencyCode } }
                                                                                                        customer { displayName email }
                                                                                                                    shippingAddress { name }
                                                                                                                              }
                                                                                                                                      }
                                                                                                                                            }
                                                                                                                                                }
                                                                                                                                                  `;
    const data = await graphql(query, { first: limit });
    return data.orders.edges.map(({ node }) => ({
          name: node.name,
          createdAt: node.createdAt,
          financialStatus: node.displayFinancialStatus,
          fulfillmentStatus: node.displayFulfillmentStatus,
          total: parseFloat(node.totalPriceSet.shopMoney.amount),
          currency: node.totalPriceSet.shopMoney.currencyCode,
          customerName: node.customer?.displayName || node.shippingAddress?.name || 'Guest',
          customerEmail: node.customer?.email || null,
    }));
}

module.exports = {
    admin,
    graphql,
    registerWebhook,
    verifyWebhookHmac,
    getAccessToken,
    getRecentOrders,
};
