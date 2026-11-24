# Phase 1 — the wedge vertical slice

**Status: exit criterion met, with one substitution that must be understood before
anyone quotes this work.**

> A wedge at M 5.5 gives β and p₂/p₁ within 2 % of exact theory, driven entirely
> from the UI, with a downloadable STEP + case + report.

All four parts are done. The substitution: **the solver is not SU2.** `docs/pathway-forward.md`
specified SU2 + Gmsh + CadQuery behind a FastAPI sidecar. This build instead ships a
TypeScript Euler solver that runs in the browser. §7 explains why, and what it costs.

---

## 1. What now exists

```
src/lib/euler2d.ts           650 lines   2D Euler: FV + MUSCL/minmod + HLLC
src/lib/wedge.ts             230 lines   body-fitted wedge grid, shock extraction
src/lib/stepExport.ts        330 lines   ISO 10303-21 (STEP) writer
src/lib/phase1Pipeline.ts    330 lines   prompt → verified wedge → artifacts
src/components/phase1/
  WedgeVerificationPanel.tsx 330 lines   UI: run, verdict, download
oracle/euler_oracle.py       470 lines   independent numpy solver for cross-check
```

### The solver

| | |
| --- | --- |
| discretisation | cell-centred finite volume, structured curvilinear grid |
| reconstruction | MUSCL, minmod limiter, index-space slopes |
| Riemann solver | HLLC, Davis wave-speed estimate |
| time integration | explicit Euler, local time stepping to steady state |
| convergence | L2 density residual < 1e-5 (relative), or round-off |
| free-stream preservation | exact: a uniform field converges in **1 iteration** |

It is textbook (Toro, *Riemann Solvers and Numerical Methods*). It is not novel, and
that is deliberate — the point is to have something whose correctness can be
checked, not something clever.

### Independent cross-check

`oracle/euler_oracle.py` is a second implementation in Python/numpy with deliberately
different choices: **Toro's pressure-based wave speeds** instead of Davis, and a
different mesh generator. Agreement between the two is therefore evidence rather
than coincidence.

At 360×220, θ = 10°, M 5.5:

| | β | β error | p₂/p₁ | p error |
| --- | --- | --- | --- | --- |
| exact theory | 18.387° | — | 3.3448 | — |
| TypeScript solver | 18.684° | **+1.62 %** | 3.3435 | **−0.04 %** |
| Python oracle | 18.71° | **+1.73 %** | 3.343 | **−0.04 %** |

Two independent codes, same answer to within 0.11 percentage points on β and
0.0005 on p₂/p₁.

---

## 2. The golden test

`src/lib/wedge.golden.test.ts` is the phase's exit criterion expressed as code. It
grades a **computed field** against **analytic theory** — the only test in the
repository that does so.

```
npm run test:golden      # 6 tests, ~90 s
```

| case | grid | β computed | β exact | error | p error | result |
| --- | --- | --- | --- | --- | --- | --- |
| θ = 10° | 360×220 | 18.684° | 18.387° | 1.62 % | −0.04 % | **PASS** |
| θ = 15° | 360×220 | 23.75° | 23.40° | 1.48 % | +0.01 % | **PASS** |
| θ = 5° | 420×260 | 14.27° | 14.02° | 1.75 % | −0.04 % | **PASS** |

Plus three invariants: a uniform freestream must converge in one iteration; the
shock angle must be monotone in wedge angle; attachment must match `θ_max(M)`.

**β error is resolution-limited, not scheme-limited.** Measured convergence at
θ = 10°:

| grid | cells | β error |
| --- | --- | --- |
| 200×120 | 24 k | 2.91 % |
| 300×160 | 48 k | 2.19 % |
| 360×220 | 79 k | **1.62 %** |
| 400×200 | 80 k | 1.04 % |
| 480×280 | 134 k | 1.29 % |

The 5° case needs a *finer* grid than 10°/15° for the same tolerance, because β is
measured near the apex where a weaker shock sits closer to the wall. That is
physics, not a tuning knob, and the test says so in a comment.

