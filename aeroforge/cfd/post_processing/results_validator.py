"""Results validation against analytical estimates and design targets.

Cross-checks CFD-derived quantities against (a) analytical bounds (e.g. a normal
-shock recovery floor) and (b) the design targets carried in the CEP, flagging
results that are non-physical or that miss the target — the credibility gate
before results are trusted.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

from .aerospace_quantities import AerospaceQuantities


@dataclass
class ValidationFinding:
    name: str
    passed: bool
    detail: str


@dataclass
class ResultsValidation:
    passed: bool
    findings: List[ValidationFinding] = field(default_factory=list)


class ResultsValidator:
    """Validates CFD results for physical plausibility and target compliance."""

    def __init__(self) -> None:
        self.q = AerospaceQuantities()

    def validate(
        self,
        quantities: Dict[str, float],
        mach: float,
        targets: List[Dict[str, Any]],
    ) -> ResultsValidation:
        findings: List[ValidationFinding] = []

        rec = quantities.get("total_pressure_recovery")
        if rec is not None:
            floor = self.q.analytical_recovery_bound(mach)
            findings.append(
                ValidationFinding(
                    "recovery_above_normal_shock_floor",
                    rec >= floor - 0.02,
                    f"recovery {rec:.3f} vs single-normal-shock floor {floor:.3f}",
                )
            )
            findings.append(
                ValidationFinding(
                    "recovery_physical", 0.0 < rec <= 1.0, f"recovery {rec:.3f} must be in (0, 1]"
                )
            )

        for t in targets or []:
            metric = t.get("metric")
            value = quantities.get(metric)
            if value is None or t.get("value") is None:
                continue
            op = t.get("operator", "gte")
            ok = (
                (value >= t["value"])
                if op == "gte"
                else (value <= t["value"]) if op == "lte" else abs(value - t["value"]) < 1e-6
            )
            findings.append(
                ValidationFinding(f"target_{metric}", ok, f"{metric}={value} {op} {t['value']}")
            )

        passed = all(f.passed for f in findings) if findings else True
        return ResultsValidation(passed=passed, findings=findings)
