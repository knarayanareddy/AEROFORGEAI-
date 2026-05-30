"""Design Loop Agent.

Wraps the design-loop controller: given results + targets, decides ACCEPT /
ITERATE / ESCALATE and, when iterating, emits structured Phase-1 modification
requests.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..design_loop import DesignLoopController
from ..types import DesignLoopDecision


class DesignLoopAgent:
    """Decides the next design-loop action."""

    def __init__(self, max_iterations: int = 5, pareto_directions: Optional[Dict[str, str]] = None):
        self.controller = DesignLoopController(
            max_iterations=max_iterations, pareto_directions=pareto_directions
        )

    def decide(
        self,
        quantities: Dict[str, float],
        targets: List[Dict[str, Any]],
        component_type: str = "",
        design_id: str = "design",
    ) -> DesignLoopDecision:
        return self.controller.step(quantities, targets, component_type, design_id)
