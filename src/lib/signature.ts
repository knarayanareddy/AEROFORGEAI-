// Ed25519 signing for CEP bundles.
//
// Design constraint: this repository is meant to stay buildable without a
// backend, so signing has to work in two very different places — a browser
// (WebCrypto) and CI (Node). Both are behind one interface, and a test asserts
// they interoperate with the same key material.
//
// What a signature proves: the bundle bytes were signed by the holder of the
// private key. What it does NOT prove: who that holder is. Identity comes from
// the key distribution channel (a pinned public key shipped with the verifier),
// not from the signature. docs/phase-4.md says so in the same words.

export interface Ed25519KeyPair {
  /** Raw 32-byte public key, base64url. */
  publicKeyB64u: string;
  /** Raw 32-byte private key seed, base64url. NEVER log or commit this. */
  privateKeyB64u: string;
}

export interface SignerDeps {
  /** Sign `message` with the raw private key seed. */
  sign: (message: Uint8Array, privateKey: Uint8Array) => Promise<Uint8Array>;
  /** Verify `signature` over `message` with the raw public key. */
  verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => Promise<boolean>;
}

// ── WebCrypto / Node WebCrypto ───────────────────────────────────────────────

/**
 * Copy into a plain ArrayBuffer.
 *
 * TypeScript's DOM types require BufferSource backed by a non-shared ArrayBuffer;
 * a Uint8Array produced by a slice can be typed as ArrayBufferLike. Copying is a
 * 32-byte operation here and removes the whole class of typing friction.
 */
function buf(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.length);
  new Uint8Array(out).set(u);
  return out;
}

const subtle = (): SubtleCrypto => {
  const s = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!s) throw new Error('WebCrypto subtle is unavailable in this environment');
  return s;
};

/** Wrap a raw 32-byte key in the SPKI/PKCS8 envelope WebCrypto requires. */
function spkiFromRaw(raw: Uint8Array): Uint8Array {
  const prefix = new Uint8Array([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ]);
  const out = new Uint8Array(prefix.length + raw.length);
  out.set(prefix);
  out.set(raw, prefix.length);
  return out;
}

function pkcs8FromRaw(raw: Uint8Array): Uint8Array {
  const prefix = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);
  const out = new Uint8Array(prefix.length + raw.length);
  out.set(prefix);
  out.set(raw, prefix.length);
  return out;
}

export const webCryptoSigner: SignerDeps = {
  async sign(message, privateKey) {
    const key = await subtle().importKey('pkcs8', buf(pkcs8FromRaw(privateKey)), { name: 'Ed25519' }, false, [
      'sign',
    ]);
    return new Uint8Array(await subtle().sign({ name: 'Ed25519' }, key, buf(message)));
  },
  async verify(message, signature, publicKey) {
    try {
      const key = await subtle().importKey('spki', buf(spkiFromRaw(publicKey)), { name: 'Ed25519' }, false, [
        'verify',
      ]);
      return await subtle().verify({ name: 'Ed25519' }, key, buf(signature), buf(message));
    } catch {
      return false;
    }
  },
};

// ── Node crypto (used by CI scripts, where WebCrypto may be absent) ──────────

export const nodeSigner: SignerDeps = {
  async sign(message, privateKey) {
    const { createPrivateKey, sign } = await import('node:crypto');
    const der = Buffer.from(pkcs8FromRaw(privateKey));
    const key = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    return new Uint8Array(sign(null, message, key));
  },
  async verify(message, signature, publicKey) {
    const { createPublicKey, verify } = await import('node:crypto');
    const der = Buffer.from(spkiFromRaw(publicKey));
    const key = createPublicKey({ key: der, format: 'der', type: 'spki' });
    return verify(null, message, key, signature);
  },
};

/** Generate a key pair. Browser; also works in Node 20 via WebCrypto. */
export async function generateKeyPair(): Promise<Ed25519KeyPair> {
  const kp = (await subtle().generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pub = new Uint8Array(await subtle().exportKey('raw', kp.publicKey));
  const priv = new Uint8Array(await subtle().exportKey('pkcs8', kp.privateKey));
  // Strip the 16-byte PKCS8 prefix to get the raw seed back.
  return {
    publicKeyB64u: toB64u(pub),
    privateKeyB64u: toB64u(priv.slice(16)),
  };
}

function toB64u(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64u(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// ── Bundle signatures ────────────────────────────────────────────────────────

export interface SignatureBlock {
  alg: 'Ed25519';
  /** base64url raw public key. */
  publicKey: string;
  /** base64url signature over the bundle digest. */
  signature: string;
  /** sha256 of the zip bytes, so the signature is over the hash not the file. */
  digest: string;
  signedAt: string;
  /** Free-form, but recorded in the manifest so it is part of what was signed. */
  signer?: string;
}

export function encodePublicKey(kp: Ed25519KeyPair): string {
  return kp.publicKeyB64u;
}

export function encodePrivateKey(kp: Ed25519KeyPair): string {
  return kp.privateKeyB64u;
}

/**
 * Sign a bundle digest.
 *
 * The message covered by the signature is the DIGEST, not the archive: a 5 MB
 * archive is hashed once, and the signed message stays 32 bytes. This also means
 * the signature can be verified without the archive present, provided the digest
 * is trusted.
 */
export async function signDigest(
  deps: SignerDeps,
  digestHex: string,
  privateKeyB64u: string,
  signedAt: string,
  signer?: string,
): Promise<SignatureBlock> {
  const { sha256Hex } = await import('./zip');
  const priv = fromB64u(privateKeyB64u);
  const message = new TextEncoder().encode(digestHex);
  const sig = await deps.sign(message, priv);

  // Derive the public key from the seed so callers cannot accidentally sign with
  // one key and advertise another.
  const { createPrivateKey, createPublicKey } = await import('node:crypto');
  let publicKeyB64u: string;
  try {
    const privKey = createPrivateKey({
      key: Buffer.from(pkcs8FromRaw(priv)),
      format: 'der',
      type: 'pkcs8',
    });
    const raw = createPublicKey(privKey).export({ type: 'spki', format: 'der' }).subarray(-32);
    publicKeyB64u = toB64u(new Uint8Array(raw));
  } catch {
    throw new Error('signDigest: could not derive the public key from the private key seed');
  }

  void sha256Hex;
  return {
    alg: 'Ed25519',
    publicKey: publicKeyB64u,
    signature: toB64u(sig),
    digest: digestHex,
    signedAt,
    signer,
  };
}

/**
 * Verify a signature block.
 *
 * Re-checks that the digest in the block matches `expectedDigest` before doing
 * any crypto: a valid signature over the wrong digest is a valid signature over
 * nothing the caller cares about.
 */
export async function verifySignature(
  deps: SignerDeps,
  block: SignatureBlock,
  expectedDigest: string,
): Promise<{ valid: boolean; reason: string }> {
  if (block.alg !== 'Ed25519') return { valid: false, reason: `unsupported algorithm ${block.alg}` };
  if (block.digest !== expectedDigest) {
    return { valid: false, reason: 'signature block covers a different digest than the bundle' };
  }
  try {
    const ok = await deps.verify(
      new TextEncoder().encode(block.digest),
      fromB64u(block.signature),
      fromB64u(block.publicKey),
    );
    return ok ? { valid: true, reason: 'signature verifies' } : { valid: false, reason: 'signature does not verify' };
  } catch (e) {
    return { valid: false, reason: `verification error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
