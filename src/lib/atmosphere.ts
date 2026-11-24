// International Standard Atmosphere (ISA) — 1976 model, troposphere + lower
// stratosphere (0–32 km), which covers every flight condition this app shows.
//
// The old UI paired sea-level pressure (101 325 Pa) with tropopause temperature
// (216.65 K) and labelled both "total". This module removes that class of bug:
// a flight condition is an ALTITUDE plus a MACH number, and every pressure and
// temperature is derived from it.
//
// Layers used (ISA):
//   0–11 km   lapse −6.5 K/km   T0 = 288.15 K, p0 = 101 325 Pa
//   11–20 km  isothermal        T  = 216.65 K
//   20–32 km  lapse +1.0 K/km   T  = 216.65 K at 20 km

import { GAMMA_AIR, R_AIR } from './obliqueShock';

export const SEA_LEVEL_TEMPERATURE_K = 288.15;
export const SEA_LEVEL_PRESSURE_PA = 101_325;
export const SEA_LEVEL_DENSITY = 1.225;
export const G0 = 9.80665;
/** Standard gravity / gas constant — the ISA exponent. */
const G_OVER_R = G0 / R_AIR;

export interface AtmosphereState {
  altitudeM: number;
  /** Static temperature, K. */
  temperatureK: number;
  /** Static pressure, Pa. */
  pressurePa: number;
  /** Static density, kg/m³. */
  density: number;
  /** Local speed of sound, m/s. */
  speedOfSound: number;
}

/** ISA layer boundaries and lapse rates (base altitude, base T, base p, lapse). */
interface IsaLayer {
  /** Base geopotential altitude of the layer, m. */
  h: number;
  /** Temperature at the base, K. */
  T: number;
  /** Pressure at the base, Pa. */
  p: number;
  /** Temperature lapse rate within the layer, K/m (negative below 11 km). */
  lapse: number;
}

const LAYERS: IsaLayer[] = [
  { h: 0, T: 288.15, p: 101_325, lapse: -0.0065 },
  { h: 11_000, T: 216.65, p: 22_632.1, lapse: 0 },
  { h: 20_000, T: 216.65, p: 5_474.89, lapse: 0.001 },
  { h: 32_000, T: 228.65, p: 868.019, lapse: 0.0028 },
];

/**
 * Static atmosphere properties at a geometric altitude.
 * Clamps to the first/last tabulated layer outside the modelled range.
 */
export function atmosphereAt(altitudeM: number): AtmosphereState {
  let layer = LAYERS[0];
  for (let i = 0; i < LAYERS.length; i++) {
    if (altitudeM >= LAYERS[i].h) layer = LAYERS[i];
  }
  const dh = altitudeM - layer.h;
  let temperatureK: number;
  let pressurePa: number;

  if (layer.lapse === 0) {
    temperatureK = layer.T;
    pressurePa = layer.p * Math.exp((-G0 * dh) / (R_AIR * layer.T));
  } else {
    const L = layer.lapse; // K/m
    temperatureK = layer.T + L * dh;
    pressurePa = layer.p * Math.pow(layer.T / temperatureK, G_OVER_R / L);
  }

  const density = pressurePa / (R_AIR * temperatureK);
  const speedOfSound = Math.sqrt(GAMMA_AIR * R_AIR * temperatureK);
  return { altitudeM, temperatureK, pressurePa, density, speedOfSound };
}

/** Inverse: the ISA altitude whose static pressure matches `pressurePa`. */
export function altitudeFromPressure(pressurePa: number): number {
  if (!(pressurePa > 0)) return NaN;
  // Walk layers from the ground up.
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const layer = LAYERS[i];
    if (pressurePa <= layer.p) {
      const L = layer.lapse;
      if (L === 0) {
        return layer.h + (R_AIR * layer.T * Math.log(layer.p / pressurePa)) / G0;
      }
      // Invert p = p_b·(T_b/T)^(g/(R·L)) for T:
      //   T = T_b · (p/p_b)^(−L·R/g)
      const T = layer.T * Math.pow(pressurePa / layer.p, -L / G_OVER_R);
      return layer.h + (T - layer.T) / L;
    }
  }
  return NaN;
}

// ── Flight condition ─────────────────────────────────────────────────────────

export interface FlightCondition {
  altitudeM: number;
  mach: number;
}

export interface DerivedFlightState extends AtmosphereState {
  mach: number;
  /** Static temperature, K (alias for clarity at call sites). */
  staticTemperatureK: number;
  /** Static pressure, Pa. */
  staticPressurePa: number;
  /** Total (stagnation) temperature T₀, K. */
  totalTemperatureK: number;
  /** Total (stagnation) pressure p₀, Pa. */
  totalPressurePa: number;
  /** Freestream velocity, m/s. */
  velocity: number;
  /** Dynamic pressure q∞ = ½ρV², Pa. */
  dynamicPressurePa: number;
  /** Adiabatic wall temperature (turbulent recovery factor 0.89), K. */
  adiabaticWallTemperatureK: number;
}

/**
 * Everything the UI needs about a flight condition, derived from altitude and
 * Mach — never typed in by hand.
 */
export function deriveFlightState(
  { altitudeM, mach }: FlightCondition,
  recoveryFactor = 0.89,
): DerivedFlightState {
  const atm = atmosphereAt(altitudeM);
  const velocity = mach * atm.speedOfSound;
  const totalTemperatureK = atm.temperatureK * (1 + 0.2 * mach * mach);
  const totalPressurePa =
    atm.pressurePa * Math.pow(1 + 0.2 * mach * mach, GAMMA_AIR / (GAMMA_AIR - 1));
  return {
    ...atm,
    mach,
    staticTemperatureK: atm.temperatureK,
    staticPressurePa: atm.pressurePa,
    totalTemperatureK,
    totalPressurePa,
    velocity,
    dynamicPressurePa: 0.5 * atm.density * velocity * velocity,
    adiabaticWallTemperatureK:
      atm.temperatureK * (1 + recoveryFactor * 0.2 * mach * mach),
  };
}

/**
 * The design/audit flight condition used throughout the app: M 5.5 at 27 km.
 * (Supersonic-cruise altitude band; matches the CEP example in the design doc.)
 */
export const DESIGN_ALTITUDE_M = 27_000;
export const DESIGN_MACH = 5.5;
