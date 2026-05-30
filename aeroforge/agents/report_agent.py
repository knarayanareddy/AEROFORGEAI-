"""Report Agent.

Assembles the final :class:`CadOutputPackage`: writes the Markdown design report
and the CEP handoff manifest, and records the geometry metrics. This is the last
stage before the result is returned to the engineer.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..exchange.cep import CEPBuilder
from ..reporting.report_generator import ReportGenerator
from ..types import (
    CadOutputPackage,
    GeometryMetrics,
    GeometryResults,
    PhysicsAugmentedIntent,
    ValidationReport,
)


class ReportAgent:
    """Packages outputs, writes the report and the CEP manifest."""

    def __init__(self, aeroforge_version: str = "0.1.0"):
        self.version = aeroforge_version
        self._report = ReportGenerator()
        self._cep = CEPBuilder()

    def package(
        self,
        results: GeometryResults,
        augmented: PhysicsAugmentedIntent,
        validation: ValidationReport,
        out_dir: Path,
        session_id: str,
        provider: str = "offline/heuristic",
        model: str = "rule-based",
    ) -> CadOutputPackage:
        out_dir = Path(out_dir)
        metrics = self._metrics(results)

        pkg = CadOutputPackage(
            design_id=augmented.intent.design_id,
            intent=augmented.intent,
            augmented=augmented,
            artifacts=results.all_artifacts(),
            validation=validation,
            metrics=metrics,
            output_dir=str(out_dir),
            session_id=session_id,
            provider=provider,
            model=model,
        )

        # Write report, then CEP (CEP references the report filename).
        report_path = self._report.write(pkg, out_dir, self.version)
        pkg.report_path = str(report_path)
        cep_path = self._cep.write(pkg, out_dir, self.version)
        pkg.cep_manifest_path = str(cep_path)
        return pkg

    @staticmethod
    def _metrics(results: GeometryResults) -> GeometryMetrics:
        m = results.primary_metrics()
        bbox = m.get("bbox", {}) or {}
        return GeometryMetrics(
            bounding_box_m={k: round(float(v), 6) for k, v in bbox.items()},
            volume_m3=m.get("volume_m3"),
            surface_area_m2=m.get("area_m2"),
            n_faces=m.get("n_faces"),
            n_edges=m.get("n_edges"),
            n_vertices=m.get("n_vertices"),
            watertight=bool(m.get("is_valid")) and int(m.get("n_solids", 0)) >= 1,
        )
