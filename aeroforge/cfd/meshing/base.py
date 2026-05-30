"""Mesh tool adapter interface.

Every mesher (Gmsh, blockMesh, snappyHexMesh, Netgen) implements
:class:`MeshToolAdapter`. The meshing agent only talks to this interface, so a
new mesher can be added without touching the pipeline.
"""

from __future__ import annotations

import abc
from typing import Optional

from ..types import GeometryPreparationPackage, MeshPackage


class MeshToolAdapter(abc.ABC):
    name: str = "abstract"
    output_format: str = "msh"

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Whether this mesher's backend is installed and usable."""

    @abc.abstractmethod
    def generate(
        self,
        prep: GeometryPreparationPackage,
        out_dir: str,
        target_cell_size_m: Optional[float] = None,
    ) -> MeshPackage:
        """Generate a mesh for the prepared geometry and write it to ``out_dir``."""
