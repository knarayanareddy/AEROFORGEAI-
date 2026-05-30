"""Netgen meshing adapter — interface stub.

Netgen (via the ``netgen``/``ngsolve`` package) is an alternative unstructured
mesher. This stub defines the contract; Gmsh is the default working mesher.
"""

from __future__ import annotations

from typing import Optional

from ..types import GeometryPreparationPackage, MeshPackage
from .base import MeshToolAdapter


class NetgenAdapter(MeshToolAdapter):
    name = "netgen"
    output_format = "vol"

    def is_available(self) -> bool:
        try:
            import netgen  # noqa: F401

            return True
        except Exception:
            return False

    def generate(
        self,
        prep: GeometryPreparationPackage,
        out_dir: str,
        target_cell_size_m: Optional[float] = None,
    ) -> MeshPackage:
        return MeshPackage(
            None,
            "vol",
            0,
            0,
            None,
            None,
            "netgen",
            success=False,
            error="Netgen adapter not yet implemented; use the Gmsh adapter.",
        )
