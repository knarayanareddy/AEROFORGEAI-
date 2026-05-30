# ✈️ AeroForge AI — CAD + CFD + Platform Automation Core

**Natural language → physics-validated aerospace CAD geometry → CFD-ready cases → automated optimization.**

AeroForge AI translates a natural-language aerospace design request into validated
parametric CAD geometry (STEP / IGES / STL / BREP) with full provenance and a
five-stage validation report (**Phase 1**), ingests that geometry through a
CFD-preparation pipeline — real Gmsh meshing, solver/turbulence selection, and a
runnable OpenFOAM/SU2 case (**Phase 2**), and ties the two together with a closed
CAD→evaluate→CAD **optimization loop**, a **REST API + web console**, and a
compliance advisory (**Part 3**).

> *"Design a 2-ramp supersonic inlet for Mach 2.5, total pressure recovery > 0.85, titanium"*
> → oblique-shock physics → parametric geometry → validation → STEP + design report + CEP
> → mesh → solver config → runnable CFD case → iterate parameters toward the target.

This repository implements **Phase 1 (CAD)**, **Phase 2 (CFD)**, and a working
core of **Part 3 (Integration & Platform)** of the AeroForge design document
([Part 1](docs/PART1_CAD_AUTOMATION.md) · [Part 2](docs/PART2_CFD_AUTOMATION.md) ·
[Part 3](docs/PART3_INTEGRATION_PLATFORM.md)). It is a runnable, offline-first
core: it needs **no API keys and no GPU** to produce real geometry, CFD cases, and
optimization runs. Phases 1 and 2 share only the CEP file format (`aeroforge.cfd`
has **zero import dependencies** on Phase 1); the Part-3 `platform` layer is the
single place that orchestrates both.

---

## Highlights

- **Real analytical physics** — oblique-shock θ-β-M solver, isentropic & normal-shock
  relations, Prandtl–Meyer expansion, multi-shock total-pressure recovery, optimal
  ramp angles (Oswatitsch), and Method-of-Characteristics-anchored nozzle contours.
  Unit-tested against textbook reference values.
- **Genuine CAD output** — a CadQuery/OpenCASCADE geometry engine produces watertight
  solids for NACA airfoils, C-D/bell/min-length nozzles, two-ramp supersonic inlets,
  and ogive/Von-Kármán nose cones, exported to STEP, IGES, STL and BREP.
- **Multi-agent pipeline** — intent → physics-constraint → geometry-planning DAG →
  code generation → sandboxed execution with error correction → 5-stage validation →
  report.
- **Tool-agnostic adapters** — CadQuery (default), FreeCAD (headless), OpenSCAD, and
  commercial stubs (Fusion 360, Onshape).
- **BYOK + local-first LLM gateway** — Ollama, llama.cpp, Anthropic, OpenAI providers
  behind one gateway with routing, fallback, and audit. **Optional**: with no provider
  configured, a deterministic heuristic parser runs the whole pipeline offline.
- **CFD handoff (CEP)** — every run emits a `cep_manifest.json` with geometry, intent,
  CFD solver/mesh hints, validation, and provenance — the Phase 1 → Phase 2 boundary.

---

## Installation

Requires Python 3.9+ (3.11+ recommended). The CAD kernel needs OpenGL system libs.

```bash
# system libs for OpenCASCADE + Gmsh (Debian/Ubuntu: libgl1 libglu1-mesa;
#                                      Amazon Linux/Fedora: mesa-libGL mesa-libGLU)
pip install -e ".[cad]"        # Phase 1: core + CadQuery kernel
pip install -e ".[cad,cfd]"    # + Phase 2: Gmsh meshing
pip install -e ".[all]"        # everything (+ cloud LLM SDKs + dev tools)
```

> On headless Linux, install `mesa-libGL`/`mesa-libGLU` (RHEL/Amazon) or
> `libgl1`/`libglu1-mesa` (Debian) so the OpenCASCADE kernel and Gmsh can load.

## Quick start

### CLI

