// Turning a natural-language prompt into a *checked* design point.
//
// Phase 1 of docs/pathway-forward.md replaces this with a schema-validated
// `POST /v1/intent` backed by a local LLM. This module is the honest stand-in
// for that endpoint: it runs entirely in the browser, it is deterministic, and
// — critically — it refuses to invent. Every parameter it returns is either
//
//   * parsed from the prompt, with the matched text recorded so the user can see
//     exactly what was read, or
//   * a documented default, flagged `inferred: true` with the reason.
//
// A parser that silently guesses 5.5 when no Mach was given would be the same
// sin as the hand-typed KPIs Phase 0 removed, just moved one layer down.

import { DESIGN_POINT, type InletDesignPoint } from '../lib/inletDesign';
import { MATERIALS, getMaterial } from '../lib/materials';

export type FieldSource = 'parsed' | 'default';

export interface IntentField<T = number> {
  value: T;
  source: FieldSource;
  /** The literal text that produced `value`. Empty for defaults. */
  evidence: string;
  /** Why this default was chosen. Empty when parsed. */
  reason: string;
}

export interface DesignIntent {
  /** Prompt that produced this intent, echoed for the audit trail. */
  prompt: string;
  altitudeM: IntentField;
  mach: IntentField;
  rampAnglesDeg: IntentField<number[]>;
  materialId: IntentField<string>;
  /** Fields that were asked for but could not be honoured, with the reason. */
  rejected: { field: string; reason: string; text: string }[];
  /** True when at least one numeric field came from the prompt. */
  parsedAnything: boolean;
  /** The assembled design point, ready for `analyseInlet`. */
  design: InletDesignPoint;
}

// ── Unit handling ────────────────────────────────────────────────────────────

const ALT_UNITS: Record<string, number> = {
  km: 1000,
  kms: 1000,
  km_: 1000,
  m: 1,
  mi: 1609.344,
  miles: 1609.344,
  mile: 1609.344,
  ft: 0.3048,
  feet: 0.3048,
  kft: 304.8,
};

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

const toNum = (s: string): number => Number(s.replace(',', '.'));

// ── Field extractors ─────────────────────────────────────────────────────────
//
// Each extractor returns the *first* plausible match, or null. Order matters:
// more specific patterns run before general ones.

function parseMach(prompt: string): IntentField | null {
  const patterns = [
    // "Mach 5.5", "M 5.5", "M=5.5", "M∞ = 5.5"
    new RegExp(String.raw`\bmach\s*(?:number\s*)?[=≈~:]?\s*${NUM}`, 'i'),
    new RegExp(String.raw`\bM\s*[∞]?\s*[=≈~:]?\s*${NUM}`, 'i'),
    // "M5.5" with no separator
    new RegExp(String.raw`\bM${NUM}\b`, 'i'),
    // Bare "at 5.5" is ambiguous with altitude, so it is deliberately excluded.
  ];
  for (const re of patterns) {
    const m = prompt.match(re);
    if (m) {
      const value = toNum(m[1]);
      // Hypersonic inlets in this tool live between M 2 and M 12. Anything else
      // is far more likely to be a misparse (a temperature, a year) than a Mach.
      if (value >= 1.5 && value <= 25) {
        return { value, source: 'parsed', evidence: m[0].trim(), reason: '' };
      }
    }
  }
  return null;
}

function parseAltitude(prompt: string): IntentField | null {
  // "27 km", "27000 m", "88,000 ft", "at 27000 m"
  const re = new RegExp(
    String.raw`${NUM}\s*(kft|km|kms|miles|mile|mi|feet|ft|m)\b(?!\s*(?:/|per)\s*s)`,
    'i',
  );
  // Prefer an altitude that is explicitly introduced by "at", "altitude",
  // "alt", "h=" or "km".
  const anchored = new RegExp(
    String.raw`(?:altitude|alt\.?|at|h)\s*[=≈~:]?\s*${NUM}\s*(kft|km|kms|miles|mile|mi|feet|ft|m)\b`,
    'i',
  );
  const m = prompt.match(anchored) ?? prompt.match(re);
  if (!m) return null;

  const unit = m[2].toLowerCase();
  const mult = ALT_UNITS[unit];
  if (mult === undefined) return null;
  const value = toNum(m[1]) * mult;

  // 0.5 km to 40 km covers every airbreathing regime this tool models. Outside
  // that the ISA model is being used outside its stated validity, so refuse.
  if (value >= 500 && value <= 40_000) {
    return {
      value,
      source: 'parsed',
      evidence: m[0].trim(),
      reason: '',
    };
  }
  return null;
}

