// OIDC token → Principal, wired to real crypto.
//
// `jwt.ts` is the format and claims layer with injected crypto. This module
// supplies the crypto from WebCrypto and maps validated claims onto the RBAC
// roles, so the whole path is testable end to end with a locally generated key.
//
// It does NOT fetch a discovery document or a JWKS over the network. That is a
// deliberate boundary, not an omission: a static front-end cannot be trusted to
// choose its own issuer at runtime, and a discovery fetch in the browser is a
// TOFU problem dressed as integration. The JWKS is passed in by the deployment.

import { base64UrlEncode, b64uToFixed, selectKey, verifyJwt, type JwtClaims, type Jwks, type JwsAlgorithm } from './jwt';
import type { Principal, Role } from './rbac';

export interface OidcConfig {
  issuer: string;
  audience: string;
  jwks: Jwks;
  /** Which claim carries roles. Defaults to 'roles'. */
  rolesClaim?: string;
}

export interface OidcResult {
  ok: boolean;
  principal?: Principal;
  claims?: JwtClaims;
  reason?: string;
}

const KNOWN_ROLES = new Set<Role>(['viewer', 'engineer', 'reviewer', 'export_officer', 'admin']);

/**
 * Verify a token and derive the principal.
 *
 * Unknown role strings are DROPPED, not passed through. An identity provider
 * that starts emitting 'superuser' must not silently acquire whatever the
 * application might later attach to that name.
 */
export async function authenticate(token: string, cfg: OidcConfig, nowSeconds?: number): Promise<OidcResult> {
  const alg: JwsAlgorithm = 'RS256';
  const rolesClaim = cfg.rolesClaim ?? 'roles';

  const r = await verifyJwt(
    token,
    {
      verifySignature: async (a, signingInput, sig, kid) => {
        const key = selectKey(cfg.jwks, kid, a);
        if (!key) return false;
        if (a === 'RS256') return verifyRsa(signingInput, sig, key);
        if (a === 'ES256') return verifyP256(signingInput, sig, key);
        return false;
      },
    },
    { issuer: cfg.issuer, audience: cfg.audience, algorithms: [alg], nowSeconds },
  );

  if (!r.valid) return { ok: false, reason: r.reason };

  const raw = r.claims[rolesClaim];
  const roles = (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [])
    .filter((x): x is string => typeof x === 'string')
    .filter((x): x is Role => KNOWN_ROLES.has(x as Role));

  if (!r.claims.sub) return { ok: false, reason: 'token has no sub claim' };

  return { ok: true, principal: { sub: r.claims.sub, roles }, claims: r.claims };
}

async function verifyRsa(signingInput: Uint8Array, sig: Uint8Array, key: { n?: string; e?: string }): Promise<boolean> {
  if (!key.n || !key.e) return false;
  // 2048-bit modulus; b64u values may be shorter if leading zeros were stripped.
  const n = b64uToFixed(key.n, 256);
  const e = b64uToFixed(key.e, 3);
  const jwk: JsonWebKey = {
    kty: 'RSA',
    n: b64u(n),
    e: b64u(e),
    alg: 'RS256',
    ext: true,
  };
  const k = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, toBuf(sig), toBuf(signingInput));
}

async function verifyP256(signingInput: Uint8Array, sig: Uint8Array, key: { x?: string; y?: string }): Promise<boolean> {
  if (!key.x || !key.y) return false;
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x: key.x, y: key.y, ext: true };
  const k = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  // JOSE ECDSA signatures are raw r||s; WebCrypto wants exactly that for P-256.
  if (sig.length !== 64) return false;
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, toBuf(sig), toBuf(signingInput));
}

function b64u(bytes: Uint8Array): string {
  return base64UrlEncode(bytes);
}

function toBuf(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.length);
  new Uint8Array(out).set(u);
  return out;
}
