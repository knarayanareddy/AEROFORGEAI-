"""Post-Processing Agent.

Extracts integral quantities from a finished case, validates them against
analytical bounds and design targets, and builds the Markdown CFD report.
"""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

from ..post_processing import (
    CFDReportBuilder,
    FieldExtractor,
    ResultsValidation,
    ResultsValidator,
)
from ..types import (
    GeometryPreparationPackage,
    MeshPackage,
    SimulationResult,
    SolverConfigPackage,
)


class PostProcessingAgent:
    """Produces validated results and the CFD report."""

    def __init__(self) -> None:
        self.extractor = FieldExtractor()
        self.validator = ResultsValidator()
        self.report = CFDReportBuilder()

    def process(
        self,
        prep: GeometryPreparationPackage,
        mesh: MeshPackage,
        config: SolverConfigPackage,
        result: SimulationResult,
        out_dir: Path,
    ) -> Tuple[SimulationResult, ResultsValidation, str]:
        if result.case_dir:
            fields, note = self.extractor.extract(Path(result.case_dir))
            result.quantities.update(fields)
            if note:
                result.note = (result.note + " " + note).strip()

        mach = prep.flow_conditions.mach
        targets = prep.manifest.performance_targets if prep.manifest else []
        validation = self.validator.validate(result.quantities, mach, targets)

        report_md = self.report.build(prep, mesh, config, result, validation)
        self.report.write(report_md, Path(out_dir))
        return result, validation, report_md
