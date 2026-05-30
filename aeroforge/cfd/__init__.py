"""AeroForge AI — Phase 2 CFD automation core.

Takes a Phase-1 CEP package (geometry + manifest) and runs a full CFD-preparation
pipeline: ingest → mesh (real Gmsh) → physics configuration → runnable solver
case → post-processing/validation → design-loop decision.

Independent of Phase 1: the CEP JSON file format is the only shared contract.

>>> from aeroforge.cfd import AeroForgeCFD
>>> run = AeroForgeCFD().run("path/to/cep_package")     # doctest: +SKIP
>>> run.mesh.n_cells, run.config.solver                 # doctest: +SKIP
"""

from __future__ import annotations

__version__ = "0.1.0"
__cep_version__ = "1.0"

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from .agents.cfd_orchestration_agent import AeroForgeCFD, CFDRunPackage


def __getattr__(name: str):
    if name in ("AeroForgeCFD", "CFDRunPackage"):
        from .agents.cfd_orchestration_agent import AeroForgeCFD, CFDRunPackage

        return {"AeroForgeCFD": AeroForgeCFD, "CFDRunPackage": CFDRunPackage}[name]
    raise AttributeError(f"module 'aeroforge.cfd' has no attribute {name!r}")


__all__ = ["AeroForgeCFD", "CFDRunPackage", "__version__", "__cep_version__"]
