export function tweetMatchesAnyKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const k of keywords) {
    const kw = k.trim().toLowerCase();
    if (!kw) continue;
    if (lower.includes(kw)) return k.trim();
  }
  return null;
}