```bash
aeroforge doctor                                  # environment diagnostics
aeroforge templates                               # list the 10 parametric templates
aeroforge design "Design a NACA 2412 airfoil at 2 m chord, 5 m span"
aeroforge design "Rao bell nozzle, throat radius 0.05 m, exit Mach 3" --out ./out
aeroforge design "2-ramp supersonic inlet for Mach 2.5, recovery > 0.85" --json
aeroforge knowledge "how do I design a scramjet inlet for Mach 6?"

# Phase 2 — run the CFD pipeline on a Phase-1 CEP package (the ./out design dir)
aeroforge cfd ./out --out ./cfd_run

# Part 3 — closed CAD->evaluate->CAD optimization loop, and the web console + REST API
aeroforge optimize "2-ramp supersonic inlet for Mach 2.5, recovery > 0.85"
aeroforge serve            # http://127.0.0.1:8000  (design form + Three.js STL preview)
```

### Python

```python
from aeroforge import AeroForge

forge = AeroForge()
pkg = forge.design("Design a 2-ramp supersonic inlet for Mach 2.5, recovery > 0.85, titanium")

print(pkg.artifacts["step"])                       # path to the STEP file
print(pkg.validation.confidence.overall)           # confidence score
print(pkg.augmented.physics["total_pressure_recovery"])
print(pkg.cep_manifest_path)                        # CFD handoff package

# Phase 2 — feed the CEP package into the CFD pipeline (independent of Phase 1)
from aeroforge.cfd import AeroForgeCFD

run = AeroForgeCFD().run(pkg.output_dir)
print(run.mesh.n_cells, run.config.solver, run.config.turbulence_model)
print(run.decision.decision)                         # ACCEPT / ITERATE / ESCALATE
print(run.report_path, run.case_dir)                 # CFD report + runnable case
```

## Architecture

```
natural language
  → Intent Agent             (StructuredDesignIntent)
  → Physics Constraint Agent (PhysicsAugmentedIntent — shock angles, recovery, areas)
  → Geometry Planning Agent  (GeometryTaskDAG)
  → CAD Code Generation Agent(CadQuery script via the Aerospace Geometry Engine)
  → Execution Agent          (sandboxed subprocess + Error Correction sub-agent)
  → Validation Agent         (5-stage: topology · geometric · physics · manufacturing · confidence)
  → Report Agent             (Markdown design report + CEP manifest)
```

**Phase 2 — CFD (`aeroforge.cfd`)**, fed by the CEP package:

```
CEP package
  → Geometry Preparation Agent  (ingest, classify internal/external, patches, ISA flow)
  → Meshing Agent               (real Gmsh mesh + y+ spec + quality + mesh correction)
  → Physics Configuration Agent (solver + turbulence + fvSchemes + 0/ BCs + controlDict)
  → Solver Execution Agent      (assemble runnable OpenFOAM/SU2 case; run if solver present)
  → Post-Processing Agent       (quantities + validation vs analytical + CFD report)
  → Design Loop Agent           (ACCEPT / ITERATE / ESCALATE + Phase-1 modification requests)
```

**Part 3 — Platform (`aeroforge.platform`)**, the integration layer over both phases:

```
OptimizationLoop:  parse intent → Phase-1 design → evaluate (analytical or Phase-2 CFD)
                   → target check → propose parameter deltas → re-design …
                   → ACCEPT / ITERATE / ESCALATE (+ Pareto front + iteration history)
REST API + web console:  POST /api/design · /api/cfd · /api/optimize · /api/compliance
ComplianceChecker:  ITAR/EAR export screening + FAA/EASA airworthiness pointers
```

See [`docs/PART1_CAD_AUTOMATION.md`](docs/PART1_CAD_AUTOMATION.md),
[`docs/PART2_CFD_AUTOMATION.md`](docs/PART2_CFD_AUTOMATION.md), and
[`docs/PART3_INTEGRATION_PLATFORM.md`](docs/PART3_INTEGRATION_PLATFORM.md) for the design.

## Package layout

