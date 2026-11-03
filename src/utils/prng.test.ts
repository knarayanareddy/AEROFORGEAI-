import { describe, it, expect } from 'vitest';
import { createRng, mulberry32 } from './prng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('createRng', () => {
  it('range() stays within bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.range(0.82, 0.88);
      expect(v).toBeGreaterThanOrEqual(0.82);
      expect(v).toBeLessThan(0.88);
    }
  });

  it('int() stays within inclusive bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(0, 199);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(199);
    }
  });
});
