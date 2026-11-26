// Audit chain tests.
//
// The interesting cases are the tampering ones. An append-and-verify test only
// proves the hash function is deterministic; it does not prove the chain
// detects modification, which is the entire point of the structure.

import { describe, expect, it } from 'vitest';
import { AuditLog, GENESIS_HASH, stableJson, verifyChain, type AuditEntry } from './auditLog';

const AT = '2026-11-24T18:00:00.000Z';
const actor = { sub: 'user-123', issuer: 'https://idp.example' };

async function sample(): Promise<AuditLog> {
  const log = new AuditLog();
  await log.append({ action: 'auth.token.verified', actor, subject: 'session', outcome: 'allow', at: AT });
  await log.append({
    action: 'policy.decision',
    actor,
    subject: 'wedge:theta=10',
    outcome: 'deny',
    detail: { control: 'ECL:ML', reason: 'Mach 5.5 exceeds ECL:ML limit 4.0' },
    at: AT,
  });
  await log.append({ action: 'bundle.export.denied', actor, subject: 'bundle.zip', outcome: 'deny', at: AT });
  return log;
}

describe('chain construction', () => {
  it('starts from the genesis hash', async () => {
    const log = new AuditLog();
    expect(log.head).toBe(GENESIS_HASH);
    const e = await log.append({ action: 'case.run', actor, subject: 'x', outcome: 'allow', at: AT });
    expect(e.seq).toBe(0);
    expect(e.prev).toBe(GENESIS_HASH);
  });

  it('links each entry to its predecessor', async () => {
    const log = await sample();
    const entries = log.toArray();
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].prev).toBe(entries[i - 1].hash);
    }
    expect(log.head).toBe(entries[entries.length - 1].hash);
  });

  it('verifies a clean chain', async () => {
    const log = await sample();
    const v = await verifyChain(log.toArray());
    expect(v.problems).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('does not depend on object key insertion order', () => {
    expect(stableJson({ b: 1, a: 2 })).toBe(stableJson({ a: 2, b: 1 }));
    expect(stableJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(stableJson({ a: [1, { z: 1, y: 2 }] })).toBe('{"a":[1,{"y":2,"z":1}]}');
  });

  it('hands out copies, so callers cannot mutate the chain', async () => {
    const log = await sample();
    const arr = log.toArray();
    arr[0].hash = 'tampered';
    expect((await verifyChain(log.toArray())).ok).toBe(true);
  });
});

describe('tamper detection', () => {
  it('detects an edited entry', async () => {
    const log = await sample();
    const entries = log.toArray();
    entries[1].outcome = 'allow'; // flip a denial to an allow
    const v = await verifyChain(entries);
    expect(v.ok).toBe(false);
    expect(v.problems.some((p) => p.kind === 'hash' && p.seq === 1)).toBe(true);
  });

  it('detects a deleted entry', async () => {
    const log = await sample();
    const entries = log.toArray();
    entries.splice(1, 1); // remove the denial
    const v = await verifyChain(entries);
    expect(v.ok).toBe(false);
    // Both the sequence number and the link are now wrong.
    expect(v.problems.some((p) => p.kind === 'seq')).toBe(true);
    expect(v.problems.some((p) => p.kind === 'prev')).toBe(true);
  });

  it('detects reordering', async () => {
    const log = await sample();
    const entries = log.toArray();
    [entries[1], entries[2]] = [entries[2], entries[1]];
    expect((await verifyChain(entries)).ok).toBe(false);
  });

  it('detects a forged entry appended with a recomputed hash', async () => {
    // A determined attacker can recompute the whole chain. This test documents
    // that the chain is NOT tamper-proof on its own — it detects edits that
    // leave hashes alone, and otherwise relies on the head hash being witnessed
    // externally. Being explicit about this beats implying more.
    const log = await sample();
    const entries: AuditEntry[] = log.toArray();
    const forged = { ...entries[2], outcome: 'allow' as const, hash: '' };
    // Recompute honestly; the chain will still verify.
    const { entryHash } = await import('./auditLog');
    forged.hash = await entryHash(forged);
    entries[2] = forged;
    expect((await verifyChain(entries)).ok).toBe(true);
    // Therefore the head hash must be published elsewhere to catch this.
    expect(log.head).not.toBe(entries[2].hash);
  });
});
