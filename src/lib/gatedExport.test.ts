// End-to-end export gate tests.
//
// These exercise the joints between layers: a denial must be audited, an
// unsigned export must not be permitted even when every other check passes, and
// a successful export must produce a signature over the real digest.

import { describe, expect, it } from 'vitest';
import { gatedExport, digestOf } from './gatedExport';
import { generateKeyPair, nodeSigner, verifySignature } from './signature';
import { verifyChain } from './auditLog';
import type { Principal } from './rbac';

const AT = '2026-11-24T19:00:00.000Z';
const officer: Principal = { sub: 'officer-1', roles: ['export_officer'] };
const engineer: Principal = { sub: 'eng-1', roles: ['engineer'] };

const req = (over: Partial<Parameters<typeof gatedExport>[0]> = {}) => ({
  principal: officer,
  digest: 'c'.repeat(64),
  controls: { destination: 'nato' as const, classification: 'ECL:ML' as const },
  mach: 3.5,
  ...over,
});

describe('happy path', () => {
  it('allows, signs, and audits a permitted export', async () => {
    const kp = await generateKeyPair();
    const out = await gatedExport(req(), {
      now: AT,
      twoPersonRequired: false,
      exporterSub: 'officer-1',
      signingKeyB64u: kp.privateKeyB64u,
    });

    expect(out.allowed).toBe(true);
    expect(out.signature).toBeTruthy();
    const v = await verifySignature(nodeSigner, out.signature!, req().digest);
    expect(v.valid, v.reason).toBe(true);
  });

  it('produces a clean audit chain', async () => {
    const kp = await generateKeyPair();
    const out = await gatedExport(req(), {
      now: AT,
      twoPersonRequired: false,
      exporterSub: 'officer-1',
      signingKeyB64u: kp.privateKeyB64u,
    });
    const chain = await verifyChain(out.audit);
    expect(chain.problems).toEqual([]);
    expect(out.audit.map((e) => e.action)).toEqual([
      'policy.decision',
      'policy.decision',
      'bundle.exported',
    ]);
  });

  it('signs the digest of the actual bundle bytes', async () => {
    const bytes = new TextEncoder().encode('pretend bundle');
    const digest = await digestOf(bytes);
    const kp = await generateKeyPair();
    const out = await gatedExport(req({ digest }), {
      now: AT,
      twoPersonRequired: false,
      exporterSub: 'officer-1',
      signingKeyB64u: kp.privateKeyB64u,
    });
    expect(out.signature!.digest).toBe(digest);
    expect((await verifySignature(nodeSigner, out.signature!, digest)).valid).toBe(true);
    // And it must NOT verify against a different bundle's digest.
    const other = await digestOf(new TextEncoder().encode('different bundle'));
    expect((await verifySignature(nodeSigner, out.signature!, other)).valid).toBe(false);
  });
});

describe('refusals are audited, not just returned', () => {
  it('denies and audits a principal without bundle:export', async () => {
    const kp = await generateKeyPair();
    const out = await gatedExport(req({ principal: engineer }), {
      now: AT,
      twoPersonRequired: false,
      exporterSub: 'eng-1',
      signingKeyB64u: kp.privateKeyB64u,
    });
    expect(out.allowed).toBe(false);
    expect(out.signature).toBeUndefined();
    expect(out.reasons[0]).toMatch(/lacks bundle:export/);
    expect(out.audit).toHaveLength(1);
    expect(out.audit[0].action).toBe('bundle.export.denied');
    expect(out.audit[0].outcome).toBe('deny');
    expect((await verifyChain(out.audit)).ok).toBe(true);
  });

  it('denies and audits a design the policy forbids', async () => {
    // The Phase 2 design point: Mach 5.5 under ECL:ML.
    const kp = await generateKeyPair();
    const out = await gatedExport(req({ mach: 5.5 }), {
      now: AT,
      twoPersonRequired: false,
      exporterSub: 'officer-1',
      signingKeyB64u: kp.privateKeyB64u,
    });
    expect(out.allowed).toBe(false);
    expect(out.reasons[0]).toMatch(/Mach limit/);
    expect(out.audit.at(-1)!.action).toBe('bundle.export.denied');
    expect(out.audit.at(-1)!.detail?.stage).toBe('policy');
  });

  it('denies when no signing key is configured', async () => {
    const out = await gatedExport(req(), { now: AT, twoPersonRequired: false, exporterSub: 'officer-1' });
    expect(out.allowed).toBe(false);
    expect(out.reasons[0]).toMatch(/unsigned export is not permitted/);
  });

  it('enforces two-person control at the signing stage', async () => {
    const kp = await generateKeyPair();
    const out = await gatedExport(req(), {
      now: AT,
      twoPersonRequired: true,
      exporterSub: 'officer-1', // same as the principal
      signingKeyB64u: kp.privateKeyB64u,
    });
    expect(out.allowed).toBe(false);
    expect(out.reasons[0]).toMatch(/two-person/);
  });

  it('checks permission BEFORE the policy', async () => {
    // An engineer exporting a sanctioned destination must be told about the
    // permission, not the destination: leaking policy detail to a principal who
    // may not export at all is an information disclosure.
    const kp = await generateKeyPair();
    const out = await gatedExport(
      req({ principal: engineer, controls: { destination: 'sanctioned', classification: 'ECL:ML' } }),
      { now: AT, twoPersonRequired: false, exporterSub: 'eng-1', signingKeyB64u: kp.privateKeyB64u },
    );
    expect(out.allowed).toBe(false);
    expect(out.reasons[0]).toMatch(/lacks bundle:export/);
    expect(out.reasons.join(' ')).not.toMatch(/sanctioned/);
  });
});
