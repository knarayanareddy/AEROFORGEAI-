// AeroForge AI — Simulation & Demo Data
// Realistic aerospace engineering parameters and results

import type {
  DesignRequirement,
  PhysicsConstraint,
  GeometryParameter,
  ValidationResult,
  AgentStep,
  CFDResult,
  IterationPoint,
} from '../types/aeroforge';

// ── Scramjet Inlet Design Session ─────────────────────────────────────────────
export const SCRAMJET_INLET_REQUIREMENTS: DesignRequirement[] = [
  { id: 'req-01', parameter: 'Design Mach Number', value: 5.5, unit: 'M∞', confidence: 0.98 },
  { id: 'req-02', parameter: 'Total Pressure Recovery', value: '>0.85', unit: 'η_p', confidence: 0.95 },
  { id: 'req-03', parameter: 'Mass Flow Rate', value: 12, unit: 'kg/s', confidence: 0.97 },
  { id: 'req-04', parameter: 'Capture Area', value: 0.042, unit: 'm²', confidence: 0.92 },
  { id: 'req-05', parameter: 'Cowl Drag Minimization', value: 'MIN', unit: 'C_D_cowl', confidence: 0.88 },
  { id: 'req-06', parameter: 'Material', value: 'Ti-6Al-4V', unit: 'alloy', confidence: 0.99 },
  { id: 'req-07', parameter: 'Operating Temperature', value: 1650, unit: 'K', confidence: 0.93 },
];

export const SCRAMJET_INLET_PHYSICS: PhysicsConstraint[] = [
  {
    id: 'phys-01',
    name: 'Oblique Shock Ramp Angle 1',
    formula: 'θ₁ = f(M∞, β₁)',
    status: 'pass',
    computed: '7.2°',
    target: '6.5–8.0°',
    tolerance: 0.5,
    unit: 'degrees',
  },
  {
    id: 'phys-02',
    name: 'Oblique Shock Ramp Angle 2',
    formula: 'θ₂ = f(M₁, β₂)',
    status: 'pass',
    computed: '5.8°',
    target: '5.0–7.0°',
    tolerance: 0.5,
    unit: 'degrees',
  },
  {
    id: 'phys-03',
    name: 'Total Pressure Recovery',
    formula: 'π_c = ∏(P0i/P0∞)',
    status: 'pass',
    computed: 0.873,
    target: '>0.850',
    tolerance: 0.01,
    unit: 'ratio',
  },
  {
    id: 'phys-04',
    name: 'Isentropic Compression Ratio',
    formula: 'P2/P∞ = (1+γM∞²sin²β)/(γ+1)',
    status: 'pass',
    computed: '18.4',
    target: '15–22',
    tolerance: 2,
    unit: 'ratio',
  },
  {
    id: 'phys-05',
    name: 'Isolator Entry Mach',
    formula: 'M_iso = M∞·f(θ_total)',
    status: 'pass',
    computed: 2.8,
    target: '2.5–3.2',
    tolerance: 0.1,
    unit: 'M',
  },
  {
    id: 'phys-06',
    name: 'Cowl Shock Impingement',
    formula: 'x_imp = h/tan(μ_cowl)',
    status: 'warn',
    computed: '±3.2 mm',
    target: 'cowl lip ±2mm',
    tolerance: 2,
    unit: 'mm',
  },
];