---

## 3. STEP output

`stepExport.ts` writes a real ISO 10303-21 / AP203 file: header, units context,
`MANIFOLD_SOLID_BREP` over a `CLOSED_SHELL` of planar `FACE_SURFACE`s.

Verified by `stepExport.test.ts` (11 tests): no dangling entity references, unique
ids, every entity terminated, millimetre units, and — the one that caught a real
bug — **the mesh is watertight**, i.e. every triangle edge has exactly one
matching reverse.

That last test failed on the first attempt with 10 unmatched edges: my side walls
duplicated the end-cap boundary. Fixed by reversing the cap winding.

Honest scope: planar faces only (exact for a prism), lines and polylines only, and
it has not been through a certification-grade translator.

---

## 4. Driven from the UI

New sidebar section **Wedge Verification** (`P1`, `LIVE`). It exposes θ and M
sliders and runs the pipeline on demand. The generator is consumed in 40 ms time
slices via `requestAnimationFrame` so the ~25 s solve does not freeze the browser.

The panel shows, side by side, the computed and exact values plus the signed
error, and gates its own verdict text on `meetsExitCriterion`. Below 2 % it says
the criterion is met; above, it says the run is not a verification. It does not
round its way to a pass.

Downloads: `wedge.step` and `report.md`, both generated during the run.

---

## 5. What the pipeline refuses to do

Every one of these is a test in `phase1Pipeline.test.ts`:

- **A detached shock throws** rather than producing a plausible-looking number,
  and the failure message tells the user to reduce the wedge angle.
- **An unknown material throws** rather than guessing a thermal verdict.
- **A non-converged solve** emits a `failed` event and states that the numbers
  below it are not converged.
- **No shock found** in the extracted field throws rather than reporting β = NaN
  as a result.

`buildReport()` closes with a section headed *"What this does and does not
establish"*, naming 2D, inviscid, single-wedge, and *"is not SU2"* explicitly.

---

## 6. Verification status

```
npm run typecheck       0 errors
npm run lint            0 errors, 0 warnings
npm test                15 files, 209 tests     (golden excluded by design)
npm run test:golden     6 tests, all passing     (~90 s)
npm run build           971.65 kB / 282.01 kB gzip
```

The golden suite is excluded from `npm test` because 90 s is too slow for a
pre-commit loop, and included in `npm run test:all`. **If it is not in CI, it is
not a gate** — see §7.

---

## 7. The substitution, stated plainly

`vite.config.ts` builds the app to a **single static `index.html`**
(`vite-plugin-singlefile`), and Vercel is connected as a static target. SU2, Gmsh
and CadQuery cannot run there. They also cannot run in this development sandbox:
there is no root, `gmsh` fails to import (`libGLU.so.1` missing, no `apt`), and
no SU2 binary is installable.

So there were three honest options: ship unverified adapter code, abandon the
single-file deploy, or write a solver that can actually be verified here. I took
the third, at your direction.

**What this costs:**

| | SU2 + Gmsh | this build |
| --- | --- | --- |
| grids | unstructured, adaptivity | structured, body-fitted only |
| physics | Euler and RANS + turbulence | Euler only, inviscid |
| dimensions | 2D and 3D | 2D |
| maturity | years of validation | one golden case, three angles |
| runtime | cluster / container | ~25 s in a browser tab |

It is enough to prove the pipeline and to grade a shock against theory. It is not
enough for an inlet with an isolator, let alone a combustor. Phase 2's
mixed-compression inlet needs either unstructured meshing or a much larger
structured effort, and that is the point at which a real SU2 sidecar earns its
keep.

**The CI gap:** the golden test runs locally but there is no CI workflow in the
repository yet, so nothing enforces it on a pull request. Wire it before trusting
the "nothing merges that regresses them" claim in `pathway-forward.md`.

---

## 8. Bugs found while building this

