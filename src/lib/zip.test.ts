// A ZIP writer is only useful if other software can read it, so these tests
// check the bytes against the format definition and against known-good vectors
// rather than against my own assumptions.
//
// The strongest check here is the Python round-trip in
// `oracle/verify_bundle.py`, which opens the archive with the standard library.
// These tests cover the parts that can be checked in-process.

import { describe, expect, it } from 'vitest';
import { buildZip, crc32, sha256Hex, sha256HexFallback } from './zip';

const enc = new TextEncoder();

describe('crc32', () => {
  it('matches the standard check vector', () => {
    // The CRC-32 of "123456789" is 0xCBF43926 by definition of the algorithm.
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
  });

  it('is zero for empty input', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('sha256', () => {
  const vectors: [string, string][] = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ];

  for (const [input, expected] of vectors) {
    it(`FIPS 180-4 vector for "${input.slice(0, 12)}${input.length > 12 ? '…' : ''}"`, async () => {
      expect(await sha256Hex(enc.encode(input))).toBe(expected);
      // The pure fallback must agree, because it is what runs on insecure origins.
      expect(sha256HexFallback(enc.encode(input))).toBe(expected);
    });
  }

  it('handles input crossing a 64-byte block boundary', async () => {
    const long = 'a'.repeat(1000);
    expect(await sha256Hex(enc.encode(long))).toBe(sha256HexFallback(enc.encode(long)));
  });
});

describe('buildZip', () => {
  const zip = buildZip([
    { name: 'a.txt', data: 'hello' },
    { name: 'dir/b.json', data: '{"x":1}' },
  ]);

  it('starts with the local file header signature', () => {
    const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
  });

  it('ends with the end-of-central-directory record', () => {
    const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(dv.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(dv.getUint16(zip.length - 22 + 10, true)).toBe(2); // entry count
  });

  it('stores entry names as UTF-8 with the flag set', () => {
    const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(dv.getUint16(6, true) & 0x0800).toBe(0x0800);
  });

  it('is byte-identical for the same inputs (reproducible archives)', () => {
    const again = buildZip([
      { name: 'a.txt', data: 'hello' },
      { name: 'dir/b.json', data: '{"x":1}' },
    ]);
    expect([...again]).toEqual([...zip]);
  });

  it('rejects traversal in entry names', () => {
    expect(() => buildZip([{ name: '../evil.sh', data: 'x' }])).toThrow(/unsafe/);
    expect(() => buildZip([{ name: '/etc/passwd', data: 'x' }])).toThrow(/unsafe/);
  });

  it('handles an empty archive', () => {
    const empty = buildZip([]);
    const dv = new DataView(empty.buffer, empty.byteOffset, empty.byteLength);
    expect(empty.length).toBe(22);
    expect(dv.getUint32(0, true)).toBe(0x06054b50);
    expect(dv.getUint16(8, true)).toBe(0);
  });

  it('records the correct CRC in the local header', () => {
    const single = buildZip([{ name: 'x', data: '123456789' }]);
    const dv = new DataView(single.buffer, single.byteOffset, single.byteLength);
    expect(dv.getUint32(14, true)).toBe(0xcbf43926);
  });
});
