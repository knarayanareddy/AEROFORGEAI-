"""OpenFOAM solver selection.

Implements the design doc's solver-selection tree: maps flow regime (and
steady/unsteady, reacting flags) to the appropriate OpenFOAM application.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..types import FlowRegime


@dataclass
class SolverChoice:
    solver: str
    is_compressible: bool
    density_based: bool
    rationale: str


class SolverSelector:
    """Selects the OpenFOAM solver for a flow scenario."""

    def select(
        self,
        regime: FlowRegime,
        steady: bool = True,
        reacting: bool = False,
        multiphase: bool = False,
    ) -> SolverChoice:
        if reacting:
            return SolverChoice(
                "reactingFoam", True, False, "Finite-rate chemistry (combustor) → reactingFoam."
            )
        if multiphase:
            return SolverChoice("interFoam", False, False, "Multiphase (VOF) flow → interFoam.")

        if regime == FlowRegime.INCOMPRESSIBLE:
            return (
                SolverChoice("simpleFoam", False, False, "Incompressible steady RANS → simpleFoam.")
                if steady
                else SolverChoice(
                    "pimpleFoam", False, False, "Incompressible unsteady RANS → pimpleFoam."
                )
            )

        if regime in (FlowRegime.SUBSONIC,):
            return (
                SolverChoice(
                    "rhoSimpleFoam", True, False, "Compressible subsonic steady → rhoSimpleFoam."
                )
                if steady
                else SolverChoice(
                    "rhoPimpleFoam", True, False, "Compressible subsonic unsteady → rhoPimpleFoam."
                )
            )

        if regime in (FlowRegime.TRANSONIC, FlowRegime.SUPERSONIC):
            return (
                SolverChoice(
                    "rhoSimpleFoam",
                    True,
                    False,
                    "Transonic/supersonic steady with shock-robust schemes " "→ rhoSimpleFoam.",
                )
                if steady
                else SolverChoice(
                    "rhoCentralFoam",
                    True,
                    True,
                    "Shock-dominated unsteady → density-based rhoCentralFoam " "(Kurganov-Tadmor).",
                )
            )

        # HYPERSONIC
        return SolverChoice(
            "rhoCentralFoam",
            True,
            True,
            "Hypersonic high-speed flow → density-based rhoCentralFoam.",
        )
