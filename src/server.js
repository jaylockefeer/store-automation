const express = require('express');
const path = require('path');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');
const { startScheduler } = require('./jobs/scheduler');
const { notify } = require('./lib/slack');
const eventLog = require('./lib/eventLog');

const app = express();

app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.use('/api', dashboardRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: config.nodeEnv, time: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, () => {
    console.log(`[server] listening on port ${config.port}`);
    startScheduler();
    eventLog.log('system', 'Service deployed and online');
    notify(`🚀 store-automation deployed and online (env: ${config.nodeEnv}).`);
});
