# SU2 fixtures — SYNTHETIC

**These files were not produced by SU2.** They were written by hand to match the
formats documented in `src/lib/su2Results.ts`, which cites the v8.6.0 source
line by line.

They exist so the parsers can be tested before a real run is available. They
prove the parser handles the *shape* of SU2 output. They prove nothing about
whether SU2 actually emits that shape — only a real run does that.

## Why they are labelled so loudly

A fixture that looks like real output is indistinguishable from real output once
it is three directories deep in a repository. Someone will find
`fixtures/su2/restart.csv`, assume it came from a run, and quote numbers from it.
The `.synthetic` extension and the "SYNTHETIC" first line in every file exist to
make that mistake impossible.

## What replaces them

`docs/phase-5-integration.md` §3. When you have a real run:

```
scripts/su2-run.sh --case build/inlet.cfg --mesh build/inlet.su2 --out runs/2026-11-26
cp runs/2026-11-26/history.csv  fixtures/su2/real-history.csv
cp runs/2026-11-26/restart.csv  fixtures/su2/real-restart.csv
```

Then delete these, update the test to read the real ones, and the "synthetic"
wording comes out of the docs at the same time. If the real files fail to parse,
the parser is wrong and the source-cited rules in `su2Results.ts` need revisiting
— that is the moment the citation earns its keep.

## Provenance of the numbers used

The history fixture's residual decay is a plausible Euler convergence curve, not
a measured one. **It was seeded with a real error on the first attempt**: the
values are log10 residuals, and a test read them as raw magnitudes, computing
`log10(log10(r))`. The test caught it. That is the sequence a synthetic fixture
is supposed to produce.

The restart fixture is a uniform Mach 5.5 freestream, gamma 1.4, p = 1,
rho = 0.42 — so u = 10.041580221, momentum_x = 4.217463693 and
E = p/0.4 + rho u^2 / 2 = 23.675, which is what the file contains. The first
version of this fixture used a momentum that worked out to Mach 1.34; the test
caught that too. Neither file is a result. Do not cite either.
