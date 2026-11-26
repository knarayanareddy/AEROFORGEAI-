// Browser mirror of policy/export_control.rego.
//
// This exists because the policy has to run in the browser (the app is a static
// bundle with no backend) AND it has to be auditable as Rego. Two
// implementations of one policy is a liability, so CI evaluates BOTH against the
// same case table (`policy/cases.json`) and fails if any verdict differs. The
// mirror is only trustworthy because it is measured against the Rego, not
// because both files were read carefully.
//
// If you change the rule, change both, then run `npm run policy:check`.

export type Destination = 'nato' | 'other' | 'sanctioned';
export type Classification = 'UNCLASSIFIED' | 'ECL:ML' | 'ECL:MTCR';

/**
 * Export-control category. Mirrors USML structure only as labels — this is not
 * a legal determination. See policy/export_control.rego for why this is
 * ASSERTED rather than inferred from a geometry name.
 */
export type ExportCategory = 'none' | 'USML-IV' | 'USML-VIII' | 'EAR-9A';

export const VALID_CATEGORIES: readonly ExportCategory[] = ['none', 'USML-IV', 'USML-VIII', 'EAR-9A'];

export interface ExportInput {
  /** REQUIRED. A missing or unknown category is itself a denial. */
  category?: string;
  destination?: Destination;
  classification?: Classification;
  mach: number;
  reviewer?: string;
}

export interface ExportDecision {
  allowed: boolean;
  denials: string[];
  classification: Classification;
  /** Echoed back; '' when the caller supplied none. */
  category: string;
}

/** Mirrors mach_limit in the Rego. */
const MACH_LIMIT: Partial<Record<Classification, number>> = {
  'ECL:ML': 4.0,
  'ECL:MTCR': 3.0,
};

const UNCLASSIFIED_MACH_REVIEW = 4.0;

/** Above this Mach, 'none' or 'EAR-9A' needs a named reviewer. */
const HYPERSONIC_CATEGORY_LIMIT = 5.0;

/**
 * Evaluate the export policy.
 *
 * Order of denials matches the Rego's `deny` set only as a set — Rego set
 * ordering is not defined — so comparisons in the conformance check sort before
 * diffing.
 */
export function evaluateExport(input: ExportInput): ExportDecision {
  const classification = input.classification ?? 'UNCLASSIFIED';
  const category = input.category;
  const reviewer = input.reviewer ?? '';
  const denials: string[] = [];

  // ── Category. Mirrors the Rego's first three deny rules. ──────────────────
  //
  // Rego semantics, which are NOT JavaScript's: `not input.category` succeeds
  // only when the key is undefined (or false). An empty string is a defined
  // term, so `not input.category` FAILS for "" and the unknown-category rule
  // fires instead. This was wrong on the first attempt here — `!category` treats
  // "" as absent, giving the opposite message — and the conformance case
  // 'cat-empty-string' caught it. Hence the explicit undefined test.
  if (category === undefined) {
    denials.push('no export-control category asserted; one is required before an export decision');
  } else if (!VALID_CATEGORIES.includes(category as ExportCategory)) {
    denials.push(
      `unknown export-control category ${category}; expected one of none, USML-IV, USML-VIII, EAR-9A`,
    );
  }

  if (category === 'USML-IV') {
    denials.push('USML Cat IV (launch vehicles, missiles) geometry may not be exported by this system');
  }
  if (category === 'USML-VIII' && input.destination !== undefined && input.destination !== 'nato') {
    denials.push(`USML Cat VIII (aircraft) geometry may not be exported to ${input.destination}`);
  }

  // Rego: input.category in {"none","EAR-9A"} — only fires for a recognised
  // member, so an unknown category does not also trigger this rule.
  if (
    (category === 'none' || category === 'EAR-9A') &&
    classification === 'UNCLASSIFIED' &&
    input.mach > HYPERSONIC_CATEGORY_LIMIT &&
    reviewer === ''
  ) {
    denials.push('geometry above Mach 5 must be categorised even when classified UNCLASSIFIED');
  }

  if (input.destination === 'sanctioned') {
    denials.push('destination is on the sanctioned list');
  }
  if (input.destination === undefined) {
    denials.push('no destination supplied; an export decision requires one');
  }
  if (classification === 'ECL:MTCR' && input.destination !== undefined && input.destination !== 'nato') {
    denials.push(`MTCR-classified geometry may not be exported to ${input.destination}`);
  }

  const limit = MACH_LIMIT[classification];
  if (limit !== undefined && input.mach > limit) {
    denials.push(`${classification} exceeds its Mach limit of ${formatRegoNumber(limit)}`);
  }

  if (classification === 'UNCLASSIFIED' && input.mach > UNCLASSIFIED_MACH_REVIEW) {
    denials.push(
      `unclassified geometry above Mach ${formatRegoNumber(UNCLASSIFIED_MACH_REVIEW)} requires a classification review (Mach ${formatRegoNumber(input.mach)})`,
    );
  }

  if (classification === 'ECL:MTCR' && !input.reviewer) {
    denials.push('MTCR-classified exports require a named reviewer');
  }

  return { allowed: denials.length === 0, denials, classification, category: category ?? '' };
}

/**
 * Render a number the way Rego's sprintf("%v") does.
 *
 * Rego prints whole floats without a decimal point (4, not 4.0). Getting this
 * wrong makes the denial strings differ between the two implementations even
 * when the verdicts agree, which would make the conformance test noisy for the
 * wrong reason.
 */
function formatRegoNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}
