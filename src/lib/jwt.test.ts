// JWT verification tests.
//
// The HMAC vector below is RFC 7515 Appendix A.1 verbatim, and the encoding
// checks use the RFC's own base64url examples. That matters: a hand-rolled JOSE
// implementation tested only against tokens it produced itself proves nothing.

import { describe, expect, it } from 'vitest';
import {
  base64UrlDecode,
  base64UrlEncode,
  b64uToFixed,
  selectKey,
  verifyJwt,
  type JwsAlgorithm,
  type JwtVerifierDeps,
} from './jwt';

// ── RFC 7515 Appendix A.1 ─────────────────────────────────────────────────────
// HMAC SHA-256 with this key and payload produces this exact signature.
const RFC_KEY = base64UrlDecode('AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow');
const RFC_TOKEN =
  'eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9' +
  '.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ' +
  '.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

describe('base64url', () => {
  it('matches the RFC 7515 example encoding', () => {
    expect(base64UrlEncode(new TextEncoder().encode('{"alg":"HS256"}'))).toBe('eyJhbGciOiJIUzI1NiJ9');
  });

  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect([...base64UrlDecode(base64UrlEncode(bytes))]).toEqual([...bytes]);
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base64UrlDecode('abc+def')).toThrow(/not base64url/);
    expect(() => base64UrlDecode('abc/def')).toThrow(/not base64url/);
  });

  it('left-pads integers to a fixed width', () => {
    // ES256 signatures are 64 bytes; a short big-endian integer must be padded,
    // not left short.
    expect(b64uToFixed(base64UrlEncode(new Uint8Array([1, 2])), 4)).toEqual(new Uint8Array([0, 0, 1, 2]));
  });
});

describe('RFC 7515 A.1 HMAC vector', () => {
  // A verifier that always returns true would pass a round-trip test. This one
  // has to accept a signature it did not produce.
  const deps: JwtVerifierDeps = {
    verifySignature: async (alg, input, sig) => {
      if (alg !== 'HS256') return false;
      const { createHmac } = await import('node:crypto');
      const expected = createHmac('sha256', RFC_KEY).update(input).digest();
      return expected.length === sig.length && expected.every((b, i) => b === sig[i]);
    },
  };

  it('accepts the signature from the RFC', async () => {
    const r = await verifyJwt(RFC_TOKEN, deps, {
      algorithms: ['HS256'],
      issuer: 'joe',
      nowSeconds: 1_300_000_000, // exp is 1300819380
    });
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.header.alg).toBe('HS256');
      expect(r.claims.iss).toBe('joe');
      expect(r.claims['http://example.com/is_root']).toBe(true);
    }
  });

  it('rejects the same token once it has expired', async () => {
    const r = await verifyJwt(RFC_TOKEN, deps, {
      algorithms: ['HS256'],
      issuer: 'joe',
      nowSeconds: 1_300_819_381,
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/expired/);
  });

  it('rejects a tampered payload', async () => {
    const parts = RFC_TOKEN.split('.');
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
    payload.iss = 'mallory';
    parts[1] = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const r = await verifyJwt(parts.join('.'), deps, {
      algorithms: ['HS256'],
      nowSeconds: 1_300_000_000,
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/signature does not verify/);
  });
});

