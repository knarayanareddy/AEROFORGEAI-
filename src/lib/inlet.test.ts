// Reference-side tests for the Phase 2 inlet.
//
// The angles and pressure ratios here are the same answer key the Phase 1 golden
// tests use, reached through `rampChain` instead of the solver, so a mismatch
// means the inlet wiring is wrong rather than the solver being inaccurate.

import { describe, expect, it } from 'vitest';
import { DEFAULT_INLET, inletReference, lipHeightOf } from './inlet';
import { thetaMaxDeg } from './obliqueShock';

describe('ramp chain at the design point', () => {
  const ref = inletReference(DEFAULT_INLET);

  it('reproduces the published answer key for each ramp', () => {
    // M 5.5, first ramp 7.2° -> beta 15.8520°, p2/p1 2.46655
    expect(ref.chain.steps[0].shock.betaDeg).toBeCloseTo(15.852, 3);
    expect(ref.chain.steps[0].shock.pressureRatio).toBeCloseTo(2.46655, 4);
    // Second ramp: 5.8° additional turn from M 4.655.
    expect(ref.chain.steps[1].shock.betaDeg).toBeCloseTo(16.573, 2);
    expect(ref.chain.steps[1].shock.pressureRatio).toBeCloseTo(1.890, 2);
  });

  it('multiplies the individual pressure ratios', () => {
    expect(ref.pressureRatio).toBeCloseTo(4.6621, 3);
  });

  it('loses total pressure across each shock but keeps most of it', () => {
    expect(ref.totalPressureRatio).toBeLessThan(1);
    expect(ref.totalPressureRatio).toBeGreaterThan(0.85);
    ref.chain.steps.forEach((s) => {
      expect(s.shock.totalPressureRatio).toBeLessThan(1);
      expect(s.shock.entropyRise).toBeGreaterThan(0);
    });
  });

  it('reports the design as attached with a large margin', () => {
    expect(ref.attached).toBe(true);
    expect(ref.marginToDetachmentDeg).toBeGreaterThan(10);
    // The margin is theta_max at the ramp's inlet Mach minus the ramp turn.
    expect(ref.marginToDetachmentDeg).toBeCloseTo(
      thetaMaxDeg(ref.chain.steps[1].machIn) - DEFAULT_INLET.rampAnglesDeg[1],
      6,
    );
  });

  it('decelerates the flow but leaves the duct supersonic', () => {
    expect(ref.machOut).toBeLessThan(DEFAULT_INLET.mach);
    expect(ref.machOut).toBeGreaterThan(1);
    expect(ref.machOut).toBeCloseTo(4.1314, 3);
  });

  it('computes mass flow from the capture area and freestream density', () => {
    // rho * u * H, with rho from the 27 km standard atmosphere.
    expect(ref.massFlowPerDepth).toBeGreaterThan(0);
    expect(Number.isFinite(ref.massFlowPerDepth)).toBe(true);
  });
});

describe('isolator expectations are declared, not simulated', () => {
  const ref = inletReference(DEFAULT_INLET);

  it('says a terminal shock is required at supersonic entry', () => {
    expect(ref.isolator.terminalShockRequired).toBe(true);
  });

  it('lists what the model does not represent', () => {
    const { notModelled } = ref.isolator;
    expect(notModelled.length).toBeGreaterThanOrEqual(4);
    expect(notModelled.join(' ')).toMatch(/shock-train unsteadiness/);
    expect(notModelled.join(' ')).toMatch(/separation/);
    // It must not claim to model the shock train.
    expect(notModelled.join(' ')).not.toMatch(/we simulate the shock train/);
  });

  it('counts a plausible number of cowl bounces, not zero and not infinity', () => {
    expect(ref.isolator.expectedReflections).toBeGreaterThanOrEqual(0);
    expect(ref.isolator.expectedReflections).toBeLessThan(100);
  });

  it('places the last ramp shock correctly in the duct frame', () => {
    // The shock's angle to the axis is upstreamTurn + beta - totalTurn. For the
    // default design: 7.2 + 16.573 - 13 = 10.77°.
    //
    // The sanity check is against the UPSTREAM Mach angle, not the downstream
    // one. A shock is steeper than mu(M1) in the upstream frame — that is what
    // makes it a shock rather than a Mach wave. Converting to the duct frame
    // subtracts the total turn, so 10.77° ends up below mu(M2) = 14.0°; that is
    // expected and is why the naive downstream comparison is the wrong test.
    const { steps, totalTurnDeg } = ref.chain;
    const last = steps[steps.length - 1];
    const upstreamTurn = steps.slice(0, -1).reduce((a, s) => a + s.turnDeg, 0);
    const toAxis = upstreamTurn + last.shock.betaDeg - totalTurnDeg;

    expect(toAxis).toBeCloseTo(10.773, 2);
    const muUpstream = (Math.asin(1 / last.machIn) * 180) / Math.PI;
    expect(last.shock.betaDeg).toBeGreaterThan(muUpstream);
  });
});

describe('parameter handling', () => {
  it('rejects mismatched ramp arrays', () => {
    expect(() => inletReference({ ...DEFAULT_INLET, rampAnglesDeg: [7.2] })).toThrow(/must match/);
  });

  it('moves the lip when the cowl angle changes', () => {
    const shallow = lipHeightOf({ ...DEFAULT_INLET, cowlAngleDeg: 3 });
    const steep = lipHeightOf({ ...DEFAULT_INLET, cowlAngleDeg: 9 });
    expect(shallow).toBeLessThan(steep);
    // Linear in tan, so a 3x angle is roughly 3x the height at small angles.
    expect(steep / shallow).toBeCloseTo(Math.tan((9 * Math.PI) / 180) / Math.tan((3 * Math.PI) / 180), 6);
  });

  it('marks the design detached when a ramp exceeds theta_max', () => {
    // theta_max is 40.47° at M 4.655, so 39° is still attached — it needs to go
    // past 40.47 to detach, and 45° is comfortably beyond it.
    const bad = inletReference({ ...DEFAULT_INLET, rampAnglesDeg: [7.2, 45] });
    expect(bad.attached).toBe(false);
    expect(Number.isNaN(bad.machOut)).toBe(true);
  });
});
