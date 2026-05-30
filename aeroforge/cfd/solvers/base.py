"""Solver adapter interface.

Every CFD solver (OpenFOAM, SU2, Fluent, STAR-CCM+) implements
:class:`SolverAdapter`. The solver-execution agent only talks to this interface.
Adapters separate *case assembly* (always works — writes the runnable case) from
*execution* (needs the solver binary; degrades gracefully when absent).
"""

from __future__ import annotations

import abc
from pathlib import Path

from ..types import MeshPackage, SimulationResult, SolverConfigPackage


class SolverAdapter(abc.ABC):
    name: str = "abstract"

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Whether the solver binary is installed."""

    @abc.abstractmethod
    def assemble_case(self, config: SolverConfigPackage, mesh: MeshPackage, case_dir: Path) -> Path:
        """Write a complete, runnable solver case to ``case_dir``; return its path."""

    @abc.abstractmethod
    def run(self, case_dir: Path, max_iterations: int = 2000) -> SimulationResult:
        """Run the solver (or report that it is unavailable)."""
