"""Pareto front tracker for multi-objective design exploration.

Maintains the set of non-dominated designs across iterations. Each objective is
declared as "maximize" or "minimize"; a design is dominated if another is at
least as good on all objectives and strictly better on one.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class ParetoPoint:
    design_id: str
    objectives: Dict[str, float]


class ParetoTracker:
    """Tracks the Pareto-optimal set under given objective directions."""

    def __init__(self, directions: Dict[str, str]):
        # directions: {objective_name: "maximize" | "minimize"}
        self.directions = directions
        self.points: List[ParetoPoint] = []

    def add(self, design_id: str, objectives: Dict[str, float]) -> bool:
        """Add a design; return True if it is on the Pareto front."""
        candidate = ParetoPoint(design_id, objectives)
        # Drop existing points dominated by the candidate.
        self.points = [p for p in self.points if not self._dominates(candidate, p)]
        # Add only if not dominated by an existing point.
        if any(self._dominates(p, candidate) for p in self.points):
            return False
        self.points.append(candidate)
        return True

    def front(self) -> List[ParetoPoint]:
        return list(self.points)

    def _dominates(self, a: ParetoPoint, b: ParetoPoint) -> bool:
        better_in_one = False
        for obj, direction in self.directions.items():
            av, bv = a.objectives.get(obj), b.objectives.get(obj)
            if av is None or bv is None:
                return False
            if direction == "maximize":
                if av < bv:
                    return False
                if av > bv:
                    better_in_one = True
            else:  # minimize
                if av > bv:
                    return False
                if av < bv:
                    better_in_one = True
        return better_in_one
