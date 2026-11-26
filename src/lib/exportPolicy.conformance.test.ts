// Conformance: TypeScript mirror vs the real Rego engine.
//
// `policy/rego_results.json` is produced by `oracle/opa_eval.py`, which runs the
// policy through regopy — OPA's own Rego runtime. This test replays every case
// through the TypeScript mirror and fails on any divergence, including in the
// denial message text.
//
// If the file is missing the test SKIPS rather than passing, so a checkout
// without regopy installed cannot silently claim conformance.

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { evaluateExport, type ExportInput } from './exportPolicy';

interface Case {
  id: string;
  input: ExportInput;
}
interface RegoVerdict {
  allowed: boolean;
  denials: string[];
  classification: string;
}

const casesPath = 'policy/cases.json';
const regoPath = 'policy/rego_results.json';
const haveRego = existsSync(regoPath);

const cases: Case[] = JSON.parse(readFileSync(casesPath, 'utf8')).cases;
const rego: Record<string, RegoVerdict> = haveRego ? JSON.parse(readFileSync(regoPath, 'utf8')) : {};

describe.skipIf(!haveRego)('TypeScript mirror matches the Rego engine', () => {
  it('covers every case in the shared table', () => {
    expect(Object.keys(rego).sort()).toEqual(cases.map((c) => c.id).sort());
  });

  for (const c of cases) {
    it(`${c.id}: verdict and denials agree`, () => {
      const mine = evaluateExport(c.input);
      const theirs = rego[c.id];
      expect(theirs, `no Rego result for ${c.id}`).toBeTruthy();
      expect(mine.allowed).toBe(theirs.allowed);
      expect(mine.classification).toBe(theirs.classification);
      expect([...mine.denials].sort()).toEqual(theirs.denials);
    });
  }
});

describe('the mirror stands on its own', () => {
  it('fails closed when input is missing', () => {
    // Every field absent: no destination, so no export. The default must be deny.
    expect(evaluateExport({ mach: 0 }).allowed).toBe(false);
  });

  it('documents what an unknown classification does', () => {
    // An unrecognised tier has no entry in mach_limit, so no Mach rule fires and
    // the export is ALLOWED. That is a real gap, and it is pinned here rather
    // than left to be discovered: the policy trusts the caller to supply a
    // classification it knows. Closing it properly means validating the tier
    // against an enum at the boundary — recorded as a known limitation in
    // docs/phase-4.md rather than silently papered over with a catch-all rule
    // that would change the Rego's meaning for every real tier.
    const r = evaluateExport({
      destination: 'nato',
      classification: 'SOMETHING_NEW' as unknown as ExportInput['classification'],
      mach: 2,
    });
    expect(r.allowed).toBe(true);
    expect(r.denials).toEqual([]);
  });

  it('refuses the design point at Mach 5.5 under ECL:ML', () => {
    // The Phase 2 inlet is Mach 5.5. Under this policy it cannot be exported
    // without a classification review. That is the intended behaviour, and it is
    // asserted so nobody "fixes" it by raising the limit.
    const r = evaluateExport({ destination: 'nato', classification: 'ECL:ML', mach: 5.5 });
    expect(r.allowed).toBe(false);
    expect(r.denials[0]).toMatch(/exceeds its Mach limit/);
  });
});

// When regopy has not been run, the suite above is skipped. Vitest reports the
// skip count, so a green run is distinguishable from a conformant one -- but
// CI runs `npm run policy:check` first, which fails loudly if regopy is missing.

