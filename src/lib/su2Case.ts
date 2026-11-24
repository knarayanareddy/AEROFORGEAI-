// Writes a SU2 v8.6 configuration file for the Phase 2 inlet.
//
// Every option name emitted here is checked against SU2's own option registry
// (Common/src/CConfig.cpp) by `oracle/su2_schema.py` in CI. That is the point:
// a case file with a typo'd key is silently ignored by SU2 — it falls back to
// the default and the run looks fine while computing something else. Key-name
// validation is therefore not cosmetic.
//
// Sources for the values used below:
//   TestCases/euler/bluntbody/blunt.cfg   supersonic Euler, AUSMPLUSUP, CFL 6,
//                                         CONV_RESIDUAL_MINVAL= -8, ITER 2500
//   TestCases/euler/naca0012/inv_NACA0012.cfg   standard output/history blocks
//   Common/include/option_structure.hpp   enum spellings (Upwind_Map, etc.)

import type { InletDesign } from './inlet';
import { SU2_MARKERS } from './su2Mesh';
import type { AtmosphereState } from './atmosphere';

export interface Su2CaseInput {
  design: InletDesign;
  /** Static pressure and temperature at the inflow plane, SI. */
  atmosphere: AtmosphereState;
  meshFilename: string;
  iterations?: number;
}

/**
 * SU2 uses a non-dimensionalisation; with REF_DIMENSIONALIZATION unset the
 * default works in freestream-normalised units, so the freestream values are
 * given in SI and SU2 handles the rest. The temperature is deliberately the
 * static temperature, matching the definition in `freestreamFrom`.
 */
export function writeSu2Case(input: Su2CaseInput): string {
  const { design: d, atmosphere: atm } = input;
  const iterations = input.iterations ?? 5000;

  const lines = [
    '% ------------------------------------------------------------------',
    '% AeroForge Phase 2 inlet — SU2 v8.6 configuration',
    '%',
    '% Generated from the same geometry that feeds the in-browser Euler',
    '% solver, so the two share a definition of the flow path.',
    '%',
    '% STATUS: this file has NOT been run. SU2 is not installed in the',
    '% environment that produced it. See docs/phase-3.md.',
    '% ------------------------------------------------------------------',
    '',
    '% ---- Problem definition ------------------------------------------',
    'SOLVER= EULER',
    'MATH_PROBLEM= DIRECT',
    'RESTART_SOL= NO',
    '',
    `MACH_NUMBER= ${d.mach}`,
    'AOA= 0.0',
    `FREESTREAM_PRESSURE= ${atm.pressurePa}`,
    `FREESTREAM_TEMPERATURE= ${atm.temperatureK}`,
    'REF_LENGTH= 1.0',
    'REF_AREA= 1.0',
    '',
    '% ---- Mesh --------------------------------------------------------',
    `MESH_FILENAME= ${input.meshFilename}`,
    'MESH_FORMAT= SU2',
    '',
    '% ---- Boundary conditions -----------------------------------------',
    '% The ramp surfaces, isolator floor and cowl inner surface are all solid.',
    'MARKER_EULER= ( ' + SU2_MARKERS.wall + ' )',
    '% The open top ahead of the cowl lip sees the ramp shocks pass through it,',
    '% so it is a far-field, not a wall. Tagged "far_top" by the mesh writer.',
    'MARKER_FAR= ( far_top )',
    'MARKER_PLOTTING= ( ' + SU2_MARKERS.wall + ' )',
    'MARKER_MONITORING= ( ' + SU2_MARKERS.wall + ' )',
    '',
    '% ---- Numerics ----------------------------------------------------',
    '% AUSM+-up and CFL 6 follow the blunt-body case, which is the closest',
    '% shipped example: supersonic Euler with strong shocks.',
    'NUM_METHOD_GRAD= WEIGHTED_LEAST_SQUARES',
    'CONV_NUM_METHOD_FLOW= AUSMPLUSUP',
    'MUSCL_FLOW= YES',
    'SLOPE_LIMITER_FLOW= VENKATAKRISHNAN',
    'TIME_DISCRE_FLOW= EULER_IMPLICIT',
    'CFL_NUMBER= 6.0',
    'CFL_ADAPT= NO',
    'LINEAR_SOLVER= FGMRES',
    'LINEAR_SOLVER_PREC= LU_SGS',
    'LINEAR_SOLVER_ERROR= 1E-6',
    'LINEAR_SOLVER_ITER= 5',
    '',
    '% ---- Convergence -------------------------------------------------',
    `ITER= ${iterations}`,
    'CONV_RESIDUAL_MINVAL= -8',
    'CONV_STARTITER= 10',
    '',
    '% ---- Output ------------------------------------------------------',
    'OUTPUT_FILES= (RESTART_ASCII, PARAVIEW_ASCII, SURFACE_CSV)',
    'SCREEN_OUTPUT= (INNER_ITER, RMS_DENSITY, RMS_ENERGY)',
    'HISTORY_OUTPUT= (ITER, RMS_RES)',
    'OUTPUT_WRT_FREQ= 500',
    '',
  ];
  return lines.join('\n');
}

/**
 * Human-readable statement of this file's status, shown in the UI next to the
 * download. It exists so the artifact cannot be mistaken for a validated run.
 */
export function su2StatusNote(): string {
  return (
    'Case + mesh are generated from the live geometry and every option name is ' +
    'checked against the SU2 v8.6.0 option registry in CI. The file has NOT been ' +
    'executed — SU2 is not available in this environment (its release binaries ' +
    'are served from a host this sandbox cannot reach).'
  );
}
