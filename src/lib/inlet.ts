// Phase 2: mixed-compression inlet with cowl and isolator.
//
// The design is graded the same way Phase 1's wedge was: against a
// characteristics-level reference the solver never sees. But the reference for an
// inlet is a chain of oblique shocks plus a total-pressure budget, not a closed
// form, so the honest question is different:
//
//   "Does the CFD reproduce the inviscid ramp chain?"
//
// not "does the CFD reproduce reality". A shock train is unsteady and viscous; a
// steady Euler solve on a structured grid cannot produce one. This module
// computes what it can, and reports what it cannot.

import type { Freestream } from './euler2d';
import { freestreamFrom } from './euler2d';
import { rampChain, thetaMaxDeg, type RampChain } from './obliqueShock';
import { atmosphereAt } from './atmosphere';

export interface InletDesign {
  rampAnglesDeg: number[];
  rampLengthsM: number[];
  /**
   * Included angle of the cowl inner surface to the axis, degrees.
   *
   * The cowl angle is the real design variable, not the lip height — the lip
   * height is whatever that angle implies. This matters because the cowl angle
   * sets how hard the second ramp shock is turned and therefore what fraction of
   * it passes into the duct: a steep cowl (36°, which is what a fixed lip
   * clearance produced here) turns the flow through the oblique-shock limit and
   * the steady solution never settles. 5–8° is a workable contraction.
   */
  cowlAngleDeg: number;
  isolatorLengthM: number;
  isolatorHeightM: number;
  mach: number;
  altitudeM: number;
}

export interface IsolatorExpectation {
  /**
   * Whether the duct must contain a terminal shock.
   *
   * This is a statement about the cycle, not a measurement: a supersonic
   * isolator that ultimately feeds a subsonic combustor must decelerate through
   * a shock somewhere in the duct. It is true whenever `entryMach > 1`, and
   * saying so is more useful than pretending the solver resolves the location.
   */
  terminalShockRequired: boolean;
  /**
   * Nominal cowl/floor bounces of the last ramp shock over the isolator length.
   * Geometry only — the shock is assumed straight and the walls parallel, which
   * is exactly the assumption a real shock train violates.
   */
  expectedReflections: number;
  /** Entry Mach into the isolator, from the ramp chain. */
  entryMach: number;
  /** Total pressure fraction remaining after the ramp chain and the duct. */
  recoveryAtExit: number;
  /** What this model deliberately does not represent. */
  notModelled: string[];
}

/**
 * Cowl-lip clearance above the isolator ceiling, m, implied by the cowl angle.
 *
 * Derived, not tuned: the cowl runs from the lip to the isolator entry at a
 * fixed angle, so the lip height follows from the geometry.
 */
export function lipHeightOf(d: InletDesign): number {
  const lipX = d.rampLengthsM[0] * 1.35;
  const isoX = d.rampLengthsM.reduce(
    (a, l, k) =>
      a + l * Math.cos((d.rampAnglesDeg.slice(0, k + 1).reduce((p, q) => p + q, 0) * Math.PI) / 180),
    0,
  );
  return Math.tan((d.cowlAngleDeg * Math.PI) / 180) * (isoX - lipX);
}

export interface InletReference {
  chain: RampChain;
  /** Cumulative pressure ratio after the ramp chain, p/p∞ at the isolator entry. */
  pressureRatio: number;
  totalPressureRatio: number;
  machOut: number;
  /** True when every ramp shock is attached, i.e. the design is startable. */
  attached: boolean;
  /** The turn angle at which the last shock would detach. */
  marginToDetachmentDeg: number;
  isolator: IsolatorExpectation;
  freestream: Freestream;
  /** Design-point mass flow per unit depth at the capture area, kg/(s·m). */
  massFlowPerDepth: number;
}

export function inletReference(d: InletDesign): InletReference {
  if (d.rampAnglesDeg.length !== d.rampLengthsM.length) {
    throw new Error('inletReference: ramp angles and lengths must match');
  }
  const chain = rampChain(d.mach, d.rampAnglesDeg);
  const atm = atmosphereAt(d.altitudeM);
  const fs = freestreamFrom(atm.pressurePa, atm.temperatureK, d.mach);

  const last = chain.steps[chain.steps.length - 1];
  const lastMachIn = last?.machIn ?? d.mach;
  const margin = last?.shock.attached
    ? thetaMaxDeg(lastMachIn) - last.turnDeg
    : -(last?.turnDeg ?? 0);

  const pressureRatio = chain.pressureRatio;
  const machOut = chain.machOut;

  // Reflections: a shock leaving the ramp system travels at the ramp angle to the
  // axis; each cowl/floor bounce is one reflection. Estimate from the duct
  // geometry rather than pretending to simulate it.
  // β is measured from the local upstream flow. The upstream flow at the last
  // ramp has already been turned by the sum of the preceding ramps, and the flow
  // downstream turns by one more. So the shock's angle relative to the (axis-
  // aligned) duct is upstreamTurn + β − totalTurn.
  const upstreamTurn = chain.steps.slice(0, -1).reduce((a, s) => a + s.turnDeg, 0);
  const shockAngleToAxis = last?.shock.attached
    ? upstreamTurn + last.shock.betaDeg - chain.totalTurnDeg
    : 0;
  // Length for the shock to traverse one duct height, and back: one full bounce.
  const traverse = Math.tan((Math.max(0, shockAngleToAxis) * Math.PI) / 180);
  const bounceLength = traverse > 1e-9 ? (2 * d.isolatorHeightM) / traverse : Infinity;
  const reflections = Number.isFinite(bounceLength)
    ? Math.floor(d.isolatorLengthM / bounceLength)
    : 0;

  // Capture: the area between the first ramp apex and the cowl lip.
  const captureHeight = d.rampLengthsM[0] * Math.sin((d.rampAnglesDeg[0] * Math.PI) / 180) + d.isolatorHeightM;
  const massFlowPerDepth = fs.rho * fs.u * captureHeight;

  return {
    chain,
    pressureRatio,
    totalPressureRatio: chain.totalPressureRecovery,
    machOut,
    attached: chain.attached,
    marginToDetachmentDeg: margin,
    freestream: fs,
    massFlowPerDepth,
    isolator: {
      // A steady, inviscid, structured-grid solve cannot represent a shock train:
      // there is no time dimension for the oscillation and no viscosity for the
      // separation that drives it.
      terminalShockRequired: Number.isFinite(machOut) && machOut > 1.0,
      expectedReflections: reflections,
      entryMach: machOut,
      recoveryAtExit: chain.totalPressureRecovery,
      notModelled: [
        'shock-train unsteadiness (a steady solver has no time dimension to express it)',
        'the terminal shock position, which depends on combustor back pressure',
        'turbulent boundary layers and separation, which set the isolator back-pressure limit',
        'viscous duct losses; recovery here is inviscid total pressure only',
        'cowl leading-edge bluntness and its shock',
      ],
    },
  };
}

/** Convenience: the default inlet used by the panel and the tests. */
export const DEFAULT_INLET: InletDesign = {
  rampAnglesDeg: [7.2, 5.8],
  rampLengthsM: [1.2, 0.9],
  cowlAngleDeg: 6,
  isolatorLengthM: 2.4,
  isolatorHeightM: 0.22,
  mach: 5.5,
  altitudeM: 27_000,
};
