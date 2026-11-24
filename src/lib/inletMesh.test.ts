// Geometry tests for the Phase 2 inlet.
//
// These are cheap and exact: the mesh is a pure function of the design, so every
// assertion here is a property of the construction rather than a tuned tolerance.

import { describe, expect, it } from 'vitest';
import { buildInletMesh, rampPolyline, type InletGeometry } from './inletMesh';
import { DEFAULT_INLET, lipHeightOf } from './inlet';

const geo = (over: Partial<InletGeometry> = {}): InletGeometry => {
  const d = DEFAULT_INLET;
  return {
    rampAnglesDeg: d.rampAnglesDeg,
    rampLengthsM: d.rampLengthsM,
    cowlStartM: d.rampLengthsM[0] * 1.35,
    lipHeightM: lipHeightOf(d),
    cowlAngleDeg: d.cowlAngleDeg,
    isolatorHeightM: d.isolatorHeightM,
    isolatorLengthM: d.isolatorLengthM,
    upstreamM: 0.6,
    nx: 60,
    ny: 30,
    ...over,
  };
};

describe('rampPolyline', () => {
  it('integrates cumulative angles', () => {
    const { points, totalTurnDeg } = rampPolyline([7.2, 5.8], [1.2, 0.9]);
    expect(totalTurnDeg).toBeCloseTo(13, 12);
    expect(points.length).toBe(3);
    // First panel at 7.2°.
    expect(points[1].y / points[1].x).toBeCloseTo(Math.tan((7.2 * Math.PI) / 180), 10);
    // Second panel at 7.2 + 5.8 = 13°.
    const dx = points[2].x - points[1].x;
    const dy = points[2].y - points[1].y;
    expect(dy / dx).toBeCloseTo(Math.tan((13 * Math.PI) / 180), 10);
  });

  it('rejects mismatched inputs', () => {
    expect(() => rampPolyline([7.2], [1.2, 0.9])).toThrow(/equal length/);
    expect(() => rampPolyline([], [])).toThrow(/at least one ramp/);
  });
});

describe('buildInletMesh', () => {
  const m = buildInletMesh(geo());

  it('produces a positive-area mesh with no degenerate cells', () => {
    for (const v of m.metrics.vol) expect(v).toBeGreaterThan(0);
  });

  it('places the floor on the ramp polyline', () => {
    const { points } = rampPolyline([7.2, 5.8], [1.2, 0.9]);
    for (const p of points) {
      expect(m.lowerY(p.x)).toBeCloseTo(p.y, 9);
    }
  });

  it('holds the floor flat through the isolator', () => {
    const { points } = rampPolyline([7.2, 5.8], [1.2, 0.9]);
    const end = points[points.length - 1];
    for (const x of [end.x + 0.1, end.x + 1, end.x + 2.4]) {
      expect(m.lowerY(x)).toBeCloseTo(end.y, 12);
    }
  });

  it('contracts the duct monotonically from the lip to the isolator', () => {
    // This is the property that broke twice during construction: a cowl that
    // rises, or a ceiling that bulges, makes the duct non-monotonic and the
    // steady solve cannot settle.
    const xs: number[] = [];
    for (let x = m.landmarks.lipX; x <= m.landmarks.isolatorX; x += 0.02) xs.push(x);
    const heights = xs.map((x) => m.upperY(x) - m.lowerY(x));
    for (let k = 1; k < heights.length; k++) {
      expect(heights[k]).toBeLessThanOrEqual(heights[k - 1] + 1e-9);
    }
  });

  it('reaches exactly the specified isolator height', () => {
    expect(m.upperY(m.landmarks.isolatorX) - m.lowerY(m.landmarks.isolatorX)).toBeCloseTo(
      DEFAULT_INLET.isolatorHeightM,
      9,
    );
  });

  it('turns the top boundary from inflow to wall at the lip', () => {
    const { nx } = m.grid;
    for (let i = 0; i <= nx; i++) {
      const x = m.grid.x[i];
      expect(m.upperIsWall(i)).toBe(x >= m.landmarks.lipX - 1e-12);
    }
    // At least one column on each side, or the mixed boundary is meaningless.
    expect(m.upperIsWall(0)).toBe(false);
    expect(m.upperIsWall(nx)).toBe(true);
  });

  it('recovers the cowl angle from the geometry', () => {
    expect(m.cowlAngleDeg).toBeCloseTo(DEFAULT_INLET.cowlAngleDeg, 6);
  });

  it('refuses a lip downstream of the isolator entry', () => {
    expect(() => buildInletMesh(geo({ cowlStartM: 5 }))).toThrow(/upstream of the isolator/);
  });

  it('refuses a lip that would sit inside the ramp surface', () => {
    expect(() => buildInletMesh(geo({ lipHeightM: -1 }))).toThrow(/not above the ramp/);
  });
});
