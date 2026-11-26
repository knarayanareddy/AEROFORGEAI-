# Export-control policy for AeroForge bundles.
#
# Evaluated by `oracle/opa_eval.py` using regopy (a real Rego runtime), and
# mirrored by `src/lib/exportPolicy.ts` for the browser. The two are cross-checked
# case-by-case in CI — the mirror is only trustworthy because it is measured
# against the policy, not because someone read both carefully.
#
# The rule set is modelled on the shape of the Wassenaar / MTCR categories, but
# the numbers are ILLUSTRATIVE. They are not a legal opinion and must not be
# used to make a real export decision. See docs/phase-4.md §1.

package aeroforge.export

default allowed := false

# ── Classification ────────────────────────────────────────────────────────────

# ── Export-control category ───────────────────────────────────────────────────
#
# A category must be ASSERTED by a human; it is never inferred from a geometry
# name. An earlier draft (from the parallel Python branch, PR #1) classified by
# substring-matching "inlet"/"nozzle" in a template name. Prototyped against the
# project's own ten templates, that flagged 5 of them — including three benign
# rocket-nozzle contours — and silently passed anything whose name did not
# match. Keyword heuristics on names are not an export-control determination, so
# the input carries a value a person chose, and the policy refuses when it is
# missing or unrecognised.
#
# The category values mirror USML structure only as labels. Nothing here is a
# legal determination. See docs/phase-4.md §1.
valid_categories := {"none", "USML-IV", "USML-VIII", "EAR-9A"}

# Above this Mach, "none" is not an acceptable assertion without a reviewer.
hypersonic_category_limit := 5.0

# Mach-driven controls. Deliberately conservative thresholds.
mach_limit["ECL:ML"] := 4.0     # civil supersonic ceiling used here
mach_limit["ECL:MTCR"] := 3.0   # stricter tier

# Geometry above this Mach needs a classification decision before export.
unclassified_limit := 4.0

# ── Rules ─────────────────────────────────────────────────────────────────────

deny contains msg if {
    not input.category
    msg := "no export-control category asserted; one is required before an export decision"
}

deny contains msg if {
    input.category
    not valid_categories[input.category]
    msg := sprintf(
        "unknown export-control category %v; expected one of none, USML-IV, USML-VIII, EAR-9A",
        [input.category],
    )
}

# USML Cat IV covers launch vehicles and missiles. Not exportable through this
# system at any destination: the advisory is not strong enough for ordnance.
deny contains msg if {
    input.category == "USML-IV"
    msg := "USML Cat IV (launch vehicles, missiles) geometry may not be exported by this system"
}

deny contains msg if {
    input.category == "USML-VIII"
    input.destination != "nato"
    msg := sprintf("USML Cat VIII (aircraft) geometry may not be exported to %v", [input.destination])
}

# Regardless of classification, an assertive design above Mach 5 with no named
# reviewer has not been through the categorisation a human should have done.
# object.get is required: `input.reviewer == ""` is undefined when the key is
# absent, so the rule would silently never fire.
deny contains msg if {
    input.category in {"none", "EAR-9A"}
    object.get(input, "classification", "UNCLASSIFIED") == "UNCLASSIFIED"
    input.mach > hypersonic_category_limit
    object.get(input, "reviewer", "") == ""
    msg := "geometry above Mach 5 must be categorised even when classified UNCLASSIFIED"
}

deny contains msg if {
    input.destination == "sanctioned"
    msg := "destination is on the sanctioned list"
}

deny contains msg if {
    not input.destination
    msg := "no destination supplied; an export decision requires one"
}

deny contains msg if {
    input.classification == "ECL:MTCR"
    input.destination != "nato"
    msg := sprintf("MTCR-classified geometry may not be exported to %v", [input.destination])
}

# Mach ceiling per classification tier.
deny contains msg if {
    limit := mach_limit[input.classification]
    input.mach > limit
    msg := sprintf("%v exceeds its Mach limit of %v", [input.classification, limit])
}

deny contains msg if {
    object.get(input, "classification", "UNCLASSIFIED") == "UNCLASSIFIED"
    input.mach > unclassified_limit
    msg := sprintf(
        "unclassified geometry above Mach %v requires a classification review (Mach %v)",
        [unclassified_limit, input.mach],
    )
}

deny contains msg if {
    not input.reviewer
    input.classification == "ECL:MTCR"
    msg := "MTCR-classified exports require a named reviewer"
}

# ── Outcome ───────────────────────────────────────────────────────────────────

allowed if {
    count(deny) == 0
}

decision := {
    "allowed": allowed,
    "denials": [m | some m in deny],
    "classification": object.get(input, "classification", "UNCLASSIFIED"),
    "category": object.get(input, "category", ""),
}
