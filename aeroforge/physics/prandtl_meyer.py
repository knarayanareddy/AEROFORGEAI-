"""Prandtl-Meyer expansion-fan relations.

Reference: Anderson, *Modern Compressible Flow*, 3rd ed., Ch. 4.
"""

from __future__ import annotations

import math

from scipy.optimize import brentq

GAMMA_AIR = 1.4


class PrandtlMeyer:
    """Prandtl-Meyer function and its inverse."""

    @staticmethod
    def nu_deg(mach: float, gamma: float = GAMMA_AIR) -> float:
        """Prandtl-Meyer angle nu(M) in degrees. Requires M >= 1."""
        if mach < 1.0:
            raise ValueError("Prandtl-Meyer function requires M >= 1")
        gp1 = gamma + 1.0
        gm1 = gamma - 1.0
        m2m1 = mach * mach - 1.0
        nu = math.sqrt(gp1 / gm1) * math.atan(math.sqrt(gm1 / gp1 * m2m1)) - math.atan(
            math.sqrt(m2m1)
        )
        return math.degrees(nu)

    @staticmethod
    def mach_from_nu(nu_deg: float, gamma: float = GAMMA_AIR) -> float:
        """Invert the Prandtl-Meyer function: nu (deg) -> Mach number."""
        if nu_deg < 0.0:
            raise ValueError("nu must be >= 0")
        if nu_deg == 0.0:
            return 1.0
        nu_max = PrandtlMeyer.nu_deg(1e6, gamma)  # theoretical limit
        if nu_deg >= nu_max:
            raise ValueError(f"nu={nu_deg:.2f} deg exceeds physical maximum {nu_max:.2f} deg")
        return float(brentq(lambda m: PrandtlMeyer.nu_deg(m, gamma) - nu_deg, 1.0 + 1e-9, 1e4))
