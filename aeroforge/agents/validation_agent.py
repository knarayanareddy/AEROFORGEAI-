"""Validation Agent.

Thin orchestration wrapper around the 5-stage :class:`GeometryValidator`. Pulls
the kernel topology metrics and builder-derived parameters off the execution
results and runs the full validation pipeline, returning a ValidationReport.
"""

from __future__ import annotations

from typing import Optional

from ..templates import Template, default_library
from ..types import GeometryResults, PhysicsAugmentedIntent, ValidationReport
from ..validation import GeometryValidator


class ValidationAgent:
    """Runs geometry through the validation engine."""

    def __init__(self, validator: Optional[GeometryValidator] = None):
        self.validator = validator or GeometryValidator()
        self.templates = default_library()

    def validate(
        self, results: GeometryResults, augmented: PhysicsAugmentedIntent
    ) -> ValidationReport:
        metrics = dict(results.primary_metrics())  # copy: don't mutate shared task metrics
        derived = dict(metrics.pop("_derived", {})) if "_derived" in metrics else {}
        # Merge physics-derived quantities too (recovery, ramp angles, etc.).
        derived = {**augmented.physics, **derived}

        template: Optional[Template] = self.templates.find_for_geometry_type(
            augmented.intent.geometry_type
        )
        return self.validator.validate(
            metrics=metrics, augmented=augmented, derived=derived, template=template
        )
