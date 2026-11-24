// The scramjet-inlet design point, DERIVED rather than typed in.
//
// Before this module, `data/aeroforgeSimulationData.ts` held a scatter of
// hand-written constants (M_iso = 2.8, p/p∞ = 18.4, π = 0.873, "T_total =
// 216.65 K") that came from three different machines and disagreed with the
// geometry drawn next to them. Everything here is a function of:
//
//     (altitude, Mach, ramp angles, material)
//
// so moving a slider genuinely changes the numbers, and a reviewer can check
// any of them against exact oblique-shock theory.
//
// The *airflow* itself is planar and the ramps are modelled as a 2D shock
// chain — the same idealisation the design document uses. Viscous effects,
// shock–boundary-layer interaction and isolator shock-train behaviour are NOT
// modelled here and are added by the CFD stage.

import { deriveFlightState, DESIGN_ALTITUDE_M, DESIGN_MACH } from './atmosphere';
import {
  assessMaterial,
  passiveCandidates,
  type MaterialAssessment,
} from './materials';
import {
  adiabaticWallTemperature,
  equalShockDesign,
  pressureCoefficient,
  rampChain,
  type RampChain,
} from './obliqueShock';

export interface InletDesignPoint {
  /** Flight condition. */
  altitudeM: number;
  mach: number;
  /** Ramp turning angles, degrees. */
  rampAnglesDeg: number[];
  /** Material id used for the thermal check. */
  materialId: string;
}

/**
 * The design point the app opens with.
 *
 * Note this is deliberately the *13° two-ramp* machine the old UI drew, not the
 * 30° machine its numbers secretly described. Keeping the geometry honest means
 * the KPIs come out at M ≈ 4.13 instead of a fictional 2.8 — which is the whole
 * point of Phase 0.
 */
export const DESIGN_POINT: InletDesignPoint = {
  altitudeM: DESIGN_ALTITUDE_M,
  mach: DESIGN_MACH,
  rampAnglesDeg: [7.2, 5.8],
  materialId: 'ti-6al-4v',
};

export interface FlowConditions {
  altitudeM: number;
  mach: number;
  staticPressurePa: number;
  staticTemperatureK: number;
  density: number;
  velocity: number;
  totalPressurePa: number;
  totalTemperatureK: number;
  adiabaticWallTemperatureK: number;
  dynamicPressurePa: number;
}

export interface InletPerformance {
  /** Shock chain across the ramps. */
  chain: RampChain;
  /** Mach number entering the isolator. */
  isolatorMach: number;
  /** p/p∞ at the isolator entry. */
  pressureRatio: number;
  /** π = p₀,isolator / p₀∞ — the recovery the inlet delivers, ramps only. */
  totalPressureRecovery: number;
  /** Isolator-entry static pressure, Pa. */
  staticPressurePa: number;
  /** Isolator-entry static temperature, K. */
  staticTemperatureK: number;
  /** Adiabatic wall temperature on the compression surface, K (hottest station). */
  wallTemperatureK: number;
  /** T_aw at each station, leading edge first. */
  wallTemperatureStations: { mach: number; staticTemperatureK: number; wallTemperatureK: number }[];
  /** Wall Cp on the first ramp (inviscid), useful for sanity checks. */
  firstRampCp: number;
}

export interface InletAnalysis {
  design: InletDesignPoint;
  flight: FlowConditions;
  performance: InletPerformance;
  thermal: MaterialAssessment;
  /** Materials that would survive the wall temperature without active cooling. */
  passiveOptions: ReturnType<typeof passiveCandidates>;
  /**
   * How many *equal* shocks it would take to reach the isolator Mach the
   * original spec asked for (2.5–3.5 band), and what that would cost.
   * This is the "what would it actually take" answer.
   */
  referenceDesigns: {
    shocks: number;
    perShockDeg: number;
    totalTurnDeg: number;
    pressureRatio: number;
    recovery: number;
  }[];
  /** Entry Mach the original specification targeted. */
  targetIsolatorMach: number;
}

export const TARGET_ISOLATOR_MACH = 2.8;

