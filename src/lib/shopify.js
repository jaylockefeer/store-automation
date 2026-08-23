const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

/**
 * Verify that an incoming webhook body really came from Shopify, using the
 * raw request body and the X-Shopify-Hmac-Sha256 header. Must be called with
 * the *raw* (unparsed) body — see routes/webhooks.js for how that's captured.
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

const admin = axios.create({
  baseURL: `https://${config.shopify.storeDomain}/admin/api/${config.shopify.apiVersion}`,
  headers: {
    'X-Shopify-Access-Token': config.shopify.adminAccessToken,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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

module.exports = { admin, graphql, registerWebhook, verifyWebhookHmac };
