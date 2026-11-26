#!/usr/bin/env python3
"""Evaluate the export-control policy with a real Rego engine.

Uses `regopy` (the Python binding to OPA's own Rego runtime), so the policy is
executed by the actual language implementation rather than by a simulation.

    python3 oracle/opa_eval.py --policy policy/export_control.rego \\
                               --cases policy/cases.json --out rego_results.json

The TypeScript mirror is then compared against this output by
`src/lib/exportPolicy.conformance.test.ts`. Two implementations of one policy is
a liability; the comparison is what keeps them honest.

Exit 0 if every case evaluated, 1 if the engine failed. Verdict correctness is
not decided here — there is no second opinion at this layer, only execution.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import regopy
except ImportError:
    print("FAIL  regopy is not installed (pip install regopy)")
    sys.exit(1)


def evaluate(policy_src: str, cases: list[dict]) -> dict[str, dict]:
    interp = regopy.Interpreter()
    interp.add_module("export_control.rego", policy_src)

    out: dict[str, dict] = {}
    for case in cases:
        cid = case["id"]
        interp.set_input(case["input"])
        result = interp.query("data.aeroforge.export.decision")
        if not result.results:
            # An undefined decision is a policy bug, not a silent "deny".
            raise SystemExit(f"FAIL  case '{cid}': policy decision is undefined")
        expr = result.results[0].expressions[0]
        value = expr if isinstance(expr, dict) else dict(expr)
        out[cid] = {
            "allowed": bool(value["allowed"]),
            "denials": sorted(str(d) for d in value["denials"]),
            "classification": str(value["classification"]),
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--policy", type=Path, default=Path("policy/export_control.rego"))
    ap.add_argument("--cases", type=Path, default=Path("policy/cases.json"))
    ap.add_argument("--out", type=Path, default=Path("rego_results.json"))
    args = ap.parse_args()

    policy_src = args.policy.read_text()
    cases = json.loads(args.cases.read_text())["cases"]

    results = evaluate(policy_src, cases)

    # Surface the distribution. A table where every case is allowed would pass a
    # naive comparison while proving nothing.
    allowed = sum(1 for r in results.values() if r["allowed"])
    denied = len(results) - allowed
    print(f"ok    evaluated {len(results)} cases with regopy {regopy.__version__}")
    print(f"      {allowed} allowed, {denied} denied")

    if allowed == 0 or denied == 0:
        print("FAIL  the case table does not exercise both outcomes")
        return 1

    args.out.write_text(json.dumps(results, indent=1, sort_keys=True))
    print(f"ok    results written to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
