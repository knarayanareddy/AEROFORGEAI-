"""ANSYS Fluent adapter — interface stub (Phase 2.3).

Fluent is driven via journal (TUI) files and requires a licensed install. This
stub defines the contract; journal generation and execution are future work.
"""

from __future__ import annotations

from pathlib import Path

from ..exceptions import SolverNotAvailableError
from ..types import MeshPackage, SimulationResult, SolverConfigPackage
from .base import SolverAdapter


class FluentAdapter(SolverAdapter):
    name = "fluent"

    def is_available(self) -> bool:
        return False

    def assemble_case(self, config: SolverConfigPackage, mesh: MeshPackage, case_dir: Path) -> Path:
        raise SolverNotAvailableError("Fluent adapter is a Phase 2.3 stub (journal TUI).")

    def run(self, case_dir: Path, max_iterations: int = 2000) -> SimulationResult:
        raise SolverNotAvailableError("Fluent adapter is a Phase 2.3 stub.")
