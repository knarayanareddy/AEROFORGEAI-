"""AeroForge AI — Part 3: Integration, Platform & Future Architecture.

The integration layer that ties Phase 1 (CAD) and Phase 2 (CFD) together:

* :class:`OptimizationLoop` — closed CAD→evaluate→CAD multi-objective iteration.
* :class:`ComplianceChecker` — FAA/EASA/ITAR/EAR advisory aggregator.
* REST API (``aeroforge.platform.api``) + a minimal web console.
* Enterprise auth/multi-tenant stubs.

This is the only layer permitted to import both Phase 1 (``aeroforge``) and
Phase 2 (``aeroforge.cfd``); those two remain independent of each other.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .compliance import ComplianceChecker, ComplianceReport
from .evaluators import AnalyticalEvaluator, CFDEvaluator, PerformanceEvaluator
from .optimization_loop import OptimizationLoop, OptimizationResult

if TYPE_CHECKING:  # pragma: no cover
    from fastapi import FastAPI


def create_app(*args, **kwargs) -> "FastAPI":
    """Lazily build the FastAPI app (keeps FastAPI an optional dependency)."""
    from .api import create_app as _create_app

    return _create_app(*args, **kwargs)


__all__ = [
    "OptimizationLoop",
    "OptimizationResult",
    "PerformanceEvaluator",
    "AnalyticalEvaluator",
    "CFDEvaluator",
    "ComplianceChecker",
    "ComplianceReport",
    "create_app",
]