```
aeroforge/
├── agents/        # multi-agent pipeline (orchestration, intent, physics, planning, ...)
├── adapters/      # CAD tool adapters (cadquery, freecad, openscad, + commercial stubs)
├── llm/           # LLM gateway, router, providers (ollama, anthropic, openai, llama.cpp)
├── physics/       # analytical aerospace physics (shocks, isentropic, MOC nozzle)
├── geometry/      # aerospace geometry engine + builders
├── templates/     # 10 validated parametric YAML templates
├── validation/    # 5-stage validation + confidence scoring
├── knowledge/     # NetworkX knowledge graph + vector store + RAG
├── memory/        # session/episodic memory + skill registry
├── security/      # sandbox, audit log, IP classifier, ITAR advisory
├── exchange/      # CAD Exchange Protocol (CEP) writer
├── reporting/     # Markdown design report generator
├── cli/           # `aeroforge` command-line interface
└── cfd/           # Phase 2 — CFD automation (independent of Phase 1)
    ├── agents/        # CFD orchestration + 8 agents
    ├── meshing/       # Gmsh adapter (real), y+ estimator, quality, refinement
    ├── physics/       # solver selector, turbulence advisor, BC/scheme/IC/convergence, ISA
    ├── solvers/       # OpenFOAM case assembly, SU2, commercial stubs
    ├── monitoring/    # residual tracking, convergence/divergence, adaptive control
    ├── post_processing/ # quantities, results validation, CFD report
    ├── design_loop/   # target checker, design modifier, Pareto, history
    ├── compute/       # local + Slurm HPC + cloud executors
    └── memory/        # simulation database, CFD skills
└── platform/     # Part 3 — integration layer (imports both phases)
    ├── optimization_loop.py  # closed CAD→evaluate→CAD multi-objective loop
    ├── evaluators.py         # analytical + CFD performance evaluators
    ├── compliance.py         # FAA/EASA/ITAR/EAR advisory
    ├── enterprise.py         # auth / multi-tenant stubs
    ├── api.py                # FastAPI REST API
    └── web/index.html        # single-page console (Three.js STL preview)
```

## What runs vs. what's stubbed (honest scope)

| Area | Status |
|---|---|
| Physics, geometry, validation, CEP, CLI, agents | ✅ fully implemented & runnable offline |
| CadQuery STEP/IGES/STL/BREP export | ✅ working (OpenCASCADE) |
| FreeCAD / OpenSCAD adapters | ✅ work when the binary is installed; degrade gracefully |
| LLM inference (Ollama/cloud) | ⚙️ wired; activates when configured — heuristic fallback otherwise |
| Knowledge graph / vector store | ✅ dev backend (NetworkX + TF-IDF); Neo4j/Chroma are production swap-ins |
| Commercial CAD (CATIA/NX/Fusion/Onshape) | 🚧 interface stubs (Phase 1.3) |
| **CFD: Gmsh meshing (Phase 2)** | ✅ real volume meshes from Phase-1 STEP |
| **CFD: solver/turbulence selection, OpenFOAM/SU2 case assembly, y+, BCs** | ✅ runnable case generated offline |
| **CFD: design loop, monitoring, Slurm job scripts, CFD report** | ✅ implemented |
| OpenFOAM/SU2 *execution* | ⚙️ runs when the solver binary is installed; otherwise the case is assembled and flagged |
| **Part 3: closed CAD→CFD→CAD optimization loop** | ✅ runnable (analytical surrogate offline; CFD-driven when a solver is present) |
| **Part 3: REST API + web console (Three.js STL preview)** | ✅ implemented (FastAPI) |
| **Part 3: compliance advisory (ITAR/EAR + FAA/EASA)** | ✅ advisory implemented |
| Part 3: enterprise auth / multi-tenant | 🚧 interface stubs |
| Internal fluid-passage extraction, ParaView viz, commercial solvers, real-gas/combustion | 🗺️ roadmap |
| Full interior-grid MOC, 47 templates, cloud (AWS/Azure) executors | 🗺️ roadmap |

## Testing

```bash
pytest                      # unit + integration (integration needs the CAD kernel)
pytest -m "not cad"         # unit tests only
pytest --cov=aeroforge      # with coverage
```

## License

Apache-2.0. AeroForge AI is a **design-acceleration tool, not a design-replacement
tool** — every output requires human engineering review before manufacture or export.
Generated geometry may be subject to export controls (ITAR/EAR); see the advisory in
each design report.
