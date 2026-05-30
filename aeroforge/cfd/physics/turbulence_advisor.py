"""Turbulence model advisor.

Implements the design doc's turbulence-model selection matrix, returning a model
plus wall treatment and the target y+ that the mesh must achieve.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..types import FlowRegime


@dataclass
class TurbulenceChoice:
    model: str
    wall_treatment: str  # "low_Re" or "wall_function"
    target_yplus: float
    rationale: str


class TurbulenceAdvisor:
    """Recommends a turbulence model + wall treatment + target y+."""

    def advise(
        self,
        regime: FlowRegime,
        component_type: str = "",
        reacting: bool = False,
        reynolds_number: float | None = None,
    ) -> TurbulenceChoice:
        ctype = (component_type or "").lower()

        # Laminar cutoff.
        if (
            reynolds_number is not None
            and reynolds_number < 5e5
            and regime in (FlowRegime.INCOMPRESSIBLE, FlowRegime.SUBSONIC)
        ):
            return TurbulenceChoice(
                "laminar", "none", 1.0, "Re < 5e5 in low-speed flow → laminar (no model)."
            )

        if reacting or "combustor" in ctype:
            return TurbulenceChoice(
                "kEpsilon",
                "wall_function",
                50.0,
                "Combustor flow → realizable k-epsilon with wall functions.",
            )

        # Default aerospace choice: k-omega SST, low-Re (y+~1).
        rationale = "k-omega SST resolves adverse pressure gradients and shock-BL "
        if "inlet" in ctype or "scramjet" in ctype:
            rationale += "interaction in inlets; low-Re wall treatment (y+~1)."
        elif "nozzle" in ctype:
            rationale += "expansion/contraction wall flow; low-Re (y+~1)."
        elif "airfoil" in ctype or "wing" in ctype:
            rationale += "attached/separating external BL; low-Re (y+~1)."
        else:
            rationale += "general wall-bounded aerospace flow; low-Re (y+~1)."
        return TurbulenceChoice("kOmegaSST", "low_Re", 1.0, rationale)
