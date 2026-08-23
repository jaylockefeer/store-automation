const express = require('express');
const path = require('path');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');
const { startScheduler } = require('./jobs/scheduler');
const { notify } = require('./lib/slack');
const eventLog = require('./lib/eventLog');

const app = express();

// Shopify webhooks need the raw body for HMAC verification, so this route
// gets express.raw() instead of the JSON parser used everywhere else.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Everything else can use normal JSON parsing.
app.use(express.json());

app.use('/api', dashboardRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv, time: new Date().toISOString() });
});

// Dashboard — a static console at "/" showing live module status and
// recent activity. See public/index.html, style.css, app.js.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port}`);
  startScheduler();
  eventLog.log('system', 'Service deployed and online');
  notify(`🚀 store-automation deployed and online (env: ${config.nodeEnv}).`);
});
