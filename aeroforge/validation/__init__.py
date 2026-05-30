"""Validation & Constraint Engine — the 5-stage geometry validation pipeline."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..templates import Template
from ..types import PhysicsAugmentedIntent, ValidationReport, ValidationStageResult
from .base import ValidationContext
from .confidence_scorer import ConfidenceScorer
from .manufacturing_validator import ManufacturingValidator
from .physics_validator import PhysicsValidator
from .topology_validator import TopologyValidator

_RECOMMENDATIONS = {
    "total_pressure_recovery": "Increase ramp turning or add a compression ramp to raise recovery.",
    "thermal_limit": "Select a higher-temperature material (e.g. Inconel 718, C/SiC) or add cooling.",
    "min_wall_thickness": "Increase wall thickness to meet the manufacturing minimum.",
    "shock_attachment": "Reduce ramp angle(s) so each oblique shock stays attached.",
    "fits_envelope": "Reduce length/width/height or relax the spatial envelope.",
    "min_feature_radius": "Increase the minimum feature radius for tool access.",
    "aspect_ratio": "Reduce slenderness or split into sub-components for manufacturability.",
}


class GeometryValidator:
    """Runs all five validation stages and assembles a ValidationReport."""

    def __init__(self) -> None:
        self.topology = TopologyValidator()
        self.physics = PhysicsValidator()
        self.manufacturing = ManufacturingValidator()
        self.scorer = ConfidenceScorer()

    def validate(
        self,
        metrics: Dict[str, Any],
        augmented: PhysicsAugmentedIntent,
        derived: Optional[Dict[str, Any]] = None,
        template: Optional[Template] = None,
    ) -> ValidationReport:
        ctx = ValidationContext(
            metrics=metrics, augmented=augmented, template=template, derived=derived or {}
        )

        stages: List[ValidationStageResult] = [
            self.topology.validate_topology(ctx),
            self.topology.validate_geometric(ctx),
            self.physics.validate(ctx),
            self.manufacturing.validate(ctx),
        ]

        # Template conformance from validated parameter ranges.
        template_conformance = 1.0
        if template and derived:
            issues = template.check_ranges(derived)
            n_ranged = (
                sum(1 for s in template.parameters.values() if isinstance(s, dict) and "range" in s)
                or 1
            )
            template_conformance = max(0.0, 1.0 - len(issues) / n_ranged)

        confidence = self.scorer.score(stages, template_conformance=template_conformance)

        # Blocking stages: topology, geometric (errors), physics (errors).
        blocking = {"topology", "geometric_constraints", "physics"}
        passed = all(s.passed for s in stages if s.stage in blocking)

        warnings: List[str] = []
        recommendations: List[str] = []
        for s in stages:
            for c in s.checks:
                if not c.passed and c.severity in ("error", "warning"):
                    warnings.append(f"[{s.stage}] {c.name}: {c.detail}")
                    if c.name in _RECOMMENDATIONS:
                        recommendations.append(_RECOMMENDATIONS[c.name])

        return ValidationReport(
            passed=passed,
            stages=stages,
            confidence=confidence,
            warnings=warnings,
            recommendations=sorted(set(recommendations)),
        )


__all__ = [
    "GeometryValidator",
    "TopologyValidator",
    "PhysicsValidator",
    "ManufacturingValidator",
    "ConfidenceScorer",
    "ValidationContext",
]
