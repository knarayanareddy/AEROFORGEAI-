# Phase 5 — Integration: making SU2 and Slurm real

**Status: infrastructure scaffolded, nothing integrated. No SU2 run has been
performed and no Slurm job has been submitted.**

This document exists because two roadmap rows are unbacked:

| Gap | Why it is open |
|---|---|
| No SU2 solution | No SU2 binary is obtainable in the build environment |
| Slurm has no cluster | There is no controller to submit to |

Everything in this document is a task list for a person with access to a machine
that can run SU2. The parsers, the run harness, the grading script and the Slurm
scripts are written. What is missing is the execution, and the execution is not
something that can be faked.

---

## 1. What is already in place

| File | Status | What it does |
|---|---|---|
| `src/lib/su2Results.ts` | **written, tested** | Parses `history.csv` and `restart.csv`; every format rule cites a v8.6.0 source line |
| `scripts/harness.test.sh` | **11 checks, verified to fail pre-fix** | Regression suite for the four review defects (§1a) |
| `src/lib/su2Results.test.ts` | **27 passing, 1 skipped** | Synthetic fixtures only; the skipped test is the real-run test |
| `fixtures/su2/*.synthetic.csv` | **synthetic** | Hand-written to the documented format, loudly labelled |
| `scripts/su2-run.sh` | **written, never run** | Finds SU2, checks the version, generates the case, runs it, asserts the artefacts exist |
| `scripts/check-su2-results.ts` | **written, run on fixtures only** | Parses the output, checks internal consistency, prints the exact answer key |
| `deploy/slurm/su2-inlet.sbatch` | **written, never submitted** | One-node batch job |
| `deploy/slurm/submit.sh` | **written, never submitted** | Validates inputs, submits, polls to a terminal state |

The parsers are the part most likely to be correct, because their rules were read
out of the SU2 source rather than inferred. The harnesses are the part most likely
to be wrong, because shell, paths and cluster conventions differ everywhere.

---

## 1a. Defects found in review of the scaffold

The scaffold was reviewed and four defects were reported. **All four were real**,
and all four were the same class of bug: the script exited 0, or lost the
evidence, while appearing to work. They are recorded here rather than quietly
fixed, because this project's whole argument rests on not accepting green output
at face value.

| # | Defect | Consequence if shipped |
|---|---|---|
| 1 | `su2-run.sh` invoked the builder as `../scripts/build-su2-case.ts` | Under the documented default workdir `build/su2-run` this resolves under `build/`, so the harness aborted before running SU2 |
| 2 | `check-su2-results.ts` skipped the pressure check when `written > 0` was false | A diverged run (p ≤ 0) passed the consistency check and exited 0; Mach was NaN or Infinity |
| 3 | `su2Results.ts` used `Number('')`, which is `0` | A blank `Pressure` cell parsed as a valid zero, was then skipped by defect 2, and the run exit 0 "internally consistent" |
| 4 | `su2-inlet.sbatch` captured `PIPESTATUS` after a pipeline under `set -e` | A failing solver killed the script before the copy-back, losing `history.csv` and `su2.log` on sites that purge scratch |

Defects 2 and 3 **compound**: the blank cell became a zero, the zero skipped the
check, and the script reported success. Reproduced end-to-end before fixing:

```
Consistency
  pressure from (rho, rhoU, rhoV, E) vs written Pressure: worst relative 0.00e+0
RESULT: run parsed and internally consistent. Shock angle not yet extracted.
EXIT CODE = 0
```

That is a malformed restart reporting `0.00e+0` error and exiting 0. It is
precisely the false tick this project has been trying to avoid since Phase 0, and
it was in code written for the very feature meant to prevent false ticks.

### What stops them recurring

`scripts/harness.test.sh` — 11 checks, one per defect plus the guards that must
keep working. **Verified to fail against the pre-fix code**: 8 of 11 fail, 3 pass.
A test that passes both before and after a fix proves nothing, so this was
checked rather than assumed.

```
before the fix:  3 passed, 8 failed
after the fix:  11 passed, 0 failed
```

