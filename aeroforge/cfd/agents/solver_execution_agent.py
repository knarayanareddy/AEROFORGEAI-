"""Solver Execution Agent.

Assembles the solver case from the config + mesh, then runs it on the chosen
compute target (local / Slurm / cloud). When no solver binary is present, the
case is still fully assembled and a clear status is returned.
"""

from __future__ import annotations

from pathlib import Path

from ..solvers import get_solver
from ..types import MeshPackage, SimulationResult, SolverConfigPackage


class SolverExecutionAgent:
    """Prepares and submits the solver case."""

    def __init__(self, solver_name: str = "openfoam"):
        self.solver_name = solver_name

    def execute(
        self,
        config: SolverConfigPackage,
        mesh: MeshPackage,
        case_dir: Path,
        max_iterations: int = 2000,
    ) -> SimulationResult:
        solver = (
            get_solver(self.solver_name, solver=config.solver)
            if self.solver_name == "openfoam"
            else get_solver(self.solver_name)
        )
        case_path = solver.assemble_case(config, mesh, Path(case_dir))
        result = solver.run(case_path, max_iterations=max_iterations)
        result.case_dir = str(case_path)
        return result
