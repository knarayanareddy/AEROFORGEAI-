"""CFD Orchestration Agent — the top-level ``AeroForgeCFD`` entry point.

Runs the full Phase-2 pipeline from a Phase-1 CEP package:

    CEP package
      -> Geometry Preparation Agent   (ingest, classify domain, patches, flow)
      -> Meshing Agent                (real Gmsh mesh + y+ + quality + correction)
      -> Physics Configuration Agent  (solver/turbulence/schemes/BC/IC/convergence)
      -> Solver Execution Agent       (assemble runnable case; run if solver present)
      -> Post-Processing Agent        (quantities + validation + report)
      -> Design Loop Agent            (ACCEPT / ITERATE / ESCALATE + Phase-1 mods)

Independent of Phase 1 — the CEP JSON is the only shared contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

from ..memory.simulation_database import SimulationDatabase
from ..memory.skill_learner import SkillLearner
from ..meshing import available_meshers
from ..solvers import available_solvers
from ..types import (
    DesignLoopDecision,
    GeometryPreparationPackage,
    LoopDecision,
    MeshPackage,
    SimulationResult,
    SolverConfigPackage,
)
from .design_loop_agent import DesignLoopAgent
from .geometry_preparation_agent import GeometryPreparationAgent
from .meshing_agent import MeshingAgent
from .physics_configuration_agent import PhysicsConfigurationAgent
from .post_processing_agent import PostProcessingAgent
from .solver_execution_agent import SolverExecutionAgent


@dataclass
class CFDRunPackage:
    prep: GeometryPreparationPackage
    mesh: MeshPackage
    config: SolverConfigPackage
    result: SimulationResult
    decision: DesignLoopDecision
    report_path: Optional[str] = None
    case_dir: Optional[str] = None
    learned_skill: Dict[str, Any] = field(default_factory=dict)


class AeroForgeCFD:
    """High-level façade for the CFD automation pipeline."""

    def __init__(self, mesher: str = "gmsh", solver: str = "openfoam", max_iterations: int = 2000):
        self.geometry_agent = GeometryPreparationAgent()
        self.meshing_agent = MeshingAgent(mesher_name=mesher)
        self.physics_agent = PhysicsConfigurationAgent()
        self.solver_agent = SolverExecutionAgent(solver_name=solver)
        self.post_agent = PostProcessingAgent()
        self.design_loop_agent = DesignLoopAgent()
        self.max_iterations = max_iterations
        self.simdb = SimulationDatabase()
        self.skill_learner = SkillLearner()

    def run(self, cep_path: Path, out_dir: Optional[Path] = None) -> CFDRunPackage:
        cep_path = Path(cep_path)
        out_dir = Path(out_dir) if out_dir else (cep_path.parent / "cfd")
        out_dir.mkdir(parents=True, exist_ok=True)

        prep = self.geometry_agent.ingest_cep(cep_path)
        mesh = self.meshing_agent.generate(prep, str(out_dir / "mesh"))
        config = self.physics_agent.configure(prep, max_iterations=self.max_iterations)
        result = self.solver_agent.execute(
            config, mesh, out_dir / "case", max_iterations=self.max_iterations
        )
        result, validation, _report_md = self.post_agent.process(
            prep, mesh, config, result, out_dir
        )

        targets = prep.manifest.performance_targets if prep.manifest else []
        if result.success and result.quantities:
            decision = self.design_loop_agent.decide(
                result.quantities, targets, prep.manifest.component_type
            )
        else:
            # No solver results (e.g. no solver binary here): the loop cannot judge
            # targets. Surface this honestly rather than defaulting to ACCEPT.
            decision = DesignLoopDecision(
                LoopDecision.ESCALATE,
                "CFD case assembled but not solved in this environment; run the case "
                "(install OpenFOAM/SU2) to obtain results before a design decision.",
            )

        learned = self.skill_learner.learn(
            prep.flow_conditions.regime.value, prep.manifest.component_type, config, mesh, result
        )

        self._record(prep, mesh, config, result, decision)
        return CFDRunPackage(
            prep=prep,
            mesh=mesh,
            config=config,
            result=result,
            decision=decision,
            report_path=str(out_dir / "cfd_report.md"),
            case_dir=result.case_dir,
            learned_skill=learned,
        )

    def doctor(self) -> Dict[str, Any]:
        return {
            "meshers": available_meshers(),
            "solvers": available_solvers(),
        }

    def _record(self, prep, mesh, config, result, decision) -> None:
        try:
            self.simdb.record(
                {
                    "component_type": prep.manifest.component_type,
                    "regime": prep.flow_conditions.regime.value,
                    "solver": config.solver,
                    "turbulence_model": config.turbulence_model,
                    "mesh_cells": mesh.n_cells if mesh else 0,
                    "converged": result.converged,
                    "decision": decision.decision.value,
                }
            )
        except Exception:  # pragma: no cover - persistence must not break a run
            pass
