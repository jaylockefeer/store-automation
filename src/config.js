require('dotenv').config();

const REQUIRED = [
    'SLACK_BOT_TOKEN',
    'SLACK_CHANNEL_ID',
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'SHOPIFY_WEBHOOK_SECRET',
  ];

function loadConfig() {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length > 0) {
          console.warn(
                  `[config] Missing env vars (features depending on them will fail): ${missing.join(', ')}`
                );
    }

  return {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        slack: {
                botToken: process.env.SLACK_BOT_TOKEN,
                channelId: process.env.SLACK_CHANNEL_ID,
        },
        shopify: {
                storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
                clientId: process.env.SHOPIFY_CLIENT_ID,
                clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
                webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
                apiVersion: '2025-01',
        },
        anthropic: {
                apiKey: process.env.ANTHROPIC_API_KEY,
        },
        meta: {
                accessToken: process.env.META_ACCESS_TOKEN,
                adAccountId: process.env.META_AD_ACCOUNT_ID,
                currency: process.env.META_CURRENCY || 'EUR',
        },
  };
}

module.exports = loadConfig();
