"""Exception hierarchy for AeroForge AI.

All AeroForge-specific errors derive from :class:`AeroForgeError` so callers can
catch the whole family with a single ``except``.
"""

from __future__ import annotations


class AeroForgeError(Exception):
    """Base class for all AeroForge errors."""


class ConfigError(AeroForgeError):
    """Raised when configuration is missing or invalid."""


class IntentParseError(AeroForgeError):
    """Raised when natural-language input cannot be turned into a design intent."""


class PhysicsConstraintError(AeroForgeError):
    """Raised when a requested design violates a hard physical law.

    Example: an oblique-shock deflection that exceeds the maximum for the given
    Mach number (the shock would detach), or a requested pressure recovery that
    is unattainable.
    """


class GeometryPlanError(AeroForgeError):
    """Raised when a valid geometry task DAG cannot be built from the intent."""


class CadGenerationError(AeroForgeError):
    """Base class for failures during CAD code generation or execution."""


class CadTaskExecutionError(CadGenerationError):
    """Raised when a single geometry task fails after all correction attempts."""

    def __init__(self, task: str, attempts: int, last_error: str | None = None):
        self.task = task
        self.attempts = attempts
        self.last_error = last_error
        super().__init__(
            f"Task '{task}' failed after {attempts} attempt(s): {last_error or 'unknown error'}"
        )


class AdapterNotAvailableError(CadGenerationError):
    """Raised when a requested CAD adapter's backend is not installed."""


class ValidationFailedError(AeroForgeError):
    """Raised when generated geometry fails a blocking validation stage."""


class ExportError(AeroForgeError):
    """Raised when a geometry export to STEP/IGES/STL/BREP fails."""
