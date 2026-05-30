"""Analytical aerospace physics library.

Pure-Python / NumPy implementations of the compressible-flow relations that
govern propulsion and aerodynamic geometry. These functions are deterministic,
unit-tested against textbook and NASA reference values, and carry no dependency
on any LLM or CAD kernel — they are the "physics-aware" backbone of AeroForge.

All angles are in **degrees** at the public API boundary (converted internally),
and all dimensional quantities are **SI** (metres, kelvin, pascals) unless a name
says otherwise.
"""

from __future__ import annotations

from .isentropic import IsentropicRelations
from .normal_shock import NormalShockRelations
from .nozzle_design import NozzleContour, NozzleContourMOC
from .oblique_shock import ObliqueShockRelations
from .prandtl_meyer import PrandtlMeyer

GAMMA_AIR = 1.4
R_AIR = 287.05  # J/(kg·K)

__all__ = [
    "IsentropicRelations",
    "NormalShockRelations",
    "ObliqueShockRelations",
    "PrandtlMeyer",
    "NozzleContourMOC",
    "NozzleContour",
    "GAMMA_AIR",
    "R_AIR",
]
