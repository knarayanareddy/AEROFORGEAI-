// Minimal ZIP writer (PKWARE APPNOTE 6.3, "stored" method only).
//
// The Phase 1 CEP bundle needs to be a single downloadable artifact, and the
// browser has no built-in ZIP. `fflate`/`jszip` would be a dependency; the
// format we need is small enough to write directly (stored, no compression) and
// writing it here keeps the single-file Vite build free of extra bytes.
//
// Deliberately NOT implemented: compression (method 8), ZIP64, encryption,
// multi-disk. A CEP bundle is a handful of small text files, so stored entries
// are the right call; the limits are stated in `assertSupported`.

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  name: string;
  /** UTF-8 text or raw bytes. */
  data: string | Uint8Array;
  /** Optional fixed modification time; defaults to a constant for reproducibility. */
  mtime?: Date;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

function toBytes(d: string | Uint8Array): Uint8Array {
  return typeof d === 'string' ? encoder.encode(d) : d;
}

/**
 * Reproducible DOS timestamp.
 *
 * ZIP stores a 2-second-resolution local time with no timezone. Using
 * `new Date()` makes every archive byte-different, which breaks content hashing
 * — so the default is a fixed instant and callers can override it.
 */
const DEFAULT_MTIME = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

function dosDateTime(d: Date): { time: number; date: number } {
  const time =
    (Math.floor(d.getSeconds() / 2) & 0x1f) |
    ((d.getMinutes() & 0x3f) << 5) |
    ((d.getHours() & 0x1f) << 11);
  const date =
    (d.getDate() & 0x1f) |
    (((d.getMonth() + 1) & 0x0f) << 5) |
    ((Math.max(0, d.getFullYear() - 1980) & 0x7f) << 9);
  return { time, date };
}

function assertSupported(entry: ZipEntry, bytes: Uint8Array): void {
  if (entry.name.startsWith('/') || entry.name.includes('..')) {
    throw new Error(`zip: unsafe entry name "${entry.name}"`);
  }
  // `stored` means no compression, so an entry can never shrink; the only limit
  // that matters is the 32-bit size fields.
  if (bytes.length > 0xffffffff) {
    throw new Error(`zip: entry "${entry.name}" exceeds 4 GiB (ZIP64 not implemented)`);
  }
}

interface CentralRecord {
  nameBytes: Uint8Array;
  crc: number;
  size: number;
  offset: number;
  time: number;
  date: number;
}

/**
 * Build a ZIP archive.
 *
 * Returns bytes plus, for each entry, the sha256 the caller can publish in a
 * manifest. Hashing is done by the caller (WebCrypto is async); this function
 * stays synchronous so it is trivial to test.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const central: CentralRecord[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = toBytes(entry.data);
    assertSupported(entry, data);

    const crc = crc32(data);
    const { time, date } = dosDateTime(entry.mtime ?? DEFAULT_MTIME);

    // Local file header: 30 bytes + name.
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // flags: UTF-8 names
    lv.setUint16(8, 0, true); // method: stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // compressed size == size
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);

    locals.push(local, data);
    central.push({ nameBytes, crc, size: data.length, offset, time, date });
    offset += local.length + data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  const centralParts: Uint8Array[] = [];

  for (const rec of central) {
    const c = new Uint8Array(46 + rec.nameBytes.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8
    cv.setUint16(10, 0, true); // stored
    cv.setUint16(12, rec.time, true);
    cv.setUint16(14, rec.date, true);
    cv.setUint32(16, rec.crc, true);
    cv.setUint32(20, rec.size, true);
    cv.setUint32(24, rec.size, true);
    cv.setUint16(28, rec.nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra
    cv.setUint16(32, 0, true); // comment
    cv.setUint16(34, 0, true); // disk
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, rec.offset, true);
    c.set(rec.nameBytes, 46);
    centralParts.push(c);
    centralSize += c.length;
  }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);

  const parts = [...locals, ...centralParts, end];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ── SHA-256 ──────────────────────────────────────────────────────────────────

/**
 * Hex SHA-256 of bytes.
 *
 * Prefers WebCrypto (`crypto.subtle`). It is unavailable on insecure origins and
 * in some Node versions, so there is a pure fallback — a manifest that silently
 * omits hashes would defeat the point of a manifest.
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    // Copy into a fresh ArrayBuffer: the DOM types want a BufferSource whose
    // backing store is not a SharedArrayBuffer view.
    const buf = new Uint8Array(data.length);
    buf.set(data);
    const digest = await subtle.digest('SHA-256', buf.buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return fallbackSha256(data);
}

// ── Pure-JS SHA-256 (FIPS 180-4), used only when WebCrypto is absent ─────────

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function fallbackSha256(data: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  // 64-bit big-endian length; the high word is zero for anything under 512 MiB.
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  const pv = new DataView(padded.buffer);
  pv.setUint32(padded.length - 8, hi);
  pv.setUint32(padded.length - 4, lo);

  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = pv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  return [...h].map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** Exposed for tests: force the fallback path regardless of WebCrypto. */
export function sha256HexFallback(data: Uint8Array): string {
  return fallbackSha256(data);
}
