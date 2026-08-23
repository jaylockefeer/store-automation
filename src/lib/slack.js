const { WebClient } = require('@slack/web-api');
const config = require('../config');

const client = config.slack.botToken ? new WebClient(config.slack.botToken) : null;

/**
 * Post a plain message to the automation channel (or a specific channel/thread).
 */
async function notify(text, { channel = config.slack.channelId, threadTs } = {}) {
  if (!client) {
    console.warn('[slack] SLACK_BOT_TOKEN not set, skipping message:', text);
    return null;
  }
  try {
    return await client.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
      unfurl_links: false,
    });
  } catch (err) {
    console.error('[slack] failed to send message:', err.data || err.message);
    return null;
  }
}

/**
 * Post a message with Approve / Reject buttons (used by modules that need a
 * human thumbs-up before doing something live, e.g. publishing a product or
 * launching an ad). action_id values are namespaced per module so a single
 * Slack app can route interactions from all modules.
 */
async function notifyApproval(text, { module, actionId, channel = config.slack.channelId } = {}) {
  if (!client) {
    console.warn('[slack] SLACK_BOT_TOKEN not set, skipping approval message:', text);
    return null;
  }
  try {
    return await client.chat.postMessage({
      channel,
      text,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text } },
        {
          type: 'actions',
          block_id: `${module}:${actionId}`,
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '✅ Approve' },
              style: 'primary',
              action_id: 'approve',
              value: actionId,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '❌ Reject' },
              style: 'danger',
              action_id: 'reject',
              value: actionId,
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error('[slack] failed to send approval message:', err.data || err.message);
    return null;
  }
}

module.exports = { client, notify, notifyApproval };
