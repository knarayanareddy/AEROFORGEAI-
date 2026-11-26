// Exact oblique-shock relations for a calorically perfect gas.
//
// This module is the single source of truth for every aerodynamic number shown
// in the UI. It replaces the hand-typed constants that used to live in
// `data/aeroforgeSimulationData.ts` (which are mutually inconsistent — see
// docs/pathway-forward.md §3.2).
//
// Conventions
//   • Angles are in DEGREES at the public boundary, RADIANS internally.
//   • M is always the flow Mach number *ahead* of the shock.
//   • The "weak" (attached) solution is the default; the strong solution is
//     available where a normal-shock-like branch is physically intended.
//   • γ defaults to 1.4 (air, calorically perfect). Real-gas effects at
//     M ≈ 5.5 are small but non-zero and are NOT modelled here.
//
// Verified against the exact θ–β–M relation; see obliqueShock.test.ts for the
// reference vectors (M = 2.0/3.0/5.5/8.0) used as regression anchors.

/** Ratio of specific heats for air (calorically perfect). */
export const GAMMA_AIR = 1.4;
/** Specific gas constant for air, J/(kg·K). */
export const R_AIR = 287.05;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** A detached (unattachable) shock: the turning angle exceeds θ_max. */
export type ShockSolution = 'weak' | 'strong';

export interface ShockResult {
  /** True when an attached solution exists at this turning angle. */
  attached: boolean;
  /** Wave angle β, degrees. NaN when detached. */
  betaDeg: number;
  /** Normal component of Mach ahead of the shock, M₁·sin β. */
  machNormal: number;
  /** Mach number downstream of the shock. NaN when detached. */
  machDownstream: number;
  /** Static pressure ratio p₂/p₁. */
  pressureRatio: number;
  /** Density ratio ρ₂/ρ₁. */
  densityRatio: number;
  /** Static temperature ratio T₂/T₁. */
  temperatureRatio: number;
  /** Total (stagnation) pressure ratio p₀₂/p₀₁ — the recovery loss. */
  totalPressureRatio: number;
  /** Entropy rise per unit mass over R, ln(p₀₁/p₀₂). 0 for an isentropic process. */
  entropyRise: number;
}

const detachedResult = (): ShockResult => ({
  attached: false,
  betaDeg: NaN,
  machNormal: NaN,
  machDownstream: NaN,
  pressureRatio: NaN,
  densityRatio: NaN,
  temperatureRatio: NaN,
  totalPressureRatio: NaN,
  entropyRise: NaN,
});

/** θ(β) from the exact θ–β–M relation. Both angles in radians. */
export function thetaFromBetaRad(mach: number, betaRad: number, gamma = GAMMA_AIR): number {
  const s = Math.sin(betaRad);
  const m2 = mach * mach;
  const num = 2 / Math.tan(betaRad) * (m2 * s * s - 1);
  const den = m2 * (gamma + Math.cos(2 * betaRad)) + 2;
  return Math.atan2(num, den);
}

/** θ(β) in degrees — convenient for tests and diagnostics. */
export function thetaFromBetaDeg(mach: number, betaDeg: number, gamma = GAMMA_AIR): number {
  return thetaFromBetaRad(mach, betaDeg * DEG, gamma) * RAD;
}

/**
 * Maximum flow-turning angle θ_max for an attached oblique shock (degrees).
 * Beyond this the shock detaches.
 *
 * Found by a coarse scan followed by golden-section refinement of θ(β) on
 * β ∈ (μ, π/2), where μ = asin(1/M) is the Mach angle.
 */
export function thetaMaxDeg(mach: number, gamma = GAMMA_AIR): number {
  if (!(mach > 1)) return 0;
  const mu = Math.asin(1 / mach);
  const hi = Math.PI / 2 - 1e-9;

  // Coarse scan (256 samples) to bracket the maximum.
  let bestB = mu + (hi - mu) / 2;
  let bestT = -Infinity;
  const N = 256;
  for (let k = 1; k <= N; k++) {
    const b = mu + ((hi - mu) * k) / (N + 1);
    const t = thetaFromBetaRad(mach, b, gamma);
    if (t > bestT) {
      bestT = t;
      bestB = b;
    }
  }

  // Golden-section search around the bracket.
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = Math.max(mu + 1e-9, bestB - (hi - mu) / (N + 1));
  let b = Math.min(hi, bestB + (hi - mu) / (N + 1));
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  let fc = thetaFromBetaRad(mach, c, gamma);
  let fd = thetaFromBetaRad(mach, d, gamma);
  for (let i = 0; i < 80; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      fc = thetaFromBetaRad(mach, c, gamma);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      fd = thetaFromBetaRad(mach, d, gamma);
    }
  }
  return thetaFromBetaRad(mach, (a + b) / 2, gamma) * RAD;
}

