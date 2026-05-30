"""Adaptive scheme controller (Adaptive Control sub-agent).

Coordinates the monitoring loop: assess residuals, and when diverging or stalled,
obtain a remedy and report the settings to apply. In a live run it would rewrite
fvSolution/fvSchemes mid-run; here it produces the decision record.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from .convergence_detector import ConvergenceDetector, ConvergenceState
from .divergence_handler import DivergenceHandler


@dataclass
class ControlAction:
    state: str
    intervene: bool
    actions: List[str] = field(default_factory=list)
    setting_changes: Dict[str, float] = field(default_factory=dict)
    escalate: bool = False


class AdaptiveSchemeController:
    """Decides mid-run interventions from residual histories."""

    def __init__(self) -> None:
        self.detector = ConvergenceDetector()
        self.handler = DivergenceHandler()

    def step(self, history: Dict[str, List[float]], attempt: int = 0) -> ControlAction:
        a = self.detector.assess(history)
        if a.state in (ConvergenceState.CONVERGED, ConvergenceState.CONVERGING):
            return ControlAction(a.state.value, intervene=False)
        remedy = self.handler.remedy(attempt, a.worst_field)
        return ControlAction(
            a.state.value,
            intervene=True,
            actions=remedy.actions,
            setting_changes=remedy.setting_changes,
            escalate=remedy.fatal,
        )
