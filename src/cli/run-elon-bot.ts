import 'dotenv/config';

import { runElonPumpBotLoop } from '../bot/elonPumpBot.js';

function envStr(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  if (v) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env ${name}`);
}

function envList(name: string, fallback: string): string[] {
  return envStr(name, fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function envBool(name: string, defaultVal: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === undefined || v === '') return defaultVal;
  return v === '1' || v === 'true' || v === 'yes';
}

async function main() {
  const config = {
    twitterBearerToken: envStr('TWITTER_BEARER_TOKEN'),
    telegramBotToken: envStr('TELEGRAM_BOT_TOKEN'),
    telegramChatId: envStr('TELEGRAM_CHAT_ID'),
    watchUsernames: envList('WATCH_USERNAMES', 'elonmusk'),
    keywords: envList('WATCH_KEYWORDS', 'doge,meme'),
    solanaRpcUrl: envStr('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com'),
    stateFilePath: envStr('BOT_STATE_FILE', './bot-state.json'),
    pollIntervalMs: Number(envStr('BOT_POLL_INTERVAL_MS', '25000')),
    excludeRetweets: envBool('BOT_EXCLUDE_RETWEETS', true),
    excludeReplies: envBool('BOT_EXCLUDE_REPLIES', false),
  };

  if (!Number.isFinite(config.pollIntervalMs) || config.pollIntervalMs < 5000) {
    throw new Error('BOT_POLL_INTERVAL_MS must be a number ≥ 5000');
  }

  console.log(
    `Elon pump bot: watching [${config.watchUsernames.join(', ')}] for keywords [${config.keywords.join(', ')}]`
  );

  await runElonPumpBotLoop(config);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
