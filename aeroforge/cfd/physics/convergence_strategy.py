"""Convergence strategy — generates ``controlDict`` and ``fvSolution``.

Sets iteration counts, write intervals, linear-solver settings, relaxation
factors, and residual-control targets appropriate to the solver and regime. For
high-speed flows it uses conservative relaxation to keep the run stable.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..types import FlowRegime
from .solver_selector import SolverChoice

_CTRL_HEADER = "FoamFile\n{\n    version 2.0;\n    format ascii;\n    class dictionary;\n    object controlDict;\n}\n"
_SOL_HEADER = "FoamFile\n{\n    version 2.0;\n    format ascii;\n    class dictionary;\n    object fvSolution;\n}\n"


@dataclass
class ConvergencePlan:
    control_dict: str
    fv_solution: str
    max_iterations: int
    residual_target: float


class ConvergenceStrategy:
    """Generates controlDict + fvSolution for steady RANS runs."""

    def configure(
        self, solver: SolverChoice, regime: FlowRegime, max_iterations: int = 2000
    ) -> ConvergencePlan:
        residual_target = (
            1e-5 if regime in (FlowRegime.INCOMPRESSIBLE, FlowRegime.SUBSONIC) else 1e-4
        )

        control = (
            _CTRL_HEADER
            + f"\napplication     {solver.solver};\n"
            + "startFrom       startTime;\nstartTime       0;\n"
            + "stopAt          endTime;\n"
            + f"endTime         {max_iterations};\n"
            + "deltaT          1;\n"
            + "writeControl    timeStep;\n"
            + f"writeInterval   {max(50, max_iterations // 10)};\n"
            + "purgeWrite      3;\nwriteFormat     ascii;\nwritePrecision  7;\n"
            + "runTimeModifiable true;\n"
        )

        # Conservative relaxation for compressible/shock flows.
        if solver.is_compressible:
            relax = (
                "relaxationFactors\n{\n"
                "    fields\n    {\n        p       0.3;\n        rho     0.05;\n    }\n"
                "    equations\n    {\n        U       0.5;\n        e       0.5;\n"
                '        "(k|omega)" 0.5;\n    }\n}\n'
            )
            solvers = (
                "solvers\n{\n"
                '    "(p|rho)"\n    {\n        solver          GAMG;\n        tolerance       1e-7;\n        relTol          0.05;\n        smoother        GaussSeidel;\n    }\n'
                '    "(U|e|k|omega)"\n    {\n        solver          smoothSolver;\n        smoother        symGaussSeidel;\n        tolerance       1e-8;\n        relTol          0.1;\n    }\n}\n'
            )
        else:
            relax = (
                "relaxationFactors\n{\n"
                "    fields\n    {\n        p       0.3;\n    }\n"
                '    equations\n    {\n        U       0.7;\n        "(k|omega)" 0.7;\n    }\n}\n'
            )
            solvers = (
                "solvers\n{\n"
                "    p\n    {\n        solver          GAMG;\n        tolerance       1e-7;\n        relTol          0.05;\n        smoother        GaussSeidel;\n    }\n"
                '    "(U|k|omega)"\n    {\n        solver          smoothSolver;\n        smoother        symGaussSeidel;\n        tolerance       1e-8;\n        relTol          0.1;\n    }\n}\n'
            )

        algo = "SIMPLE" if not solver.density_based else "SIMPLE"
        residual_control = (
            f"{algo}\n{{\n    nNonOrthogonalCorrectors 1;\n"
            "    residualControl\n    {\n"
            f"        p           {residual_target};\n        U           {residual_target};\n"
            f'        "(k|omega)" {residual_target};\n    }}\n}}\n'
        )

        fv_solution = _SOL_HEADER + "\n" + solvers + "\n" + relax + "\n" + residual_control
        return ConvergencePlan(control, fv_solution, max_iterations, residual_target)
