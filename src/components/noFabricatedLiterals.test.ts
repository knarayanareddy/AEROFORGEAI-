// A repository-wide guard against fabricated engineering values.
//
// Phase 0's worst defect was not in the data file — it was JSX literals spread
// across panels (`ISOLATOR M≈2.8`, `487 / 500 ITER`, `β₁ 18.4°`, `18.4 P∞`,
// `7/8 VALIDATED`). Data-layer tests cannot see those, and neither can a grep
// for constants that are *supposed* to be wrong in one place but right in
// another. This test scans the component sources for the specific shapes that
// fabrications took, so the pattern cannot quietly return.
//
// It is deliberately shaped as "no magic number appears in a JSX text or prop
// position" for the quantities that must be derived — not as a general ban,
// which would be unmaintainable.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) out.push(p);
  }
  return out;
}

const files = walk(SRC).map((f) => ({
  path: f.replace(SRC, ''),
  src: readFileSync(f, 'utf8'),
}));

/** Strip comments so documentation of an old defect does not trip the guard. */
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Scope: the UI layer. The physics core legitimately contains 216.65 (ISA base
// temperature) and other real physical constants; the ban is on hand-typed
// engineering values in *presentation* code, which must call into lib/ instead.
const code = files
  .filter((f) => f.path.startsWith('components/') || f.path.startsWith('data/'))
  .map((f) => ({ path: f.path, src: stripComments(f.src) }));

const componentCode = code.filter((f) => f.path.startsWith('components/'));

const find = (re: RegExp) => {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  return code.flatMap((f) =>
    [...f.src.matchAll(g)].map((m) => `${f.path}: ${m[0].trim().slice(0, 80)}`),
  );
};

describe('no fabricated engineering values in component source', () => {
  it('no sea-level pressure masquerading as a total condition', () => {
    expect(find(/101\s*325/)).toEqual([]);
  });

  it('no tropopause static temperature masquerading as a total condition', () => {
    // Not a ban on the number: it is the ISA base temperature and belongs in
    // lib/atmosphere.ts. The ban is on it appearing in a component.
    const hits = componentCode.flatMap((f) =>
      [...f.src.matchAll(/216\.65/g)].map((m) => `${f.path}: ${m[0]}`),
    );
    expect(hits).toEqual([]);
  });

  it('no fictional isolator Mach', () => {
    // The derived value is 4.13; 2.8 was the number for a machine never drawn.
    expect(find(/ISOLATOR\s*M\s*[≈=]\s*2\.8/)).toEqual([]);
    expect(find(/['"`]2\.80['"`]/)).toEqual([]);
  });

  it('no old pressure ratio or recovery', () => {
    expect(find(/18\.4\s*P?∞/)).toEqual([]);
    expect(find(/18\.4\s*[×x]/)).toEqual([]);
    expect(find(/87\.3\s*%/)).toEqual([]);
  });

  it('no fabricated validation scorecard', () => {
    expect(find(/7\s*\/\s*8\s*(PASS|VALIDATED)/i)).toEqual([]);
  });

  it('no fake solver iteration counter', () => {
    expect(find(/487\s*\/\s*500/)).toEqual([]);
    expect(find(/2\.4\s*[×x]\s*10/)).toEqual([]);
  });

  it('no fabrication of a compliance certification', () => {
    expect(find(/AS9100D\s+COMPLIANT/)).toEqual([]);
    expect(find(/ITAR\/EAR\s+compliant/i)).toEqual([]);
  });

  it('no model identifier that does not exist', () => {
    expect(find(/llama3\.2/)).toEqual([]);
  });

  it('no fabricated shock angles', () => {
    expect(find(/18\.4\s*°/)).toEqual([]);
    expect(find(/14\.2\s*°/)).toEqual([]);
  });
});

describe('no non-deterministic value generation', () => {
  it('Math.random() appears nowhere outside the seeded PRNG', () => {
    const hits = files
      .filter((f) => f.path !== 'utils/prng.ts' && f.path !== 'utils/prng.test.ts')
      .map((f) => ({ path: f.path, src: stripComments(f.src) }))
      .flatMap((f) =>
        [...f.src.matchAll(/Math\.random\s*\(/g)].map((m) => `${f.path}: ${m[0]}`),
      );
    expect(hits).toEqual([]);
  });
});

describe('every engineering number in a panel traces to the physics core', () => {
  it('panels that show shock or pressure values import from lib', () => {
    const panels = code.filter((f) =>
      /^(components\/(cad|cfd|export|dashboard)\/)/.test(f.path),
    );
    expect(panels.length).toBeGreaterThan(0);
    for (const p of panels) {
      const showsPhysics = /(pressureRatio|isolatorMach|totalPressureRecovery|wallTemperature)/.test(
        p.src,
      );
      if (showsPhysics) {
        expect(p.src, `${p.path} shows physics values`).toMatch(/from '\.\.\/\.\.\/lib\//);
      }
    }
  });
});