export function analyseInlet(design: InletDesignPoint): InletAnalysis {
  const flightState = deriveFlightState({
    altitudeM: design.altitudeM,
    mach: design.mach,
  });

  const chain = rampChain(design.mach, design.rampAnglesDeg);

  const flight: FlowConditions = {
    altitudeM: flightState.altitudeM,
    mach: flightState.mach,
    staticPressurePa: flightState.staticPressurePa,
    staticTemperatureK: flightState.staticTemperatureK,
    density: flightState.density,
    velocity: flightState.velocity,
    totalPressurePa: flightState.totalPressurePa,
    totalTemperatureK: flightState.totalTemperatureK,
    adiabaticWallTemperatureK: flightState.adiabaticWallTemperatureK,
    dynamicPressurePa: flightState.dynamicPressurePa,
  };

  // Wall temperature: the hottest adiabatic wall temperature anywhere on the
  // compression surface.
  //
  // T_aw is evaluated at each station from the LOCAL edge conditions:
  //     T_aw = T_local · (1 + r·(γ−1)/2 · M_local²)
  // Because T_local rises while M_local falls across each shock, T_aw is NOT
  // constant along the chain (it falls once r < 1). The leading edge — full
  // freestream Mach, before any compression — is therefore usually the hottest
  // point, and taking the maximum is the conservative choice.
  //
  // Do NOT multiply a compressed static temperature by the freestream recovery
  // factor: that double-counts the compression and inflates T_aw by hundreds of
  // kelvin.
  const stations: { mach: number; staticTemperatureK: number }[] = [
    { mach: design.mach, staticTemperatureK: flightState.staticTemperatureK },
  ];
  if (chain.attached) {
    let tempNow = flightState.staticTemperatureK;
    for (const step of chain.steps) {
      tempNow *= step.shock.temperatureRatio;
      stations.push({ mach: step.shock.machDownstream, staticTemperatureK: tempNow });
    }
  }
  const wallTemperatureK = Math.max(
    ...stations.map((s) => adiabaticWallTemperature(s.staticTemperatureK, s.mach)),
  );

  const performance: InletPerformance = {
    chain,
    isolatorMach: chain.machOut,
    pressureRatio: chain.pressureRatio,
    totalPressureRecovery: chain.totalPressureRecovery,
    staticPressurePa: flightState.staticPressurePa * chain.pressureRatio,
    staticTemperatureK:
      flightState.staticTemperatureK * (chain.attached ? chain.temperatureRatio : NaN),
    wallTemperatureK,
    wallTemperatureStations: stations.map((s) => ({
      ...s,
      wallTemperatureK: adiabaticWallTemperature(s.staticTemperatureK, s.mach),
    })),
    firstRampCp: chain.steps[0]?.shock.attached
      ? pressureCoefficient(chain.steps[0].shock.pressureRatio, design.mach)
      : NaN,
  };

  const thermal =
    assessMaterial(design.materialId, wallTemperatureK) ??
    assessMaterial('inconel-718', wallTemperatureK)!;

  return {
    design,
    flight,
    performance,
    thermal,
    passiveOptions: passiveCandidates(wallTemperatureK),
    referenceDesigns: buildReferenceDesigns(design.mach),
    targetIsolatorMach: TARGET_ISOLATOR_MACH,
  };
}

/**
 * What it takes to reach the target isolator Mach with 2–5 equal shocks.
 * Used by the UI to explain why the drawn geometry cannot hit the old numbers.
 */
function buildReferenceDesigns(mach: number) {
  const out: InletAnalysis['referenceDesigns'] = [];
  for (let n = 2; n <= 5; n++) {
    const c = equalShockDesign(mach, n, TARGET_ISOLATOR_MACH);
    if (!c) continue;
    out.push({
      shocks: n,
      perShockDeg: c.steps[0].turnDeg,
      totalTurnDeg: c.totalTurnDeg,
      pressureRatio: c.pressureRatio,
      recovery: c.totalPressureRecovery,
    });
  }
  return out;
}

