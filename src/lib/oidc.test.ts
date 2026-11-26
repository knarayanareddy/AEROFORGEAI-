// OIDC end-to-end tests with a locally generated RSA key.
//
// These mint genuine RS256 tokens with Node's crypto and run them through the
// full path: signature, claims, role mapping. No stubs in the crypto.

import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { authenticate, type OidcConfig } from './oidc';
import { base64UrlEncode } from './jwt';

const ISS = 'https://idp.example';
const AUD = 'aeroforge';
const NOW = 1_800_000_000;

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' }) as { n: string; e: string };

const cfg: OidcConfig = {
  issuer: ISS,
  audience: AUD,
  jwks: { keys: [{ kty: 'RSA', kid: 'k1', use: 'sig', alg: 'RS256', n: jwk.n, e: jwk.e }] },
};

function mint(claims: Record<string, unknown>, header: Record<string, unknown> = { alg: 'RS256', kid: 'k1' }) {
  const h = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const p = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const input = `${h}.${p}`;
  const s = createSign('RSA-SHA256');
  s.update(input);
  const sig = s.sign(privateKey);
  return `${input}.${base64UrlEncode(new Uint8Array(sig))}`;
}

const base = { iss: ISS, aud: AUD, exp: NOW + 300, sub: 'user-42', roles: ['engineer'] };

describe('valid tokens', () => {
  it('authenticates and maps roles', async () => {
    const r = await authenticate(mint(base), cfg, NOW);
    expect(r.ok, r.reason).toBe(true);
    expect(r.principal).toEqual({ sub: 'user-42', roles: ['engineer'] });
  });

  it('accepts an audience array containing the expected value', async () => {
    const r = await authenticate(mint({ ...base, aud: ['other', AUD] }), cfg, NOW);
    expect(r.ok, r.reason).toBe(true);
  });

  it('accepts a single string role claim', async () => {
    const r = await authenticate(mint({ ...base, roles: 'reviewer' }), cfg, NOW);
    expect(r.ok).toBe(true);
    expect(r.principal!.roles).toEqual(['reviewer']);
  });
});

describe('role mapping refuses to invent authority', () => {
  it('drops unknown roles instead of passing them through', async () => {
    const r = await authenticate(mint({ ...base, roles: ['engineer', 'superuser'] }), cfg, NOW);
    expect(r.ok).toBe(true);
    expect(r.principal!.roles).toEqual(['engineer']);
  });

  it('yields no roles when the claim is absent', async () => {
    const r = await authenticate(mint({ ...base, roles: undefined }), cfg, NOW);
    expect(r.ok).toBe(true);
    expect(r.principal!.roles).toEqual([]);
  });

  it('yields no roles when the claim is the wrong type', async () => {
    const r = await authenticate(mint({ ...base, roles: 42 }), cfg, NOW);
    expect(r.principal!.roles).toEqual([]);
  });
});

describe('rejections', () => {
  it('rejects a token signed by another key', async () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const h = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', kid: 'k1' })));
    const p = base64UrlEncode(new TextEncoder().encode(JSON.stringify(base)));
    const s = createSign('RSA-SHA256');
    s.update(`${h}.${p}`);
    const token = `${h}.${p}.${base64UrlEncode(new Uint8Array(s.sign(other.privateKey)))}`;
    const r = await authenticate(token, cfg, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/signature does not verify|not accepted/);
  });

  it('rejects an unknown kid', async () => {
    const r = await authenticate(mint(base, { alg: 'RS256', kid: 'nope' }), cfg, NOW);
    expect(r.ok).toBe(false);
  });

  it('rejects a token with no kid when the JWKS has several keys', async () => {
    const twoKeys: OidcConfig = {
      ...cfg,
      jwks: { keys: [cfg.jwks.keys[0], { ...cfg.jwks.keys[0], kid: 'k2' }] },
    };
    const r = await authenticate(mint(base, { alg: 'RS256' }), twoKeys, NOW);
    expect(r.ok).toBe(false);
  });

  it('rejects an expired token', async () => {
    const r = await authenticate(mint({ ...base, exp: NOW - 1 }), cfg, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/expired/);
  });

  it('rejects a wrong issuer', async () => {
    const r = await authenticate(mint({ ...base, iss: 'https://evil.example' }), cfg, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/issuer/);
  });

  it('rejects a wrong audience', async () => {
    const r = await authenticate(mint({ ...base, aud: 'someone-else' }), cfg, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/audience/);
  });

  it('rejects alg=none before touching crypto', async () => {
    const h = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'none' })));
    const p = base64UrlEncode(new TextEncoder().encode(JSON.stringify(base)));
    const r = await authenticate(`${h}.${p}.`, cfg, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not accepted/);
  });

  it('rejects a token with no sub', async () => {
    const r = await authenticate(mint({ ...base, sub: undefined }), cfg, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no sub/);
  });
});
