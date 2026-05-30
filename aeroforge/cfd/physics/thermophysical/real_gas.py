"""High-temperature real-gas model — interface stub (Phase 2 roadmap).

Hypersonic flows above ~Mach 6 exhibit vibrational excitation and dissociation
that a calorically perfect gas cannot capture. This stub defines where an
equilibrium/non-equilibrium real-gas model (e.g. via CoolProp or a Park 2-temp
model) would plug in. Until then, callers fall back to :class:`IdealGas`.
"""

from __future__ import annotations

from dataclasses import dataclass

from .ideal_gas import IdealGas


@dataclass
class RealGas(IdealGas):
    """Placeholder that currently behaves as a calorically perfect gas."""

    note: str = "real-gas effects not yet modelled; using ideal-gas fallback"
