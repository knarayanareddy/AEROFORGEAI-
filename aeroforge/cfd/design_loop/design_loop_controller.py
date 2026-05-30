"""Design loop controller.

Ties target checking, modification proposal, Pareto tracking, and history into a
single step. Given CFD results, it decides ACCEPT / ITERATE / ESCALATE and, when
iterating, emits the Phase-1 modification requests.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..types import DesignLoopDecision, LoopDecision
from .design_modifier import DesignModifier
from .iteration_history import IterationHistory
from .pareto_tracker import ParetoTracker
from .target_checker import TargetChecker


class DesignLoopController:
    """Orchestrates one design-loop decision step."""

    def __init__(self, max_iterations: int = 5, pareto_directions: Optional[Dict[str, str]] = None):
        self.checker = TargetChecker()
        self.modifier = DesignModifier()
        self.history = IterationHistory()
        self.max_iterations = max_iterations
        self.pareto = ParetoTracker(pareto_directions) if pareto_directions else None

    def step(
        self,
        quantities: Dict[str, float],
        targets: List[Dict[str, Any]],
        component_type: str = "",
        design_id: str = "design",
    ) -> DesignLoopDecision:
        decision = self.checker.check(
            quantities,
            targets,
            iterations_used=len(self.history),
            max_iterations=self.max_iterations,
        )
        if decision.decision == LoopDecision.ITERATE:
            decision.modifications = self.modifier.propose(decision.gaps, component_type)
        if self.pareto is not None:
            self.pareto.add(design_id, quantities)
        self.history.record(decision.decision.value, quantities, decision.modifications)
        return decision
