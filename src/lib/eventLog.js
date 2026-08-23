// Simple bounded in-memory log of recent events, so the dashboard has
// something live to show. Resets on restart/redeploy — that's fine, this
// is a "what's happening right now" view, not a source of truth (Shopify
// and Slack remain that).
const MAX_EVENTS = 50;
const events = [];

function log(type, message, meta = {}) {
    events.unshift({ type, message, meta, at: new Date().toISOString() });
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

function getAll() {
    return events;
}

module.exports = { log, getAll };
