// Hash-chained audit log.
//
// Each entry commits to its predecessor's hash, so removing or editing an entry
// breaks every subsequent link. Chain verification is deterministic and local —
// it does not need the secret that produced the signatures, which is what makes
// it useful to an auditor who is not trusted with the keys.
//
// What this DOES prove: the sequence was not modified after the fact, assuming
// the head hash was witnessed somewhere else (git commit, signed bundle, ticket).
// What it does NOT prove: that the log is complete. A truncated log is still a
// valid chain up to its new head. Detecting truncation needs the head hash
// recorded independently — `docs/phase-4.md` is explicit about that limit.

import { sha256Hex } from './zip';

export type AuditAction =
  | 'auth.token.verified'
  | 'auth.token.rejected'
  | 'policy.decision'
  | 'bundle.exported'
  | 'bundle.export.denied'
  | 'case.run';

export interface AuditEntryInput {
  action: AuditAction;
  /** Who or what performed the action. */
  actor: { sub: string; issuer?: string };
  /** What was acted upon. */
  subject: string;
  /** Outcome, so a denial is as visible as a success. */
  outcome: 'allow' | 'deny' | 'error';
  /** Action-specific payload. Must be JSON-serialisable. */
  detail?: Record<string, unknown>;
  /** ISO-8601 UTC. Passed in rather than read from the clock so logs are
   *  reproducible in tests and deterministic in exports. */
  at: string;
}

export interface AuditEntry extends AuditEntryInput {
  /** Monotonic index, 0-based. */
  seq: number;
  /** Hash of the previous entry; 64 zeros for the first. */
  prev: string;
  /** sha256 over the canonical encoding of this entry including prev. */
  hash: string;
}

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Canonical encoding of an entry.
 *
 * Key order is fixed by construction rather than by JSON.stringify's insertion
 * order, because two nominally identical entries must hash identically
 * regardless of how the object was built. This is the detail that makes the
 * chain testable across languages.
 */
export function canonicalize(e: AuditEntryInput & { seq: number; prev: string }): string {
  // Only the fields that have a defined meaning, in a fixed order.
  const parts = [
    `seq=${e.seq}`,
    `prev=${e.prev}`,
    `at=${e.at}`,
    `action=${e.action}`,
    `outcome=${e.outcome}`,
    `actor=${e.actor.issuer ?? ''}|${e.actor.sub}`,
    `subject=${e.subject}`,
    `detail=${stableJson(e.detail ?? {})}`,
  ];
  return parts.join('\n');
}

/** JSON with object keys sorted, so encoding does not depend on insertion order. */
export function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`;
}

export async function entryHash(e: AuditEntryInput & { seq: number; prev: string }): Promise<string> {
  return sha256Hex(new TextEncoder().encode(canonicalize(e)));
}

/** Append-only log. Mutations go through `append`, which does the chaining. */
export class AuditLog {
  private entries: AuditEntry[] = [];

  get length(): number {
    return this.entries.length;
  }

  get head(): string {
    return this.entries.length ? this.entries[this.entries.length - 1].hash : GENESIS_HASH;
  }

  /** A copy — callers cannot mutate the internal chain. */
  toArray(): AuditEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  async append(input: AuditEntryInput): Promise<AuditEntry> {
    const seq = this.entries.length;
    const prev = this.head;
    const hash = await entryHash({ ...input, seq, prev });
    const entry: AuditEntry = { ...input, seq, prev, hash };
    this.entries.push(entry);
    return { ...entry };
  }
}

export interface ChainProblem {
  seq: number;
  kind: 'seq' | 'prev' | 'hash';
  detail: string;
}

/**
 * Verify a chain.
 *
 * Returns every problem found, not just the first, because "entry 7 is wrong"
 * and "entries 7 through 400 are wrong" are different situations and an auditor
 * needs to tell them apart.
 */
export async function verifyChain(entries: AuditEntry[]): Promise<{ ok: boolean; problems: ChainProblem[] }> {
  const problems: ChainProblem[] = [];
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];

    if (e.seq !== i) {
      problems.push({ seq: i, kind: 'seq', detail: `entry has seq ${e.seq}, expected ${i}` });
    }
    if (e.prev !== expectedPrev) {
      problems.push({ seq: i, kind: 'prev', detail: `prev does not match predecessor hash` });
    }

    const recomputed = await entryHash(e);
    if (recomputed !== e.hash) {
      problems.push({ seq: i, kind: 'hash', detail: `content hash mismatch (stored ${e.hash.slice(0, 12)}…)` });
    }

    expectedPrev = e.hash;
  }

  return { ok: problems.length === 0, problems };
}