function parseRamps(prompt: string): IntentField<number[]> | null {
  // "7.2° + 5.8°", "ramps of 6.5 and 7 deg", "ramps [7.2, 5.8]".
  //
  // Two passes, because English puts the unit wherever it likes:
  //   1. a run of numbers joined by , / and / + ending in one unit
  //      ("6.5 and 7 deg" — the degree sign appears once);
  //   2. otherwise every "<number>°" that carries its own unit.
  // Repeated capture groups are avoided on purpose: JS keeps only the last
  // iteration, which silently duplicated and then dropped angles.
  const unitSrc = String.raw`(?:°|deg\b|degrees?\b)`;
  const listRe = new RegExp(
    String.raw`((?:\d+(?:[.,]\d+)?\s*(?:,|and|\+|&)\s*)+\d+(?:[.,]\d+)?)\s*` + unitSrc,
    'i',
  );
  const bareRe = new RegExp(String.raw`\d+(?:[.,]\d+)?`, 'g');

  const candidates: number[] = [];
  const listMatch = prompt.match(listRe);
  if (listMatch) {
    for (const t of listMatch[1].match(bareRe) ?? []) {
      const v = toNum(t);
      if (v > 0 && v < 89) candidates.push(v);
    }
  }

  const singleRe = new RegExp(String.raw`\d+(?:[.,]\d+)?\s*` + unitSrc, 'gi');
  const singles: number[] = [];
  for (const hit of prompt.matchAll(singleRe)) {
    const v = toNum((hit[0].match(bareRe) ?? ['NaN'])[0]);
    if (v > 0 && v < 89) singles.push(v);
  }

  // Whichever pass found more distinct angles wins; ties go to the singles
  // because they are unit-explicit.
  const angles = singles.length >= candidates.length ? singles : candidates;

  if (angles.length > 0) {
    return {
      value: angles.slice(0, 5),
      source: 'parsed',
      evidence: angles.map((a) => `${a}°`).join(' + '),
      reason: '',
    };
  }

  // "three ramps", "3-shock inlet", "two-ramp"
  const countWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, single: 1, double: 2, triple: 3,
  };
  const countRe = /(\bone|two|three|four|five|single|double|triple|\d)\s*(?:-|\s)?(?:ramps?|shocks?|stages?)\b/i;
  const cm = prompt.match(countRe);
  if (cm) {
    const raw = cm[1].toLowerCase();
    const n = countWords[raw] ?? Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 5) {
      // Equal-shock split of the default total turning: a documented default,
      // not a measurement.
      const totalTurn = DESIGN_POINT.rampAnglesDeg.reduce((a, b) => a + b, 0);
      const per = Number((totalTurn / n).toFixed(2));
      return {
        value: Array.from({ length: n }, () => per),
        source: 'parsed',
        evidence: cm[0].trim(),
        reason: `shock count read from prompt; ${totalTurn}° total turning split equally (a default, not a parsed geometry)`,
      };
    }
  }
  return null;
}

