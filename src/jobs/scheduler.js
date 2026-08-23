const cron = require('node-cron');

/**
 * Central place to register scheduled jobs. Each module that needs a
 * recurring task (price sync, daily Slack digest, etc.) exports a
 * `register(cron)` function; we call all of them here so server.js stays
 * untouched as we add modules one by one.
 *
 * Example, once module 3 (pricing & inventory sync) exists:
 *   require('../modules/pricing-sync').register(cron);
 */
const MODULE_JOBS = [
  // '../modules/pricing-sync',
  // '../modules/reporting',
];

function startScheduler() {
  for (const modulePath of MODULE_JOBS) {
    try {
      const mod = require(modulePath);
      if (typeof mod.register === 'function') {
        mod.register(cron);
        console.log(`[scheduler] registered jobs from ${modulePath}`);
      }
    } catch (err) {
      console.error(`[scheduler] failed to load ${modulePath}:`, err.message);
    }
  }
  if (MODULE_JOBS.length === 0) {
    console.log('[scheduler] no module jobs registered yet');
  }
}

module.exports = { startScheduler };
