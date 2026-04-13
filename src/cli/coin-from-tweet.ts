import 'dotenv/config';

import { fetchCoinMetadataFromTweet, tweetIdFromInput } from '../twitter/coinFromTweet.js';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npm run coin-from-tweet -- <tweet-url-or-id>');
    process.exit(1);
  }

  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    console.error('Missing TWITTER_BEARER_TOKEN in environment (.env)');
    process.exit(1);
  }

  try {
    tweetIdFromInput(arg);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  const meta = await fetchCoinMetadataFromTweet(arg, { bearerToken: token });
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
