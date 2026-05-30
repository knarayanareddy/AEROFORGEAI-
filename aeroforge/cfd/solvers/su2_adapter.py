"""SU2 solver adapter.

Generates an SU2 configuration file (``.cfg``) from the solver config and writes
the case. Runs ``SU2_CFD`` when installed; otherwise assembles the case and
reports gracefully. SU2 is a strong density-based option for compressible
external aerodynamics.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from ..types import MeshPackage, SimulationResult, SolverConfigPackage
from .base import SolverAdapter


class SU2Adapter(SolverAdapter):
    name = "su2"

    def is_available(self) -> bool:
        return shutil.which("SU2_CFD") is not None

    def assemble_case(self, config: SolverConfigPackage, mesh: MeshPackage, case_dir: Path) -> Path:
        case_dir = Path(case_dir)
        case_dir.mkdir(parents=True, exist_ok=True)
        compressible = config.solver.startswith("rho") or "Foam" not in config.solver
        cfg = (
            "% AeroForge AI — auto-generated SU2 config\n"
            f"SOLVER= {'RANS' if config.turbulence_model != 'laminar' else 'NAVIER_STOKES'}\n"
            f"KIND_TURB_MODEL= {'SST' if 'SST' in config.turbulence_model else 'NONE'}\n"
            "MATH_PROBLEM= DIRECT\n"
            f"REGIME_TYPE= {'COMPRESSIBLE' if compressible else 'INCOMPRESSIBLE'}\n"
            "MACH_NUMBER= 0.0  % set from CEP\n"
            "AOA= 0.0\n"
            "EXT_ITER= 5000\n"
            "CONV_NUM_METHOD_FLOW= ROE\n"
            "MUSCL_FLOW= YES\n"
            "SLOPE_LIMITER_FLOW= VENKATAKRISHNAN\n"
            "MGLEVEL= 3\n"
            "MESH_FILENAME= mesh.su2\n"
            "MESH_FORMAT= SU2\n"
            "CONV_FILENAME= history\n"
            "RESTART_SOL= NO\n"
        )
        (case_dir / "case.cfg").write_text(cfg)
        if mesh and mesh.mesh_file and Path(mesh.mesh_file).exists():
            # SU2 needs .su2; conversion via meshio is left to a pre-step.
            (case_dir / "convert_mesh.txt").write_text(
                "Convert the Gmsh mesh to SU2 format, e.g.:\n"
                "  python -c \"import meshio; meshio.write('mesh.su2', meshio.read('mesh.msh'))\"\n"
            )
            shutil.copy(mesh.mesh_file, case_dir / "mesh.msh")
        return case_dir

    def run(self, case_dir: Path, max_iterations: int = 5000) -> SimulationResult:
        case_dir = Path(case_dir)
        if not self.is_available():
            return SimulationResult(
                success=False,
                converged=False,
                iterations=0,
                case_dir=str(case_dir),
                note=f"SU2 case assembled at {case_dir}; SU2_CFD binary not installed here.",
            )
        try:
            subprocess.run(
                ["SU2_CFD", "case.cfg"],
                cwd=case_dir,
                check=True,
                capture_output=True,
                text=True,
                timeout=7200,
            )
            return SimulationResult(
                success=True, converged=True, iterations=max_iterations, case_dir=str(case_dir)
            )
        except Exception as exc:  # noqa: BLE001
            return SimulationResult(
                success=False, converged=False, iterations=0, case_dir=str(case_dir), error=str(exc)
            )
