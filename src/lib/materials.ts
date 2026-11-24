// Material allowables for the design cases this app shows.
//
// Every entry carries its SOURCE, because a temperature limit without a source
// is indistinguishable from a guess. The old UI asserted "Ti-6Al-4V: required
// T < 1750 K" and marked a 1650 K wall as PASS — the alloy melts near 1900 K
// and its useful service ceiling is ~870 K, so that PASS was false. This module
// exists so a false PASS cannot be emitted again: a check that has no source is
// reported as `unknown`, never as `pass`.
//
// Values are conservative engineering allowables, not design allowables for a
// specific drawing. Every one must be confirmed against the controlling
// specification (MMPDS / AMS / supplier data) before hardware is cut.

export type ThermalClass =
  | 'titanium'
  | 'nickel-superalloy'
  | 'refractory'
  | 'carbon-carbon'
  | 'ceramic-matrix'
  | 'steel'
  | 'aluminium';

export interface Material {
  id: string;
  name: string;
  class: ThermalClass;
  /**
   * Practical long-duration service ceiling for structural duty, K.
   * Above this the material needs active cooling or is out of its allowables.
   */
  serviceLimitK: number;
  /** Solidus / melting onset, K. Never a design limit. */
  meltingK: number;
  /** Density, kg/m³. */
  densityKgM3: number;
  /**
   * True when the material can hold structural load at hypersonic
   * stagnation temperatures only with active cooling.
   */
  requiresActiveCooling: boolean;
  /** Source of the service limit — display this next to the number. */
  source: string;
  /** One-line engineering note shown in the UI. */
  note: string;
}

export const MATERIALS: Material[] = [
  {
    id: 'ti-6al-4v',
    name: 'Ti-6Al-4V',
    class: 'titanium',
    serviceLimitK: 870,
    meltingK: 1_890,
    densityKgM3: 4_430,
    requiresActiveCooling: true,
    source: 'MMPDS-2022 / AMS 4928 (bar & forging spec, not a thermal limit)',
    note:
      'The workhorse airframe alloy. Usable to roughly 600 °C (870 K); it loses strength rapidly ' +
      'beyond that and is not a candidate for a hypersonic inlet flowpath.',
  },
  {
    id: 'inconel-718',
    name: 'Inconel 718',
    class: 'nickel-superalloy',
    serviceLimitK: 980,
    meltingK: 1_600,
    densityKgM3: 8_190,
    requiresActiveCooling: true,
    source: 'MMPDS-2022 / AMS 5662',
    note:
      'Nickel superalloy with good creep resistance to ~700 °C (980 K). Standard choice for ' +
      'moderate-temperature hot structure; needs cooling or thermal protection above that.',
  },
  {
    id: 'haynes-230',
    name: 'Haynes 230',
    class: 'nickel-superalloy',
    serviceLimitK: 1_150,
    meltingK: 1_640,
    densityKgM3: 8_970,
    requiresActiveCooling: true,
    source: 'Haynes International datasheet',
    note: 'Higher-temperature nickel alloy for combustor and exhaust hardware.',
  },
  {
    id: 'c-103',
    name: 'C-103 (Nb alloy)',
    class: 'refractory',
    serviceLimitK: 1_480,
    meltingK: 2_620,
    densityKgM3: 8_850,
    requiresActiveCooling: false,
    source: 'Refractory-metal supplier data (Nb-Hf-Ti)',
    note:
      'Niobium alloy used for uncooled nozzle flaps and hot structure in the 1200–1500 K band. ' +
      'Oxidation protection (silicide coating) is mandatory.',
  },
  {
    id: 'c-c',
    name: 'Carbon–carbon composite',
    class: 'carbon-carbon',
    serviceLimitK: 2_200,
    meltingK: 3_900, // sublimes; no true melt
    densityKgM3: 1_800,
    requiresActiveCooling: false,
    source: 'Manufacturer data; sublimation onset ≈ 3300 K',
    note:
      'Leading-edge and nose-cap material. Holds strength to ~2200 K in inert conditions; ' +
      'oxidises rapidly unless coated, and has low through-thickness strength.',
  },
  {
    id: 'sic-sic',
    name: 'SiC/SiC ceramic matrix composite',
    class: 'ceramic-matrix',
    serviceLimitK: 1_600,
    meltingK: 2_700,
    densityKgM3: 3_000,
    requiresActiveCooling: false,
    source: 'CMH-17 / supplier data',
    note: 'Lower density than superalloys at similar temperature capability; brittle, needs damage tolerance work.',
  },
  {
    id: 'al-7075',
    name: 'Al 7075-T6',
    class: 'aluminium',
    serviceLimitK: 400,
    meltingK: 905,
    densityKgM3: 2_810,
    requiresActiveCooling: true,
    source: 'MMPDS-2022',
    note: 'Cold structure only. At Mach 5.5 the wall is far beyond this; not applicable to the flowpath.',
  },
];

