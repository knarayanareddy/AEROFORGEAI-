// AeroForge AI — Simulation & Demo Data
// Realistic aerospace engineering parameters and results.
// All "random" data is generated with a seeded PRNG so every reload
// (and every test) sees identical values.

import type {
  DesignRequirement,
  PhysicsConstraint,
  GeometryParameter,
  ValidationResult,
  AgentStep,
  DesignLibraryItem,
} from '../types/aeroforge';
import { createRng } from '../utils/prng';
import {
  DEFAULT_ANALYSIS,
  DESIGN_POINT,
  evaluateInletRules,
  type InletAnalysis,
} from '../lib/inletDesign';
import { DESIGN_ALTITUDE_M } from '../lib/atmosphere';
import { stagnantWallProfile } from '../lib/inletDesign';

// ── Scramjet Inlet Design Session ─────────────────────────────────────────────
export const SCRAMJET_INLET_REQUIREMENTS: DesignRequirement[] = [
  { id: 'req-01', parameter: 'Design Mach Number', value: DESIGN_POINT.mach, unit: 'M∞', confidence: 1 },
  { id: 'req-02', parameter: 'Total Pressure Recovery', value: '>0.85', unit: 'η_p', confidence: 1 },
  { id: 'req-03', parameter: 'Mass Flow Rate', value: 12, unit: 'kg/s', confidence: 0.97 },
  { id: 'req-04', parameter: 'Capture Area', value: 0.042, unit: 'm²', confidence: 0.92 },
  { id: 'req-05', parameter: 'Cowl Drag Minimization', value: 'MIN', unit: 'C_D_cowl', confidence: 0.88 },
  { id: 'req-06', parameter: 'Material', value: 'Ti-6Al-4V', unit: 'alloy', confidence: 0.99 },
  {
    id: 'req-07',
    parameter: 'Flight Altitude',
    value: DESIGN_ALTITUDE_M / 1000,
    unit: 'km',
    confidence: 1,
  },
];

/**
 * Physics constraints — DERIVED from `lib/inletDesign`, never typed in.
 *
 * The formula strings are rendered next to the value they produced, so the two
 * can no longer disagree (the old `phys-04` displayed a pressure-ratio formula
 * that was wrong by a factor of ~2 at hypersonic Mach).
 */
const A: InletAnalysis = DEFAULT_ANALYSIS;
const P = A.performance;

export const SCRAMJET_INLET_PHYSICS: PhysicsConstraint[] = [
  {
    id: 'phys-01',
    name: 'Oblique Shock Ramp Angle 1',
    formula: 'θ₁ from weak-shock solution of θ(β, M∞)',
    status: P.chain.steps[0]?.shock.attached ? 'pass' : 'fail',
    computed: `${DESIGN_POINT.rampAnglesDeg[0].toFixed(1)}° (β₁ = ${P.chain.steps[0]?.shock.betaDeg.toFixed(2) ?? '—'}°)`,
    target: '6.5–8.0°',
    tolerance: 0.5,
    unit: 'degrees',
  },
  {
    id: 'phys-02',
    name: 'Oblique Shock Ramp Angle 2',
    formula: 'θ₂ from weak-shock solution of θ(β, M₁)',
    status: P.chain.steps[1]?.shock.attached ? 'pass' : 'fail',
    computed: `${DESIGN_POINT.rampAnglesDeg[1].toFixed(1)}° (β₂ = ${P.chain.steps[1]?.shock.betaDeg.toFixed(2) ?? '—'}°)`,
    target: '5.0–7.0°',
    tolerance: 0.5,
    unit: 'degrees',
  },
  {
    id: 'phys-03',
    name: 'Total Pressure Recovery (ramps only)',
    formula: 'π = ∏ (p₀,ᵢ₊₁ / p₀,ᵢ) across the shock chain',
    status: P.totalPressureRecovery >= 0.85 ? 'pass' : P.totalPressureRecovery >= 0.6 ? 'warn' : 'fail',
    computed: Number.isFinite(P.totalPressureRecovery)
      ? Number(P.totalPressureRecovery.toFixed(4))
      : 'detached',
    target: '>0.850',
    tolerance: 0.01,
    unit: 'ratio',
  },
  {
    id: 'phys-04',
    name: 'Static Pressure Ratio p/p∞',
    formula: 'p₂/p₁ = 1 + 2γ/(γ+1)·(M₁²sin²β − 1)',
    status: P.pressureRatio >= 2 ? 'pass' : 'warn',
    computed: Number.isFinite(P.pressureRatio) ? Number(P.pressureRatio.toFixed(3)) : 'detached',
    target: '4.0–22 (design dependent)',
    tolerance: 0.5,
    unit: 'ratio',
  },
  {
    id: 'phys-05',
    name: 'Isolator Entry Mach',
    formula: 'M₂ = M_n2 / sin(β − θ) applied through the chain',
    status:
      P.isolatorMach >= 2.5 && P.isolatorMach <= 3.5
        ? 'pass'
        : Number.isFinite(P.isolatorMach)
          ? 'warn'
          : 'fail',
    computed: Number.isFinite(P.isolatorMach) ? Number(P.isolatorMach.toFixed(3)) : 'detached',
    target: '2.5–3.5',
    tolerance: 0.1,
    unit: 'M',
  },
  {
    id: 'phys-06',
    name: 'Wall Temperature vs Material',
    formula: 'T_aw = T∞·(1 + r·(γ−1)/2·M∞²),  r = 0.89',
    status: A.thermal.verdict === 'ok' ? 'pass' : A.thermal.verdict === 'marginal' ? 'warn' : 'fail',
    computed: `${Math.round(P.wallTemperatureK)} K`,
    target: `≤ ${Math.round(A.thermal.serviceLimitK)} K (${A.thermal.material.name})`,
    tolerance: 0,
    unit: 'K',
  },
];

