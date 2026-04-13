/** Base58 Solana address pattern (length varies with encoding). */
const SOLANA_MINT_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

/** pump.fun coin pages: https://pump.fun/<mint> */
const PUMP_FUN_PATH_RE = /pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/i;

export function extractSolanaMintCandidates(text: string): string[] {
  const fromUrls: string[] = [];
  for (const m of text.matchAll(PUMP_FUN_PATH_RE)) {
    fromUrls.push(m[1]);
  }

  const fromBare: string[] = [];
  for (const m of text.matchAll(SOLANA_MINT_RE)) {
    fromBare.push(m[0]);
  }

  const ordered = [...fromUrls, ...fromBare];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const a of ordered) {
    if (seen.has(a)) continue;
    seen.add(a);
    unique.push(a);
  }
  return unique;
}
