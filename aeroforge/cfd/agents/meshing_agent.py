"""Meshing Agent.

Selects/configures a mesher, computes the boundary-layer (y+) spec, generates the
mesh, validates its quality, and — when quality is poor — runs one corrective
re-mesh at a finer size (the Mesh Correction sub-agent). Returns a MeshPackage
with the attached boundary-layer specification.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..meshing import YPlusEstimator, get_mesher
from ..types import GeometryPreparationPackage, MeshPackage


class MeshingAgent:
    """Generates and quality-checks the CFD mesh."""

    def __init__(self, mesher_name: str = "gmsh", target_yplus: float = 1.0):
        self.mesher = get_mesher(mesher_name)
        self.yplus = YPlusEstimator()
        self.target_yplus = target_yplus

    def generate(
        self,
        prep: GeometryPreparationPackage,
        out_dir: str,
        target_cell_size_m: Optional[float] = None,
    ) -> MeshPackage:
        flow = prep.flow_conditions
        bl = self.yplus.compute_first_layer_height(
            self.target_yplus,
            flow.velocity_ms,
            prep.characteristic_length_m,
            flow.fluid,
            flow.mach,
        )

        mesh = self.mesher.generate(prep, out_dir, target_cell_size_m)
        mesh.boundary_layer = bl

        # Mesh Correction sub-agent: one finer re-mesh if quality is poor (not fatal).
        if mesh.success and mesh.quality and not mesh.quality.passed and not mesh.quality.fatal:
            finer = (target_cell_size_m or prep.characteristic_length_m / 12.0) * 0.6
            retry = self.mesher.generate(prep, str(Path(out_dir) / "remesh"), finer)
            if retry.success and retry.quality and retry.quality.passed:
                retry.boundary_layer = bl
                return retry
        return mesh
