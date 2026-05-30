"""AeroForge AI — Phase 1 CAD automation core.

Natural-language aerospace design intent → physics-validated parametric CAD
geometry (STEP / IGES / STL / BREP) with full provenance and a CFD-ready CAD
Exchange Protocol (CEP) handoff package.

Quick start
-----------
>>> from aeroforge import AeroForge
>>> forge = AeroForge()
>>> pkg = forge.design("Design a NACA 2412 airfoil, 2 m chord, 5 m span")
>>> pkg.artifacts["step"]            # doctest: +SKIP
'.../naca_2412.step'
"""

from __future__ import annotations

__version__ = "0.1.0"
__cep_version__ = "1.0"

from typing import TYPE_CHECKING

from .config import AeroForgeConfig
from .exceptions import AeroForgeError
from .types import (
    CadOutputPackage,
    PhysicsAugmentedIntent,
    StructuredDesignIntent,
    ValidationReport,
)

if TYPE_CHECKING:  # pragma: no cover
    from .agents.orchestration_agent import AeroForge


def __getattr__(name: str):
    """Lazily expose the orchestrator so importing light submodules (e.g.
    ``aeroforge.physics``) never pulls in the full agent/CAD stack."""
    if name == "AeroForge":
        from .agents.orchestration_agent import AeroForge as _AeroForge

        return _AeroForge
    raise AttributeError(f"module 'aeroforge' has no attribute {name!r}")


__all__ = [
    "__version__",
    "__cep_version__",
    "AeroForge",
    "AeroForgeConfig",
    "AeroForgeError",
    "StructuredDesignIntent",
    "PhysicsAugmentedIntent",
    "ValidationReport",
    "CadOutputPackage",
]
