"""Mesh quality validation against the design-doc thresholds.

Grades each metric Excellent / Acceptable / Reject and decides whether a mesh may
proceed to the solver. A fatal metric (e.g. non-positive cell volume) blocks the
run; near-limit metrics warn and proceed with a flag.
"""

from __future__ import annotations

from typing import Dict

from ..types import MeshQualityReport

# (excellent_max, acceptable_max) for "lower is better" metrics.
_THRESHOLDS = {
    "max_skewness": (0.25, 0.85),
    "approx_max_skewness": (0.25, 0.85),
    "max_aspect_ratio": (5.0, 100.0),
    "max_non_orthogonality": (35.0, 70.0),
    "max_face_twist": (10.0, 45.0),
}


class MeshQualityValidator:
    """Validates mesh metrics against acceptance thresholds."""

    def validate(self, metrics: Dict[str, float]) -> MeshQualityReport:
        grades: Dict[str, str] = {}
        warnings = []
        fatal = False
        passed = True

        min_vol = metrics.get("min_cell_volume")
        if min_vol is not None and min_vol <= 0:
            fatal = True
            passed = False
            warnings.append("FATAL: non-positive minimum cell volume — re-mesh required.")

        for metric, value in metrics.items():
            if metric not in _THRESHOLDS:
                continue
            exc, acc = _THRESHOLDS[metric]
            if value < exc:
                grades[metric] = "excellent"
            elif value < acc:
                grades[metric] = "acceptable"
                warnings.append(f"{metric}={value} near limit (acceptable).")
            else:
                grades[metric] = "reject"
                passed = False
                warnings.append(f"{metric}={value} exceeds acceptable threshold {acc}.")

        return MeshQualityReport(
            passed=passed and not fatal,
            fatal=fatal,
            metrics=dict(metrics),
            grades=grades,
            warnings=warnings,
        )
