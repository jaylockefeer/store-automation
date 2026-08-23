# store-automation

AI-powered backend automation for a Shopify dropshipping fashion store,
controlled through Slack, deployed on Railway. Built module by module —
see `src/modules/README.md` for the roadmap.

## What's live right now (Module 1: Foundation)

- Express server with a `/health` check
- Shopify webhook receiver at `/webhooks/shopify` (HMAC-verified)
- Slack notifications on new orders, cancellations, and low stock
- Cron scheduler skeleton, ready for module jobs
- Claude (Anthropic) API wrapper, ready for AI modules

Nothing here changes prices, publishes products, or touches orders yet —
module 1 only *listens and notifies*. That starts with module 2.

## One-time setup

### 1. Slack app
Create a Slack app at https://api.slack.com/apps (or use an existing one),
add the `chat:write` scope under OAuth & Permissions, install it to your
workspace, and copy the **Bot User OAuth Token** (`xoxb-...`). Invite the
bot to `#store-automation`.

### 2. Shopify Admin API access
Shopify Admin → Settings → Apps and sales channels → Develop apps →
Create an app → configure Admin API scopes (start with `read_orders`,
`read_inventory`, `read_products`; add `write_*` scopes as later modules
need them) → install → copy the Admin API access token.

### 3. Environment variables
Copy `.env.example` to `.env` locally, or set the same variables in
Railway → your service → Variables. You'll need `SLACK_BOT_TOKEN`,
`SLACK_CHANNEL_ID`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`,
`SHOPIFY_WEBHOOK_SECRET`, and `ANTHROPIC_API_KEY`.

### 4. Register the Shopify webhook
Once deployed, your service has a public URL like
`https://<your-service>.up.railway.app`. Register the webhook so Shopify
knows to call it — easiest via Shopify Admin → Settings → Notifications →
Webhooks → Create webhook, topic `Order creation`, format JSON, URL
`https://<your-service>.up.railway.app/webhooks/shopify`. Shopify will show
you the **signing secret** for that webhook — put it in `SHOPIFY_WEBHOOK_SECRET`.
Repeat for `Order cancellation` and `Inventory levels update` if you want
those too.

## Local development

```bash
npm install
cp .env.example .env   # fill in the values
npm run dev
```

## Deploying

Push to `main` — Railway is connected to this repo and deploys
automatically on push.
