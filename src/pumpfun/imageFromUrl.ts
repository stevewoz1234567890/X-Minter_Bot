/** Minimal valid1×1 PNG (transparent) when remote image fetch fails. */
const TINY_PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

export async function fetchImageForPump(logoUrl: string | null): Promise<{
  bytes: Uint8Array;
  fileName: string;
  mime: string;
}> {
  if (!logoUrl) {
    return { bytes: TINY_PNG, fileName: 'token.png', mime: 'image/png' };
  }
  try {
    const res = await fetch(logoUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.length) throw new Error('empty body');
    const ext =
      mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('gif')
            ? 'gif'
            : 'png';
    return { bytes: buf, fileName: `token.${ext}`, mime };
  } catch {
    return { bytes: TINY_PNG, fileName: 'token.png', mime: 'image/png' };
  }
}