describe('algorithm confusion is rejected', () => {
  // The attack: a token declares alg=none or alg=HS256, and a naive verifier
  // chooses the algorithm from the token. Both must be refused by the
  // allow-list before any crypto runs.
  const spy: JwtVerifierDeps = {
    verifySignature: (() => {
      throw new Error('crypto must not be reached');
    }) as unknown as JwtVerifierDeps['verifySignature'],
  };

  const make = (header: object) =>
    [
      base64UrlEncode(new TextEncoder().encode(JSON.stringify(header))),
      base64UrlEncode(new TextEncoder().encode(JSON.stringify({ exp: 9_999_999_999 }))),
      'c2ln',
    ].join('.');

  it('refuses alg=none even when the allow-list is otherwise permissive', async () => {
    const r = await verifyJwt(make({ alg: 'none', typ: 'JWT' }), spy, {
      algorithms: ['RS256', 'ES256'] as JwsAlgorithm[],
      nowSeconds: 1_300_000_000,
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/not accepted by this verifier/);
  });

  it('refuses an algorithm outside the pinned set', async () => {
    const r = await verifyJwt(make({ alg: 'HS256' }), spy, {
      algorithms: ['RS256'],
      nowSeconds: 1_300_000_000,
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/not accepted/);
  });

  it('refuses a token with no exp claim', async () => {
    // A token without exp never expires. Treating that as "no constraint" turns
    // every session into a permanent one.
    const token = [
      base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256' }))),
      base64UrlEncode(new TextEncoder().encode(JSON.stringify({ iss: 'x' }))),
      'c2ln',
    ].join('.');
    const ok: JwtVerifierDeps = { verifySignature: async () => true };
    const r = await verifyJwt(token, ok, { algorithms: ['HS256'], nowSeconds: 1_300_000_000 });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/no exp claim/);
  });

  it('refuses a malformed token', async () => {
    const ok: JwtVerifierDeps = { verifySignature: async () => true };
    expect((await verifyJwt('a.b', ok, { algorithms: ['HS256'] })).valid).toBe(false);
    expect((await verifyJwt('a.b.c.d', ok, { algorithms: ['HS256'] })).valid).toBe(false);
    const junk = await verifyJwt('!!!.@@@.###', ok, { algorithms: ['HS256'] });
    expect(junk.valid).toBe(false);
    if (!junk.valid) expect(junk.reason).toMatch(/not valid base64url JSON/);
  });
});

describe('claim validation', () => {
  const deps: JwtVerifierDeps = { verifySignature: async () => true };
  const token = (claims: object) =>
    [
      base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256' }))),
      base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims))),
      base64UrlEncode(new Uint8Array([1, 2, 3])),
    ].join('.');
  const now = 1_700_000_000;

  it('enforces issuer', async () => {
    const r = await verifyJwt(token({ exp: now + 60, iss: 'https://evil.example' }), deps, {
      algorithms: ['RS256'],
      issuer: 'https://idp.example',
      nowSeconds: now,
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/issuer/);
  });

  it('enforces audience, including the array form', async () => {
    const bad = await verifyJwt(token({ exp: now + 60, aud: ['other'] }), deps, {
      algorithms: ['RS256'],
      audience: 'aeroforge',
      nowSeconds: now,
    });
    expect(bad.valid).toBe(false);

    const good = await verifyJwt(token({ exp: now + 60, aud: ['other', 'aeroforge'] }), deps, {
      algorithms: ['RS256'],
      audience: 'aeroforge',
      nowSeconds: now,
    });
    expect(good.valid).toBe(true);
  });

  it('enforces nbf', async () => {
    const r = await verifyJwt(token({ exp: now + 60, nbf: now + 30 }), deps, {
      algorithms: ['RS256'],
      nowSeconds: now,
    });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/not valid before/);
  });

  it('applies clock skew only when asked', async () => {
    const claims = { exp: now - 10 };
    const strict = await verifyJwt(token(claims), deps, { algorithms: ['RS256'], nowSeconds: now });
    expect(strict.valid).toBe(false);
    const lenient = await verifyJwt(token(claims), deps, {
      algorithms: ['RS256'],
      nowSeconds: now,
      clockSkewSeconds: 30,
    });
    expect(lenient.valid).toBe(true);
  });
});

describe('key selection', () => {
  const jwks = {
    keys: [
      { kty: 'RSA', kid: 'a', use: 'sig', alg: 'RS256' },
      { kty: 'RSA', kid: 'b', use: 'sig', alg: 'RS256' },
      { kty: 'RSA', kid: 'c', use: 'enc' },
    ],
  };

  it('selects by kid', () => {
    expect(selectKey(jwks, 'b', 'RS256')?.kid).toBe('b');
  });

  it('ignores keys marked for encryption', () => {
    expect(selectKey(jwks, 'c', 'RS256')).toBeNull();
  });

  it('ignores keys for a different algorithm', () => {
    expect(selectKey({ keys: [{ kty: 'EC', kid: 'x', alg: 'ES256' }] }, 'x', 'RS256')).toBeNull();
  });

  it('refuses to guess when there is no kid and several keys', () => {
    // Guessing is how a key-rotation bug becomes "we accept tokens signed by a
    // retired key".
    expect(selectKey(jwks, undefined, 'RS256')).toBeNull();
  });

  it('uses the only key when the set is unambiguous', () => {
    expect(selectKey({ keys: [{ kty: 'RSA', kid: 'only' }] }, undefined, 'RS256')?.kid).toBe('only');
  });
});
