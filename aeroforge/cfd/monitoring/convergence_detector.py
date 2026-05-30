"""Convergence detector.

Classifies a residual history as CONVERGED, CONVERGING, STALLED, or DIVERGING so
the monitoring agent can decide whether to stop, continue, or intervene.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List


class ConvergenceState(str, Enum):
    CONVERGED = "converged"
    CONVERGING = "converging"
    STALLED = "stalled"
    DIVERGING = "diverging"


@dataclass
class ConvergenceAssessment:
    state: ConvergenceState
    worst_field: str
    worst_residual: float
    detail: str


class ConvergenceDetector:
    """Detects convergence state from residual histories."""

    def assess(
        self, history: Dict[str, List[float]], target: float = 1e-4
    ) -> ConvergenceAssessment:
        if not history:
            return ConvergenceAssessment(ConvergenceState.STALLED, "", 1.0, "no residual data")
        finals = {f: v[-1] for f, v in history.items() if v}
        worst_field = max(finals, key=finals.get)
        worst = finals[worst_field]

        if all(v < target for v in finals.values()):
            return ConvergenceAssessment(
                ConvergenceState.CONVERGED, worst_field, worst, "all fields below target residual"
            )

        # Trend over the last few iterations of the worst field.
        series = history[worst_field]
        if len(series) >= 4:
            recent = series[-4:]
            if recent[-1] > recent[0] * 5:
                return ConvergenceAssessment(
                    ConvergenceState.DIVERGING,
                    worst_field,
                    worst,
                    "worst-field residual rising sharply",
                )
            if recent[-1] > recent[0] * 0.9:
                return ConvergenceAssessment(
                    ConvergenceState.STALLED, worst_field, worst, "residual decay has stalled"
                )
        return ConvergenceAssessment(
            ConvergenceState.CONVERGING, worst_field, worst, "residuals still decreasing"
        )
