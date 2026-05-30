"""Divergence handler.

When the convergence detector flags divergence, this proposes concrete remedial
actions (reduce relaxation, lower Courant number, switch to more dissipative
schemes) for the Adaptive Control Agent to apply mid-run.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class DivergenceRemedy:
    actions: List[str] = field(default_factory=list)
    setting_changes: Dict[str, float] = field(default_factory=dict)
    fatal: bool = False


class DivergenceHandler:
    """Recommends remedies for a diverging run."""

    def remedy(self, attempt: int, worst_field: str) -> DivergenceRemedy:
        if attempt >= 3:
            return DivergenceRemedy(
                actions=[
                    "Divergence persisted after 3 interventions — escalate for human "
                    "review (likely mesh quality or BC setup issue)."
                ],
                fatal=True,
            )
        # Progressive stabilisation.
        relax = max(0.1, 0.5 - 0.15 * attempt)
        return DivergenceRemedy(
            actions=[
                f"Reduce relaxation factor for {worst_field} to {relax:.2f}.",
                "Lower max Courant number / pseudo-time step.",
                "Switch div schemes to more dissipative upwind (Minmod) for stability.",
            ],
            setting_changes={"relaxation": relax, "courant": max(0.5, 5.0 - attempt)},
        )
