/**
 * Heuristic extraction of human-facing coin name / symbol from tweet text * and Twitter API entity payloads. X does not define token metadata; this is best-effort.
 */

type CashtagEntity = { tag: string; start: number; end: number };

export function symbolFromEntitiesAndText(
  text: string,
  cashtags: CashtagEntity[] | undefined
): string | null {
  if (cashtags?.length) {
    const t = cashtags[0].tag?.toUpperCase();
    if (t) return t.slice(0, 10);
  }
  const m = text.match(/\$([A-Za-z0-9]{1,10})\b/);
  return m ? m[1].toUpperCase() : null;
}

export function coinNameFromText(
  text: string,
  symbol: string | null,
  authorDisplayName: string
): string | null {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!withoutUrls) {
    return authorDisplayName?.trim() || null;
  }

  const paren = withoutUrls.match(/^["'“”]?\s*([^($]+?)\s*\(\s*\$?[A-Za-z0-9]+\s*\)/);
  if (paren?.[1]) {
    const n = paren[1].replace(/["'“”]/g, '').trim();
    if (n.length >= 2 && n.length <= 64) return n;
  }

  let line = withoutUrls
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return authorDisplayName?.trim() || null;

  line = line.replace(/\$[A-Za-z0-9]{1,10}\b/g, ' ').replace(/#[A-Za-z0-9_]+/g, ' ');
  if (symbol) {
    const re = new RegExp(`\\b${symbol}\\b`, 'gi');
    line = line.replace(re, ' ');
  }
  line = line.replace(/\s+/g, ' ').trim();

  if (line.length >= 2 && line.length <= 64) return line;
  if (authorDisplayName?.trim()) return authorDisplayName.trim();
  return null;
}

export function upsizeTwitterProfileImage(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace('_normal', '_400x400');
}
