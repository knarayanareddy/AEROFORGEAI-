"""Stages 1 & 2: topology and geometric-constraint validation."""

from __future__ import annotations

from ..types import ValidationCheck, ValidationStageResult
from .base import ValidationContext


class TopologyValidator:
    """Stage 1 (topology) and Stage 2 (geometric constraints)."""

    def validate_topology(self, ctx: ValidationContext) -> ValidationStageResult:
        m = ctx.metrics
        checks = []

        is_valid = bool(m.get("is_valid", False))
        n_solids = int(m.get("n_solids", 0))
        shape_type = str(m.get("shape_type", ""))
        volume = float(m.get("volume_m3", 0.0) or 0.0)
        area = float(m.get("area_m2", 0.0) or 0.0)

        watertight = is_valid and n_solids >= 1 and shape_type in ("Solid", "Compound", "CompSolid")
        checks.append(
            ValidationCheck(
                name="watertight_solid",
                passed=watertight,
                detail=f"is_valid={is_valid}, n_solids={n_solids}, type={shape_type}",
            )
        )
        checks.append(
            ValidationCheck(
                name="manifold",
                passed=is_valid,
                detail="OCC validity check (BRepCheck) " + ("passed" if is_valid else "failed"),
            )
        )
        checks.append(
            ValidationCheck(
                name="non_degenerate_volume",
                passed=volume > 1e-12,
                value=volume,
                detail=f"volume={volume:.3e} m^3",
            )
        )
        checks.append(
            ValidationCheck(
                name="positive_surface_area",
                passed=area > 0.0,
                value=area,
                detail=f"area={area:.3e} m^2",
            )
        )
        return ValidationStageResult(
            stage="topology", passed=all(c.passed for c in checks), checks=checks
        )

    def validate_geometric(self, ctx: ValidationContext) -> ValidationStageResult:
        checks = []
        bb = ctx.bbox
        env = ctx.augmented.intent.envelope

        # Envelope fit (only if the user specified an envelope).
        if env and any([env.max_length_m, env.max_width_m, env.max_height_m]) and bb:
            dims = sorted([bb.get("x", 0), bb.get("y", 0), bb.get("z", 0)], reverse=True)
            limits = sorted(
                [v for v in [env.max_length_m, env.max_width_m, env.max_height_m] if v],
                reverse=True,
            )
            fits = all(d <= lim + 1e-9 for d, lim in zip(dims, limits))
            checks.append(
                ValidationCheck(
                    name="fits_envelope",
                    passed=fits,
                    detail=f"part dims {[round(d,4) for d in dims]} vs limits {limits}",
                    severity="error",
                )
            )

        # Aspect ratio vs template limit.
        if bb:
            dims = [bb.get("x", 0), bb.get("y", 0), bb.get("z", 0)]
            nonzero = [d for d in dims if d > 1e-9]
            if nonzero:
                ar = max(nonzero) / min(nonzero)
                max_ar = 50.0
                if ctx.template:
                    max_ar = float(
                        ctx.template.manufacturing_constraints.get("max_aspect_ratio", max_ar)
                    )
                checks.append(
                    ValidationCheck(
                        name="aspect_ratio",
                        passed=ar <= max_ar,
                        value=ar,
                        detail=f"aspect ratio {ar:.1f} (limit {max_ar})",
                        severity="warning",
                    )
                )

        # Template parameter-range conformance.
        if ctx.template and ctx.derived:
            issues = ctx.template.check_ranges(ctx.derived)
            checks.append(
                ValidationCheck(
                    name="template_parameter_ranges",
                    passed=not issues,
                    detail=(
                        "; ".join(issues) if issues else "all parameters within validated ranges"
                    ),
                    severity="warning",
                )
            )

        if not checks:
            checks.append(
                ValidationCheck(
                    name="geometric_constraints",
                    passed=True,
                    detail="no explicit geometric constraints to enforce",
                    severity="info",
                )
            )
        return ValidationStageResult(
            stage="geometric_constraints",
            passed=all(c.passed for c in checks if c.severity == "error"),
            checks=checks,
        )
