import { TwitterApi, type ApiV2Includes, type TweetV2, type UserV2 } from 'twitter-api-v2';

import { fetchMintDecimals } from '../solana/mintDecimals.js';
import {
  coinNameFromText,
  symbolFromEntitiesAndText,
  upsizeTwitterProfileImage,
} from './parseCoinFields.js';
import { extractSolanaMintCandidates } from './parseMint.js';

export type CoinMetadataFromTweet = {
  tweetId: string;
  coinName: string | null;
  symbol: string | null;
  logoUrl: string | null;
  /** Present when a mint was found *and* RPC returned SPL mint decimals. */
  decimals: number | null;
  mintAddress: string | null;
  mintCandidates: string[];
  source: {
    text: string;
    authorUsername: string;
    authorDisplayName: string;
    tweetUrl: string;
  };
};

export function tweetIdFromInput(input: string): string {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/status\/(\d+)/);
  if (fromUrl) return fromUrl[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  throw new Error('Expected an X post URL (…/status/<id>) or a numeric tweet id');
}

function firstPhotoFromTweet(tweet: TweetV2, includes?: ApiV2Includes): string | null {
  const keys = tweet.attachments?.media_keys;
  const mediaList = includes?.media;
  if (!keys?.length || !mediaList?.length) return null;
  const mediaMap = new Map(mediaList.map((m) => [m.media_key, m]));
  for (const k of keys) {
    const m = mediaMap.get(k);
    if (m?.type === 'photo' && m.url) return m.url;
  }
  return null;
}

export type FetchCoinFromTweetOptions = {
  bearerToken: string;
  /** Defaults to process.env.SOLANA_RPC_URL or mainnet public RPC. */
  solanaRpcUrl?: string;
};

export async function fetchCoinMetadataFromTweet(
  tweetIdOrUrl: string,
  options: FetchCoinFromTweetOptions
): Promise<CoinMetadataFromTweet> {
  const tweetId = tweetIdFromInput(tweetIdOrUrl);
  const client = new TwitterApi(options.bearerToken).readOnly;

  const { data: tweet, includes } = await client.v2.singleTweet(tweetId, {
    expansions: ['author_id', 'attachments.media_keys'],
    'tweet.fields': ['attachments', 'entities', 'created_at'],
    'user.fields': ['profile_image_url', 'username', 'name'],
    'media.fields': ['type', 'url', 'preview_image_url', 'width', 'height'],
  });

  if (!tweet) {
    throw new Error(`Tweet ${tweetId} not found or not accessible with this token`);
  }

  const users = includes?.users as UserV2[] | undefined;
  const author = users?.find((u) => u.id === tweet.author_id);
  const text = tweet.text ?? '';
  const cashtags = tweet.entities?.cashtags as { tag: string; start: number; end: number }[] | undefined;

  const symbol = symbolFromEntitiesAndText(text, cashtags);
  const coinName = coinNameFromText(text, symbol, author?.name ?? '');
  const mintCandidates = extractSolanaMintCandidates(text);
  const mintAddress = mintCandidates[0] ?? null;

  const photo = firstPhotoFromTweet(tweet, includes);
  const profile = upsizeTwitterProfileImage(author?.profile_image_url);
  const logoUrl = photo ?? profile ?? null;

  const rpc =
    options.solanaRpcUrl ??
    process.env.SOLANA_RPC_URL ??
    'https://api.mainnet-beta.solana.com';

  let decimals: number | null = null;
  if (mintAddress) {
    try {
      decimals = await fetchMintDecimals(rpc, mintAddress);
    } catch {
      decimals = null;
    }
  }

  const username = author?.username ?? 'unknown';
  return {
    tweetId,
    coinName,
    symbol,
    logoUrl,
    decimals,
    mintAddress,
    mintCandidates,
    source: {
      text,
      authorUsername: username,
      authorDisplayName: author?.name ?? '',
      tweetUrl: `https://x.com/${username}/status/${tweetId}`,
    },
  };
}
