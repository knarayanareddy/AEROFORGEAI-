"""CFD skill learner.

After a converged run, distils the winning configuration into a reusable skill
record (regime → solver/turbulence/mesh settings). This is the learning-loop hook;
persistence is via the simulation database / skill registry.
"""

from __future__ import annotations

from typing import Any, Dict

from ..types import MeshPackage, SimulationResult, SolverConfigPackage


class SkillLearner:
    """Extracts a reusable CFD skill from a successful simulation."""

    def learn(
        self,
        regime: str,
        component_type: str,
        config: SolverConfigPackage,
        mesh: MeshPackage,
        result: SimulationResult,
    ) -> Dict[str, Any]:
        if not (result.success and result.converged):
            return {}
        return {
            "skill": {
                "name": f"{component_type}_{regime}_converged",
                "regime": regime,
                "solver": config.solver,
                "turbulence_model": config.turbulence_model,
                "settings": {
                    "wall_treatment": config.wall_treatment,
                    "mesh_cells": mesh.n_cells if mesh else None,
                    "iterations_to_converge": result.iterations,
                },
                "source": "learned",
            }
        }