Running it in CI means the behaviour cannot silently regress.

### The fourth finding, partial

The reviewer also noted the `--version` probe in `su2-inlet.sbatch`
(`"${SU2_CFD}" --version 2>/dev/null | head -1 || true`). That line is
mitigated by `|| true` but is still untidy: it masks a missing binary that step 3
of the script would catch anyway. It is left in place because it is diagnostic
output, not a control, and the substantive checks that follow it are unaffected.

---

## 2. Getting an SU2 v8.6.0 binary

The release tarballs are on `objects.githubusercontent.com`, which is blocked from
this environment (the same block that stopped the OPA CLI in Phase 4). The source
tarball from `codeload.github.com` works, which is why `oracle/su2_schema.json`
could be built. Building SU2 from source is a 20–40 minute compile and needs
MPI and a C++ toolchain.

Three routes, in order of preference:

### Route A — container (recommended)

SU2 publishes prebuilt images. This is the only route that gives a reproducible
version without a local toolchain:

```bash
docker pull su2code/su2:8.6.0      # verify the tag exists first
docker run --rm -v "$PWD/build/su2-run:/work" -w /work \
  su2code/su2:8.6.0 SU2_CFD --help
```

**Verify this before relying on it.** The tag name and the binary path inside the
image are not confirmed here. If the image has `SU2_CFD` at a different path,
`scripts/su2-run.sh --su2-bin` takes an explicit path.

### Route B — conda

`conda install -c conda-forge su2` may have a matching build. Check the version:

```bash
SU2_CFD --version    # must report 8.6.0
```

A different version is not automatically a problem, but `oracle/su2_schema.json`
was extracted from the `v8.6.0` tag, and CI asserts the two match. A different
version means that job is comparing against the wrong registry and the config
validation stops meaning anything.

### Route C — build from source

```bash
curl -sSL -o su2-src.tar.gz \
  https://codeload.github.com/su2code/SU2/tar.gz/refs/tags/v8.6.0
tar xzf su2-src.tar.gz && cd SU2-8.6.0
./meson.py build --optimization=2 -Dwith-mpi=enabled
./ninja.py -C build install
```

This is what CI would do if the compile time were acceptable; it is not, which is
why the CI job validates the *schema* against the source rather than building.

---

## 3. The first real run

This is the whole task. Everything else is a consequence of it.

```bash
# 1. Prerequisites only — this runs today and exits 2
./scripts/su2-run.sh --check

# 2. The run
./scripts/su2-run.sh --su2-bin /path/to/SU2_CFD --workdir build/su2-run
```

`su2-run.sh` will:

1. Check the binary exists and prints a version containing `8.6.0`.
2. Run `scripts/build-su2-case.ts` in `build/su2-run` to write `inlet.cfg` and
   `inlet.su2`.
3. Run `SU2_CFD inlet.cfg` from that directory, teeing the console to
   `su2.stdout.log`.
4. **Assert that `history.csv` and `restart.csv` exist**, and exit 3 if not.

Step 4 is the one that will fail first if any format assumption in
`su2Results.ts` is wrong. That is deliberate: the script fails on a missing file
rather than letting `check-su2-results.ts` throw a stack trace later.

### Expected failure modes, in order of likelihood

| Symptom | Cause | Fix |
|---|---|---|
| `MISSING history.csv` | `CONV_FILENAME` not applied, or file named differently | Check `CONV_FILENAME` in `inlet.cfg`; SU2 appends `.csv` |
| `MISSING restart.csv` | `OUTPUT_FILES` did not take | `inlet.cfg` sets `OUTPUT_FILES= (RESTART_ASCII, PARAVIEW_ASCII, SURFACE_CSV)`; confirm SU2 echoed it |
| Parser throws `no iteration column` | `HISTORY_OUTPUT` lacks `ITER` | `inlet.cfg` sets `HISTORY_OUTPUT= (ITER, RMS_RES)` |
| Parser throws `not a finite number` | Column order differs from assumption | Read the actual header; the parser is name-driven except for `PointID` |
| Solver diverges in <100 iterations | CFL 6 is too aggressive for this mesh | Drop `CFL_NUMBER` to 2, then 1, and note it |
| `restart.csv` has 4 fields, not 7 | `WRT_RESTART_COMPACT` is on | It defaults to NO; if it is on, only coordinates and solution are written |

