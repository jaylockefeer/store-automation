const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

/**
 * Verify that an incoming webhook body really came from Shopify, using the
 * raw request body and the X-Shopify-Hmac-Sha256 header. Must be called with
 * the *raw* (unparsed) body — see routes/webhooks.js for how that's captured.
 * Note: this is unrelated to the app credentials below — this secret comes
 * from Settings > Notifications > Webhooks in the Shopify admin, which is
 * still the classic (non-Dev-Dashboard) flow.
 */
function verifyWebhookHmac(rawBody, hmacHeader) {
  if (!config.shopify.webhookSecret || !hmacHeader) return false;
  const digest = crypto
    .createHmac('sha256', config.shopify.webhookSecret)
    .update(rawBody, 'utf8')
    .digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false; // length mismatch etc.
  }
}

// Bare `shop` subdomain, e.g. "your-store" (accepts either "your-store" or
// "your-store.myshopify.com" in the env var so setup is a bit more forgiving).
const SHOP = (config.shopify.storeDomain || '').replace(/\.myshopify\.com$/, '');

// --- Client credentials grant (Dev Dashboard apps, required since Jan 2026) ---
// Tokens expire every 24h, so we cache and refresh instead of storing a
// static token. See: https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
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

// Attach a fresh (or cached, if still valid) access token to every request.
admin.interceptors.request.use(async (req) => {
  req.headers['X-Shopify-Access-Token'] = await getAccessToken();
  return req;
});

/**
 * Run a GraphQL query/mutation against the Shopify Admin API.
 */
async function graphql(query, variables = {}) {
  const res = await admin.post('/graphql.json', { query, variables });
  if (res.data.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(res.data.errors)}`);
  }
  return res.data.data;
}

/**
 * Register a webhook topic pointed at this service. Call once per topic
 * during setup (see README) — Shopify doesn't auto-discover endpoints.
 */
async function registerWebhook(topic, callbackUrl) {
  return admin.post('/webhooks.json', {
    webhook: { topic, address: callbackUrl, format: 'json' },
  });
}

module.exports = { admin, graphql, registerWebhook, verifyWebhookHmac, getAccessToken };
