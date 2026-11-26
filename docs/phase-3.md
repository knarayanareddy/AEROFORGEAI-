# Phase 3 — SU2 sidecar: what was built, and what was not

**Status: case and mesh writers validated against SU2 v8.6.0's own source. No SU2
solution exists, because SU2 could not be executed in this environment.**

> **Where this goes next:** the parsers, run harness and Slurm scripts that turn
> a real run into a graded result are scaffolded in
> [`phase-5-integration.md`](./phase-5-integration.md), with a tick-box
> checklist. Nothing there has been executed either — the gap is unchanged, it
> is just now navigable.

That distinction is the whole of this document. The previous phases ended with a
number that could be checked against theory. This one does not, and pretending
otherwise would be the single most damaging thing this project could do — a
plausible `.cfg` cited later as if it had produced a result.

---

## 1. What "sidecar" was supposed to mean, and what changed

The roadmap's Phase 3 is: *when the structured-grid Euler solver stops being
adequate, hand the case to SU2.* Phase 2 established exactly where it stops — the
isolator, where a shock train needs unsteadiness, viscosity and a back-pressure
boundary.

The intended deliverable was a working SU2 run of the Phase 2 inlet, cross-checked
against the in-browser solver on the ramp shocks. **That was not possible here.**

### Why SU2 could not be run

SU2 publishes prebuilt Linux binaries as GitHub release assets. Those assets are
served from `objects.githubusercontent.com` after a redirect:

```
HTTP/2 302
location: https://objects.githubusercontent.com/github-production-release-asset-…
```

That host is outside this sandbox's network allowlist and returns connection
failure (`curl` exit 35). Direct `curl` to the release URL, and the
`api.github.com/repos/.../releases/assets/<id>` route with
`Accept: application/octet-stream` (which also redirects there), both fail. There
is no `su2` or `pysu2` distribution on PyPI.

So the honest position is: **the capability is unavailable, and the work below is
what can be delivered without pretending otherwise.**

---

## 2. What *was* possible, and why it is worth something

`codeload.github.com` *is* reachable, so the complete SU2 v8.6.0 source tree can be
fetched. That source contains two things that are better than guesses:

- **The option registry**, `Common/src/CConfig.cpp` — every registered config key
  via `add*Option("NAME", …)`.
- **The enum maps**, `Common/include/option_structure.hpp` — every accepted enum
  spelling, e.g. `Upwind_Map` containing `AUSMPLUSUP`.

And the mesh reader source settles a question that would otherwise be a silent
bug: `CSU2ASCIIMeshReaderFVM.cpp` shows exactly how the ASCII format is parsed.

From that, this phase delivers a **validated case and mesh writer** rather than a
run.

### Why key-name validation is not cosmetic

SU2 silently ignores an unrecognised config key. A typo does not raise — the
solver falls back to the default and computes something else. `"CFL_NUBMER"` would
leave the CFL at its default value with no warning at all. For a file that is
going to be handed to a solver whose output matters, "it opens" proves nothing.

So the check is: every key emitted must exist in the registry mined from the
source, and every enum-style value must be a member of the maps.

---

## 3. The extracted schema

`oracle/su2_schema.py --extract <SU2 source tree>` produces
`oracle/su2_schema.json`:

| | |
|---|---|
| Registered options | **770** |
| Enum maps | 112 |
| Enum values | 510 |

CI re-extracts from a freshly downloaded v8.6.0 tree and asserts the committed
schema is identical. If SU2 renames an option, the job fails at the schema rather
than quietly emitting a case the solver ignores.

### Current case file

33 keys, all registered, all enum values known:

```
ok    33 config keys all registered, all enum values known
ok    mesh structure (NDIME/NPOIN/NELEM/NMARK, VTK quad type)

RESULT: PASS
```

The validator is also tested *negatively* — a deliberately misspelled key and a
deliberately wrong enum value must both be rejected, and CI runs that check. A
validator that accepts everything is worse than none.

---

## 4. The mesh writer, and the bug it avoided

The Phase 2 inlet mesh is written as SU2 ASCII. Two details came from the source,
not from memory:

1. **`NPOIN` lines are coordinates only** — `x y` in 2D, no node id. (Confirmed at
   `CSU2ASCIIMeshReaderFVM.cpp:362-378`.)
2. **Quads are in ring order, not VTK diagonal order.** This one matters.
   `CQuadrilateral::Change_Orientation()` does `std::swap(Nodes[1], Nodes[3])`,
   which is only a valid edge swap if the quad is stored as a ring
   (`n0,n1,n2,n3` around the perimeter). Under VTK's `(0,1,3,2)` convention the
   same swap crosses the quad.

   A wrong winding does **not** produce a parse error. It produces inverted or
   self-intersecting elements and a silently wrong answer. The test suite asserts
   ring adjacency directly (`n1-n0 == 1`, `n2-n1 == nx+1`, …) and asserts
   positive shoelace area for every element.