/**
 * Wave angle β (degrees) for a given turning angle θ, or NaN if the shock
 * detaches. `solution` selects the weak (default) or strong branch.
 */
export function shockAngleDeg(
  mach: number,
  thetaDeg: number,
  solution: ShockSolution = 'weak',
  gamma = GAMMA_AIR,
): number {
  if (!(mach > 1) || thetaDeg <= 0) return NaN;
  const mu = Math.asin(1 / mach);
  const thetaMaxRad = thetaMaxDeg(mach, gamma) * DEG;
  const thetaRad = thetaDeg * DEG;
  if (thetaRad > thetaMaxRad) return NaN; // detached

  // Find β_max (where θ peaks) so we can bracket the correct branch.
  const betaAtThetaMax = findBetaAtThetaMax(mach, gamma);

  let lo: number;
  let hi: number;
  if (solution === 'weak') {
    lo = mu; // θ(μ) = 0
    hi = betaAtThetaMax; // θ increases monotonically here
  } else {
    lo = betaAtThetaMax;
    hi = Math.PI / 2; // θ(π/2) = 0
  }

  // Bisection on a monotone branch of θ(β).
  const increasing = solution === 'weak';
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const t = thetaFromBetaRad(mach, mid, gamma);
    if (increasing ? t < thetaRad : t > thetaRad) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-14) break;
  }
  return ((lo + hi) / 2) * RAD;
}

/** β (radians) at which θ(β) is maximal — the boundary between the branches. */
function findBetaAtThetaMax(mach: number, gamma = GAMMA_AIR): number {
  const mu = Math.asin(1 / mach);
  let bestB = mu + (Math.PI / 2 - mu) / 2;
  let bestT = -Infinity;
  const N = 512;
  for (let k = 1; k <= N; k++) {
    const b = mu + ((Math.PI / 2 - mu) * k) / (N + 1);
    const t = thetaFromBetaRad(mach, b, gamma);
    if (t > bestT) {
      bestT = t;
      bestB = b;
    }
  }
  return bestB;
}

/**
 * Full oblique-shock solution for a flow turning through `thetaDeg`.
 *
 * Returns `attached: false` with NaN fields when θ > θ_max (detached shock) —
 * callers must treat that as a hard failure, never as a zero.
 */
export function obliqueShock(
  mach1: number,
  thetaDeg: number,
  gamma = GAMMA_AIR,
  solution: ShockSolution = 'weak',
): ShockResult {
  if (!(mach1 > 1) || !(thetaDeg > 0)) return detachedResult();

  const betaDeg = shockAngleDeg(mach1, thetaDeg, solution, gamma);
  if (!Number.isFinite(betaDeg)) return detachedResult();

  const beta = betaDeg * DEG;
  const theta = thetaDeg * DEG;
  const mn1 = mach1 * Math.sin(beta);
  if (!(mn1 > 1)) return detachedResult();

  const g = gamma;
  const mn1sq = mn1 * mn1;

  // Normal-shock jump relations on the normal component.
  const pressureRatio = 1 + (2 * g) / (g + 1) * (mn1sq - 1);
  const densityRatio = ((g + 1) * mn1sq) / ((g - 1) * mn1sq + 2);
  const temperatureRatio = pressureRatio / densityRatio;

  // Post-shock normal Mach, then rotate back into the flow direction.
  const mn2 = Math.sqrt((1 + ((g - 1) / 2) * mn1sq) / (g * mn1sq - (g - 1) / 2));
  const denom = Math.sin(beta - theta);
  const machDownstream = denom > 1e-12 ? mn2 / denom : NaN;

  // p₀₂/p₀₁ — the total-pressure (recovery) loss across a single shock.
  const totalPressureRatio =
    Math.pow(densityRatio, g / (g - 1)) *
    Math.pow((g + 1) / (2 * g * mn1sq - (g - 1)), 1 / (g - 1));

  return {
    attached: true,
    betaDeg,
    machNormal: mn1,
    machDownstream,
    pressureRatio,
    densityRatio,
    temperatureRatio,
    totalPressureRatio,
    entropyRise: Math.log(1 / totalPressureRatio),
  };
}

/** Normal-shock relations (β = 90°), for completeness and reference tests. */
export function normalShock(mach1: number, gamma = GAMMA_AIR): ShockResult {
  if (!(mach1 > 1)) return detachedResult();
  const g = gamma;
  const m2 = mach1 * mach1;
  const pressureRatio = 1 + (2 * g) / (g + 1) * (m2 - 1);
  const densityRatio = ((g + 1) * m2) / ((g - 1) * m2 + 2);
  const machDownstream = Math.sqrt((1 + ((g - 1) / 2) * m2) / (g * m2 - (g - 1) / 2));
  const totalPressureRatio =
    Math.pow(densityRatio, g / (g - 1)) *
    Math.pow((g + 1) / (2 * g * m2 - (g - 1)), 1 / (g - 1));
  return {
    attached: true,
    betaDeg: 90,
    machNormal: mach1,
    machDownstream,
    pressureRatio,
    densityRatio,
    temperatureRatio: pressureRatio / densityRatio,
    totalPressureRatio,
    entropyRise: Math.log(1 / totalPressureRatio),
  };
}

