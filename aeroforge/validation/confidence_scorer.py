"""Stage 5: confidence scoring.

Aggregates the pass rates of the preceding stages into a single, explainable
confidence score in [0, 1]. The score sets the user-notification level: high
scores pass cleanly; low scores surface warnings and recommendations.
"""

from __future__ import annotations

from typing import List

from ..types import ConfidenceBreakdown, ValidationStageResult


class ConfidenceScorer:
    """Computes a multi-factor confidence score from stage results."""

    #: Relative weights of each factor in the overall score.
    WEIGHTS = {
        "topology_integrity": 0.35,
        "physics_pass_rate": 0.30,
        "manufacturing_feasibility": 0.20,
        "template_conformance": 0.15,
    }

    def score(
        self,
        stages: List[ValidationStageResult],
        template_conformance: float = 1.0,
    ) -> ConfidenceBreakdown:
        by_stage = {s.stage: s for s in stages}

        topo = self._pass_rate(by_stage.get("topology"))
        # geometric constraints fold into topology integrity.
        geo = self._pass_rate(by_stage.get("geometric_constraints"))
        topology_integrity = 0.6 * topo + 0.4 * geo
        physics = self._pass_rate(by_stage.get("physics"))
        mfg = self._pass_rate(by_stage.get("manufacturing"))

        overall = (
            self.WEIGHTS["topology_integrity"] * topology_integrity
            + self.WEIGHTS["physics_pass_rate"] * physics
            + self.WEIGHTS["manufacturing_feasibility"] * mfg
            + self.WEIGHTS["template_conformance"] * template_conformance
        )
        return ConfidenceBreakdown(
            template_conformance=round(template_conformance, 3),
            physics_pass_rate=round(physics, 3),
            manufacturing_feasibility=round(mfg, 3),
            topology_integrity=round(topology_integrity, 3),
            overall=round(overall, 3),
        )

    @staticmethod
    def _pass_rate(stage: ValidationStageResult | None) -> float:
        if stage is None or not stage.checks:
            return 1.0
        scored = [c for c in stage.checks if c.severity in ("error", "warning")]
        if not scored:
            return 1.0
        return sum(1.0 for c in scored if c.passed) / len(scored)