export const MATERIAL_BY_ID: Record<string, Material> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m]),
);

export function getMaterial(id: string): Material | undefined {
  return MATERIAL_BY_ID[id];
}

// ── Thermal assessment ───────────────────────────────────────────────────────

export type ThermalVerdict = 'ok' | 'marginal' | 'fail' | 'unknown';

export interface MaterialAssessment {
  material: Material;
  /** Wall temperature assessed, K. */
  wallTemperatureK: number;
  /** Service limit used, K. */
  serviceLimitK: number;
  /** (limit − wall) / limit. Negative means over the limit. */
  margin: number;
  verdict: ThermalVerdict;
  requiresActiveCooling: boolean;
  /** Human-readable one-liner for the validation row. */
  summary: string;
  /** Alternatives that would pass at this wall temperature. */
  alternatives: Material[];
}

/** Fraction of the service limit below which the margin is called "marginal". */
const MARGINAL_BAND = 0.05;

/**
 * Assess a material against a wall temperature.
 *
 * Uses the ADIABATIC WALL temperature (the wall actually sees T_aw, not T₀ and
 * not T∞) and fails closed: a material with no service limit yields `unknown`,
 * never `ok`.
 */
export function assessMaterial(
  materialId: string,
  wallTemperatureK: number,
): MaterialAssessment | null {
  const material = getMaterial(materialId);
  if (!material) return null;

  if (!Number.isFinite(material.serviceLimitK) || material.serviceLimitK <= 0) {
    return {
      material,
      wallTemperatureK,
      serviceLimitK: NaN,
      margin: NaN,
      verdict: 'unknown',
      requiresActiveCooling: material.requiresActiveCooling,
      summary: `${material.name}: no sourced service limit — cannot assess`,
      alternatives: [],
    };
  }

  const limit = material.serviceLimitK;
  const margin = (limit - wallTemperatureK) / limit;
  let verdict: ThermalVerdict;
  if (wallTemperatureK > limit) verdict = 'fail';
  else if (margin <= MARGINAL_BAND) verdict = 'marginal';
  else verdict = 'ok';

  const alternatives = MATERIALS.filter(
    (m) => m.id !== material.id && m.serviceLimitK > wallTemperatureK,
  ).sort((a, b) => a.densityKgM3 - b.densityKgM3);

  const summary =
    verdict === 'fail'
      ? `${material.name}: ${Math.round(wallTemperatureK)} K exceeds ${Math.round(limit)} K service limit — not viable`
      : verdict === 'marginal'
        ? `${material.name}: ${Math.round(wallTemperatureK)} K within ${Math.round(limit)} K limit but margin < 5%`
        : `${material.name}: ${Math.round(wallTemperatureK)} K vs ${Math.round(limit)} K limit — OK`;

  return {
    material,
    wallTemperatureK,
    serviceLimitK: limit,
    margin,
    verdict,
    requiresActiveCooling: material.requiresActiveCooling && verdict !== 'ok',
    summary,
    alternatives,
  };
}

/**
 * The "can any passive material do this?" question.
 * Returns materials that hold the wall temperature without active cooling.
 */
export function passiveCandidates(wallTemperatureK: number): Material[] {
  return MATERIALS.filter((m) => m.serviceLimitK > wallTemperatureK).sort(
    (a, b) => a.densityKgM3 - b.densityKgM3,
  );
}
