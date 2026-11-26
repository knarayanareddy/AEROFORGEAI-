// Ed25519 signing tests.
//
// The interop test is the important one: a signature produced by the Node path
// must verify under the WebCrypto path and vice versa, with the same raw key
// bytes. Without that, "works in CI" and "works in the browser" are two
// unrelated claims.

import { describe, expect, it } from 'vitest';
import {
  generateKeyPair,
  nodeSigner,
  signDigest,
  verifySignature,
  webCryptoSigner,
  type SignatureBlock,
  type SignerDeps,
} from './signature';

const AT = '2026-11-24T18:30:00.000Z';

const DIGEST = 'a'.repeat(64);

describe('signing under one implementation', () => {
  it('round-trips with the Node signer', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT, 'ci');
    const v = await verifySignature(nodeSigner, block, DIGEST);
    expect(v.valid).toBe(true);
  });

  it('round-trips with the WebCrypto signer', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(webCryptoSigner, DIGEST, kp.privateKeyB64u, AT, 'browser');
    const v = await verifySignature(webCryptoSigner, block, DIGEST);
    expect(v.valid).toBe(true);
  });
});

describe('cross-implementation interop', () => {
  it('a Node signature verifies under WebCrypto', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT);
    const v = await verifySignature(webCryptoSigner, block, DIGEST);
    expect(v.valid, v.reason).toBe(true);
  });

  it('a WebCrypto signature verifies under Node', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(webCryptoSigner, DIGEST, kp.privateKeyB64u, AT);
    const v = await verifySignature(nodeSigner, block, DIGEST);
    expect(v.valid, v.reason).toBe(true);
  });
});

describe('rejection cases', () => {
  it('rejects a modified digest', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT);
    const v = await verifySignature(nodeSigner, block, 'b'.repeat(64));
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/different digest/);
  });

  it('rejects a signature from a different key', async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, a.privateKeyB64u, AT);
    // Swap in b's public key: the maths must fail.
    const forged: SignatureBlock = { ...block, publicKey: b.publicKeyB64u };
    const v = await verifySignature(nodeSigner, forged, DIGEST);
    expect(v.valid).toBe(false);
  });

  it('rejects corrupted signature bytes', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT);
    const bytes = block.signature.split('');
    bytes[0] = bytes[0] === 'A' ? 'B' : 'A';
    const v = await verifySignature(nodeSigner, { ...block, signature: bytes.join('') }, DIGEST);
    expect(v.valid).toBe(false);
  });

  it('rejects an unsupported algorithm', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT);
    const v = await verifySignature(nodeSigner, { ...block, alg: 'RS256' as SignatureBlock['alg'] }, DIGEST);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/unsupported algorithm/);
  });

  it('rejects when the verifier itself throws', async () => {
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT);
    const broken: SignerDeps = {
      sign: async () => new Uint8Array(),
      verify: async () => {
        throw new Error('provider exploded');
      },
    };
    const v = await verifySignature(broken, block, DIGEST);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/provider exploded/);
  });
});

describe('key handling', () => {
  it('derives the advertised public key from the private seed', async () => {
    // Signing with key A must never produce a block advertising key B. The
    // public key is derived, not passed in.
    const kp = await generateKeyPair();
    const block = await signDigest(nodeSigner, DIGEST, kp.privateKeyB64u, AT);
    expect(block.publicKey).toBe(kp.publicKeyB64u);
  });

  it('generates distinct key pairs', async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    expect(a.publicKeyB64u).not.toBe(b.publicKeyB64u);
    expect(a.privateKeyB64u).not.toBe(b.privateKeyB64u);
  });

  it('produces 32-byte raw keys', async () => {
    const kp = await generateKeyPair();
    // base64url of 32 bytes is 43 chars.
    expect(kp.publicKeyB64u).toHaveLength(43);
    expect(kp.privateKeyB64u).toHaveLength(43);
  });
});