The `inlet.cfg` already sets `OUTPUT_WRT_FREQ= 500` and `CONV_RESIDUAL_MINVAL=
-8`. At 10 iterations per second on a 7,200-cell mesh that is roughly a minute
per 500 iterations, so the 30-minute Slurm ceiling is generous rather than
measured.

---

## 4. The part that is genuinely not written: shock extraction

After the run parses, there is one more piece of code to write, and it is the
part I deliberately did **not** guess at.

`check-su2-results.ts` prints the exact answer key (β = 18.3869°, p₂/p₁ = 3.3448
at M 5.5, θ 10°) and the inflow Mach sampled from the restart, but it does not
report the solved shock angle. The reason:

- `extractWedgeShock` in `src/lib/wedge.ts` works on a **structured nx × ny
  grid**. It takes a `Float64Array` of nodal values and a grid shape, finds the
  shock by taking the median of local column-wise slopes, and refines it.
- The SU2 restart is a **flat point list** with no shape attached.

To connect them you need the mesh topology. Options, in order of least invented
work:

### Option 1 — reuse the generator's own indexing (simplest)

`src/lib/su2Mesh.ts` writes the mesh, so it knows the point ordering. If the
restart preserves that ordering (SU2 writes points in mesh order for a
single-zone problem), you can reshape the restart arrays into the original
`nx × ny` grid and call `extractWedgeShock` unchanged.

**Verified while writing this document:** the generated mesh is
`NPOIN= 7381`, `NELEM= 7200` (all type 9, quadrilateral), from
`inletMeshFor(design, 120, 60)`. So the point list is
`(nx+1) × (ny+1) = 121 × 61 = 7381`, which is a structured grid flattened in
row-major order — **not** an arbitrary cloud. That makes Option 1 plausible.

It is still an assumption until checked. The check:

```ts
import { inletMeshFor } from '../src/lib/inletSolve';
import { DEFAULT_INLET } from '../src/lib/inlet';

const mesh = inletMeshFor(DEFAULT_INLET, 120, 60);
const g = mesh.grid as { x: Float64Array; y: Float64Array };

// The restart is row-major over (nx+1) × (ny+1) if SU2 preserved mesh order.
// Compare every point, and report the worst deviation rather than passing on
// the first match: a partial match is a reordering, not agreement.
let worst = 0;
for (let i = 0; i < rest.nPoints; i++) {
  worst = Math.max(worst, Math.abs(g.x[i] - rest.byName.get('x')!.values[i]),
                          Math.abs(g.y[i] - rest.byName.get('y')!.values[i]));
}
console.log('worst coordinate deviation', worst);
```

If `worst` is ~0 (say < 1e-12), the ordering is preserved and you can index
straight into a reshaped grid. If it is large, use Option 2.

Note the shape: `mesh.grid` is `{ x: Float64Array, y: Float64Array }` over
`(nx+1) × (ny+1)` nodes, and the solver arrays are cell-centred
(`nx × ny`). Check which one the restart corresponds to before writing the
reshape — being off by one in a dimension produces a visual shear that is easy
to misread as a physics bug.

### Option 2 — rebuild the grid from coordinates

If the ordering is not preserved, bin the points by their `y` coordinate into
`ny` rows, sort each row by `x`, and reshape. This is mechanical but needs care
at the wall where the mesh may have been refined.

### What the grading should then assert

Same criterion as Phase 1, so the result is comparable:

| Quantity | Criterion | Phase 1 achieved |
|---|---|---|
| β | within 2 % of θ-β-M | +1.62 % |
| p₂/p₁ | within 2 % of theory | −0.04 % |

Report both, plus the grid and the solver settings, because a comparison between
two solvers on different grids is not a comparison.

---

## 5. Making CI verify it

