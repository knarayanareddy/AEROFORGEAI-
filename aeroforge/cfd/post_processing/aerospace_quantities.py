"""Aerospace-specific integral quantity extraction.

Computes the engineering quantities aerospace engineers care about — total
pressure recovery, force coefficients — from CFD field/force data when present,
and provides self-contained analytical *expectations* (e.g. ideal normal-shock
recovery) used by the results validator as a sanity bound.
"""

from __future__ import annotations

import math
from typing import Dict, Optional

GAMMA = 1.4


def normal_shock_total_pressure_ratio(mach: float, gamma: float = GAMMA) -> float:
    """Analytical p0_2/p0_1 across a normal shock (sanity bound for inlets)."""
    if mach <= 1.0:
        return 1.0
    gp1, gm1 = gamma + 1.0, gamma - 1.0
    t1 = (gp1 * mach**2 / (gm1 * mach**2 + 2.0)) ** (gamma / gm1)
    t2 = (gp1 / (2.0 * gamma * mach**2 - gm1)) ** (1.0 / gm1)
    return t1 * t2


class AerospaceQuantities:
    """Extracts integral quantities from CFD results."""

    def total_pressure_recovery(self, fields: Dict[str, float]) -> Optional[float]:
        """pt_outlet / pt_inlet from extracted stagnation pressures, if available."""
        pt_in = fields.get("pt_inlet")
        pt_out = fields.get("pt_outlet")
        if pt_in and pt_out and pt_in > 0:
            return pt_out / pt_in
        return None

    def force_coefficients(
        self, forces: Dict[str, float], dynamic_pressure: float, area: float
    ) -> Dict[str, float]:
        """Cd, Cl from drag/lift forces (N), q = 0.5*rho*U^2, reference area."""
        out: Dict[str, float] = {}
        denom = dynamic_pressure * area
        if denom > 0:
            if "drag" in forces:
                out["Cd"] = forces["drag"] / denom
            if "lift" in forces:
                out["Cl"] = forces["lift"] / denom
        return out

    def analytical_recovery_bound(self, mach: float) -> float:
        """Lower bound: a single terminal normal shock at the design Mach."""
        return normal_shock_total_pressure_ratio(mach)