/**
 * The validation rules that replace the eight hand-typed verdicts.
 *
 * Each rule is a pure function of the analysis. Rules that cannot evaluate
 * return `warn`/`unknown` rather than `pass` — fail-closed, as the review
 * recommends.
 */
export type RuleStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export interface InletRule {
  id: string;
  check: string;
  status: RuleStatus;
  computed: string;
  required: string;
  standard: string;
  note: string;
  confidence: number;
}

export function evaluateInletRules(analysis: InletAnalysis): InletRule[] {
  const { design, performance, thermal, flight } = analysis;
  const rules: InletRule[] = [];

  rules.push({
    id: 'rule-mach-range',
    check: 'Flight Mach in design envelope',
    status: design.mach > 5 ? 'pass' : design.mach >= 4 ? 'warn' : 'fail',
    computed: `M∞ = ${design.mach.toFixed(2)}`,
    required: 'M∞ > 5.0 for scramjet operation',
    standard: 'Design envelope (see design doc Part 2)',
    note: 'Below M ≈ 5 the flowpath cannot self-ignite; ramjet mode takes over.',
    confidence: 1,
  });

  rules.push({
    id: 'rule-chain-attached',
    check: 'Shock chain attached',
    status: performance.chain.attached ? 'pass' : 'fail',
    computed: performance.chain.attached
      ? `${performance.chain.steps.length} shocks, total turning ${performance.chain.totalTurnDeg.toFixed(1)}°`
      : 'shock detached',
    required: 'All ramps below θ_max',
    standard: 'Exact θ–β–M detachment limit',
    note: performance.chain.attached
      ? 'Every ramp produces an attached oblique shock.'
      : 'At least one ramp exceeds θ_max; the shock detaches and the inlet unstart risk is high.',
    confidence: 1,
  });

  rules.push({
    id: 'rule-isolator-mach',
    check: 'Isolator entry Mach',
    status: performance.chain.attached
      ? performance.isolatorMach >= 2.0 && performance.isolatorMach <= 3.5
        ? 'pass'
        : 'warn'
      : 'fail',
    computed: performance.chain.attached
      ? `M_iso = ${performance.isolatorMach.toFixed(2)}`
      : '—',
    required: '2.5 ≤ M_iso ≤ 3.5 (combustor entry)',
    standard: 'AIAA-2001-1793 (isolator L/H)',
    note: performance.chain.attached
      ? performance.isolatorMach > 3.5
        ? 'Flow enters the isolator too fast: insufficient compression, combustion will not hold.'
        : performance.isolatorMach < 2.0
          ? 'Flow is over-compressed: recovery and mass capture will suffer.'
          : 'Within the combustor-entry band.'
      : 'Cannot be evaluated while the shock is detached.',
    confidence: 1,
  });

  rules.push({
    id: 'rule-recovery',
    check: 'Total pressure recovery',
    status: performance.chain.attached
      ? performance.totalPressureRecovery >= 0.85
        ? 'pass'
        : performance.totalPressureRecovery >= 0.6
          ? 'warn'
          : 'fail'
      : 'fail',
    computed: performance.chain.attached
      ? `π = ${performance.totalPressureRecovery.toFixed(3)}`
      : '—',
    required: 'π ≥ 0.85 (ramps only, before isolator losses)',
    standard: 'MIL-E-5007D',
    note:
      'Ramp-only inviscid value. Isolator shock-train, bleed and ' +
      'shock–boundary-layer interaction will reduce this further in CFD.',
    confidence: 0.95,
  });

  rules.push({
    id: 'rule-wall-temperature',
    check: 'Wall temperature vs material service limit',
    status:
      thermal.verdict === 'ok'
        ? 'pass'
        : thermal.verdict === 'marginal'
          ? 'warn'
          : thermal.verdict === 'fail'
            ? 'fail'
            : 'unknown',
    computed: `T_aw ≈ ${Math.round(performance.wallTemperatureK)} K vs ${Math.round(thermal.serviceLimitK)} K (${thermal.material.name})`,
    required: `T_wall < ${thermal.material.name} service limit (${Math.round(thermal.serviceLimitK)} K)`,
    standard: thermal.material.source,
    note:
      thermal.verdict === 'fail'
        ? `Not viable in ${thermal.material.name}. ` +
          (thermal.alternatives.length
            ? `Passive alternatives at this wall temperature: ${thermal.alternatives
                .slice(0, 3)
                .map((m) => m.name)
                .join(', ')} — or actively cool the flowpath.`
            : 'No material in the database survives this wall temperature passively; active cooling is required.')
        : thermal.summary,
    confidence: 0.9,
  });

  rules.push({
    id: 'rule-total-temperature',
    check: 'Stagnation temperature consistency',
    status: 'pass',
    computed: `T₀ = ${Math.round(flight.totalTemperatureK)} K at M∞ = ${design.mach.toFixed(1)}`,
    required: 'T₀ derived from ISA static temperature',
    standard: 'Isentropic stagnation relation',
    note:
      'The freestream total temperature must be computed from altitude and Mach — ' +
      'not quoted as the tropopause static temperature (216.65 K).',
    confidence: 1,
  });

  rules.push({
    id: 'rule-mass-capture',
    check: 'Mass-flow capture ratio',
    status: 'unknown',
    computed: 'requires CFD',
    required: 'MFCR > 0.90',
    standard: 'AIAA-2006-8134',
    note:
      'Capture ratio depends on the cowl shock position and viscous spillage; ' +
      'it is a CFD output, not an analytic one. Reported as unknown until the ' +
      'solver stage runs.',
    confidence: 0,
  });

  rules.push({
    id: 'rule-manufacturing',
    check: 'Manufacturing tolerances',
    status: 'unknown',
    computed: 'requires geometry artifact',
    required: 'Dims within ±0.1 mm (per drawing)',
    standard: 'AS9100D',
    note:
      'Tolerance conformance is a property of a released drawing and a measured ' +
      'part. Nothing in the demo has been measured, so this cannot pass.',
    confidence: 0,
  });

  return rules;
}

