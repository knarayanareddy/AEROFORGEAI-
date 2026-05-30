"""NACA airfoil coordinate generation.

Implements the NACA 4-digit family (and the symmetric 00xx case). Coordinates use
cosine spacing for a smooth, well-resolved leading edge. Output is a closed loop
of ``(x, y)`` points (upper surface trailing->leading edge is handled by the
caller) suitable for lofting in CAD.

Reference: Abbott & von Doenhoff, *Theory of Wing Sections*.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class AirfoilCoordinates:
    upper: List[Tuple[float, float]]
    lower: List[Tuple[float, float]]
    code: str
    chord: float

    def closed_loop(self) -> List[Tuple[float, float]]:
        """Return a single closed outline: upper LE->TE then lower TE->LE."""
        # upper from leading edge to trailing edge, then lower back to leading edge
        loop = list(self.upper)
        loop += list(reversed(self.lower))
        # de-duplicate adjacent identical points (LE/TE)
        out: List[Tuple[float, float]] = []
        for p in loop:
            if not out or abs(out[-1][0] - p[0]) > 1e-12 or abs(out[-1][1] - p[1]) > 1e-12:
                out.append(p)
        return out


def parse_naca4(code: str) -> Tuple[float, float, float]:
    """Parse a NACA 4-digit code (e.g. '2412') into (m, p, t) fractions."""
    digits = "".join(ch for ch in code if ch.isdigit())
    if len(digits) != 4:
        raise ValueError(f"'{code}' is not a 4-digit NACA code")
    m = int(digits[0]) / 100.0
    p = int(digits[1]) / 10.0
    t = int(digits[2:]) / 100.0
    return m, p, t


def naca4_coordinates(code: str, chord: float = 1.0, n_points: int = 100) -> AirfoilCoordinates:
    """Generate NACA 4-digit airfoil coordinates with cosine spacing."""
    m, p, t = parse_naca4(code)
    upper: List[Tuple[float, float]] = []
    lower: List[Tuple[float, float]] = []
    for i in range(n_points + 1):
        x = (1.0 - math.cos(math.pi * i / n_points)) / 2.0  # cosine spacing [0,1]
        yt = (t / 0.2) * (
            0.2969 * math.sqrt(x)
            - 0.1260 * x
            - 0.3516 * x**2
            + 0.2843 * x**3
            - 0.1015 * x**4  # open trailing edge (classic coefficients)
        )
        if m > 0.0 and p > 0.0:
            if x < p:
                yc = (m / p**2) * (2 * p * x - x**2)
                dyc = (2 * m / p**2) * (p - x)
            else:
                yc = (m / (1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x**2)
                dyc = (2 * m / (1 - p) ** 2) * (p - x)
        else:
            yc, dyc = 0.0, 0.0
        theta = math.atan(dyc)
        upper.append((chord * (x - yt * math.sin(theta)), chord * (yc + yt * math.cos(theta))))
        lower.append((chord * (x + yt * math.sin(theta)), chord * (yc - yt * math.cos(theta))))
    return AirfoilCoordinates(upper=upper, lower=lower, code=code, chord=chord)


def max_thickness_fraction(code: str) -> float:
    """Return the maximum thickness/chord fraction encoded in the code."""
    return parse_naca4(code)[2]
