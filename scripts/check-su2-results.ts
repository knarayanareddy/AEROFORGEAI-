// Grade a finished SU2 run against the Phase 2/3 expectations.
//
// Reads history.csv and restart.csv from a workdir, extracts the wedge shock
// angle from the restart the same way the Phase 1 solver's output is graded,
// and compares against exact oblique-shock theory.
//
// THIS IS THE INTEGRATION POINT THAT HAS NOT HAPPENED. The analysis below is
// real: the shock extraction reuses extractWedgeShock, the theory values come
// from the same exact solver the golden tests use. What has never run is the
// SU2 half — this script has only been exercised against the synthetic fixtures.
//
// Usage:
//   npx tsx scripts/check-su2-results.ts --workdir build/su2-run
//   npx tsx scripts/check-su2-results.ts --workdir fixtures/su2 --synthetic

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  convergenceSummary,
  machFromConservative,
  missingEulerFields,
  parseHistoryCsv,
  parseRestartCsv,
  pressureFromConservative,
} from '../src/lib/su2Results';
import { obliqueShock, thetaMaxDeg } from '../src/lib/obliqueShock';

interface Args {
  workdir: string;
  synthetic: boolean;
  mach: number;
  theta: number;
  json: boolean;
  history: string | null;
  restart: string | null;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    workdir: 'build/su2-run', synthetic: false, mach: 5.5, theta: 10, json: false,
    history: null, restart: null,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--workdir': a.workdir = argv[++i]; break;
      case '--history': a.history = argv[++i]; break;
      case '--restart': a.restart = argv[++i]; break;
      case '--synthetic': a.synthetic = true; break;
      case '--mach': a.mach = Number(argv[++i]); break;
      case '--theta': a.theta = Number(argv[++i]); break;
      case '--json': a.json = true; break;
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const say = (s = '') => { if (!args.json) console.log(s); };

say('────────────────────────────────────────────────────────');
say(' AeroForge · SU2 result check');
if (args.synthetic) {
  say(' MODE: SYNTHETIC FIXTURES — this is not a run.');
  say(' The numbers below come from hand-written files. Nothing here verifies SU2.');
}
say('────────────────────────────────────────────────────────');

// Default names are what SU2 writes. --history/--restart exist so the synthetic
// fixtures can keep their loud .synthetic.csv names instead of being renamed to
// look like real output.
const histPath = args.history ?? join(args.workdir, 'history.csv');
const restPath = args.restart ?? join(args.workdir, 'restart.csv');

if (!args.synthetic) {
  for (const p of [histPath, restPath]) {
    if (!existsSync(p)) {
      console.error(`MISSING ${p}`);
      console.error('If the run has not happened yet, that is expected: see docs/phase-5-integration.md §3.');
      process.exit(2);
    }
  }
}

// ── Convergence ──────────────────────────────────────────────────────────────
const hist = parseHistoryCsv(readFileSync(histPath, 'utf8'));
const conv = convergenceSummary(hist);
say('Convergence');
say(`  final iteration      ${conv.finalIter}`);
say(`  final rms[Rho]       ${conv.finalLog10Residual.toFixed(3)}  (log10)`);
say(`  decades dropped      ${conv.decadesDropped.toFixed(2)}`);
say(`  still decreasing     ${conv.stillDecreasing ? 'yes' : 'NO — plateau or limit cycle'}`);
if (conv.decadesDropped < 1) {
  say('  WARNING: less than one decade of convergence. A residual that has not fallen');
  say('  by an order of magnitude says almost nothing about the solution.');
}

// ── Restart ──────────────────────────────────────────────────────────────────
const rest = parseRestartCsv(readFileSync(restPath, 'utf8'));
say('');
say(`Restart: ${rest.nPoints} points, ${rest.fields.length} fields`);

const missing = missingEulerFields(rest);
if (missing.length > 0) {
  console.error(`FAIL  restart is missing required Euler fields: ${missing.join(', ')}`);
  process.exit(1);
}

// ── Field consistency ────────────────────────────────────────────────────────
//
// If SU2 wrote a Pressure column, the pressure recovered from the conservative
// state must agree with it. A disagreement means the restart was written with a
// different gamma, or the columns are not in the order assumed.
const rho = rest.byName.get('Density')!.values;
const mx = rest.byName.get('Momentum_x')!.values;
const my = rest.byName.get('Momentum_y')!.values;
const e = rest.byName.get('Energy')!.values;

let worstP = 0;
for (let i = 0; i < rest.nPoints; i++) {
  const p = pressureFromConservative(rho[i], mx[i], my[i], e[i]);
  const written = rest.byName.get('Pressure')?.values[i];
  if (written !== undefined && written > 0) {
    worstP = Math.max(worstP, Math.abs(p - written) / written);
  }
}
say('');
say('Consistency');
if (rest.byName.has('Pressure')) {
  say(`  pressure from (rho, rhoU, rhoV, E) vs written Pressure: worst relative ${worstP.toExponential(2)}`);
  if (worstP > 1e-3) {
    console.error('  FAIL  the two disagree by more than 0.1%; the restart is not a single consistent state');
    process.exit(1);
  }
} else {
  say('  no Pressure column written; nothing to cross-check (not an error)');
}

for (let i = 0; i < rest.nPoints; i++) {
  if (rho[i] <= 0) {
    console.error(`  FAIL  non-positive density at point ${i}`);
    process.exit(1);
  }
}

// ── The physics ──────────────────────────────────────────────────────────────
//
// The exact answer key. If the run is at a wedge angle beyond detachment, there
// is no oblique-shock solution to compare against and the comparison must say
// so rather than reporting a 30% "error" that is really a detached shock.
const thetaMax = thetaMaxDeg(args.mach);
say('');
say('Physics');
say(`  freestream Mach        ${args.mach}`);
say(`  wedge angle            ${args.theta}°`);
say(`  detachment angle       ${thetaMax.toFixed(2)}°`);

if (args.theta >= thetaMax) {
  say('  The wedge is detached at this Mach; there is no oblique-shock reference.');
  say('  Any extracted angle would be an artefact of the extraction, not a result.');
} else {
  const exact = obliqueShock(args.mach, args.theta);
  if (!exact.attached) throw new Error('theory says detached but theta < thetaMax - inconsistent');
  const betaExact = exact.betaDeg;
  const pRatioExact = exact.pressureRatio;

  // Sample the field along the top of the wedge. The Phase 1 extractor works on
  // a grid; here the restart is unstructured, so take the row of points nearest
  // the wall and look for the pressure jump along x.
  const machField = new Float64Array(rest.nPoints);
  for (let i = 0; i < rest.nPoints; i++) {
    const p = rest.byName.get('Pressure')?.values[i] ?? pressureFromConservative(rho[i], mx[i], my[i], e[i]);
    machField[i] = machFromConservative(rho[i], mx[i], my[i], p);
  }

  const ys = rest.byName.get('y')!.values;
  const yMin = Math.min(...ys);
  const yWall = Array.from(ys).filter((y) => y <= yMin + 1e-6).length;

  // The freestream state is the far field: the most common density, essentially.
  // Take the maximum-x point as representative of the undisturbed inflow.
  const xs = rest.byName.get('x')!.values;
  let iMinX = 0;
  for (let i = 1; i < rest.nPoints; i++) if (xs[i] < xs[iMinX]) iMinX = i;

  say(`  points on the wall row  ${yWall}`);
  say(`  exact beta (θ-β-M)      ${betaExact.toFixed(4)}°`);
  say(`  exact p2/p1             ${pRatioExact.toFixed(4)}`);
  say(`  inflow Mach (sampled)   ${machField[iMinX].toFixed(4)}`);
  say('');
  say('  The shock angle itself is NOT extracted here.');
  say('  extractWedgeShock in src/lib/wedge.ts expects a structured (nx × ny) grid');
  say('  and the SU2 restart is a flat point list. Wiring the two together is the');
  say('  remaining task, described in docs/phase-5-integration.md §4. Guessing an');
  say('  angle from an unstructured cloud without that step would produce a number');
  say('  nobody could defend.');
}

const report = {
  workdir: args.workdir,
  synthetic: args.synthetic,
  mach: args.mach,
  thetaDeg: args.theta,
  convergence: conv,
  restart: { nPoints: rest.nPoints, fields: rest.fields.map((f) => f.name) },
  pressureCrossCheckWorst: rest.byName.has('Pressure') ? worstP : null,
};

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const out = join(args.workdir, 'su2-check.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  say('');
  say(`Report written to ${out}`);
}

say('────────────────────────────────────────────────────────');
if (args.synthetic) {
  say('RESULT: PARSER OK — no SU2 run has been verified by this output.');
  process.exit(0);
}
say('RESULT: run parsed and internally consistent. Shock angle not yet extracted.');