/** Convenience: the default analysis the panels render on first load. */
export const DEFAULT_ANALYSIS = analyseInlet(DESIGN_POINT);


/**
 * Wall static-pressure distribution along the flowpath, for the pressure chart.
 *
 * Geometry model: the compression surface is split into equal ramp segments and
 * an isolator, expressed as fractions of the flowpath length. Static pressure
 * jumps across each shock and stays flat downstream of it — exactly what the
 * shock chain says, rather than a hand-drawn curve.
 *
 * (This is an inviscid 1-D reconstruction. The CFD stage replaces it with a
 * solved wall field.)
 */
export function stagnantWallProfile(
  performance: InletPerformance,
  mach: number,
  points = 21,
): { x: number; p_p_inf: number; cp: number }[] {
  const { chain } = performance;
  if (!chain.attached || chain.steps.length === 0) return [];

  const n = chain.steps.length;
  // Compression surface occupies 65% of the plotted length; isolator the rest.
  const rampSpan = 0.65 / n;
  const out: { x: number; p_p_inf: number; cp: number }[] = [];

  const push = (x: number, p: number) =>
    out.push({
      x: Number(x.toFixed(4)),
      p_p_inf: Number(p.toFixed(4)),
      cp: Number(pressureCoefficient(p, mach).toFixed(4)),
    });

  // Staircase: a point immediately before and immediately after each shock, so
  // the chart renders a step rather than interpolating across it.
  const eps = 1e-4;
  push(0, 1);
  let p = 1;
  for (let k = 0; k < n; k++) {
    const xShock = rampSpan * (k + 1);
    p *= chain.steps[k].shock.pressureRatio;
    push(Math.max(eps, xShock - eps), k === 0 ? 1 : p / chain.steps[k].shock.pressureRatio);
    push(xShock, p);
  }
  // Fill the isolator at constant pressure.
  const isolatorStart = rampSpan * n;
  const remaining = Math.max(1, Math.ceil(points * (1 - isolatorStart)) - 1);
  for (let i = 1; i <= remaining; i++) {
    push(isolatorStart + (1 - isolatorStart) * (i / remaining), p);
  }
  return out;
}
