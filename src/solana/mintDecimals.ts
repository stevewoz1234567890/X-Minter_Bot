import { Connection, PublicKey } from '@solana/web3.js';

export async function fetchMintDecimals(
  rpcUrl: string,
  mintAddress: string
): Promise<number> {
  const conn = new Connection(rpcUrl, 'confirmed');
  const pk = new PublicKey(mintAddress);
  const res = await conn.getParsedAccountInfo(pk);
  const data = res.value?.data;
  if (!data || typeof data === 'string' || !('parsed' in data)) {
    throw new Error('Not a valid mint account');
  }
  const parsed = data.parsed;
  if (parsed.type !== 'mint') {
    throw new Error('Account is not an SPL mint');
  }
  return (parsed.info as { decimals: number }).decimals;
}
