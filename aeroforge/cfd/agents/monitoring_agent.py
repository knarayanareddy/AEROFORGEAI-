"""Monitoring Agent.

Tracks residuals from a solver log and, via the Adaptive Control sub-agent,
recommends interventions on divergence/stall. Operates on a finished or
in-progress log file.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..monitoring import AdaptiveSchemeController, ControlAction, ResidualTracker


class MonitoringAgent:
    """Real-time / post-hoc convergence monitoring."""

    def __init__(self) -> None:
        self.tracker = ResidualTracker()
        self.controller = AdaptiveSchemeController()

    def assess_log(self, log_path: Path, attempt: int = 0) -> Optional[ControlAction]:
        text = Path(log_path).read_text(errors="ignore") if Path(log_path).exists() else ""
        if not text:
            return None
        history = self.tracker.history(text)
        if not history:
            return None
        return self.controller.step(history, attempt=attempt)
