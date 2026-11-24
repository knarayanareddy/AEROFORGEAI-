# AeroForge AI — The Pathway Forward

**An end-to-end read of the review bundle `aeroforgeai-review-and-integration-strategy.zip`
(Drive: `1S0YhreYvRId2108tpUFC9jSJeN7LWZ-v`), checked line-by-line against this repository
at commit `84f0c95`.**

> What it is: not a design document, and not a patch. It is a **review + integration
> blueprint** delivered as a small React/Vite single-page app (22 source files, ~3.7k lines,
> builds to one 448 kB `index.html`). It audits the current repo, re-derives its physics from
> first principles, and specifies the architecture needed to turn the demo into a working
> platform.

---

## 1. TL;DR — the verdict in one paragraph

The current repo is a **polished cockpit with no engine**. It is real, well-built React 19 +
Tailwind 4 front-end code (5,975 lines of `src/`, 22 passing tests, clean `tsc`/`eslint`, 952 kB
single-file build) sitting in front of a 6,806-line design doc that is essentially **0 %
implemented in code**. No Python, no server, no CAD kernel, no mesher, no solver, no artifact
is ever produced. The headline input — the natural-language prompt — is **thrown away**
(`handleRunAgent(_prompt)`), and several hard-coded engineering numbers are **physically wrong**
in ways that would be dangerous if anyone trusted them (Ti-6Al-4V "PASS" at 1650 K; a 13° two-ramp
inlet claimed to reach M = 2.8 when theory gives M ≈ 4.13).

The review's own estimate — **~11 % of the 16 designed layers are implemented**, with 0 backend
LOC — matches what I measured.

**The pathway forward is a 5-phase build, in this order:**

| Phase | Weeks | What "done" means |
| --- | --- | --- |
| **P0 — Make the demo honest** | 0–1 | UI labels what is real vs demo; every number derives from one tested physics module; no false PASS. |
| **P1 — One real vertical slice** | 2–5 | Prompt → CadQuery → Gmsh → SU2 → PyVista → downloadable STEP + case + report, on a **wedge with an exact answer** (β, p₂/p₁ within 2 %). |
| **P2 — The flagship inlet (2D→3D)** | 6–10 | Real mixed-compression inlet with cowl/isolator/bleed, analytic sizing gate, 2D RANS, validated KPIs. |
| **P3 — Close the loop** | 11–16 | KPI misses drive automatic geometry edits; NSGA-II / Bayesian / adjoint with provenance. |
| **P4 — Harden** | 17+ | OIDC/RBAC, OPA export-control policy, hash-chained audit, signed bundles, K8s/Slurm. |

The single most important architectural instruction in the whole bundle:
**keep the front-end, and replace the data source, not the UI.** Roughly 80 % of the existing
UI survives; what changes is where its numbers come from (constants → API + SSE) and what the
viewers render (SVG/CSS-grid mock-ups → real geometry and fields).

---

## 2. What the bundle actually contains

| File | Lines | Role |
| --- | --- | --- |
| `src/App.tsx` | 138 | Shell, sticky nav, scroll-spy progress, 7 sections |
| `src/sections/Verdict.tsx` | 180 | 16-layer reality map (implemented / simulated / not started) |
| `src/sections/Audit.tsx` | 237 | Panel-by-panel "claim vs mechanism" + 12-finding log |
| `src/sections/Physics.tsx` | 249 | Live oblique-shock recomputation + interactive design finder |
| `src/sections/Workflow.tsx` | 494 | Animated before/after dataflow graphs with play/loop |
| `src/sections/Changes.tsx` | 409 | 10 architectural principles, file map, 5-phase roadmap, stack picks |
| `src/sections/Catalog.tsx` | 147 | 30 open-source candidates scored for fit × difficulty, with licence class |
| `src/sections/Playbook.tsx` + `Composer.tsx` | 593 | 5 integration strategies, readiness scorecard, 8-step recipe, 9 seams, stack composer |
| `src/data/{workflow,recipes,catalog}.ts` | 1,097 | Node graphs, copy-paste contract code, tool metadata |
| `src/lib/shock.ts` | 99 | Exact θ–β–M relations (the only "real" physics in the bundle) |
| `src/components/ui.tsx`, `index.css`, `main.tsx` | ~220 | Dark aerospace design system |