// ── Ramp chains ──────────────────────────────────────────────────────────────

export interface RampStep {
  /** Turning angle applied by this ramp, degrees. */
  turnDeg: number;
  /** Mach number ahead of this ramp. */
  machIn: number;
  /** Full shock solution for this ramp. */
  shock: ShockResult;
}

export interface RampChain {
  /** True only if every ramp produced an attached shock. */
  attached: boolean;
  steps: RampStep[];
  /** Mach number entering the isolator. NaN if detached. */
  machOut: number;
  /** Total turning of the compression surface, degrees. */
  totalTurnDeg: number;
  /** Cumulative p/p∞ across all ramps. */
  pressureRatio: number;
  /** Cumulative total-pressure recovery π = ∏ p₀,ᵢ₊₁/p₀,ᵢ. */
  totalPressureRecovery: number;
  /** Cumulative density ratio ρ/ρ∞. */
  densityRatio: number;
  /** Cumulative static temperature ratio T/T∞. */
  temperatureRatio: number;
  /**
   * True when a terminal normal shock was applied at the throat.
   *
   * This is the difference between "recovery across the ramps" and "recovery
   * into the isolator". For an external-compression inlet the terminal shock is
   * where most of the loss happens: at M 5.5 with two 10° ramps, recovery is
   * 0.765 before it and 0.159 after — a factor of 4.8. Reporting the first
   * number as though it were inlet recovery overstates performance, so the
   * chain records which one it is.
   */
  hasTerminalShock: boolean;
}

export const EMPTY_CHAIN: RampChain = {
  attached: false,
  steps: [],
  machOut: NaN,
  totalTurnDeg: 0,
  pressureRatio: NaN,
  totalPressureRecovery: NaN,
  densityRatio: NaN,
  temperatureRatio: NaN,
  hasTerminalShock: false,
};

/**
 * Cascade a list of ramp turning angles, each shock starting from the Mach
 * number left by the previous one.
 *
 * Stops at the first detached shock and reports `attached: false`; partial
 * results up to that point remain in `steps` for diagnostics.
 *
 * `terminalNormalShock` appends the throat normal shock that a real
 * external-compression inlet has. It defaults to **false** so existing callers
 * keep their current meaning — silently changing it would alter every recovery
 * number in the app without any test noticing. Pass true for an inlet figure;
 * `hasTerminalShock` on the result records which was computed.
 */
export function rampChain(
  mach: number,
  turnsDeg: number[],
  gamma = GAMMA_AIR,
  terminalNormalShock = false,
): RampChain {
  let machNow = mach;
  let pressure = 1;
  let recovery = 1;
  let density = 1;
  let temperature = 1;
  const steps: RampStep[] = [];
  let attached = true;

  for (const turn of turnsDeg) {
    const shock = obliqueShock(machNow, turn, gamma);
    steps.push({ turnDeg: turn, machIn: machNow, shock });
    if (!shock.attached) {
      attached = false;
      break;
    }
    pressure *= shock.pressureRatio;
    recovery *= shock.totalPressureRatio;
    density *= shock.densityRatio;
    temperature *= shock.temperatureRatio;
    machNow = shock.machDownstream;
  }

  // Terminal normal shock at the throat. Only meaningful while supersonic: a
  // chain that has already reached M <= 1 has no shock left to stand.
  let appliedTerminal = false;
  if (terminalNormalShock && attached && machNow > 1) {
    const wall = normalShock(machNow, gamma);
    if (wall.attached) {
      steps.push({ turnDeg: 90, machIn: machNow, shock: wall });
      pressure *= wall.pressureRatio;
      recovery *= wall.totalPressureRatio;
      density *= wall.densityRatio;
      temperature *= wall.temperatureRatio;
      machNow = wall.machDownstream;
      appliedTerminal = true;
    }
  }

  return {
    attached,
    steps,
    machOut: attached ? machNow : NaN,
    totalTurnDeg: turnsDeg.reduce((a, b) => a + b, 0),
    pressureRatio: attached ? pressure : NaN,
    totalPressureRecovery: attached ? recovery : NaN,
    densityRatio: attached ? density : NaN,
    temperatureRatio: attached ? temperature : NaN,
    hasTerminalShock: appliedTerminal,
  };
}

