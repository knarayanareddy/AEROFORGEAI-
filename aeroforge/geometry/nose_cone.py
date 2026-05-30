"""Nose-cone / ogive profile generation.

Profiles return ``(x, r)`` points from tip (x=0) to base (x=L), to be revolved
about the x-axis. Supports tangent-ogive, conical, and Von Karman (LD-Haack)
series — the families called out in the design doc's aerodynamic-surface scope.
"""

from __future__ import annotations

import math
from typing import List, Literal, Tuple


def tangent_ogive(base_radius: float, length: float, n: int = 60) -> List[Tuple[float, float]]:
    """Tangent-ogive profile. rho = (R^2 + L^2) / (2R)."""
    R, L = base_radius, length
    rho = (R * R + L * L) / (2.0 * R)
    pts: List[Tuple[float, float]] = []
    for i in range(n + 1):
        x = L * i / n
        r = math.sqrt(rho * rho - (L - x) ** 2) - (rho - R)
        pts.append((x, max(0.0, r)))
    return pts


def conical(base_radius: float, length: float, n: int = 30) -> List[Tuple[float, float]]:
    """Straight conical nose profile."""
    return [(length * i / n, base_radius * i / n) for i in range(n + 1)]


def von_karman(base_radius: float, length: float, n: int = 60) -> List[Tuple[float, float]]:
    """Von Karman (LD-Haack, C=0) minimum-drag ogive profile."""
    R, L = base_radius, length
    pts: List[Tuple[float, float]] = []
    for i in range(n + 1):
        x = L * i / n
        theta = math.acos(1.0 - 2.0 * x / L)
        r = (R / math.sqrt(math.pi)) * math.sqrt(theta - math.sin(2 * theta) / 2.0)
        pts.append((x, max(0.0, r)))
    return pts


def nose_cone_profile(
    shape: Literal["ogive", "conical", "von_karman"],
    base_radius: float,
    length: float,
    n: int = 60,
) -> List[Tuple[float, float]]:
    if shape == "ogive":
        return tangent_ogive(base_radius, length, n)
    if shape == "conical":
        return conical(base_radius, length, n)
    if shape == "von_karman":
        return von_karman(base_radius, length, n)
    raise ValueError(f"Unknown nose-cone shape: {shape}")
