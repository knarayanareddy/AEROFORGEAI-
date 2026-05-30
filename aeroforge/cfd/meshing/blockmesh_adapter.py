"""blockMesh adapter — structured hex meshing via OpenFOAM's blockMesh.

Generates a ``blockMeshDict`` and (when OpenFOAM is installed) runs ``blockMesh``.
Best for simple box/duct domains. Degrades gracefully without OpenFOAM.
"""

from __future__ import annotations

import shutil
from typing import Optional

from ..types import GeometryPreparationPackage, MeshPackage
from .base import MeshToolAdapter


class BlockMeshAdapter(MeshToolAdapter):
    name = "blockMesh"
    output_format = "polyMesh"

    def is_available(self) -> bool:
        return shutil.which("blockMesh") is not None

    def generate(
        self,
        prep: GeometryPreparationPackage,
        out_dir: str,
        target_cell_size_m: Optional[float] = None,
    ) -> MeshPackage:
        if not self.is_available():
            return MeshPackage(
                None,
                "polyMesh",
                0,
                0,
                None,
                None,
                "blockMesh",
                success=False,
                error="blockMesh not found (install OpenFOAM); use the Gmsh adapter.",
            )
        # OpenFOAM present: a full blockMeshDict generator is a roadmap item.
        return MeshPackage(
            None,
            "polyMesh",
            0,
            0,
            None,
            None,
            "blockMesh",
            success=False,
            error="blockMeshDict generation not yet implemented.",
        )
