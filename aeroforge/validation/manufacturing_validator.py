"""Stage 4: manufacturing-feasibility validation.

Checks the design against template manufacturing constraints (minimum wall
thickness, minimum radius/feature size) and flags geometry that is hard to make.
Some checks (undercuts, draft angles) require full surface analysis and are
reported as advisory ``info`` until that analysis lands.
"""

from __future__ import annotations

from ..types import ValidationCheck, ValidationStageResult
from .base import ValidationContext


class ManufacturingValidator:
    """Stage 4 manufacturing-feasibility checks."""

    def validate(self, ctx: ValidationContext) -> ValidationStageResult:
        checks = []
        derived = ctx.derived
        mfg = ctx.template.manufacturing_constraints if ctx.template else {}

        # Minimum wall thickness.
        wall = derived.get("wall_thickness_m")
        min_wall = mfg.get("min_wall_thickness_m")
        if wall is not None and min_wall is not None:
            checks.append(
                ValidationCheck(
                    name="min_wall_thickness",
                    passed=wall >= min_wall - 1e-9,
                    value=wall,
                    detail=f"wall {wall*1000:.2f} mm vs min {min_wall*1000:.2f} mm",
                )
            )

        # Minimum radius / feature size (throat radius, base radius, etc.).
        min_radius = mfg.get("min_radius_m") or mfg.get("min_tip_radius_m")
        radius_like = derived.get("throat_radius_m") or derived.get("base_radius_m")
        if radius_like is not None and min_radius is not None:
            checks.append(
                ValidationCheck(
                    name="min_feature_radius",
                    passed=radius_like >= min_radius - 1e-9,
                    value=radius_like,
                    detail=f"feature radius {radius_like*1000:.2f} mm vs min {min_radius*1000:.2f} mm",
                    severity="warning",
                )
            )

        # Trailing-edge thickness for airfoils (advisory).
        tte = mfg.get("min_trailing_edge_thickness_m")
        if tte is not None and "max_thickness_fraction" in derived:
            checks.append(
                ValidationCheck(
                    name="trailing_edge_manufacturability",
                    passed=True,
                    detail=f"NACA TE is near-zero; CNC/AM should target >= {tte*1000:.2f} mm TE",
                    severity="info",
                )
            )

        # Advisory checks pending full surface analysis.
        checks.append(
            ValidationCheck(
                name="undercut_and_draft_analysis",
                passed=True,
                detail="undercut/draft-angle analysis not yet implemented (advisory)",
                severity="info",
            )
        )

        if not any(c.severity == "error" for c in checks) and len(checks) == 1:
            checks.insert(
                0,
                ValidationCheck(
                    name="manufacturing_feasibility",
                    passed=True,
                    detail="no template manufacturing constraints to enforce",
                    severity="info",
                ),
            )
        return ValidationStageResult(
            stage="manufacturing",
            passed=all(c.passed for c in checks if c.severity == "error"),
            checks=checks,
        )
