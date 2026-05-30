"""Target checker — ACCEPT / ITERATE / ESCALATE decision.

Compares CFD results against the design targets carried in the CEP and decides
whether the design is accepted, should iterate (with quantified performance
gaps), or must be escalated to a human.
"""

from __future__ import annotations

from typing import Any, Dict, List

from ..types import DesignLoopDecision, LoopDecision


class TargetChecker:
    """Evaluates results against design targets."""

    def __init__(self, iterate_tolerance: float = 0.10):
        # Within this relative gap, a design is considered iterable rather than escalated.
        self.iterate_tolerance = iterate_tolerance

    def check(
        self,
        quantities: Dict[str, float],
        targets: List[Dict[str, Any]],
        iterations_used: int = 0,
        max_iterations: int = 5,
    ) -> DesignLoopDecision:
        gaps: List[Dict[str, Any]] = []
        all_met = True

        for t in targets or []:
            metric, target_val, op = t.get("metric"), t.get("value"), t.get("operator", "gte")
            value = quantities.get(metric)
            if value is None or target_val is None:
                continue
            met, gap = self._evaluate(value, target_val, op)
            if not met:
                all_met = False
                gaps.append(
                    {
                        "metric": metric,
                        "value": value,
                        "target": target_val,
                        "operator": op,
                        "gap": round(gap, 6),
                    }
                )

        if all_met:
            return DesignLoopDecision(LoopDecision.ACCEPT, "All design targets met.", gaps=[])
        if iterations_used >= max_iterations:
            return DesignLoopDecision(
                LoopDecision.ESCALATE,
                f"Targets unmet after {iterations_used} iterations.",
                gaps=gaps,
            )
        # Iterate if every gap is within the iterate tolerance, else escalate.
        if all(abs(g["gap"]) <= self.iterate_tolerance * abs(g["target"] or 1) for g in gaps):
            return DesignLoopDecision(
                LoopDecision.ITERATE, "Targets close; propose geometry modifications.", gaps=gaps
            )
        return DesignLoopDecision(
            LoopDecision.ESCALATE, "Performance gap too large for automatic iteration.", gaps=gaps
        )

    @staticmethod
    def _evaluate(value: float, target: float, op: str):
        if op == "gte":
            return value >= target, value - target
        if op == "lte":
            return value <= target, value - target
        if op == "minimize":
            return False, value  # never "met"; always room to improve
        return abs(value - target) < 1e-6, value - target
