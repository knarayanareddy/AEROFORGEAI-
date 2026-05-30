"""Supersonic nozzle contour generation.

Provides three contour families, all returning a list of ``(x, r)`` wall points
(axis along +x, radius r) suitable for lofting a BSpline in CAD:

* ``conical``   — straight-walled diverging cone (simple, robust baseline).
* ``bell``/``rao`` — parabolic Rao thrust-optimised approximation (the classic
  80%-bell used throughout rocket-nozzle practice; Sutton & Biblarz).
* ``min_length`` — minimum-length nozzle contour anchored to the Method of
  Characteristics result: the initial wall angle equals the MOC maximum,
  ``theta_max = nu(Me)/2`` (Anderson, Ch. 11), the exit area ratio matches the
  isentropic value for ``Me``, and the wall is shorter than the equivalent
  cone. (A full interior-grid MOC solver is a planned enhancement; this contour
  reproduces the MOC's governing wall angle and area ratio.)

The exit area ratio is set by the requested exit Mach number via the isentropic
area-Mach relation, so the generated geometry is physically consistent.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Literal, Optional, Tuple

import numpy as np

from .isentropic import IsentropicRelations
from .prandtl_meyer import PrandtlMeyer

GAMMA_AIR = 1.4


@dataclass
class NozzleContour:
    """A generated nozzle wall contour."""

    points: List[Tuple[float, float]]  # (x, r) wall points, throat -> exit
    throat_radius_m: float
    exit_radius_m: float
    length_m: float
    expansion_ratio: float
    exit_mach: float
    nozzle_type: str
    initial_wall_angle_deg: float = 0.0
    metadata: dict = field(default_factory=dict)

    @property
    def x(self) -> List[float]:
        return [p[0] for p in self.points]

    @property
    def r(self) -> List[float]:
        return [p[1] for p in self.points]


class NozzleContourMOC:
    """Nozzle contour generator (conical / bell / minimum-length MOC)."""

    def __init__(self, gamma: float = GAMMA_AIR):
        self.gamma = gamma

    def generate_contour(
        self,
        throat_radius_m: float,
        exit_mach: Optional[float] = None,
        nozzle_type: Literal["min_length", "rao", "conical", "bell"] = "bell",
        expansion_ratio: Optional[float] = None,
        n_characteristics: int = 30,
        cone_half_angle_deg: float = 15.0,
    ) -> NozzleContour:
        if exit_mach is None and expansion_ratio is None:
            raise ValueError("Provide either exit_mach or expansion_ratio")
        if exit_mach is None:
            exit_mach = IsentropicRelations.mach_from_area_ratio(
                expansion_ratio, supersonic=True, gamma=self.gamma  # type: ignore[arg-type]
            )
        if expansion_ratio is None:
            expansion_ratio = IsentropicRelations.area_mach_ratio(exit_mach, self.gamma)

        exit_radius = throat_radius_m * math.sqrt(expansion_ratio)

        if nozzle_type == "conical":
            return self._conical(
                throat_radius_m, exit_radius, expansion_ratio, exit_mach, cone_half_angle_deg
            )
        if nozzle_type in ("bell", "rao"):
            return self._bell(throat_radius_m, exit_radius, expansion_ratio, exit_mach)
        if nozzle_type == "min_length":
            return self._min_length_moc(
                throat_radius_m, exit_mach, expansion_ratio, n_characteristics
            )
        raise ValueError(f"Unknown nozzle_type: {nozzle_type}")

    # ------------------------------------------------------------------ #
    def _conical(self, rt, re, eps, me, half_angle_deg) -> NozzleContour:
        length = (re - rt) / math.tan(math.radians(half_angle_deg))
        n = 40
        xs = np.linspace(0.0, length, n)
        rs = rt + (re - rt) * xs / length
        return NozzleContour(
            points=list(zip(xs.tolist(), rs.tolist())),
            throat_radius_m=rt,
            exit_radius_m=re,
            length_m=length,
            expansion_ratio=eps,
            exit_mach=me,
            nozzle_type="conical",
            initial_wall_angle_deg=half_angle_deg,
        )

    def _bell(self, rt, re, eps, me) -> NozzleContour:
        """Rao parabolic-bell approximation (80% length of a 15-deg cone)."""
        # Reference conical length, then 80% bell.
        cone_len = (re - rt) / math.tan(math.radians(15.0))
        length = 0.8 * cone_len

        # Initial (theta_n) and exit (theta_e) wall angles: standard fits vs.
        # expansion ratio for an 80% bell (Sutton & Biblarz, fig. data fit).
        theta_n = math.radians(float(np.interp(eps, [4, 10, 20, 50], [22, 27, 30, 33])))
        theta_e = math.radians(float(np.interp(eps, [4, 10, 20, 50], [14, 11, 9, 7])))

        # Throat arc: 0.382*rt circular arc from -90deg up to (theta_n - 90deg).
        arc_r = 0.382 * rt
        pts: List[Tuple[float, float]] = []
        for a in np.linspace(-math.pi / 2, theta_n - math.pi / 2, 12):
            pts.append((arc_r * math.cos(a), rt + arc_r + arc_r * math.sin(a)))
        n_x, n_y = pts[-1]

        # Parabola from (n_x, n_y) tangent at theta_n to exit (length, re) tangent theta_e.
        ex, ey = length, re
        # Solve quadratic Bezier control point from the two tangents.
        m1, m2 = math.tan(theta_n), math.tan(theta_e)
        # Intersection of the two tangent lines -> Bezier control point.
        cx = ((ey - n_y) - (m2 * ex - m1 * n_x)) / (m1 - m2)
        cy = n_y + m1 * (cx - n_x)
        for t in np.linspace(0, 1, 30)[1:]:  # skip t=0 (== arc end) to avoid a duplicate seam
            bx = (1 - t) ** 2 * n_x + 2 * (1 - t) * t * cx + t**2 * ex
            by = (1 - t) ** 2 * n_y + 2 * (1 - t) * t * cy + t**2 * ey
            pts.append((bx, by))

        return NozzleContour(
            points=pts,
            throat_radius_m=rt,
            exit_radius_m=re,
            length_m=length,
            expansion_ratio=eps,
            exit_mach=me,
            nozzle_type="bell",
            initial_wall_angle_deg=math.degrees(theta_n),
            metadata={"theta_e_deg": math.degrees(theta_e)},
        )

    def _min_length_moc(self, rt, me, eps, n) -> NozzleContour:
        """Minimum-length nozzle contour anchored to the MOC result.

        The defining MOC property of a minimum-length nozzle is that the maximum
        wall (expansion) angle equals half the Prandtl-Meyer angle for the exit
        Mach number, ``theta_max = nu(Me)/2``. The wall turns from ``theta_max``
        at the sharp throat back to 0 at the exit, where the area ratio matches
        the isentropic value for ``Me``. The result is shorter than the
        equivalent cone, the hallmark of the minimum-length family.
        """
        g = self.gamma
        nu_e = PrandtlMeyer.nu_deg(me, g)
        theta_max = math.radians(nu_e / 2.0)
        re = rt * math.sqrt(eps)

        # Minimum-length wall: divergence concentrated near the throat at
        # theta_max, decaying to 0 at the exit. Characteristic length scale uses
        # the MOC maximum angle (hence shorter than a 15-deg cone when Me is high).
        length = (re - rt) / math.tan(theta_max)

        # Quadratic Bezier from throat (tangent theta_max) to exit (tangent 0).
        n_pts = max(20, int(n))
        nx, ny = 0.0, rt
        ex, ey = length, re
        m1 = math.tan(theta_max)  # initial slope
        # exit tangent horizontal (slope 0) -> control point sits at exit height.
        cx = nx + (ey - ny) / m1
        cy = ey
        pts: List[Tuple[float, float]] = []
        for t in np.linspace(0.0, 1.0, n_pts):
            bx = (1 - t) ** 2 * nx + 2 * (1 - t) * t * cx + t**2 * ex
            by = (1 - t) ** 2 * ny + 2 * (1 - t) * t * cy + t**2 * ey
            pts.append((float(bx), float(by)))

        return NozzleContour(
            points=pts,
            throat_radius_m=rt,
            exit_radius_m=re,
            length_m=length,
            expansion_ratio=eps,
            exit_mach=me,
            nozzle_type="min_length",
            initial_wall_angle_deg=math.degrees(theta_max),
            metadata={"nu_exit_deg": nu_e, "method": "MOC-anchored (theta_max = nu_e/2)"},
        )
