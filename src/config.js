require('dotenv').config();

// Vars every module can rely on existing (foundation-level). Individual
// modules should validate their own extra vars (e.g. TEEMDROP_API_KEY)
// when they load, so the app doesn't crash if a module isn't set up yet.
const REQUIRED = [
  'SLACK_BOT_TOKEN',
  'SLACK_CHANNEL_ID',
  'SHOPIFY_STORE_DOMAIN',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
  'SHOPIFY_WEBHOOK_SECRET',
];

function loadConfig() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Don't crash on boot — log loudly instead, so /health still comes up
    // and Railway doesn't loop-restart the service while you're setting
    // variables one at a time.
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
      adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
      apiVersion: '2025-01',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  };
}

module.exports = loadConfig();