It builds cleanly (`vite build` → `dist/index.html`, 447.6 kB / 144 kB gzip). I reproduced the
build in a scratch copy and verified the source matches what the sections claim.

### The seven sections, in effect

1. **Verdict** — grades 16 layers promised by `completedesigndoc.md` against what physically
   exists. Short answer: 1 built (UI shell), 9 simulated, 6 not started. Overall ≈ 11 %.
2. **Repo audit** — for each of the 8 panels: what the UI *shows* vs the *mechanism* that
   produces it, then a ranked findings log (3 critical / 4 high / 4 medium / 3 low).
3. **Physics check** — an interactive page that re-derives the repo's own design point with
   exact oblique-shock theory, live sliders, and a "how many shocks do you actually need?"
   solver.
4. **Before / After** — two animated graph topologies. "Before" is the timer-driven illusion;
   "After" is UI → gateway → orchestrator → LLM/KG → CAD → validation → mesh → solver → post →
   optimiser → artifact store → bundle, with a loop-back toggle.
5. **What must change** — 10 architectural principles (derive-don't-store, job protocol, adapter
   contracts, CEP as JSON Schema, geometry tagging, sandboxing, template-first, V&V ladder,
   provenance, honest UI), a file-level migration map, and the phased roadmap.
6. **OSS catalog** — 30 tools (FreeCAD, CadQuery, build123d, OCCT, OpenVSP, SALOME, Gmsh,
   SU2, OpenFOAM, PyVista, pymoo, OpenMDAO, Dakota, meshio, AeroSandbox …) with licence class,
   headless capability, I/O formats, fit and integration difficulty.
7. **Integration playbook** — five strategies (wrap / embed / plugin / fork / reimplement), a
   decision helper, a readiness scorecard, an 8-step recipe, and **working code**: a tool
   manifest, adapter `Protocol`s, a container runner, an SSE endpoint, a `useJobStream` React
   hook, a contract test, and a proposed **CEP v1.1** JSON.

---

## 3. Verification — I re-ran the numbers against the actual repo

Everything below I checked myself, either by reading this checkout or by recomputing the physics
independently (γ = 1.4, weak-shock branch).

### 3.1 Software claims — all confirmed

| Claim | Measured |
| --- | --- |
| `tsc --noEmit` clean | ✅ 0 errors |
| `eslint .` clean | ✅ 0 warnings |
| `vitest run` 22 / 22 pass | ✅ 3 files, 22 tests |
| `vite build` ≈ 919 kB | ✅ **952.06 kB** (267.61 kB gzip) |
| "No server / zero fetch/WebSocket" | ✅ no `fetch(`, `WebSocket`, `EventSource` anywhere in `src/` |
| "CAD panel 794 LOC, CFD 577, …" | ✅ exact matches |
| "~5.7k lines of front-end" | ✅ 5,975 lines of `.ts/.tsx/.css` |
| "8 static verdicts", "500-point convergence curve", "48×22 CSS grid" | ✅ all three exact (`generateConvergenceData` is `1e-1·exp(−i/55)` + seeded noise) |
| "Code has no localStorage" | ✅ **stronger than the review says** — no persistence of any kind exists |
| "10 component types, 1 full scenario" | ✅ `ComponentType` has 10 members; `DESIGN_LIBRARY` has 6 cards |

Panel-level mechanism claims also hold: the CAD panel drives exactly **three** of its ten sliders
into the drawing (`geo-01` capture height appears only as a text label; `geo-03`/`geo-04` are the
only ones with geometry effect); the Knowledge panel falls back to `Math.random()` for any query
outside its 4 canned strings; the Export panel contains **no** `Blob`/`createObjectURL` at all.

### 3.2 Physics claims — all confirmed, and they are the important part

Recomputed from the repo's own design point (M∞ 5.5, ramps 7.2° + 5.8°, γ = 1.4, weak solution):