Recorded because the pattern matters more than the individual fixes: **five of the
six were found by a test or a diagnostic disagreeing with an expectation, not by
reading the code.**

1. **Missing volume in the time-step.** The update used `CFL·R/Λ` while `R`
   already integrated over face areas, so the effective step scaled with cell
   size. Caught by non-convergence.
2. **Slope index collapsed.** `bi - (useJ ? 1 : 0)` evaluated to `8*s` for both
   directions, so the j-slope was never used.
3. **Extraction looked for the wrong sign.** Pressure *falls* as you scan up from
   the wall, so searching for a rise found nothing. β came out NaN for every
   column.
4. **β measured from the wrong origin.** The local wall height instead of the
   apex — under-reporting β by roughly θ itself (10.46° vs 18.39°).
5. **STEP solid was not watertight.** End caps and side walls both owned the
   profile edges. Found by the watertightness test; 10 unmatched edges.
6. **Residual normalisation.** `res / (refResidual || 1)` turned a legitimate
   zero into 1.0, so an exactly-uniform field looked like it never converged.

Two of my *tests* were also wrong and were corrected rather than the code:
a 10° ramp's horizontal extent is `cos(10°)` = 985 mm, not 1000 mm; and a
different Mach at the same altitude must **not** change static pressure.

---

## 9. Next

Phase 1 proper is done. What is missing before this can be called a platform:

1. **CI.** A workflow running `typecheck`, `lint`, `test`, and `test:golden`. Until
   that exists, none of the above is enforced.
2. **A Worker.** The solve currently blocks a tab for ~25 s. Move it to a Web
   Worker with the same event stream and add a cancel button.
3. **Phase 2 inlet.** Ramp chains with a cowl, an isolator, and a shock-train
   extraction — this is where the structured-grid approach starts to strain.
4. **The CEP artifact.** The `bundle.zip` (STEP + case + report + manifest with
   hashes) is still not produced; the report and STEP are separate downloads.

---

## 10. Follow-ups landed after the slice

**Web Worker.** The solve now runs in `src/workers/solver.worker.ts`, driven by
`useWedgeSolve`. The message contract is the pipeline's own event stream, so the
panel does not care which one it is talking to. Progress arrives from a callback
*inside* the solver loop (`onSolveProgress`), because a generator can only yield
between stages and a progress bar that moves once per stage is worse than none.

Cancel is supported and is honest about its limits: in the worker the run is
stopped between pipeline events and `terminate()` reclaims the thread; if the app
has fallen back to inline execution (no `Worker` constructor) the solve cannot be
interrupted mid-iteration, and the UI says exactly that instead of pretending the
cancel worked. A cancelled run reports no result — an unconverged field is not a
result.

Verified by `src/workers/solver.worker.test.ts` (6 tests), which installs a fake
`self` and drives the real handler: progress streaming, run-id tagging, result
trimming (the panel gets a Mach array, not the padded conserved state), and the
cancel reply. Vite emits the worker as its own chunk (`dist/solver.worker-*.js`,
25 kB) alongside the single-file HTML.

**CEP bundle.** `src/lib/zip.ts` writes stored-entry ZIP archives with a fixed
default timestamp, so identical inputs produce byte-identical archives.
`src/lib/cepBundle.ts` assembles the six files and a manifest of SHA-256 hashes.
`oracle/verify_bundle.py` checks a bundle with Python's standard `zipfile` and
`hashlib` — software that did not write the archive — and also checks that the
`passed` flag agrees with the errors the manifest reports.

Reference bundle: 160 × 100 grid, 1,016,630 bytes, sha256
`068171ba257a83db74e1c97c3351fedeb1b925e64be4bd93b9ece41937228c27`, five artefact
hashes all verified, `RESULT: PASS`. At the production 360 × 220 grid the bundle
is 4,870 kB and verifies as `verdict=PASS beta_error=1.618%`.

Both run in CI: the `bundle` job builds a bundle and runs the Python verifier.