function parseMaterial(prompt: string): IntentField<string> | null {
  const lower = prompt.toLowerCase();
  // Alias table: the prompt will not spell out our ids.
  const aliases: Record<string, string> = {
    'ti-6al-4v': 'ti-6al-4v',
    titanium: 'ti-6al-4v',
    'ti 6al 4v': 'ti-6al-4v',
    'inconel 718': 'inconel-718',
    inconel: 'inconel-718',
    'haynes 230': 'haynes-230',
    haynes: 'haynes-230',
    'c-103': 'c-103',
    niobium: 'c-103',
    'carbon-carbon': 'c-c',
    'carbon carbon': 'c-c',
    'carbon–carbon': 'c-c',
    'c/c': 'c-c',
    'sic/sic': 'sic-sic',
    'ceramic matrix': 'sic-sic',
    'cmc': 'sic-sic',
    'al-7075': 'al-7075',
    aluminium: 'al-7075',
    aluminum: 'al-7075',
  };
  for (const [needle, id] of Object.entries(aliases)) {
    if (lower.includes(needle) && getMaterial(id)) {
      return {
        value: id,
        source: 'parsed',
        evidence: prompt.slice(lower.indexOf(needle), lower.indexOf(needle) + needle.length),
        reason: '',
      };
    }
  }
  return null;
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export const KNOWN_MATERIALS = MATERIALS.map((m) => m.name);

/**
 * Parse a prompt into a design intent.
 *
 * Never throws and never returns a partially-valid design: missing fields fall
 * back to `DESIGN_POINT` and say so.
 */
export function parseDesignIntent(rawPrompt: string): DesignIntent {
  const prompt = rawPrompt.trim();
  const rejected: DesignIntent['rejected'] = [];

  const machP = parseMach(prompt);
  const altP = parseAltitude(prompt);
  const rampsP = parseRamps(prompt);
  const matP = parseMaterial(prompt);

  // A number that looks like a Mach but is out of range is worth telling the
  // user about rather than silently ignoring.
  if (!machP && /mach|(^|\W)M\s*\d/i.test(prompt)) {
    const raw = prompt.match(new RegExp(String.raw`(?:mach\s*[=≈~:]?\s*|M\s*[=≈~]\s*)${NUM}`, 'i'));
    if (raw) {
      rejected.push({
        field: 'mach',
        reason: `M ${raw[1]} is outside the 1.5–25 modelled range`,
        text: raw[0].trim(),
      });
    }
  }
  if (!altP && /\d\s*(km|kft|ft|miles?)\b/i.test(prompt)) {
    const raw = prompt.match(new RegExp(String.raw`${NUM}\s*(kft|km|kms|miles|mile|mi|feet|ft|m)\b`, 'i'));
    if (raw) {
      rejected.push({
        field: 'altitude',
        reason: `${raw[0]} is outside the 0.5–40 km range the ISA model is valid for`,
        text: raw[0].trim(),
      });
    }
  }

  const pick = <T,>(parsed: IntentField<T> | null, fallback: T, reason: string): IntentField<T> =>
    parsed ?? { value: fallback, source: 'default', evidence: '', reason };

  const mach = pick(machP, DESIGN_POINT.mach, 'no Mach found in the prompt; using the demo design point');
  const altitudeM = pick(
    altP,
    DESIGN_POINT.altitudeM,
    'no altitude found in the prompt; using the demo design point',
  );
  const rampAnglesDeg = pick(
    rampsP,
    DESIGN_POINT.rampAnglesDeg,
    'no ramp geometry found in the prompt; using the demo two-ramp geometry',
  );
  const materialId = pick(
    matP,
    DESIGN_POINT.materialId,
    'no material found in the prompt; using the demo material',
  );

  const fields = [mach, altitudeM, rampAnglesDeg, materialId];

  return {
    prompt,
    mach,
    altitudeM,
    rampAnglesDeg,
    materialId,
    rejected,
    parsedAnything: fields.some((f) => f.source === 'parsed'),
    design: {
      mach: mach.value,
      altitudeM: altitudeM.value,
      rampAnglesDeg: rampAnglesDeg.value,
      materialId: materialId.value,
    },
  };
}

/** One-line summary of what the parser did, for display above the timeline. */
export function describeIntent(intent: DesignIntent): string {
  const parts = [
    `M ${intent.mach.value}`,
    `${(intent.altitudeM.value / 1000).toFixed(1)} km`,
    `${intent.rampAnglesDeg.value.length} ramp${intent.rampAnglesDeg.value.length === 1 ? '' : 's'}`,
    getMaterial(intent.materialId.value)?.name ?? intent.materialId.value,
  ];
  return parts.join(' · ');
}