| Quantity | Repo claims | Recomputed | Verdict |
| --- | --- | --- | --- |
| β₁ (7.2° ramp at M 5.5) | — | **15.85°** | — |
| M after ramp 1 | "4.10" | **4.655** | repo label wrong |
| M after ramp 2 (isolator entry) | **2.80** | **4.131** | ❌ off by 1.3 Mach |
| Static pressure ratio p/p∞ | **18.4** | **4.66** | ❌ off by ~4× |
| Total-pressure recovery π | **0.873** | **0.905** | plausible for 13° turning, but that flow is at M ≈ 4 |
| Stagnation temperature T₀ | "T_total = 216.65 K" | **1,527 K** | ❌ 216.65 K is *static* tropopause T, not total |
| Adiabatic wall temperature (r = 0.89) | "1650 K < 1750 K → PASS" | **1,383 K** | Ti-6Al-4V service ceiling ≈ 870 K — neither number is an allowable |
| Pressure-ratio formula `phys-04` | `(1+γM²sin²β)/(γ+1)` | `1 + 2γ/(γ+1)(M²sin²β − 1)` | ❌ displayed form off by ≈ 2× at hypersonic Mach |

And the review's most interesting diagnostic claim — that the repo's M = 2.8 **and** p/p∞ = 18.4
are *mutually consistent* but belong to a **different machine** than the one drawn — is exactly
right. My independent solve:

| Equal-strength design | Turning per shock | Resulting M | p/p∞ | π |
| --- | --- | --- | --- | --- |
| 2 shocks | 14.83° | 2.800 | 18.3 | **0.534** |
| 3 shocks | 10.69° | 2.800 | 23.6 | 0.687 |
| 4 shocks | 8.33° | 2.800 | 26.9 | 0.784 |
| 5 shocks | 6.80° | 2.800 | 29.0 | 0.845 |
| **Repo's 13° (7.2+5.8)** | 13° total | **4.131** | **4.66** | 0.905 |

So the UI's geometry, its pressure ratio and its recovery come from **three different designs**,
and nothing flags it because no physics executes. The review's phase-2 target (`π ≥ 0.6`, 4-shock
mixed compression) is the correct engineering answer.

**The fix is cheap.** The bundle's `src/lib/shock.ts` is 99 lines and produces exactly these
numbers. Ported to the backend as `physics/oblique_shock.py` with tests against NACA-1135, it
becomes the single source of truth for geometry → KPIs → validation, and the "illustration"
becomes a calculator.

### 3.3 Where the bundle itself is wrong or incomplete

**Correction first.** In my initial pass I wrote that the orchestrator node was missing from the
"after" graph. That was **wrong** — I have since scripted the check. `afterNodes` defines all 13
ids (`ui, api, orch, llm, kg, cad, val, mesh, cfd, post, opt, art, out`), and every `seq`,
`loopSeq`, `labels` key and `extra` edge in both modes resolves. **Both workflow graphs are
structurally complete.** I also checked the two `labels` keys that *look* wrong (`timer>cad`,
`opt>exp`) — they belong to the before-block's illusion set and are unused by the after mode.

What does actually hold up, verified by rendering rather than reading:

1. **The `su2` recipe template does not render.** I extracted it and ran it through Jinja2 with
   `StrictUndefined`. It fails immediately: **`mesh_file` is undefined**, then `cep` — the
   template's two top-level parameters are never documented next to it. Supply those and it
   renders, but then: **`{{ u_inf }}` is still undefined** (it is not a CEP field and appears in
   no caller), so the one line that feeds the inlet condition cannot be produced. The recipe is
   illustrative, not runnable. Fix before anyone copies it.