export const SCRAMJET_INLET_GEOMETRY: GeometryParameter[] = [
  { id: 'geo-01', name: 'Inlet Capture Height', value: 205, unit: 'mm', min: 150, max: 300, locked: false },
  { id: 'geo-02', name: 'Inlet Capture Width', value: 210, unit: 'mm', min: 150, max: 300, locked: false },
  { id: 'geo-03', name: 'Ramp 1 Angle', value: DESIGN_POINT.rampAnglesDeg[0], unit: '°', min: 5.0, max: 12.0, locked: false },
  { id: 'geo-04', name: 'Ramp 2 Angle', value: DESIGN_POINT.rampAnglesDeg[1], unit: '°', min: 3.0, max: 9.0, locked: false },
  { id: 'geo-05', name: 'Cowl Height', value: 48, unit: 'mm', min: 30, max: 80, locked: false },
  { id: 'geo-06', name: 'Throat Width', value: 142, unit: 'mm', min: 100, max: 200, locked: true },
  { id: 'geo-07', name: 'Isolator Length', value: 380, unit: 'mm', min: 250, max: 600, locked: false },
  { id: 'geo-08', name: 'Bleed Slot Width', value: 3.5, unit: 'mm', min: 2.0, max: 6.0, locked: false },
  { id: 'geo-09', name: 'Wall Boundary Layer Trip', value: 15, unit: 'mm from LE', min: 10, max: 30, locked: false },
  { id: 'geo-10', name: 'Cowl Lip Radius', value: 0.8, unit: 'mm', min: 0.3, max: 2.0, locked: false },
];

/**
 * Validation rows — produced by the rule engine in `lib/inletDesign`.
 *
 * Two things changed on purpose:
 *   • every row is a pure function of the design point, so moving a ramp angle
 *     changes the verdict;
 *   • rules that need CFD or a measured part report `unknown`, never `pass`.
 */
export const SCRAMJET_INLET_VALIDATION: ValidationResult[] = evaluateInletRules(A).map((r) => ({
  id: r.id,
  check: r.check,
  status: r.status === 'unknown' ? 'pending' : r.status,
  computed: r.computed,
  required: r.required,
  confidence: r.confidence,
  standard: r.standard,
}));

