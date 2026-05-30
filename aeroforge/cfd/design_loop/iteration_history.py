"""Iteration history for the design loop."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List


@dataclass
class Iteration:
    index: int
    decision: str
    quantities: Dict[str, float]
    modifications: List[Dict[str, Any]]
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class IterationHistory:
    """Records the sequence of design-loop iterations."""

    def __init__(self) -> None:
        self.iterations: List[Iteration] = []

    def record(
        self, decision: str, quantities: Dict[str, float], modifications: List[Dict[str, Any]]
    ) -> Iteration:
        it = Iteration(len(self.iterations) + 1, decision, dict(quantities), list(modifications))
        self.iterations.append(it)
        return it

    def __len__(self) -> int:
        return len(self.iterations)
