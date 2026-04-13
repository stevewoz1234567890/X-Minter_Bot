# X-Minter_Bot

TypeScript tooling that reads posts on X (Twitter), derives memecoin-style metadata, can **mint new Pump.fun tokens** on Solana, and optionally runs a **keyword watcher** that mints and pings you on Telegram.

## What’s included

- **Tweet → metadata** — Given a post URL or numeric id, fetches text, author, media, heuristic **name / symbol / logo URL**, optional **mint** hints, and **SPL decimals** when a mint address appears in the post.
- **Pump.fun create** — Uploads metadata + image to Pump’s IPFS helper, then submits an on-chain **`createV2`** transaction via [`@pump-fun/pump-sdk`](https://www.npmjs.com/package/@pump-fun/pump-sdk).
- **Watch bot** — Polls one or more X accounts (default `@elonmusk`); on new posts matching comma-separated **keywords** (default `doge`, `meme`), runs the mint pipeline and sends a **Telegram** message with the Pump.fun link. The first run only initializes a cursor (no backlog mint).

## Requirements

- **Node.js** 18+ (20+ recommended; some Solana-related packages warn on older Node).
- **X API v2** bearer token with access to the endpoints you use (user lookup, user timeline, single-tweet lookup). Available scopes and rate limits depend on your X developer project tier.
- **Solana wallet** with enough SOL on **mainnet-beta** for fees and mint rent (and optional priority fees).
- **Telegram** bot token and chat id if you use `npm run bot`.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: TWITTER_BEARER_TOKEN, SOLANA_PRIVATE_KEY, TELEGRAM_*, etc.
npm run build
```

Fill `SOLANA_PRIVATE_KEY` with a **base58** secret key (typical 64-byte keypair export). Never commit `.env` or real keys.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run coin-from-tweet -- <url-or-id>` | Print JSON metadata for one post (needs `TWITTER_BEARER_TOKEN`). |
| `npm run bot` | Run the keyword watcher loop (needs full bot env; see `.env.example`). |

## Environment (summary)

See [`.env.example`](.env.example) for all variables. Commonly used:

- `TWITTER_BEARER_TOKEN` — X API bearer.
- `SOLANA_RPC_URL`, `SOLANA_PRIVATE_KEY` — RPC and signing wallet for mints.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — Bot notifications.
- `WATCH_USERNAMES`, `WATCH_KEYWORDS` — Accounts and substrings to watch.
- `BOT_POLL_INTERVAL_MS`, `BOT_STATE_FILE`, `BOT_EXCLUDE_RETWEETS`, `BOT_EXCLUDE_REPLIES` — Bot tuning.

## Project layout

```
src/
  twitter/       # Tweet fetch + parsing helpers
  solana/        # RPC helpers, wallet from env
  pumpfun/       # IPFS upload + createV2 transaction
  bot/           # Polling, keywords, state file
  notify/        # Telegram
  cli/           # coin-from-tweet, run-elon-bot
```

## Risks and limitations

- **X** does not provide token metadata; name/symbol/logo are **heuristics** from the post and may be wrong or generic.
- **Pump.fun IPFS** and program behavior can change; failures may require code or env updates.
- Automating coins tied to real people or brands can raise **legal, trademark, and platform ToS** issues. This repo is for education and self-hosted automation; you are responsible for compliance and for any trading losses.