// ── Agent Pipeline Steps ───────────────────────────────────────────────────────
export const CAD_AGENT_STEPS: AgentStep[] = [
  {
    id: 'step-01',
    phase: 'intent-decomposition',
    label: 'Intent Decomposition',
    description: 'Parsing natural language → structured design requirements using LLM reasoning chain',
    status: 'complete',
    progress: 100,
    duration: 1.2,
    output: 'Extracted 7 requirements: Mach=5.5, η_p>0.85, ṁ=12kg/s, Material=Ti-6Al-4V...',
  },
  {
    id: 'step-02',
    phase: 'physics-computation',
    label: 'Oblique Shock Computation',
    description: 'Applying oblique shock relations to compute ramp angles and pressure recovery chain',
    status: 'complete',
    progress: 100,
    duration: 0.8,
    output: `θ₁=${DESIGN_POINT.rampAnglesDeg[0]}°, θ₂=${DESIGN_POINT.rampAnglesDeg[1]}° | M_iso=${P.isolatorMach.toFixed(2)} | π_c=${P.totalPressureRecovery.toFixed(3)} (ramps only) · not solved — no CFD has run`,
  },
  {
    id: 'step-03',
    phase: 'geometry-generation',
    label: 'Parametric Geometry Generation',
    description: 'Generating 3D mixed-compression scramjet inlet geometry in FreeCAD with 47 parametric features',
    status: 'complete',
    progress: 100,
    duration: 4.3,
    output: '3D model: 47 features, 12 sketch planes, 8 constraints | STEP export ready',
  },
  {
    id: 'step-04',
    phase: 'constraint-validation',
    label: 'Aerospace Constraint Validation',
    description: 'Running 8 validation checks against AIAA, MIL-SPEC, and AS9100D standards',
    status: 'complete',
    progress: 100,
    duration: 2.1,
    output: `${SCRAMJET_INLET_VALIDATION.filter(v => v.status === 'pass').length}/${SCRAMJET_INLET_VALIDATION.length} PASS · ${SCRAMJET_INLET_VALIDATION.filter(v => v.status === 'pending').length} pending CFD/measurement`,
  },
  {
    id: 'step-05',
    phase: 'export-preparation',
    label: 'Export Package Preparation',
    description: 'Generating STEP, IGES, STL, and design report with full parameter traceability',
    status: 'complete',
    progress: 100,
    duration: 1.5,
    output: 'Simulated only — no artifact is produced until the CAD worker exists',
  },
  {
    id: 'step-06',
    phase: 'cfd-handoff',
    label: 'CFD Handoff via CEP',
    description: 'Packaging geometry + boundary conditions + mesh hints for CFD Agent via CAD Exchange Protocol',
    status: 'complete',
    progress: 100,
    duration: 0.6,
    output: `CEP draft | M∞=${DESIGN_POINT.mach} · static p=${A.flight.staticPressurePa.toFixed(0)} Pa · T=${A.flight.staticTemperatureK.toFixed(1)} K · T₀=${A.flight.totalTemperatureK.toFixed(0)} K`, 
  },
];

export const CFD_AGENT_STEPS: AgentStep[] = [
  {
    id: 'cfd-01',
    phase: 'mesh-generation',
    label: 'Mesh Generation (snappyHexMesh)',
    description: 'Adaptive hex-dominant meshing with boundary layer refinement near cowl lip and ramp surfaces',
    status: 'complete',
    progress: 100,
    duration: 18.4,
    output: '4.2M cells | y+≈1 near wall | 8 refinement levels | Max aspect ratio: 45',
  },
  {
    id: 'cfd-02',
    phase: 'solver-setup',
    label: 'Physics & Solver Configuration',
    description: 'Configuring compressible RANS solver: k-ω SST turbulence, ideal gas EOS, Sutherland viscosity',
    status: 'complete',
    progress: 100,
    duration: 2.2,
    output: 'Solver: rhoCentralFoam | Turbulence: k-ω SST | dt: 1e-8s | CFL: 0.5',
  },
  {
    id: 'cfd-03',
    phase: 'simulation-running',
    label: 'CFD Simulation (500 iterations)',
    description: 'Running compressible Navier-Stokes simulation on 4.2M cell mesh with convergence monitoring',
    status: 'complete',
    progress: 100,
    duration: 1840,
    output: 'Converged at iter 487 | Residuals < 1e-5 | η_p=0.873, MFCR=0.94',
  },
  {
    id: 'cfd-04',
    phase: 'post-processing',
    label: 'Post-Processing & Results Analysis',
    description: 'Extracting pressure contours, Mach field, shock structure, and performance KPIs',
    status: 'complete',
    progress: 100,
    duration: 8.7,
    output: 'Shock system validated | Separation bubble at x=0.82m | η_p=0.873 ✓',
  },
];

