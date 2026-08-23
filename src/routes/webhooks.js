const express = require('express');
const { verifyWebhookHmac } = require('../lib/shopify');
const { notify } = require('../lib/slack');
const eventLog = require('../lib/eventLog');

const router = express.Router();

router.post('/shopify', async (req, res) => {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const topic = req.get('X-Shopify-Topic');
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const rawBody = req.body;

              const valid = verifyWebhookHmac(rawBody, hmacHeader);
    if (!valid) {
          console.warn('[webhooks] invalid HMAC, rejecting', { topic, shopDomain });
          return res.status(401).send('invalid signature');
    }

              let payload;
    try {
          payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
          return res.status(400).send('invalid json');
    }

              res.status(200).send('ok');

              handleTopic(topic, payload).catch((err) => {
                    console.error(`[webhooks] error handling topic ${topic}:`, err);
              });
});

async function handleTopic(topic, payload) {
    switch (topic) {
      case 'orders/create':
              eventLog.log('order', `New order #${payload.name}`, {
                        total: `${payload.currency} ${payload.total_price}`,
                        items: payload.line_items?.length || 0,
              });
              await notify(
                        `🛍️ *New order* #${payload.name} — ${payload.currency} ${payload.total_price} ` +
                          `(${payload.line_items?.length || 0} item${payload.line_items?.length === 1 ? '' : 's'})`
                      );
              break;

      case 'orders/cancelled':
              eventLog.log('cancelled', `Order #${payload.name} cancelled`);
              await notify(`⚠️ Order #${payload.name} was *cancelled*.`);
              break;

      case 'inventory_levels/update':
              if (typeof payload.available === 'number' && payload.available <= 3) {
                        eventLog.log('low_stock', `Low stock: item ${payload.inventory_item_id}`, {
                                    available: payload.available,
                        });
                        await notify(`📦 Low stock alert: inventory item ${payload.inventory_item_id} has ${payload.available} left.`);
              }
              break;

      default:
              console.log(`[webhooks] unhandled topic: ${topic}`);
    }
}

module.exports = router;
