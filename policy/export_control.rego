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

# Mach-driven controls. Deliberately conservative thresholds.
mach_limit["ECL:ML"] := 4.0     # civil supersonic ceiling used here
mach_limit["ECL:MTCR"] := 3.0   # stricter tier

# Geometry above this Mach needs a classification decision before export.
unclassified_limit := 4.0

# ── Rules ─────────────────────────────────────────────────────────────────────

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
}
