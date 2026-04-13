import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

export function keypairFromBase58Secret(secret: string): Keypair {
  const raw = bs58.decode(secret.trim());
  if (raw.length === 64) {
    return Keypair.fromSecretKey(raw);
  }
  if (raw.length === 32) {
    return Keypair.fromSeed(raw);
  }
  throw new Error('SOLANA_PRIVATE_KEY must decode to 32-byte seed or 64-byte secret key');
}

export function creatorKeypairFromEnv(): Keypair {
  const s = process.env.SOLANA_PRIVATE_KEY?.trim();
  if (!s) throw new Error('SOLANA_PRIVATE_KEY is required for minting');
  return keypairFromBase58Secret(s);
}
