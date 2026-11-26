// Minimal, dependency-free JOSE verification for the P4 OIDC layer.
//
// Scope is deliberately narrow: verify a compact JWS serialised token, check the
// standard claims, and support exactly the two algorithms an OIDC identity
// provider will actually hand you — RS256 (the common case) and ES256 (used by
// providers that prefer P-256). Symmetric HS256 is bounded to tests: accepting
// it from a network peer is the classic algorithm-confusion vulnerability.
//
// This is not a general JOSE library and does not try to be. It exists so the
// auth layer's core claim — "this token was signed by this key and is still
// valid" — can be tested against RFC 7515/7519 vectors rather than trusted
// because a helper function said so.

export type JwsAlgorithm = 'RS256' | 'ES256' | 'HS256';

export interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

export interface JwtClaims {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [k: string]: unknown;
}

export interface VerifyOptions {
  /** Expected issuer; compared exactly when present. */
  issuer?: string;
  /** Expected audience; matches if any audience entry equals it. */
  audience?: string;
  /** Verification time in seconds since the epoch. Defaults to now. */
  nowSeconds?: number;
  /** Seconds of leeway allowed on exp/nbf. Defaults to 0 — see note below. */
  clockSkewSeconds?: number;
  /**
   * Algorithms the caller is willing to accept.
   *
   * Required, with no default, because 'alg' is attacker-controlled. A verifier
   * that reads the algorithm from the token and trusts it will happily verify an
   * 'HS256' token using the RSA public key as an HMAC secret. That is the
   * algorithm-confusion attack, and requiring the caller to pin the set removes
   * the choice from the attacker.
   */
  algorithms: JwsAlgorithm[];
}

export type VerifyResult =
  | { valid: true; header: JwtHeader; claims: JwtClaims }
  | { valid: false; reason: string };

// ── base64url ────────────────────────────────────────────────────────────────

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('not base64url');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function decodeJson<T>(s: string): T {
  const text = new TextDecoder().decode(base64UrlDecode(s));
  return JSON.parse(text) as T;
}

// ── verification ─────────────────────────────────────────────────────────────

/** What the verifier needs to know about the world. Injected, so it is testable. */
export interface JwtVerifierDeps {
  /**
   * Verify a signature. Returns true only if the signing input verifies under
   * the key.
   */
  verifySignature: (alg: JwsAlgorithm, signingInput: Uint8Array, sig: Uint8Array, kid?: string) => Promise<boolean>;
}

export async function verifyJwt(
  token: string,
  deps: JwtVerifierDeps,
  opts: VerifyOptions,
): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'token is not a compact JWS (expected 3 parts)' };

  const [headerB64, payloadB64, sigB64] = parts;

  let header: JwtHeader;
  let claims: JwtClaims;
  try {
    header = decodeJson<JwtHeader>(headerB64);
    claims = decodeJson<JwtClaims>(payloadB64);
  } catch {
    return { valid: false, reason: 'header or payload is not valid base64url JSON' };
  }

  if (!header || typeof header.alg !== 'string') {
    return { valid: false, reason: 'header has no alg' };
  }

  // The caller's allow-list is checked BEFORE the signature, so an unexpected
  // algorithm never reaches the crypto layer at all.
  if (!opts.algorithms.includes(header.alg as JwsAlgorithm)) {
    return { valid: false, reason: `algorithm '${header.alg}' is not accepted by this verifier` };
  }
  const alg = header.alg as JwsAlgorithm;

  // 'none' never reaches here: it cannot be in the caller's allow-list type,
  // and any string outside the list was already rejected above.

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  let sig: Uint8Array;
  try {
    sig = base64UrlDecode(sigB64);
  } catch {
    return { valid: false, reason: 'signature is not base64url' };
  }

  let ok: boolean;
  try {
    ok = await deps.verifySignature(alg, signingInput, sig, header.kid);
  } catch (e) {
    return { valid: false, reason: `signature verification failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!ok) return { valid: false, reason: 'signature does not verify' };

  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const skew = opts.clockSkewSeconds ?? 0;

  // exp is REQUIRED. A token with no expiry is a token that is valid forever,
  // and treating a missing exp as "no constraint" is how sessions silently
  // become permanent.
  if (typeof claims.exp !== 'number') {
    return { valid: false, reason: 'token has no exp claim; an unbounded token is not accepted' };
  }
  if (now - skew >= claims.exp) {
    return { valid: false, reason: `token expired at ${claims.exp} (now ${now})` };
  }
  if (typeof claims.nbf === 'number' && now + skew < claims.nbf) {
    return { valid: false, reason: `token not valid before ${claims.nbf} (now ${now})` };
  }
  if (opts.issuer !== undefined && claims.iss !== opts.issuer) {
    return { valid: false, reason: `issuer '${claims.iss}' does not match '${opts.issuer}'` };
  }
  if (opts.audience !== undefined) {
    const aud = claims.aud;
    const list = Array.isArray(aud) ? aud : aud === undefined ? [] : [aud];
    if (!list.includes(opts.audience)) {
      return { valid: false, reason: `audience ${JSON.stringify(aud)} does not include '${opts.audience}'` };
    }
  }

  return { valid: true, header, claims };
}

// ── key handling ─────────────────────────────────────────────────────────────

export interface Jwk {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string; // RSA modulus, base64url
  e?: string; // RSA exponent, base64url
  crv?: string; // EC curve
  x?: string;
  y?: string;
}

export interface Jwks {
  keys: Jwk[];
}

/**
 * Pick the key for a token.
 *
 * `kid` is matched when the token carries one and a key declares it. When the
 * token has no kid and the set has exactly one key, that key is used; otherwise
 * it is ambiguous and this refuses rather than guessing. Guessing is how a
 * rotation bug turns into accepting a token signed by a retired key.
 */
export function selectKey(jwks: Jwks, kid?: string, alg?: string): Jwk | null {
  const usable = jwks.keys.filter((k) => {
    if (k.use !== undefined && k.use !== 'sig') return false;
    if (k.alg !== undefined && alg !== undefined && k.alg !== alg) return false;
    return true;
  });
  if (kid !== undefined) {
    return usable.find((k) => k.kid === kid) ?? null;
  }
  return usable.length === 1 ? usable[0] : null;
}

/** Convert a base64url big-endian integer to bytes, left-padded to `len`. */
export function b64uToFixed(bytes: string, len: number): Uint8Array {
  const raw = base64UrlDecode(bytes);
  if (raw.length === len) return raw;
  if (raw.length > len) return raw.slice(raw.length - len);
  const out = new Uint8Array(len);
  out.set(raw, len - raw.length);
  return out;
}