export const SCRAMJET_INLET_GEOMETRY: GeometryParameter[] = [
  { id: 'geo-01', name: 'Inlet Capture Height', value: 205, unit: 'mm', min: 150, max: 300, locked: false },
  { id: 'geo-02', name: 'Inlet Capture Width', value: 210, unit: 'mm', min: 150, max: 300, locked: false },
  { id: 'geo-03', name: 'Ramp 1 Angle', value: 7.2, unit: '°', min: 5.0, max: 12.0, locked: false },
  { id: 'geo-04', name: 'Ramp 2 Angle', value: 5.8, unit: '°', min: 3.0, max: 9.0, locked: false },
  { id: 'geo-05', name: 'Cowl Height', value: 48, unit: 'mm', min: 30, max: 80, locked: false },
  { id: 'geo-06', name: 'Throat Width', value: 142, unit: 'mm', min: 100, max: 200, locked: true },
  { id: 'geo-07', name: 'Isolator Length', value: 380, unit: 'mm', min: 250, max: 600, locked: false },
  { id: 'geo-08', name: 'Bleed Slot Width', value: 3.5, unit: 'mm', min: 2.0, max: 6.0, locked: false },
  { id: 'geo-09', name: 'Wall Boundary Layer Trip', value: 15, unit: 'mm from LE', min: 10, max: 30, locked: false },
  { id: 'geo-10', name: 'Cowl Lip Radius', value: 0.8, unit: 'mm', min: 0.3, max: 2.0, locked: false },
];

export const SCRAMJET_INLET_VALIDATION: ValidationResult[] = [
  { id: 'val-01', check: 'Mach Number Range', status: 'pass', computed: 'M∞=5.5', required: 'M∞>5.0', confidence: 0.98, standard: 'AIAA-2004-3351' },
  { id: 'val-02', check: 'Total Pressure Recovery', status: 'pass', computed: 'η=0.873', required: 'η>0.850', confidence: 0.96, standard: 'MIL-E-5007D' },
  { id: 'val-03', check: 'Mass Flow Capture Ratio', status: 'pass', computed: 'MFCR=0.94', required: 'MFCR>0.90', confidence: 0.94, standard: 'AIAA-2006-8134' },
  { id: 'val-04', check: 'Cowl Shock Alignment', status: 'warn', computed: '+3.2mm off', required: '±2.0mm', confidence: 0.79, standard: 'NASA-CR-195446' },
  { id: 'val-05', check: 'Ti-6Al-4V Temp Limit', status: 'pass', computed: 'T=1650K', required: 'T<1750K', confidence: 0.97, standard: 'AMS 4928' },
  { id: 'val-06', check: 'Boundary Layer Thickness', status: 'pass', computed: 'δ=4.2mm', required: 'δ<6.0mm', confidence: 0.91, standard: 'AIAA-99-4878' },
  { id: 'val-07', check: 'Isolator L/H Ratio', status: 'pass', computed: 'L/H=2.68', required: '2.5<L/H<3.5', confidence: 0.99, standard: 'AIAA-2001-1793' },
  { id: 'val-08', check: 'Manufacturing Tolerances', status: 'pass', computed: 'All dims ±0.05mm', required: '±0.1mm', confidence: 0.95, standard: 'AS9100D' },
];

// ── CFD Convergence Data ───────────────────────────────────────────────────────
export const generateCFDIterations = (): IterationPoint[] => {
  const pts: IterationPoint[] = [];
  for (let i = 1; i <= 500; i++) {
    const decay = Math.exp(-i / 80);
    const noise = (Math.random() - 0.5) * 0.001 * decay;
    pts.push({
      iteration: i,
      residual: 1e-1 * Math.exp(-i / 60) + noise + 1e-6,
      cl: 0.412 + decay * 0.15 * Math.sin(i / 20) + noise * 2,
      cd: 0.0283 + decay * 0.008 * Math.cos(i / 25) + noise,
      cm: -0.022 + decay * 0.004 * Math.sin(i / 30) + noise * 0.5,
    });
  }
  return pts;
};

