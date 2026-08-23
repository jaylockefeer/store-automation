const express = require('express');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const { startScheduler } = require('./jobs/scheduler');
const { notify } = require('./lib/slack');

const app = express();

// Shopify webhooks need the raw body for HMAC verification, so this route
// gets express.raw() instead of the JSON parser used everywhere else.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Everything else can use normal JSON parsing.
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv, time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('store-automation is running. See /health for status.');
});

app.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
  startScheduler();
  notify(`🚀 store-automation deployed and online (env: ${config.nodeEnv}).`);
});
