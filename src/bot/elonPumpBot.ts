import { Connection } from '@solana/web3.js';
import { TwitterApi, type TweetV2 } from 'twitter-api-v2';

import { fetchCoinMetadataFromTweet } from '../twitter/coinFromTweet.js';
import { createPumpFunTokenV2 } from '../pumpfun/createToken.js';
import { fetchImageForPump } from '../pumpfun/imageFromUrl.js';
import { uploadPumpMetadataToIpfs } from '../pumpfun/ipfsUpload.js';
import { sendTelegramMessage } from '../notify/telegram.js';
import { creatorKeypairFromEnv } from '../solana/keypairFromEnv.js';
import { tweetMatchesAnyKeyword } from './keywordMatch.js';
import { loadBotState, saveBotState } from './state.js';

export type ElonPumpBotConfig = {
  twitterBearerToken: string;
  telegramBotToken: string;
  telegramChatId: string;
  watchUsernames: string[];
  keywords: string[];
  solanaRpcUrl: string;
  stateFilePath: string;
  pollIntervalMs: number;
  excludeRetweets: boolean;
  excludeReplies: boolean;
};

function maxTweetId(ids: string[]): string {
  return ids.reduce((a, b) => (BigInt(a) > BigInt(b) ? a : b));
}

function sortTweetsChronological(tweets: TweetV2[]): TweetV2[] {
  return [...tweets].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0));
}

export async function runElonPumpBotCycle(config: ElonPumpBotConfig): Promise<void> {
  const client = new TwitterApi(config.twitterBearerToken).readOnly;
  const connection = new Connection(config.solanaRpcUrl, 'confirmed');
  const creator = creatorKeypairFromEnv();

  const state = await loadBotState(config.stateFilePath);

  const exclude: ('retweets' | 'replies')[] = [];
  if (config.excludeRetweets) exclude.push('retweets');
  if (config.excludeReplies) exclude.push('replies');

  for (const username of config.watchUsernames) {
    const uname = username.replace(/^@/, '').trim().toLowerCase();
    if (!uname) continue;

    const userRes = await client.v2.userByUsername(uname, {
      'user.fields': ['id', 'username'],
    });
    const userId = userRes.data?.id;
    if (!userId) {
      console.error(`User not found: ${uname}`);
      continue;
    }

    const since = state.lastSeenByUser[userId];
    const timeline = await client.v2.userTimeline(userId, {
      max_results: 10,
      since_id: since,
      exclude: exclude.length ? exclude : undefined,
      'tweet.fields': ['created_at', 'text', 'author_id'],
    });

    const tweets = timeline.tweets;
    if (!tweets.length) continue;

    const ids = tweets.map((t) => t.id);
    const newest = maxTweetId(ids);

    if (!since) {
      state.lastSeenByUser[userId] = newest;
      await saveBotState(config.stateFilePath, state);
      console.log(`Initialized cursor for @${uname} at tweet ${newest} (no backfill mint).`);
      continue;
    }

    const ordered = sortTweetsChronological(tweets);

    for (const tw of ordered) {
      const text = tw.text ?? '';
      const hit = tweetMatchesAnyKeyword(text, config.keywords);
      if (!hit) continue;

      console.log(`Keyword "${hit}" in tweet ${tw.id} from @${uname}`);

      try {
        const meta = await fetchCoinMetadataFromTweet(tw.id, {
          bearerToken: config.twitterBearerToken,
          solanaRpcUrl: config.solanaRpcUrl,
        });

        const name =
          meta.coinName?.trim() ||
          `${meta.source.authorDisplayName || uname} ${hit}`.slice(0, 32);
        const symbol = (
          meta.symbol?.trim() ||
          hit.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ||
          'MEME'
        ).slice(0, 10);
        const description = `Auto-mint from @${meta.source.authorUsername} post. ${meta.source.tweetUrl}`.slice(
          0,
          500
        );

        const img = await fetchImageForPump(meta.logoUrl);
        const uri = await uploadPumpMetadataToIpfs({
          name,
          symbol,
          description,
          image: img.bytes,
          imageFileName: img.fileName,
          imageMime: img.mime,
          tweetUrl: meta.source.tweetUrl,
        });

        const { signature, mint } = await createPumpFunTokenV2({
          connection,
          creator,
          name,
          symbol,
          metadataUri: uri,
        });

        const pumpUrl = `https://pump.fun/coin/${mint}`;
        const msg = [
          `<b>New Pump.fun mint</b>`,
          ``,
          `Tweet: ${meta.source.tweetUrl}`,
          `Matched: <code>${hit}</code>`,
          ``,
          `Mint: <code>${mint}</code>`,
          `Name: ${name} (${symbol})`,
          `Sig: <code>${signature}</code>`,
          ``,
          `<a href="${pumpUrl}">Open on Pump.fun</a>`,
          ``,
          `<i>Reminder: high risk. Plan your exit / take profit.</i>`,
        ].join('\n');

        await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, msg);
        console.log(`Minted ${mint}, notified Telegram.`);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        console.error(`Mint pipeline failed for tweet ${tw.id}:`, err);
        try {
          await sendTelegramMessage(
            config.telegramBotToken,
            config.telegramChatId,
            [`<b>Mint failed</b>`, `Tweet: https://x.com/${uname}/status/${tw.id}`, `Keyword: ${hit}`, ``, `<code>${err.slice(0, 800)}</code>`].join(
              '\n'
            )
          );
        } catch {
          /* ignore secondary notify errors */
        }
      }
    }

    state.lastSeenByUser[userId] = newest;
    await saveBotState(config.stateFilePath, state);
  }
}

export async function runElonPumpBotLoop(config: ElonPumpBotConfig): Promise<void> {
  for (;;) {
    try {
      await runElonPumpBotCycle(config);
    } catch (e) {
      console.error('Bot cycle error:', e);
    }
    await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
}
