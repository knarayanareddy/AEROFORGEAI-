// Tests for the SU2 ASCII mesh writer.
//
// The format details asserted here come from SU2 v8.6.0 source, not from memory:
//   CSU2ASCIIMeshReaderFVM.cpp — NDIME/NPOIN/NELEM/NMARK, VTK type codes
//   CQuadrilateral.cpp        — Change_Orientation() swaps nodes 1 and 3,
//                               which is only correct for RING ordering
//
// The ordering test matters more than it looks. A wrong winding does not fail to
// parse; it produces inverted elements and a wrong answer.

import { describe, expect, it } from 'vitest';
import { buildInletMesh, type InletGeometry } from './inletMesh';
import { writeSu2Mesh, describeSu2Mesh, SU2_MARKERS } from './su2Mesh';
import { DEFAULT_INLET, lipHeightOf } from './inlet';

const geo = (over: Partial<InletGeometry> = {}): InletGeometry => ({
  rampAnglesDeg: DEFAULT_INLET.rampAnglesDeg,
  rampLengthsM: DEFAULT_INLET.rampLengthsM,
  cowlStartM: DEFAULT_INLET.rampLengthsM[0] * 1.35,
  lipHeightM: lipHeightOf(DEFAULT_INLET),
  cowlAngleDeg: DEFAULT_INLET.cowlAngleDeg,
  isolatorHeightM: DEFAULT_INLET.isolatorHeightM,
  isolatorLengthM: DEFAULT_INLET.isolatorLengthM,
  upstreamM: 0.6,
  nx: 20,
  ny: 10,
  ...over,
});

const mesh = buildInletMesh(geo());
const text = writeSu2Mesh(mesh);

function parse(text: string) {
  const lines = text.split('\n');
  const idx = (prefix: string) => lines.findIndex((l) => l.startsWith(prefix));
  const npoin = parseInt(lines[idx('NPOIN=')].split('=')[1], 10);
  const nelem = parseInt(lines[idx('NELEM=')].split('=')[1], 10);
  const nmark = parseInt(lines[idx('NMARK=')].split('=')[1], 10);
  const pts: [number, number][] = [];
  const p0 = idx('NPOIN=');
  for (let k = 1; k <= npoin; k++) {
    const [a, b] = lines[p0 + k].trim().split(/\s+/).map(Number);
    pts.push([a, b]);
  }
  const elems: number[][] = [];
  const e0 = idx('NELEM=');
  for (let k = 1; k <= nelem; k++) {
    const parts = lines[e0 + k].trim().split(/\s+/).map(Number);
    elems.push(parts);
  }
  return { lines, npoin, nelem, nmark, pts, elems };
}

const parsed = parse(text);

describe('SU2 ASCII structure', () => {
  const p = parsed;

  it('declares 2 dimensions', () => {
    expect(text.split('\n')[0]).toBe('NDIME= 2');
  });

  it('writes the declared number of points', () => {
    expect(p.npoin).toBe((20 + 1) * (10 + 1));
    expect(p.pts.length).toBe(p.npoin);
  });

  it('writes the declared number of quads', () => {
    expect(p.nelem).toBe(20 * 10);
    expect(p.elems.length).toBe(p.nelem);
  });

  it('every element is VTK type 9 with 4 nodes and an id', () => {
    for (const e of p.elems) {
      expect(e[0]).toBe(9);
      expect(e).toHaveLength(6);
      // Node ids must be inside the declared point range.
      for (const n of e.slice(1, 5)) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(p.npoin);
      }
    }
  });

  it('round-trips coordinates to full double precision', () => {
    // The first node is the upstream bottom corner at (-0.6, 0).
    expect(p.pts[0][0]).toBeCloseTo(-0.6, 12);
    expect(p.pts[0][1]).toBeCloseTo(0, 12);
    // Expressing coordinates as %.15e must reproduce the exact double.
    const last = p.pts[p.npoin - 1];
    expect(last[0]).toBe(mesh.grid.x[mesh.grid.x.length - 1]);
    expect(last[1]).toBe(mesh.grid.y[mesh.grid.y.length - 1]);
  });
});

describe('quadrilateral node ordering', () => {
  const p = parsed;
  it('is a ring, not the VTK diagonal order', () => {
    // SU2's Change_Orientation() swaps nodes 1 and 3. That is a valid edge swap
    // only if the quad is stored in ring order. Under VTK's (0,1,3,2) order the
    // swap would cross the quad. So consecutive nodes must be topological
    // neighbours in the grid.
    const { nx } = mesh.grid;
    const ox = (id: number) => id % (nx + 1);
    void ox;
    for (let c = 0; c < 5; c++) {
      const [, n0, n1, n2, n3] = p.elems[c];
      // For element (i,j): n0=(i,j) n1=(i+1,j) n2=(i+1,j+1) n3=(i,j+1)
      expect(n1 - n0).toBe(1); // right
      expect(n2 - n1).toBe(nx + 1); // up
      expect(n2 - n3).toBe(1); // right, from n3
      expect(n3 - n0).toBe(nx + 1); // up, from n0
    }
  });

  it('gives every quad positive signed area', () => {
    // A ring-ordered quad winds consistently, so the shoelace area is positive
    // for all elements. Reversed winding would flip the sign and SU2 would see
    // an inverted element.
    for (const e of p.elems) {
      const [a, b, c, d] = e.slice(1, 5).map((n) => p.pts[n]);
      // Standard shoelace. (An earlier version of this test used the equivalent
      // trapezoid form with a sign slip, and "found" every element inverted.)
      const area =
        0.5 *
        (a[0] * b[1] - b[0] * a[1] +
          b[0] * c[1] - c[0] * b[1] +
          c[0] * d[1] - d[0] * c[1] +
          d[0] * a[1] - a[0] * d[1]);
      expect(area).toBeGreaterThan(0);
    }
  });
});

describe('boundary markers', () => {
  const tags = [...text.matchAll(/MARKER_TAG=\s*(\S+)/g)].map((m) => m[1]);

  it('declares every marker block it writes', () => {
    expect(tags.length).toBe(parseInt(text.match(/NMARK=\s*(\d+)/)![1], 10));
  });

  it('has a single solid wall marker covering ramps, floor and cowl', () => {
    expect(tags).toContain(SU2_MARKERS.wall);
  });

  it('separates the open top from the wall', () => {
    // If the open top were folded into the wall marker, SU2 would put a solid
    // surface where the ramp shocks must leave the domain — the exact mistake
    // that stalled the in-browser solver.
    expect(tags).toContain('far_top');
    const wallCount = Number(text.match(/MARKER_TAG=\s*wall\s*\nMARKER_ELEMS=\s*(\d+)/)![1]);
    const farCount = Number(text.match(/MARKER_TAG=\s*far_top\s*\nMARKER_ELEMS=\s*(\d+)/)![1]);
    expect(wallCount + farCount).toBe(2 * 20);
    expect(farCount).toBeGreaterThan(0);
    expect(farCount).toBeLessThan(2 * 20);
  });

  it('has one inflow and one outflow edge', () => {
    expect(Number(text.match(/MARKER_TAG=\s*inlet\s*\nMARKER_ELEMS=\s*(\d+)/)![1])).toBe(1);
    expect(Number(text.match(/MARKER_TAG=\s*outlet\s*\nMARKER_ELEMS=\s*(\d+)/)![1])).toBe(1);
  });

  it('agrees with describeSu2Mesh', () => {
    const d = describeSu2Mesh(mesh);
    expect(d.points).toBe(parsed.npoin);
    expect(d.quads).toBe(parsed.nelem);
  });
});
