"""Performance evaluators for the optimization loop.

A design's performance can be scored two ways:

* :class:`AnalyticalEvaluator` — reads the physics-derived metrics the Phase-1
  physics agent already computed (total pressure recovery, expansion ratio, ...).
  Always available, no solver needed — this is what drives the loop offline.
* :class:`CFDEvaluator` — runs the Phase-2 CFD pipeline and extracts the
  simulated quantities. Used when a CFD solver (OpenFOAM/SU2) is installed.

Both return a flat ``{metric: value}`` dict the design-loop target checker
understands. This module is part of the Part-3 integration layer, so it is
allowed to import both Phase 1 and Phase 2 (which remain independent of each
other).
"""

from __future__ import annotations

import abc
from typing import Dict

from ..types import CadOutputPackage

_METRIC_KEYS = (
    "total_pressure_recovery",
    "mass_capture_ratio",
    "expansion_ratio",
    "exit_mach",
    "total_turn_deg",
)


class PerformanceEvaluator(abc.ABC):
    source: str = "abstract"

    @abc.abstractmethod
    def evaluate(self, pkg: CadOutputPackage) -> Dict[str, float]:
        """Return a flat {metric: value} dict scoring the design."""


class AnalyticalEvaluator(PerformanceEvaluator):
    """Score a design from its physics-derived quantities (offline-safe)."""

    source = "analytical"

    def evaluate(self, pkg: CadOutputPackage) -> Dict[str, float]:
        phys = pkg.augmented.physics or {}
        out: Dict[str, float] = {}
        for k in _METRIC_KEYS:
            v = phys.get(k)
            if isinstance(v, (int, float)):
                out[k] = float(v)
        return out


class CFDEvaluator(PerformanceEvaluator):
    """Score a design by running the Phase-2 CFD pipeline on its CEP package."""

    source = "cfd"

    def __init__(self, mesher: str = "gmsh", solver: str = "openfoam"):
        self.mesher = mesher
        self.solver = solver

    def evaluate(self, pkg: CadOutputPackage) -> Dict[str, float]:
        from ..cfd import AeroForgeCFD  # local import keeps Phase-1-only installs light

        if not pkg.output_dir:
            return {}
        run = AeroForgeCFD(mesher=self.mesher, solver=self.solver).run(pkg.output_dir)
        return dict(run.result.quantities or {})
