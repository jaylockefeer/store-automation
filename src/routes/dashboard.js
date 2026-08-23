const express = require('express');
const config = require('../config');
const eventLog = require('../lib/eventLog');

const router = express.Router();
const bootedAt = Date.now();

router.get('/status', (req, res) => {
    res.json({
          env: config.nodeEnv,
          uptimeSeconds: Math.floor((Date.now() - bootedAt) / 1000),
          modules: [
            { id: '01', name: 'Foundation', live: true },
            { id: '02', name: 'Product sourcing', live: false },
            { id: '03', name: 'Pricing & inventory sync', live: false },
            { id: '04', name: 'Order routing', live: false },
            { id: '05', name: 'Marketing content', live: false },
            { id: '06', name: 'Reporting', live: false },
                ],
    });
});

router.get('/events', (req, res) => {
    res.json({ events: eventLog.getAll() });
});

module.exports = router;