export const CFD_RESULTS: CFDResult = {
  machNumber: 5.5,
  totalPressureRecovery: 0.873,
  massFlowRate: 12.1,
  dragCoefficient: 0.0283,
  liftCoefficient: 0.412,
  stallAngle: 18.5,
  iterationData: generateCFDIterations(),
};

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
    output: 'θ₁=7.2°, θ₂=5.8° | M_iso=2.8 | π_c=0.873 ✓',
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
    output: '7/8 PASS | 1 WARN (cowl shock alignment ±3.2mm, tolerance ±2mm)',
  },
  {
    id: 'step-05',
    phase: 'export-preparation',
    label: 'Export Package Preparation',
    description: 'Generating STEP, IGES, STL, and design report with full parameter traceability',
    status: 'complete',
    progress: 100,
    duration: 1.5,
    output: 'Export package: scramjet_inlet_M5p5_v1.step (2.3MB) + design_report.pdf',
  },
  {
    id: 'step-06',
    phase: 'cfd-handoff',
    label: 'CFD Handoff via CEP',
    description: 'Packaging geometry + boundary conditions + mesh hints for CFD Agent via CAD Exchange Protocol',
    status: 'complete',
    progress: 100,
    duration: 0.6,
    output: 'CEP bundle: inlet_cep_v1.json | BC: P∞=1013Pa, T∞=216K, M=5.5 | Ready for OpenFOAM',
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

// ── Pressure Field Data (Mach contour simulation) ─────────────────────────────
export const generateMachContourData = () => {
  const data = [];
  for (let x = 0; x <= 40; x++) {
    for (let y = 0; y <= 20; y++) {
      const xNorm = x / 40;
      const yNorm = y / 20;
      // Simulate Mach number distribution in scramjet inlet
      const shock1 = Math.max(0, 1 - Math.abs(xNorm - 0.15 - yNorm * 0.3) * 15);
      const shock2 = Math.max(0, 1 - Math.abs(xNorm - 0.35 - yNorm * 0.2) * 12);
      const expansion = xNorm > 0.5 ? (xNorm - 0.5) * 0.8 : 0;
      const baseMach = 5.5 - xNorm * 2.7;
      const mach = Math.max(1.2, baseMach - shock1 * 1.2 - shock2 * 0.8 + expansion);
      data.push({ x, y, mach: Number(mach.toFixed(2)) });
    }
  }
  return data;
};

// ── Residual Convergence ───────────────────────────────────────────────────────
export const CONVERGENCE_DATA = Array.from({ length: 500 }, (_, i) => ({
  iteration: i + 1,
  continuity: Math.max(1e-7, 1e-1 * Math.exp(-i / 55) + (Math.random() - 0.5) * 5e-3 * Math.exp(-i / 40)),
  momentum_x: Math.max(1e-7, 8e-2 * Math.exp(-i / 60) + (Math.random() - 0.5) * 3e-3 * Math.exp(-i / 45)),
  momentum_y: Math.max(1e-7, 6e-2 * Math.exp(-i / 58) + (Math.random() - 0.5) * 2e-3 * Math.exp(-i / 42)),
  energy: Math.max(1e-7, 5e-2 * Math.exp(-i / 65) + (Math.random() - 0.5) * 2e-3 * Math.exp(-i / 50)),
  k: Math.max(1e-7, 9e-2 * Math.exp(-i / 50) + (Math.random() - 0.5) * 4e-3 * Math.exp(-i / 38)),
  omega: Math.max(1e-7, 7e-2 * Math.exp(-i / 52) + (Math.random() - 0.5) * 3e-3 * Math.exp(-i / 40)),
}));

// ── Pressure Distribution Along Ramp ─────────────────────────────────────────
export const PRESSURE_DISTRIBUTION = [
  { x: 0.0, p_p_inf: 1.0, cp: 0.0 },
  { x: 0.05, p_p_inf: 1.8, cp: 0.063 },
  { x: 0.10, p_p_inf: 2.9, cp: 0.156 },
  { x: 0.15, p_p_inf: 4.8, cp: 0.311 },
  { x: 0.20, p_p_inf: 5.2, cp: 0.343 },
  { x: 0.25, p_p_inf: 6.1, cp: 0.421 },
  { x: 0.30, p_p_inf: 7.4, cp: 0.531 },
  { x: 0.35, p_p_inf: 9.8, cp: 0.734 },
  { x: 0.40, p_p_inf: 11.2, cp: 0.851 },
  { x: 0.45, p_p_inf: 12.1, cp: 0.926 },
  { x: 0.50, p_p_inf: 13.8, cp: 1.067 },
  { x: 0.55, p_p_inf: 15.4, cp: 1.201 },
  { x: 0.60, p_p_inf: 16.1, cp: 1.258 },
  { x: 0.65, p_p_inf: 16.8, cp: 1.316 },
  { x: 0.70, p_p_inf: 17.2, cp: 1.350 },
  { x: 0.75, p_p_inf: 17.6, cp: 1.383 },
  { x: 0.80, p_p_inf: 18.1, cp: 1.424 },
  { x: 0.85, p_p_inf: 18.4, cp: 1.449 },
  { x: 0.90, p_p_inf: 18.3, cp: 1.441 },
  { x: 0.95, p_p_inf: 18.2, cp: 1.433 },
  { x: 1.00, p_p_inf: 18.4, cp: 1.449 },
];

// ── Design Library ─────────────────────────────────────────────────────────────
export const DESIGN_LIBRARY = [
  {
    id: 'lib-01',
    name: 'Mixed-Compression Scramjet Inlet',
    type: 'scramjet-inlet',
    machRange: '4.5–6.5',
    status: 'validated',
    eta_p: 0.873,
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
  { id: 'ollama', name: 'Ollama (Local)', model: 'llama3.2:70b', local: true, status: 'active' },
  { id: 'llama.cpp', name: 'llama.cpp (Local)', model: 'mixtral-8x7b-Q8', local: true, status: 'ready' },
  { id: 'openai', name: 'OpenAI (BYOK)', model: 'o3', local: false, status: 'configured' },
  { id: 'anthropic', name: 'Anthropic (BYOK)', model: 'claude-opus-4', local: false, status: 'configured' },
  { id: 'google', name: 'Google (BYOK)', model: 'gemini-2-ultra', local: false, status: 'ready' },
  { id: 'mistral', name: 'Mistral (BYOK)', model: 'mixtral-large', local: false, status: 'ready' },
];

// ── Knowledge Graph Nodes ──────────────────────────────────────────────────────
export const KNOWLEDGE_NODES = [
  { id: 'kn-01', type: 'component', label: 'Scramjet Inlet', x: 50, y: 50, connections: ['kn-02', 'kn-03', 'kn-06'] },
  { id: 'kn-02', type: 'constraint', label: 'Oblique Shock θ₁', x: 20, y: 30, connections: ['kn-04'] },
  { id: 'kn-03', type: 'constraint', label: 'Total Pressure η_p', x: 80, y: 30, connections: ['kn-04', 'kn-05'] },
  { id: 'kn-04', type: 'standard', label: 'MIL-E-5007D', x: 50, y: 15, connections: [] },
  { id: 'kn-05', type: 'paper', label: 'AIAA-2004-3351', x: 85, y: 60, connections: [] },
  { id: 'kn-06', type: 'material', label: 'Ti-6Al-4V', x: 20, y: 70, connections: ['kn-07'] },
  { id: 'kn-07', type: 'standard', label: 'AMS 4928', x: 10, y: 85, connections: [] },
];

// ── System Metrics ─────────────────────────────────────────────────────────────
export const SYSTEM_METRICS = {
  cadAgent: { status: 'active', uptime: '99.8%', sessionsToday: 47, avgCycleTime: '8.4min' },
  cfdAgent: { status: 'active', uptime: '99.2%', simulationsToday: 23, avgSolveTime: '31min' },
  knowledgeGraph: { nodes: 14820, edges: 38410, papers: 2847, standards: 312 },
  validationEngine: { checksRun: 8241, passRate: '94.2%', avgConfidence: 0.934 },
};