2. **The rendered case does not match the CEP it is rendered from.** Two mismatches, both real:
   - The template consumes `cep.freestream.T_static_k`, but the CEP v1.1 sample defines
     `T_static_k` only *inside* `geometry.tags`-style objects — the freestream object has
     `mach`, `altitude_m`, `p_static_pa` and **no `T_static_k`**. (Rendering with my own CEP
     worked; rendering with the bundle's own CEP silently produces a blank temperature.)
   - `MARKER_SYM = ( symmetry_z0, symmetry_z1 )` requires **both** symmetry planes, but the CEP
     sample declares only `symmetry_z0`. The mesh recipe's tag rule set does produce both — so
     the contract example and the solver template disagree on what a valid CEP contains. That is
     exactly the class of bug the bundle's principle 4 is supposed to prevent.
3. **`MARKER_SUPERSONIC_INLET` signature is right, but under-specified.** It takes
   `( marker, T_static, p_static, u, v, w )` — a **velocity vector in m/s**, which is correct per
   [SU2's docs](https://su2code.github.io/docs_v7/Markers-and-BC/). But the template passes
   `u_inf` as a bare scalar with no derivation shown, and it also sets
   `MACH_NUMBER= 5.5` + `AOA= 0.0` in the same file. In SU2 `MACH_NUMBER`/`AOA` set the
   **freestream/initialisation** state, while the inlet marker's velocity sets the **boundary**
   state; if `u_inf` is computed from anything other than the same CEP freestream, the case is
   inconsistent at the boundary. Worth making the derivation explicit.
4. **"five pre-written steps" is off by one.** The bundle says five in three places
   (`workflow.ts:61`, `Audit.tsx:38`, `Verdict.tsx:22`); `CAD_AGENT_STEPS` has **six**
   (`step-01` … `step-06`). Purely cosmetic, but the audit is otherwise exact enough that the
   reader will notice.
5. **The readiness scorecard checks itself.** Its presets are the author's own assessment
   (`PRESETS` in `Playbook.tsx`), so it cannot disagree with the catalogue. A teaching tool, not
   a measurement — don't quote the score as evidence.
6. **It preaches a demo banner it doesn't have.** Principle 10 asks for a DEMO/LIVE indicator;
   the bundle's own app has no banner, and its only persistence is a roadmap checklist in
   `localStorage`.

**Not the bundle's fault, but adjacent:** `llama3.2:70b` is not a real model (Llama 3.2 ships
1B/3B/11B/90B). That string lives in *this repo* (`App.tsx:24`, `CADAgentPanel.tsx:591`,
`ExportHandoffPanel.tsx:34`) and in the design doc — the bundle merely quotes it while auditing.
The bundle's own CEP correctly uses `qwen2.5-coder:32b`; adopt that in the P0 pass.

---

## 4. The architecture the bundle specifies (and I endorse)

```
Browser (React 19)  ──POST /v1/sessions──▶  FastAPI gateway  ──▶  Orchestrator (state machine)
       ▲                                        │                       │
       └──── SSE /v1/sessions/{id}/events ◀─── events ◀──────┬─────────┴─────────┐
                                                             ▼                   ▼
                                                     LLM router (LiteLLM)   Physics + KG
                                                     Ollama / BYOK          oblique_shock, ISA,
                                                     JSON-schema            materials, RAG
                                                             │
                                          ┌──────────────────┴──────────────────┐
                                          ▼                  ▼                  ▼
                                    CadAdapter          MeshAdapter        SolverAdapter
                                    CadQuery/FreeCAD    Gmsh/snappy        SU2 / OpenFOAM
                                          │                  │                  │
                                          └── STEP+tags.json ─┴── mesh+markers ─┴── flow.vtu
                                                                                   │
                                                              PostAdapter (PyVista) → kpis.json
                                                                                   │
                                                              Artifact store (CAS, sha256) → bundle
```

### The ten principles — my notes on each

| # | Principle | Verdict |
| --- | --- | --- |
| 1 | **Derive, don't store** — one `DesignState`, pure physics | The single highest-leverage change. `handleParamChange` already exists; it just needs to recompute instead of fading a badge. |
| 2 | **Real backend with a job protocol** — sessions, jobs, SSE, artifacts | Right call. SSE over WebSockets for one-way progress is correct; add `Last-Event-ID` resume. |
| 3 | **Adapter contracts, not integrations** — 4 `Protocol`s | Correct and, importantly, *small*. Four interfaces is achievable; a "plugin framework" would not be. |
| 4 | **CEP v1.1 as versioned JSON Schema** | Right, and it fixes a real bug: store **static** p∞, T∞, M∞ + altitude and derive totals. The repo currently pairs sea-level p with tropopause T. |
| 5 | **Geometry tagging → automatic BCs** | This is the best technical insight in the bundle. Plain STEP loses face names; `tags.json` matched by centroid is what makes CAD→CFD automation possible without a human clicking faces. |
| 6 | **Sandbox everything an LLM can influence** | Non-negotiable for aerospace IP. `--network none`, read-only FS, 60 s timeout. |
| 7 | **Template-first, free-form second** | Correct trade: 8–10 tested templates + LLM fills a JSON instance of a schema beats unconstrained codegen. |
| 8 | **V&V ladder** — wedge, Sod, NACA 0012, flat plate, bell nozzle | The only way to know a number is physics rather than hope. Gate merges on it. |
| 9 | **Provenance by default** — content-addressed, image digests, prompt hashes | Required for the doc's "traceability" claim to mean anything. |
| 10 | **Honest UI** — LIVE / CACHED / DEMO chips | Do this first. It is one day of work and it converts a liability into an asset. |

### The seams the bundle identifies (and I agree are where "seamless" is won)

Units (SI internally, `pint` at the boundary) · coordinate frames (CAD y-up vs CFD x-streamwise,
symmetry planes, AoA sign) · names→boundaries (the tags sidecar) · tolerance/healing (OCC
`ShapeFix`) · mesh semantics (physical groups vs patches, re-verify after `gmshToFoam`) ·
steady vs transient convergence normalisation · a **typed failure taxonomy** (boolean fail,
mesh-quality fail, divergence, OOM, timeout — each with a recovery action) · determinism
(strip STEP timestamps, pin thread counts and seeds) · hardware/resources in the manifest.

### Recommended first stack (I checked every pick against licence + headless reality)

**CadQuery / build123d** (Apache-2.0, pip, deterministic) → **Gmsh** (GPL-2.0 with linking
exception — run as separate process) → **SU2** (LGPL-2.1, density-based RANS + discrete adjoint)
→ **PyVista** (permissive) for KPIs and field export; **pymoo** + **BoTorch** for the loop;
**Postgres + MinIO + pgvector** for state, provenance and embeddings; **LiteLLM → Ollama** by
default, BYOK opt-in. Add **FreeCAD** as a second CAD adapter only when you need assemblies,
TechDraw or FCStd round-trip; **OpenFOAM** only when you need transient physics.

Two licence facts from the bundle worth repeating: GPL tools (OpenFOAM, Gmsh, CalculiX,
OpenSCAD) must stay behind a **process boundary**; and open-source tooling does **not** remove
ITAR/EAR obligations on the designs you generate.

---

## 5. What this repo must do, concretely

### Phase 0 (week 0–1) — make the demo honest  ✅ **DONE** — see [`phase-0-implementation.md`](./phase-0-implementation.md)
Files: `src/data/aeroforgeSimulationData.ts`, `export/ExportHandoffPanel.tsx`,
`cad/CADAgentPanel.tsx`, `cfd/CFDAgentPanel.tsx`, `knowledge/KnowledgeGraphPanel.tsx`.

- [x] Add the physics core, with tests: shipped as `src/lib/obliqueShock.ts`,
      `atmosphere.ts` (ISA), `materials.ts`, `inletDesign.ts`. **Every** KPI in the data file
      is now a call into these.
- [x] Recompute the scramjet design point from the physics: either keep 13° and report
      M ≈ 4.1 / p ≈ 4.7, or move to a 4-shock, 33° design and report M 2.8 / π 0.78. Do not
      keep the current mix.
- [x] `val-05`: replace "Ti-6Al-4V PASS at 1650 K" with a real allowable (≈870 K service, cited)
      and a FAIL + recommendation (Inconel 718 / C/C or active cooling).
- [x] Fix the `phys-04` formula string; render formulas from the same function that computes them.
- [x] Relabel `AS9100D COMPLIANT` → "AS9100D-aligned traceability (preview)"; same for ITAR/EAR.
- [x] Add a global DEMO banner + per-panel provenance chips.
- [x] Replace `Math.random()` in the Knowledge panel and the dashboard health gauges;
      replace `llama3.2:70b` with a real model id. Enforced by an ESLint
      `no-restricted-properties` rule, so it cannot return.
- [x] Wire `handleRunAgent(prompt)` to a schema-validated `DesignIntent` and render *that*
      instead of the canned timeline. Shipped as the in-browser `src/lib/designIntent.ts`
      parser; the HTTP endpoint (`POST /v1/intent`) is still Phase 1, and the panel says so.

**Outcome:** 8 of 8 items done. The prompt now drives the physics; the only part of item 8
still open is the HTTP transport, which is Phase 1 work by definition. Gates: typecheck and
lint clean, **186** tests (was 22), build 945 kB / 272 kB gzip.

Four of the eight were closed *after* the first "Phase 0 complete" claim, which was made too
early — see §10 of [`phase-0-implementation.md`](./phase-0-implementation.md) for what was
missed and what now prevents it.

### Phase 1 (week 2–5) — one real vertical slice  ✅ **EXIT CRITERION MET** — see [`phase-1-slice.md`](./phase-1-slice.md)

> **Scope change, agreed before implementation:** the solver is a TypeScript Euler
> code in the browser, not SU2 + Gmsh + CadQuery behind FastAPI. The single-file
> Vite build deploys to Vercel as static HTML, and SU2/Gmsh cannot run in this
> sandbox (no root, `gmsh` needs `libGLU`). A Python/numpy oracle grades the
> TypeScript solver so the two codes cross-check. Items below marked ⤳ were
> delivered in the substitute form; the rest remain open.

- [ ] ⤳ `backend/` FastAPI app: `POST /v1/sessions`, `GET /v1/sessions/{id}/events` (SSE),
      `GET /v1/artifacts/{sha}`. Pydantic v2 models = the OpenAPI source of truth.
- [ ] Job queue (Arq/Celery + Redis) + job table (SQLite for dev, Postgres for prod).
- [ ] `CadAdapter` with **wedge** and **naca4** templates in CadQuery, emitting STEP + STL +
      `tags.json` + `qa.json`.
- [ ] `MeshAdapter` (Gmsh 2D, physical groups from tags, y⁺-driven first cell) with a
      mesh-quality gate.
- [ ] `SolverAdapter` (SU2 Euler/RANS) streaming `history.csv` rows as SSE; type the failure modes.
- [ ] `PostAdapter` (PyVista): shock angle β and p₂/p₁ extracted from the field.
- [ ] Artifact CAS keyed by sha256 + manifest; `bundle.zip` with STEP + case + report.
- [x] ⤳ CI golden tests: **wedge (β, p₂/p₁ within 2 %) passes at 5°, 10° and 15°**.
      Sod tube and NACA 0012 are not written. **The golden test is not yet wired into
      CI** — there is no workflow file, so nothing enforces it on a PR.
- [x] ⤳ Front-end: a new **Wedge Verification** panel drives the real pipeline and
      serves STEP + report. The older CAD/CFD/Export panels still show derived-but-static
      values and are labelled as such.

**Exit criterion:** a wedge at M 5.5 gives β and p₂/p₁ within 2 % of exact theory, driven
entirely from the UI, with a publicly downloadable STEP + case + report.

**Outcome: met.** θ = 10°: β +1.62 %, p₂/p₁ −0.04 %. θ = 15°: 1.48 % / +0.01 %.
θ = 5°: 1.75 % / −0.04 %. Cross-checked by an independent numpy solver
(β +1.73 %, p₂/p₁ −0.04 %). STEP is a watertight ISO 10303-21 solid. Report is
generated per run. Full record in [`phase-1-slice.md`](./phase-1-slice.md).

### Phase 2 — inlet with cowl and isolator

**Outcome: ramp shocks validated, isolator explicitly out of scope.**

The first ramp shock is recovered from the CFD field at **15.910° against 15.852°
of oblique-shock theory (+0.36 %)** and **2.469 against 2.4666 on p₂/p₁
(+0.08 %)**, gated in CI. The second ramp shock cannot be measured on this geometry:
the cowl lip truncates it before it becomes a straight line, so it is reported as
undetected rather than fitted. The isolator is not validated and cannot be by this
solver — a shock train is unsteady and separation-driven. Full record, including
the three failed extraction strategies and the two geometry findings, in
[`phase-2.md`](./phase-2.md).

This is exactly where the structured-grid approach stops earning its keep, which
is the trigger for the SU2 sidecar in Phase 3.

### Phase 3 — SU2 sidecar

**Outcome: inputs built and validated against SU2 v8.6.0's own source; no SU2
solution exists.**

SU2's prebuilt binaries are served from `objects.githubusercontent.com`, which this
environment cannot reach, and there is no PyPI distribution. Rather than write an
adapter that shells out to a solver that is not there, this phase delivers what can
actually be verified: a case and mesh writer whose 33 config keys are checked
against the 770-option registry mined from the SU2 v8.6.0 source, with the schema
re-extracted and diffed in CI, and a mesh whose quad ordering is asserted against
`CQuadrilateral::Change_Orientation()`.

Every artifact says it has not been run, in the file, in the manifest and in the UI.
Full record, including the precise verification-status table and what it would take
to close the gap, in [`phase-3.md`](./phase-3.md).

The isolator itself is still unmodelled. A shock train needs RANS, a wall-resolved
mesh and a back-pressure outlet — a different problem, not a config change.

### Phase 4

As the roadmap table above. Two sequencing notes I would add:

- **Do the V&V ladder before the scramjet inlet**, not concurrently. A wrong answer on a wedge is
  debuggable in an hour; on a 3-shock inlet with shock–boundary-layer interaction it is a
  multi-week rabbit hole with no ground truth.
- **Do not build the optimiser until `evaluate(x) → y` is cached and deterministic.** Otherwise
  every "generation" is a fresh CFD run and the loop is unaffordable before it is useful.

---

## 6. How I would use the bundle from here

Treat the zip as **three reusable assets**, not as a document to read once:

1. **The physics module (`src/lib/shock.ts`)** — lift it verbatim into `backend/physics` and
   `src/lib` in Phase 0. It is the cheapest correctness win in the project.
2. **The contract code (`src/data/recipes.ts`)** — `ADAPTER_PY`, `RUNNER_PY`, `SSE_PY`,
   `HOOK_TS`, `CEP_V11`, `MANIFEST_YAML` are close enough to paste, provided you fix the SU2
   template (defect 1/2 above). They encode the right shape: four `Protocol`s, JSON-line events,
   a pinned-digest manifest.
3. **The roadmap JSON** (`PHASES` in `Changes.tsx`) — it already has goals, exit criteria and
   deliverable checklists. Move it into `docs/pathway-forward.json` and let CI report progress
   against it, so the plan cannot silently drift away from the code.

### The one thing the bundle cannot give you
It cannot make the physics *right* at the fidelity AeroForge claims. Inviscid oblique-shock
theory is necessary but not sufficient: at M ≈ 5.5 you will need real-gas effects (small but
non-zero), shock–boundary-layer interaction, isolator shock-train behaviour and bleed — none of
which the analytic kernel captures. The right posture is the one the bundle already implies:
**analytics size the design and gate the cheap decisions; the solver decides; the V&V ladder
tells you when the solver is lying to you.** Keep those three roles separate and the platform
can grow into the design doc without ever again emitting a number it cannot defend.

---

## 7. Appendix — reproducible checks

```bash
# this repo, current state
npm ci && npm run typecheck && npm run lint && npm test && npm run build
# → 0 errors, 0 warnings, 22/22, dist/index.html 952.06 kB (267.61 kB gzip)

# the bundle
unzip aeroforgeai-review-and-integration-strategy.zip -d /tmp/review
cd /tmp/review && npm install && npm run build
# → dist/index.html 447.57 kB (144.33 kB gzip)

# spot-checks on the claims
grep -n "handleRunAgent" src/components/cad/CADAgentPanel.tsx      # _prompt, unused
grep -rn "fetch(\|WebSocket\|EventSource" src/                     # (no matches)
grep -rn "Blob\|createObjectURL" src/                              # (no matches)
grep -n "101325\|216.65" src/components/cfd/CFDAgentPanel.tsx      # sea-level p with tropopause T
grep -n "18.4\|2.80\|0.873" src/data/aeroforgeSimulationData.ts    # mutually inconsistent design
```

Independent physics (γ = 1.4, weak shock):
```
M 5.5, ramps 7.2° + 5.8°  →  β₁ 15.85°, M₂ 4.655, p₂/p₁ 2.467
                             β₂ 16.57°, M₃ 4.131, p₃/p₂ 1.890
                             total: M 4.131, p/p∞ 4.66, π 0.905
To actually reach M 2.8:     2×14.83° → π 0.534 | 4×8.33° → π 0.784
T₀ at M 5.5, T∞ 216.65 K:    1,527 K        T_aw (r = 0.89): 1,383 K
ISA 27 km (with +1 K/km lapse): p 1,848 Pa, T 223.65 K → p₀ 1.72 MPa, T₀ 1,577 K
```

---

*Reviewed 2026-11-23. Bundle: `aeroforgeai-review-and-integration-strategy.zip` (Drive
`1S0YhreYvRId2108tpUFC9jSJeN7LWZ-v`), 22 files / 308,957 bytes. Repo: commit `84f0c95`.*

---

## 8. Addendum — how the bundle maps to the original brief

The bundle was produced from a single prompt with six asks. Mapping each ask to where it is
answered, so the bundle can be checked against what was actually requested:

| Original ask | Where it is answered | Assessment |
| --- | --- | --- |
| *End-to-end review of the repo* | §02 Audit (8 panels, claim vs mechanism) + §01 Verdict (16 layers) | **Strong.** Line-level, file-level, with LOC counts that are exact to the line. |
| *Does it work the way it is designed?* | §01 Verdict, §02 findings log | **Strong.** Correct answer (works as a demo, not as the system) and it separates "honest README" from "dishonest UI". |
| *Can we take OSS CAD/simulation repos and make them work seamlessly?* | §06 Catalog (30 tools) + §07 Playbook (5 strategies + decision helper + 8-step recipe) | **Strong.** Answers "yes", then explains the licence boundary and the process-boundary rule, which is the non-obvious part. |
| *What needs to change for it to work seamlessly* | §05 What must change (10 principles, file map, tech stack) | **Strong.** The file-level map is the most actionable artefact in the bundle. |
| *A before/after dynamic interactive workflow diagram* | §04 Workflow — Play/Step/Reset, 0.5×–4× speed, per-node inspector, live event log, KPI-miss loop toggle | **Delivered and structurally sound.** Both graphs verified complete (13/13 and 12/12 node ids, all edges resolve). |
| *How to integrate and possibly modify different repos* | §07 Playbook 7.1–7.9 (strategies, scorecard, recipes, 9 seams, licence checklist) + §06 mods/watch-outs per tool | **Strong on strategy, thin on code.** The CEP shape and adapter `Protocol`s are right; the SU2 template is not runnable (§3.3). |
| *Different sections for each, elaborated in detail* | 7 sections, ~3.7k lines of source | **Yes** — though "detail" skews toward prose and data tables rather than executable code. |

**The one gap in the brief.** "Change them to work seamlessly in this setup" is answered
architecturally (adapter contracts, process boundaries, CEP) but never *demonstrated*. There is no
working mini-example — not even a 50-line script that takes one CadQuery box through Gmsh to a
`vtu`. That is exactly why the `su2` template's defects went unnoticed: nothing in the bundle was
ever executed. **This is the argument for doing Phase 1 of the roadmap before anything else** —
it converts the bundle's advice into a tested spine that every later adapter plugs into.