// ── Residual Convergence ───────────────────────────────────────────────────────
export interface ConvergencePoint {
  iteration: number;
  continuity: number;
  momentum_x: number;
  momentum_y: number;
  energy: number;
  k: number;
  omega: number;
}

export const DEFAULT_CONVERGENCE_SEED = 20260514;

export function generateConvergenceData(
  seed: number = DEFAULT_CONVERGENCE_SEED,
): ConvergencePoint[] {
  const rng = createRng(seed);
  return Array.from({ length: 500 }, (_, i) => ({
    iteration: i + 1,
    continuity: Math.max(1e-7, 1e-1 * Math.exp(-i / 55) + (rng.next() - 0.5) * 5e-3 * Math.exp(-i / 40)),
    momentum_x: Math.max(1e-7, 8e-2 * Math.exp(-i / 60) + (rng.next() - 0.5) * 3e-3 * Math.exp(-i / 45)),
    momentum_y: Math.max(1e-7, 6e-2 * Math.exp(-i / 58) + (rng.next() - 0.5) * 2e-3 * Math.exp(-i / 42)),
    energy: Math.max(1e-7, 5e-2 * Math.exp(-i / 65) + (rng.next() - 0.5) * 2e-3 * Math.exp(-i / 50)),
    k: Math.max(1e-7, 9e-2 * Math.exp(-i / 50) + (rng.next() - 0.5) * 4e-3 * Math.exp(-i / 38)),
    omega: Math.max(1e-7, 7e-2 * Math.exp(-i / 52) + (rng.next() - 0.5) * 3e-3 * Math.exp(-i / 40)),
  }));
}

export const CONVERGENCE_DATA: ConvergencePoint[] = generateConvergenceData();

// ── Pressure Distribution Along Ramp ─────────────────────────────────────────
/**
 * Wall static-pressure distribution along the flowpath, DERIVED from the shock
 * chain instead of a 21-row hand-typed array that peaked at p/p∞ = 18.4.
 *
 * The compression surface has two ramps at x ∈ (0, 0.35] and (0.35, 0.65]
 * (fraction of inlet length), followed by the isolator. Static pressure jumps
 * across each shock and is flat downstream of it.
 */
export const PRESSURE_DISTRIBUTION: { x: number; p_p_inf: number; cp: number }[] =
  stagnantWallProfile(P, A.flight.mach);

// ── Design Library ─────────────────────────────────────────────────────────────
export const DESIGN_LIBRARY: DesignLibraryItem[] = [
  {
    id: 'lib-01',
    name: 'Mixed-Compression Scramjet Inlet',
    type: 'scramjet-inlet',
    machRange: '4.5–6.5',
    status: 'validated',
    eta_p: P.totalPressureRecovery,
    tags: ['hypersonic', 'scramjet', 'propulsion'],
    created: '2026-05-12',
    version: 'v1.2.0',
  },
  {
    id: 'lib-02',
    name: 'C-D Nozzle (Bell, Area Ratio 8:1)',
    type: 'cd-nozzle',
    machRange: '3.0',
    status: 'validated',
    eta_p: 0.968,
    tags: ['nozzle', 'supersonic', 'propulsion'],
    created: '2026-05-10',
    version: 'v2.0.1',
  },
  {
    id: 'lib-03',
    name: 'NACA 0012 Airfoil Wing Section',
    type: 'naca-airfoil',
    machRange: '0.2–0.8',
    status: 'validated',
    eta_p: 0.941,
    tags: ['airfoil', 'subsonic', 'aerodynamic'],
    created: '2026-05-08',
    version: 'v1.0.3',
  },
  {
    id: 'lib-04',
    name: 'Von Kármán Ogive Nosecone',
    type: 'ogive-nosecone',
    machRange: '1.5–5.0',
    status: 'validated',
    eta_p: 0.922,
    tags: ['nosecone', 'supersonic', 'drag-min'],
    created: '2026-05-06',
    version: 'v1.1.0',
  },
  {
    id: 'lib-05',
    name: 'Turbofan Nacelle (BPR 12)',
    type: 'turbofan-nacelle',
    machRange: '0.78–0.85',
    status: 'in-review',
    eta_p: 0.889,
    tags: ['nacelle', 'turbofan', 'subsonic'],
    created: '2026-05-14',
    version: 'v0.9.2',
  },
  {
    id: 'lib-06',
    name: 'Aerospike Nozzle (Linear, 20-plug)',
    type: 'aerospike-nozzle',
    machRange: '1.0–3.5',
    status: 'in-review',
    eta_p: 0.912,
    tags: ['nozzle', 'aerospike', 'altitude-comp'],
    created: '2026-05-13',
    version: 'v0.7.1',
  },
];

