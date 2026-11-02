# AeroForge AI

**AI-Native Aerospace Design & Simulation Platform** — Natural Language → CAD → CFD → Validated Aerospace Design.

A multi-agent, tool-agnostic front-end demo (React + Vite + Tailwind) for an aerospace
CAD/CFD platform: intent parsing, parametric geometry, CFD results, knowledge-graph RAG,
standards validation (AIAA / MIL-SPEC / AS9100D), multi-objective optimization, and
export/handoff (STEP, IGES, STL, OpenFOAM, CEP bundle) with an ITAR/EAR compliance view.

The full architecture is specified in [`completedesigndoc.md`](./completedesigndoc.md).

## Tech stack

- **React 19** + **TypeScript** (strict) + **Vite 8** (single-file build via `vite-plugin-singlefile`)
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **framer-motion**, **recharts**, **lucide-react**
- **Vitest** for unit tests, **ESLint** (flat config, typescript-eslint + react-hooks) for linting

## Quickstart

```bash
npm ci          # install dependencies (Node >= 20)
npm run dev     # start the dev server (http://localhost:5173)
```

Production build (outputs a single self-contained `dist/index.html`):

```bash
npm run build   # typechecks first, then bundles
npm run preview # serve the built file
```

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Vite dev server (bound to all interfaces)     |
| `npm run build`      | `tsc --noEmit` + `vite build` (single file)   |
| `npm run preview`    | Preview the production build                  |
| `npm run typecheck`  | TypeScript check without emitting             |
| `npm run lint`       | ESLint over `src/` and `vite.config.ts`       |
| `npm test`           | Run the Vitest suite once                     |
| `npm run test:watch` | Run Vitest in watch mode                      |

## Project structure

```
src/
  App.tsx                        # app shell, boot screen, section router
  main.tsx                       # entry point
  index.css                      # design system (Tailwind + custom components)
  types/aeroforge.ts             # shared domain types
  data/aeroforgeSimulationData.ts# demo/simulation data (seeded PRNG — reproducible)
  utils/
    prng.ts                      # deterministic PRNG (mulberry32)
    design.ts                    # pure helpers: library filter, validation score, durations
    hooks.ts                     # useInterval (auto-cleanup, pauses when tab hidden)
    *.test.ts                    # unit tests
  components/
    layout/    navbar + sidebar
    dashboard/ mission control
    cad/       CAD agent (NL intent → parametric geometry)
    cfd/       CFD agent (convergence, Mach field, solver config)
    geometry/  geometry engine / component library
    knowledge/ knowledge graph (Graph RAG)
    validation/ validation & constraint engine
    optimization/ multi-objective optimization loop
    export/    export & handoff (CEP manifest, ITAR/EAR)
```

## Testing & quality gates

CI (`.github/workflows/ci.yml`) runs on every push/PR: `npm ci` → typecheck → lint →
tests → build → `npm audit --audit-level=high`.

## Notes

- All "live" simulation data is generated locally with a **seeded PRNG**, so demos are
  reproducible and tests are deterministic.
- The UI is a front-end MVP; LLM/CAD/CFD backends (Ollama, FreeCAD, OpenFOAM) are
  represented by simulated pipelines as described in the design doc.
- Security/compliance: local-only LLM option (no data egress), ITAR/EAR panel in the
  Export section. See the design doc for the full threat model.
