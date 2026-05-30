"""snappyHexMesh adapter — OpenFOAM body-fitted hex-dominant meshing (stub).

snappyHexMesh produces high-quality hex-dominant meshes around complex geometry
with automated boundary-layer insertion. Requires OpenFOAM; degrades gracefully.
"""

from __future__ import annotations

import shutil
from typing import Optional

from ..types import GeometryPreparationPackage, MeshPackage
from .base import MeshToolAdapter


class SnappyHexAdapter(MeshToolAdapter):
    name = "snappyHexMesh"
    output_format = "polyMesh"

    def is_available(self) -> bool:
        return shutil.which("snappyHexMesh") is not None

    def generate(
        self,
        prep: GeometryPreparationPackage,
        out_dir: str,
        target_cell_size_m: Optional[float] = None,
    ) -> MeshPackage:
        return MeshPackage(
            None,
            "polyMesh",
            0,
            0,
            None,
            None,
            "snappyHexMesh",
            success=False,
            error=(
                "snappyHexMesh requires OpenFOAM and a base blockMesh; not available here. "
                "Use the Gmsh adapter for a working mesh."
            ),
        )
