const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const client = config.anthropic.apiKey ? new Anthropic({ apiKey: config.anthropic.apiKey }) : null;

/**
 * Simple text-in, text-out helper for AI modules (listing copy, ad captions,
 * digest summaries, etc). Individual modules can call client.messages.create
 * directly if they need tools, structured JSON output, etc.
 */
async function ask(prompt, { system, maxTokens = 1024, model = 'claude-sonnet-4-6' } = {}) {
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

module.exports = { client, ask };