Markers are derived from the **same predicates the TypeScript solver uses**
(`inletMeshFor` is shared), so the exported mesh cannot disagree with the mesh
that was actually solved:

```
NMARK= 4
  wall      187 edges   (ramps + isolator floor + cowl inner surface + ceiling)
  far_top    53 edges   (open top ahead of the cowl lip)
  inlet       1 edge
  outlet      1 edge
```

The `far_top` split is not bookkeeping. Phase 2 found that imposing freestream
above the ramp shocks stalls the solve indefinitely; the corresponding SU2 mistake
is tagging that surface as a wall, which would put a solid boundary where the
shocks must leave the domain.

---

## 5. Verification status: precise

| Item | Status | Evidence |
|---|---|---|
| SU2 installed locally | **no** | release assets unreachable (`curl` 35), no PyPI package |
| SU2 run of the inlet | **not done** | — |
| Case option names valid | **yes** | 33/33 against the v8.6.0 registry |
| Case enum values valid | **yes** | against 510 extracted values |
| Schema matches SU2 source | **yes** | CI re-extracts and diffs |
| Mesh structure valid | **yes** | NDIME/NPOIN/NELEM/NMARK, VTK type 9 |
| Quad winding correct | **yes (by construction + test)** | ring-order adjacency, positive area |
| Mesh is a valid SU2 mesh | **not proven** | needs SU2 to read it |
| Solver agreement TS ↔ SU2 | **do not have** | requires both runs |

The last two rows are the gap. A file that satisfies a schema check is not the
same as a file a solver has successfully consumed, and this document does not
claim otherwise.

---

## 6. What the artifacts say about themselves

Every generated case file carries this in its header:

```
% STATUS: this file has NOT been run. SU2 is not installed in the
% environment that produced it. See docs/phase-3.md.
```

and the UI shows a `NOT RUN` badge beside the download buttons **before any run**,
not only after one. Three tests enforce this, including one that greps the case
file for success language (`validated`, `verified`, `run successfully`) and fails
if it appears.

The CEP bundle now carries `su2/inlet.su2` and `su2/inlet.cfg`, and the bundle
verifier checks that the manifest description repeats the caveat. The
`su2/inlet.su2` artifact is 502,888 bytes and hashes correctly against the
manifest.

---

## 7. What it would take to close this

In order, cheapest first:

1. **Run the case somewhere with network access to the SU2 binaries.** One
   command: `SU2_CFD inlet.cfg`. Then check `history.csv` for a converged residual
   and compare the ramp-shock angle against the 15.852° reference. If SU2 reports
   anything unexpected, the likely first culprit is mesh validity — that is the
   row marked "not proven" above.
2. **Cross-check the two solvers on the same mesh.** The in-browser result is
   β = 15.910° at 120×60. A SU2 run on `inlet.su2` should land within a few
   tenths of a degree; a larger gap means one of the two boundary treatments is
   wrong, and the `far_top` marker is where to look first.
3. **Only then, the isolator.** A shock train needs `SOLVER= RANS`, a turbulence
   model, a wall-resolved mesh (y⁺ ~ 1) and a back-pressure outlet. That is not a
   config change; it is a different mesh and a different problem. The Phase 2
   document explains why no amount of grid refinement in the current formulation
   gets there.

---

## 8. Files

| File | Purpose |
|---|---|
| `src/lib/su2Mesh.ts` | SU2 ASCII writer; markers from the shared geometry predicates |
| `src/lib/su2Case.ts` | v8.6 case file, with the unrun status in its header |
| `src/lib/su2Mesh.test.ts` | 12 tests: structure, ring ordering, winding, markers |
| `src/lib/su2Case.test.ts` | 8 tests, including "never claims to have been run" |
| `oracle/su2_schema.py` | Extracts and validates against the SU2 source registry |
| `oracle/su2_schema.json` | 770 options, 112 maps, 510 enum values, v8.6.0 |
| `scripts/build-su2-case.ts` | Emits the case + mesh CI validates |
| `.github/workflows/ci.yml` | `su2` job: fetch source, diff schema, validate, reject a broken case |

---

## 9. Honest summary

The roadmap said the isolator finding triggers the SU2 sidecar. It does — and the
sidecar's *inputs* now exist, generated from the same geometry the browser solver
used, with every option name checked against SU2's own source and every byte
hashed into the CEP manifest.

What does not exist is a SU2 solution. The environment cannot run SU2, and no
amount of careful writing substitutes for that. Phase 2's β = 15.910° remains the
only validated inlet number in this repository, and it came from the browser
solver, not from SU2.