Once a run has succeeded once, the artefacts can be committed and CI can grade
them without needing SU2:

1. Copy `history.csv` and `restart.csv` to `fixtures/su2/` under their real
   names (`history.csv`, not `history.synthetic.csv`).
2. Un-skip the test in `src/lib/su2Results.test.ts` that reads them.
3. Add a CI step running `scripts/check-su2-results.ts --workdir fixtures/su2`
   and asserting the β and p₂/p₁ criteria.
4. Delete the synthetic fixtures and the paragraphs in `docs/phase-3.md` and
   this document that say no run exists.

**Do not skip step 4.** A repository that keeps both synthetic and real fixtures
will eventually have someone cite the synthetic one.

What CI still cannot do: re-run SU2. The compile is too slow for per-push CI. A
nightly job with the container is the honest way to get that coverage, and it
should be described as nightly rather than implied to be per-push.

---

## 6. Slurm

`deploy/slurm/` is written and untested. The honest first step is smaller than
it looks:

```bash
# On the cluster, from a login node that has sbatch:
export SU2_CFD=/path/to/SU2_CFD
export CASE_DIR=/path/to/build/su2-run     # inlet.cfg and inlet.su2 must exist
./deploy/slurm/submit.sh --dry-run          # prints the exact sbatch command
./deploy/slurm/submit.sh --partition <name>
```

### Site-specific things to expect to change

| Directive | Why it will probably need editing |
|---|---|
| `--cpus-per-task=4` | SU2 runs single-threaded unless built with OpenMP; 4 is for the OS, not the solver |
| `--time=00:30:00` | Not measured. Adjust after the first run reports its wall time |
| `--mem=4G` | 7,381 points is tiny; 4G is generous. A real mesh needs more |
| `--partition` | Site-specific; passed as an argument rather than hardcoded |
| `SU2_CFD` on `PATH` | If the cluster uses modules, add `module load su2` to the sbatch file |

### The MPI question

The sbatch script runs one task. SU2 built with MPI can be launched as
`mpiexec -n N SU2_CFD inlet.cfg`, and `scripts/su2-run.sh` supports
`--nprocs N` for that. But with 7,381 points, parallel decomposition gains
almost nothing and makes the failure modes worse. **Start with one rank.** Raise
it only when the mesh grows.

---

## 7. Checklist

Copy this into the PR that closes the gap. Each box needs an artefact, not an
assertion.

```
[ ] SU2 binary obtained, version confirmed as 8.6.0          -> paste `SU2_CFD --version`
[ ] ./scripts/su2-run.sh --check passes                       -> paste the output
[ ] First run completes, exit 0                               -> paste the tail of su2.stdout.log
[ ] history.csv parses                                        -> paste the convergence summary
[ ] restart.csv parses                                        -> paste nPoints and the field list
[ ] Pressure cross-check agrees to <1e-3 relative             -> paste the number
[ ] Shock extraction wired (Option 1 or 2)                    -> the code, in this PR
[ ] beta within 2% of theta-beta-M                            -> paste the value and the criterion
[ ] p2/p1 within 2% of theory                                 -> paste the value and the criterion
[ ] Real fixtures committed, synthetic ones deleted            -> `git ls-files fixtures/su2`
[ ] Skipped test un-skipped and passing                       -> paste the test name
[ ] Slurm dry-run prints a sane sbatch command                -> paste it
[ ] Slurm job COMPLETED on a real cluster                     -> paste `sacct -j <id>`
[ ] Docs updated: phase-3.md, phase-5-integration.md, roadmap -> the diff
```

The last row of the checklist is the one that matters most. When the run
happens, `docs/phase-3.md` §5 must change from *"no SU2 solution exists"* to
whatever actually happened, with the numbers. That is the difference between
this project's documentation and a brochure.

---

## 8. What this document does not do

- It does not claim SU2 works. Nothing has been run.
- It does not guess the shock extraction. The remaining work is described, and
  the reason it was not guessed is stated.
- It does not estimate run times. The Slurm ceiling is a guess and is labelled
  as one.
- It does not promise the container route works. The tag is unverified here.
