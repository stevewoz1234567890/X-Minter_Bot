/** Upload coin image + metadata to Pump.fun IPFS helper (same flow as the web UI). */

const PUMP_IPFS_URL = 'https://pump.fun/api/ipfs';

export type PumpIpfsUploadParams = {
  name: string;
  symbol: string;
  description: string;
  /** Image bytes (PNG/JPEG/WebP). */
  image: Uint8Array;
  imageFileName: string;
  imageMime: string;
  tweetUrl?: string;
};

export async function uploadPumpMetadataToIpfs(params: PumpIpfsUploadParams): Promise<string> {
  const form = new FormData();
  form.set('name', params.name.slice(0, 32));
  form.set('symbol', params.symbol.slice(0, 10));
  form.set('description', params.description.slice(0, 500));
  form.set('showName', 'true');
  if (params.tweetUrl) form.set('twitter', params.tweetUrl);

  const blob = new Blob([Buffer.from(params.image)], { type: params.imageMime });
  form.set('file', blob, params.imageFileName);

  const res = await fetch(PUMP_IPFS_URL, { method: 'POST', body: form });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Pump IPFS upload failed ${res.status}: ${errText.slice(0, 500)}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const uri =
    (typeof json.metadataUri === 'string' && json.metadataUri) ||
    (typeof json.uri === 'string' && json.uri) ||
    (json.metadata &&
      typeof json.metadata === 'object' &&
      json.metadata !== null &&
      typeof (json.metadata as Record<string, unknown>).uri === 'string' &&
      (json.metadata as Record<string, unknown>).uri) ||
    null;

  if (!uri || typeof uri !== 'string') {
    throw new Error(`Pump IPFS response missing metadata URI: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return uri;
}
