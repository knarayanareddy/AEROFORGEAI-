// Deterministic PRNG (mulberry32) so simulated data is reproducible
// across reloads and test runs.

export type Rng = {
  /** Next pseudo-random float in [0, 1). */
  next: () => number;
  /** Next pseudo-random float in [min, max). */
  range: (min: number, max: number) => number;
  /** Next pseudo-random integer in [min, max] (inclusive). */
  int: (min: number, max: number) => number;
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
  };
}
