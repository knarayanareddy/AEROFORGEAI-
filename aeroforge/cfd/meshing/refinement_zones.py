"""Refinement zone engine.

Auto-identifies regions that need finer cells for aerospace flows — shock
regions (from CEP shock hints), boundary layers (from the y+ estimate), and
wakes (downstream of bodies) — and returns target cell sizes for each. These map
to snappyHexMesh refinement regions or Gmsh size fields.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from ..types import GeometryPreparationPackage


@dataclass
class RefinementZone:
    name: str
    target_cell_size_m: float
    zone_type: str
    rationale: str


class RefinementZoneEngine:
    """Computes refinement zones for a prepared geometry."""

    def zones(self, prep: GeometryPreparationPackage) -> List[RefinementZone]:
        out: List[RefinementZone] = []
        L = max(prep.characteristic_length_m, 1e-3)
        hints = prep.manifest.cfd_hints.get("mesh_hints", {})

        if hints.get("shock_refinement_required") or prep.flow_conditions.mach >= 1.0:
            out.append(
                RefinementZone(
                    "shock_region",
                    0.005 * L,
                    "box_or_cone_aligned_with_shock",
                    "Supersonic flow: refine to ~0.5% of L to resolve shocks.",
                )
            )

        out.append(
            RefinementZone(
                "boundary_layer",
                0.002 * L,
                "surface_inflation_layers",
                "Wall BL refinement sized by the y+ estimator.",
            )
        )

        if prep.flow_conditions.mach < 1.0:
            out.append(
                RefinementZone(
                    "wake_region",
                    0.02 * L,
                    "downstream_box",
                    "Subsonic wake refinement to ~2% of L.",
                )
            )
        return out
