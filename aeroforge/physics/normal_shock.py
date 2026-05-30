"""Normal-shock relations for a calorically perfect gas.

Reference: Anderson, *Modern Compressible Flow*, 3rd ed., Ch. 3.
"""

from __future__ import annotations

import math

GAMMA_AIR = 1.4


class NormalShockRelations:
    """Property jumps across a stationary normal shock."""

    @staticmethod
    def mach_downstream(mach1: float, gamma: float = GAMMA_AIR) -> float:
        """Downstream Mach number M2 given upstream M1 (>= 1)."""
        if mach1 < 1.0:
            raise ValueError("Normal shock requires upstream M1 >= 1")
        gm1 = gamma - 1.0
        num = 1.0 + 0.5 * gm1 * mach1 * mach1
        den = gamma * mach1 * mach1 - 0.5 * gm1
        return math.sqrt(num / den)

    @staticmethod
    def static_pressure_ratio(mach1: float, gamma: float = GAMMA_AIR) -> float:
        """p2/p1 across the shock."""
        return 1.0 + (2.0 * gamma / (gamma + 1.0)) * (mach1 * mach1 - 1.0)

    @staticmethod
    def density_ratio(mach1: float, gamma: float = GAMMA_AIR) -> float:
        """rho2/rho1 across the shock."""
        gp1 = gamma + 1.0
        gm1 = gamma - 1.0
        return (gp1 * mach1 * mach1) / (gm1 * mach1 * mach1 + 2.0)

    @staticmethod
    def temperature_ratio(mach1: float, gamma: float = GAMMA_AIR) -> float:
        """T2/T1 across the shock."""
        return NormalShockRelations.static_pressure_ratio(
            mach1, gamma
        ) / NormalShockRelations.density_ratio(mach1, gamma)

    @staticmethod
    def total_pressure_ratio(mach1: float, gamma: float = GAMMA_AIR) -> float:
        """Stagnation-pressure recovery p0_2/p0_1 across a normal shock.

        This is always <= 1 and quantifies the irreversible loss. It is the key
        quantity for inlet efficiency.
        """
        if mach1 <= 1.0:
            return 1.0
        gp1 = gamma + 1.0
        gm1 = gamma - 1.0
        term1 = (gp1 * mach1 * mach1 / (gm1 * mach1 * mach1 + 2.0)) ** (gamma / gm1)
        term2 = (gp1 / (2.0 * gamma * mach1 * mach1 - gm1)) ** (1.0 / gm1)
        return term1 * term2
