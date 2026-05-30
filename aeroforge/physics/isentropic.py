"""Isentropic (adiabatic, reversible) compressible-flow relations.

Reference: Anderson, *Modern Compressible Flow*, 3rd ed., Ch. 3.
"""

from __future__ import annotations

import math
from typing import Optional

from scipy.optimize import brentq

GAMMA_AIR = 1.4


class IsentropicRelations:
    """Isentropic relations for a calorically perfect gas."""

    @staticmethod
    def stagnation_temperature_ratio(mach: float, gamma: float = GAMMA_AIR) -> float:
        """T0/T = 1 + (gamma-1)/2 * M^2."""
        return 1.0 + 0.5 * (gamma - 1.0) * mach * mach

    @staticmethod
    def stagnation_pressure_ratio(mach: float, gamma: float = GAMMA_AIR) -> float:
        """p0/p = (1 + (gamma-1)/2 M^2)^(gamma/(gamma-1))."""
        t = IsentropicRelations.stagnation_temperature_ratio(mach, gamma)
        return t ** (gamma / (gamma - 1.0))

    @staticmethod
    def stagnation_density_ratio(mach: float, gamma: float = GAMMA_AIR) -> float:
        """rho0/rho = (1 + (gamma-1)/2 M^2)^(1/(gamma-1))."""
        t = IsentropicRelations.stagnation_temperature_ratio(mach, gamma)
        return t ** (1.0 / (gamma - 1.0))

    @staticmethod
    def area_mach_ratio(mach: float, gamma: float = GAMMA_AIR) -> float:
        """A/A* as a function of Mach number (the area–Mach relation).

        Returns the ratio of local area to the sonic-throat area. Valid for
        ``mach > 0``; equals 1 at M = 1.
        """
        if mach <= 0:
            raise ValueError("Mach number must be positive")
        gm1 = gamma - 1.0
        gp1 = gamma + 1.0
        term = (2.0 / gp1) * (1.0 + 0.5 * gm1 * mach * mach)
        exponent = gp1 / (2.0 * gm1)
        return (1.0 / mach) * term**exponent

    @staticmethod
    def mach_from_area_ratio(
        area_ratio: float, supersonic: bool = True, gamma: float = GAMMA_AIR
    ) -> float:
        """Invert the area–Mach relation A/A* → M.

        The area–Mach relation has two roots for every ``A/A* > 1`` (one subsonic,
        one supersonic). ``supersonic`` selects which branch to return.
        """
        if area_ratio < 1.0:
            raise ValueError("A/A* must be >= 1")
        if math.isclose(area_ratio, 1.0, rel_tol=1e-9):
            return 1.0

        def f(m: float) -> float:
            return IsentropicRelations.area_mach_ratio(m, gamma) - area_ratio

        if supersonic:
            return brentq(f, 1.0 + 1e-9, 100.0, xtol=1e-10)
        return brentq(f, 1e-6, 1.0 - 1e-9, xtol=1e-10)

    @staticmethod
    def mach_angle_deg(mach: float) -> float:
        """Mach angle mu = arcsin(1/M), in degrees. Requires M >= 1."""
        if mach < 1.0:
            raise ValueError("Mach angle defined only for M >= 1")
        return math.degrees(math.asin(1.0 / mach))

    @staticmethod
    def expansion_ratio_for_exit_mach(exit_mach: float, gamma: float = GAMMA_AIR) -> float:
        """Nozzle area expansion ratio Ae/At for a given exit Mach number."""
        return IsentropicRelations.area_mach_ratio(exit_mach, gamma)
