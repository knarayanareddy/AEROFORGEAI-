// The STEP file must be a real Part 21 file, not a text file with a .step name.
// These tests parse the output back and check the invariants an importer relies
// on: a closed shell, no dangling references, consistent units, closed topology.

import { describe, expect, it } from 'vitest';
import { wedgeTriangles, writeStep } from './stepExport';

const build = (angleDeg = 10) =>
  writeStep({
    name: 'test.step',
    productName: 'Test wedge',
    parameters: { theta_deg: angleDeg, mach: 5.5 },
    triangles: wedgeTriangles({
      angleDeg,
      chordM: 1,
      depthM: 0.2,
      upstreamM: 0.4,
      heightM: 0.6,
    }),
  });

describe('STEP structure', () => {
  const src = build();

  it('has the required ISO-10303-21 envelope', () => {
    expect(src.startsWith('ISO-10303-21;')).toBe(true);
    expect(src.trimEnd().endsWith('END-ISO-10303-21;')).toBe(true);
    expect(src).toContain('HEADER;');
    expect(src).toContain('ENDSEC;');
    expect(src).toContain('DATA;');
  });

  it('declares a schema', () => {
    expect(src).toMatch(/FILE_SCHEMA\(\('AUTOMOTIVE_DESIGN/);
  });

  it('has no dangling entity references', () => {
    const defined = new Set(
      [...src.matchAll(/^#(\d+)=/gm)].map((m) => Number(m[1])),
    );
    const referenced = new Set(
      [...src.matchAll(/#(\d+)/g)].map((m) => Number(m[1])),
    );
    const dangling = [...referenced].filter((r) => !defined.has(r));
    expect(dangling).toEqual([]);
  });

  it('contains a closed shell inside a manifold solid', () => {
    expect(src).toMatch(/MANIFOLD_SOLID_BREP\(/);
    expect(src).toMatch(/CLOSED_SHELL\(/);
    expect(src).toMatch(/ADVANCED_BREP_SHAPE_REPRESENTATION/);
  });

  it('declares millimetre units, so a 1 m ramp reads as 985 mm in x', () => {
    expect(src).toMatch(/SI_UNIT\(\.MILLI\.,\.METRE\.\)/);
    // The ramp is 1 m along the surface, so its end is at cos(10°) = 0.9848 m,
    // i.e. 985 mm in x. (My first version of this test asserted 1000 and was
    // wrong: 1 m is the chord along the ramp, not the horizontal extent.)
    const xs = [...src.matchAll(/CARTESIAN_POINT\('',\((-?[\d.]+),/g)].map((m) =>
      Number(m[1]),
    );
    expect(Math.max(...xs)).toBeCloseTo(984.8077, 2);
  });

  it('every entity line is terminated', () => {
    const bad = src
      .split('\n')
      .filter((l) => l.startsWith('#'))
      .filter((l) => !l.trimEnd().endsWith(';'));
    expect(bad).toEqual([]);
  });

  it('entity ids are unique', () => {
    const ids = [...src.matchAll(/^#(\d+)=/gm)].map((m) => Number(m[1]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('negative coordinates survive the round trip', () => {
    // The upstream plate starts at x = -0.4 m = -400 mm.
    const xs = [...src.matchAll(/CARTESIAN_POINT\('',\((-?[\d.]+),/g)].map((m) =>
      Number(m[1]),
    );
    expect(Math.min(...xs)).toBeCloseTo(-400, 3);
  });
});

describe('STEP geometry', () => {
  it('a zero-angle plate is still a valid solid', () => {
    const src = writeStep({
      name: 'flat.step',
      productName: 'Flat plate',
      parameters: {},
      triangles: wedgeTriangles({
        angleDeg: 0,
        chordM: 1,
        depthM: 0.2,
        upstreamM: 0.2,
        heightM: 0.3,
      }),
    });
    expect(src).toMatch(/CLOSED_SHELL/);
    // Degenerate normals must not produce NaN in the file.
    expect(src).not.toContain('NaN');
  });

  it('the solid is watertight: every triangle edge has a matching reverse', () => {
    const tris = wedgeTriangles({
      angleDeg: 10,
      chordM: 1,
      depthM: 0.2,
      upstreamM: 0.4,
      heightM: 0.6,
    });
    const key = (p: number[]) => p.map((c) => c.toFixed(9)).join(',');
    const edges = new Map<string, number>();
    for (const t of tris) {
      const k = t.v.map(key);
      for (let e = 0; e < 3; e++) {
        const a = k[e];
        const b = k[(e + 1) % 3];
        edges.set(`${a}>${b}`, (edges.get(`${a}>${b}`) ?? 0) + 1);
      }
    }
    const unmatched = [...edges.keys()].filter((e) => {
      const [a, b] = e.split('>');
      return !edges.has(`${b}>${a}`);
    });
    expect(unmatched).toEqual([]);
  });

  it('the file contains no NaN or Infinity', () => {
    expect(build()).not.toMatch(/NaN|Infinity/);
  });
});
