"""Exception hierarchy for the AeroForge CFD subsystem (Phase 2).

Independent of Phase 1 — the CFD package shares only the CEP file format.
"""

from __future__ import annotations


class CFDError(Exception):
    """Base class for all CFD errors."""


class CEPIngestionError(CFDError):
    """Raised when a CEP package is missing, malformed, or unreadable."""


class MeshingError(CFDError):
    """Raised when mesh generation fails."""


class MeshQualityError(CFDError):
    """Raised when a mesh fails a fatal quality threshold (e.g. negative volume)."""


class SolverNotAvailableError(CFDError):
    """Raised when a requested solver binary is not installed on this machine."""


class PhysicsConfigError(CFDError):
    """Raised when a valid solver/physics configuration cannot be produced."""


class DivergenceError(CFDError):
    """Raised when a simulation diverges and cannot be recovered."""
