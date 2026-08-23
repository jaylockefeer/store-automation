# Modules

This folder is where each automation lives, one file (or subfolder) per
module, added one at a time. Nothing in `src/server.js`, `src/routes`, or
`src/jobs/scheduler.js` should need rewriting as we add modules — they're
built to just pick up new files here.

Planned build order:

1. ~~Foundation~~ (done — webhook listener, Slack bot, Railway deploy)
2. `product-sourcing.js` — pulls candidates from Teemdrop, AI writes
   title/description/tags, posts to Slack for approval before publishing
   as a Shopify draft/active product
3. `pricing-sync.js` — keeps Shopify price/stock in sync with the supplier,
   Slack alerts on stockouts or supplier price jumps
4. `order-routing.js` — forwards paid orders to the supplier, tracks
   fulfillment, posts exceptions to Slack
5. `marketing-content.js` — AI ad copy/images, pushed to Meta Ads as
   drafts for approval
6. `reporting.js` — daily/weekly Slack digest (sales, ad spend, margin)

## Conventions for new modules

- A module that needs a webhook: add a `case` to the dispatch table in
  `src/routes/webhooks.js`.
- A module that needs a recurring job: export `register(cron)` and add its
  path to `MODULE_JOBS` in `src/jobs/scheduler.js`.
- A module that needs a human approval step before doing something live:
  use `notifyApproval()` from `src/lib/slack.js`.
- Use `src/lib/shopify.js` (`graphql()`) for Shopify reads/writes, and
  `src/lib/claude.js` (`ask()`) for AI generation, so API auth/config stays
  in one place.
