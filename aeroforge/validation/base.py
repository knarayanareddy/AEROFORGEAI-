"""Shared context for the validation pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from ..templates import Template
from ..types import PhysicsAugmentedIntent


@dataclass
class ValidationContext:
    """Everything a validation stage needs."""

    metrics: Dict[str, Any]  # kernel topology metrics (volume, bbox, n_solids, ...)
    augmented: PhysicsAugmentedIntent
    template: Optional[Template] = None
    derived: Dict[str, Any] = field(default_factory=dict)  # builder-derived quantities

    @property
    def bbox(self) -> Dict[str, float]:
        return self.metrics.get("bbox", {}) or {}