/**
 * Design aid: find the number of *equal* shocks that decelerate `mach` to
 * `targetMach`, and report the resulting recovery.
 *
 * This is how the UI answers "what would it actually take to reach M_iso?" —
 * the repo's 13° two-ramp geometry reaches only M ≈ 4.13, so a real inlet needs
 * more shocks. Solves per-shock turning by bisection.
 *
 * Returns `null` when no attached equal-shock design of that count can reach
 * the target (e.g. target too low for the shock count).
 */
export function equalShockDesign(
  mach: number,
  shocks: number,
  targetMach: number,
  gamma = GAMMA_AIR,
): RampChain | null {
  if (shocks < 1 || !(mach > targetMach)) return null;

  // If a single normal shock already undershoots, an oblique chain of `shocks`
  // shocks can never reach the target — the flow would have to be subsonic.
  const normal = normalShock(mach, gamma);
  if (!normal.attached) return null;
  if (normal.machDownstream < targetMach && shocks === 1) return null;

  const evaluate = (turn: number) => rampChain(mach, Array(shocks).fill(turn), gamma);
  const reaches = (turn: number) => {
    const c = evaluate(turn);
    return c.attached && c.machOut <= targetMach;
  };

  // Turn angle needed grows with the number of shocks being weaker; scan upward
  // until the chain overshoots the target, then bisect. Detachment caps it.
  let lo = 0.05;
  let hi = 0.05;
  const step = 0.05;
  let found = false;
  for (let t = 0.05; t <= thetaMaxDeg(mach, gamma) - 1e-6; t += step) {
    if (reaches(t)) {
      hi = t;
      found = true;
      break;
    }
    lo = t;
  }
  if (!found) return null;

  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (reaches(mid)) hi = mid;
    else lo = mid;
    if (hi - lo < 1e-10) break;
  }
  return evaluate(hi);
}

// ── Isentropic / stagnation helpers ──────────────────────────────────────────

/** T₀/T = 1 + (γ−1)/2 · M². */
export function stagnationTemperatureRatio(mach: number, gamma = GAMMA_AIR): number {
  return 1 + ((gamma - 1) / 2) * mach * mach;
}

/** p₀/p = (T₀/T)^(γ/(γ−1)). */
export function stagnationPressureRatio(mach: number, gamma = GAMMA_AIR): number {
  return Math.pow(stagnationTemperatureRatio(mach, gamma), gamma / (gamma - 1));
}

/** ρ₀/ρ = (T₀/T)^(1/(γ−1)). */
export function stagnationDensityRatio(mach: number, gamma = GAMMA_AIR): number {
  return Math.pow(stagnationTemperatureRatio(mach, gamma), 1 / (gamma - 1));
}

/** Isentropic area ratio A/A* for a choked throat. */
export function areaRatioFromMach(mach: number, gamma = GAMMA_AIR): number {
  if (!(mach > 0)) return NaN;
  const g = gamma;
  const t = 1 + ((g - 1) / 2) * mach * mach;
  return (1 / mach) * Math.pow((2 / (g + 1)) * t, (g + 1) / (2 * (g - 1)));
}

/** Inverse of {@link areaRatioFromMach}; `supersonic` picks the upper branch. */
export function machFromAreaRatio(
  areaRatio: number,
  supersonic = true,
  gamma = GAMMA_AIR,
): number {
  if (!(areaRatio >= 1)) return NaN;
  let lo = supersonic ? 1 : 1e-6;
  let hi = supersonic ? 50 : 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const a = areaRatioFromMach(mid, gamma);
    if (a < areaRatio) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

/**
 * Adiabatic wall (recovery) temperature. T_aw = T∞ · (1 + r·(γ−1)/2·M²).
 * Default recovery factor r = 0.89 (turbulent boundary layer).
 */
export function adiabaticWallTemperature(
  staticTemperatureK: number,
  mach: number,
  recoveryFactor = 0.89,
  gamma = GAMMA_AIR,
): number {
  return staticTemperatureK * (1 + recoveryFactor * ((gamma - 1) / 2) * mach * mach);
}

/**
 * Pressure coefficient Cp = (p − p∞)/q∞ with q∞ = ½γ p∞ M∞².
 * For a 2D ramp this is the inviscid surface Cp.
 */
export function pressureCoefficient(
  pressureRatio: number,
  mach: number,
  gamma = GAMMA_AIR,
): number {
  const qRatio = 0.5 * gamma * mach * mach; // q∞/p∞
  return (pressureRatio - 1) / qRatio;
}

/**
 * Static temperature downstream of an isentropic compression/expansion that
 * brings the flow from `machIn` to `machOut` with the same total temperature.
 */
export function staticTemperatureRatioIsentropic(
  machIn: number,
  machOut: number,
  gamma = GAMMA_AIR,
): number {
  return stagnationTemperatureRatio(machIn, gamma) / stagnationTemperatureRatio(machOut, gamma);
}