// ── LLM Providers ─────────────────────────────────────────────────────────────
export const LLM_PROVIDERS = [
  // NOTE: llama3.2 ships in 1B/3B/11B/90B variants — "llama3.2:70b" does not
  // exist. Using a model id that can actually be pulled.
  { id: 'ollama', name: 'Ollama (Local)', model: 'qwen2.5-coder:32b', local: true, status: 'active' },
  { id: 'llama.cpp', name: 'llama.cpp (Local)', model: 'mixtral-8x7b-Q8', local: true, status: 'ready' },
  { id: 'openai', name: 'OpenAI (BYOK)', model: 'o3', local: false, status: 'configured' },
  { id: 'anthropic', name: 'Anthropic (BYOK)', model: 'claude-opus-4', local: false, status: 'configured' },
  { id: 'google', name: 'Google (BYOK)', model: 'gemini-2-ultra', local: false, status: 'ready' },
  { id: 'mistral', name: 'Mistral (BYOK)', model: 'mixtral-large', local: false, status: 'ready' },
];

// ── Pareto Front (optimization demo) ───────────────────────────────────────────
export interface ParetoPoint {
  cd: number;
  eta: number;
  iter: number;
  label?: string;
}

export function generateParetoData(seed = 42): { dominated: ParetoPoint[]; pareto: ParetoPoint[] } {
  const rng = createRng(seed);
  const dominated: ParetoPoint[] = [];

  // Dominated design-space points: tradeoff between drag (Cd) and pressure recovery (eta_p)
  for (let i = 0; i < 80; i++) {
    dominated.push({
      cd: 0.025 + rng.next() * 0.02,
      eta: 0.82 + rng.next() * 0.06,
      iter: rng.int(0, 199),
    });
  }

  // Pareto front points
  const paretoFront: ParetoPoint[] = [
    { cd: 0.0218, eta: 0.898, iter: 0, label: 'Best η_p' },
    { cd: 0.0231, eta: 0.892, iter: 0 },
    { cd: 0.0245, eta: 0.886, iter: 0 },
    { cd: 0.0258, eta: 0.881, iter: 0 },
    { cd: 0.0271, eta: 0.876, iter: 0 },
    { cd: 0.0283, eta: 0.873, iter: 0, label: 'Current Design' },
    { cd: 0.0295, eta: 0.869, iter: 0 },
    { cd: 0.0312, eta: 0.862, iter: 0 },
    { cd: 0.0328, eta: 0.856, iter: 0 },
    { cd: 0.0347, eta: 0.848, iter: 0, label: 'Best Cd' },
  ];

  return { dominated, pareto: paretoFront };
}

export const PARETO_DATA = generateParetoData();

// ── Derived design analysis (re-exported so panels never recompute it) ────────
export { DEFAULT_ANALYSIS as SCRAMJET_DESIGN_ANALYSIS };

// ── System Metrics ─────────────────────────────────────────────────────────────
export const SYSTEM_METRICS = {
  cadAgent: { status: 'active', uptime: '99.8%', sessionsToday: 47, avgCycleTime: '8.4min' },
  cfdAgent: { status: 'active', uptime: '99.2%', simulationsToday: 23, avgSolveTime: '31min' },
  knowledgeGraph: { nodes: 14820, edges: 38410, papers: 2847, standards: 312 },
  validationEngine: { checksRun: 8241, passRate: '94.2%', avgConfidence: 0.934 },
};
