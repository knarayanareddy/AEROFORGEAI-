"""Siemens STAR-CCM+ adapter — interface stub (Phase 2.3).

STAR-CCM+ is driven via Java macros and requires a licensed install. This stub
defines the contract; macro generation and execution are future work.
"""

from __future__ import annotations

from pathlib import Path

from ..exceptions import SolverNotAvailableError
from ..types import MeshPackage, SimulationResult, SolverConfigPackage
from .base import SolverAdapter


class StarCCMAdapter(SolverAdapter):
    name = "starccm"

    def is_available(self) -> bool:
        return False

    def assemble_case(self, config: SolverConfigPackage, mesh: MeshPackage, case_dir: Path) -> Path:
        raise SolverNotAvailableError("STAR-CCM+ adapter is a Phase 2.3 stub (Java macros).")

    def run(self, case_dir: Path, max_iterations: int = 2000) -> SimulationResult:
        raise SolverNotAvailableError("STAR-CCM+ adapter is a Phase 2.3 stub.")
