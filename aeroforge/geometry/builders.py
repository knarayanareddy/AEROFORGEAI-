"""Geometry builders: physics-derived parameters -> CadQuery script strings.

Each builder computes its geometry analytically (airfoil coordinates, nozzle
contour, ramp wedge, ogive profile), embeds the point data as literals, and
returns a self-contained CadQuery script that defines ``result``. The script is
what the Execution Agent runs in the sandbox — so generation stays deterministic
and fully traceable while execution stays isolated.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

from ..physics.nozzle_design import NozzleContourMOC
from .airfoil import max_thickness_fraction, naca4_coordinates
from .nose_cone import nose_cone_profile


@dataclass
class BuildSpec:
    """A generated geometry build: the script plus its derived metadata."""

    script: str
    result_var: str = "result"
    components: List[str] = field(default_factory=list)
    derived: Dict[str, Any] = field(default_factory=dict)


def _dedupe(points: List[Tuple[float, float]], tol: float = 1e-9) -> List[Tuple[float, float]]:
    """Drop consecutive near-identical points (zero-length edges break OCC)."""
    out: List[Tuple[float, float]] = []
    for x, y in points:
        if not out or abs(out[-1][0] - x) > tol or abs(out[-1][1] - y) > tol:
            out.append((float(x), float(y)))
    return out


def _fmt_points(points: List[Tuple[float, float]], nd: int = 8) -> str:
    pts = _dedupe(points)
    return "[" + ", ".join(f"({round(x, nd)}, {round(y, nd)})" for x, y in pts) + "]"


# --------------------------------------------------------------------------- #
# NACA airfoil  (aerodynamic surface)
# --------------------------------------------------------------------------- #
def naca_airfoil(params: Dict[str, Any]) -> BuildSpec:
    code = str(params.get("naca_code", params.get("code", "2412")))
    chord = float(params.get("chord_m", params.get("chord", 1.0)))
    span = float(params.get("span_m", params.get("span", 1.0)))
    n_points = int(params.get("n_points", 120))

    coords = naca4_coordinates(code, chord=chord, n_points=n_points)
    loop = coords.closed_loop()

    script = (
        f"# NACA {code} airfoil — chord={chord} m, span={span} m\n"
        f"_pts = {_fmt_points(loop)}\n"
        f'result = cq.Workplane("XY").polyline(_pts).close().extrude({span})\n'
    )
    return BuildSpec(
        script=script,
        components=["airfoil_section", "spanwise_extrusion"],
        derived={
            "naca_code": code,
            "chord_m": chord,
            "span_m": span,
            "max_thickness_fraction": max_thickness_fraction(code),
            "planform_area_m2": chord * span,
        },
    )


# --------------------------------------------------------------------------- #
# Convergent-divergent / bell / conical nozzle  (propulsion)
# --------------------------------------------------------------------------- #
def cd_nozzle(params: Dict[str, Any]) -> BuildSpec:
    throat_r = float(params.get("throat_radius_m", 0.05))
    nozzle_type = str(params.get("nozzle_type", "bell"))
    wall_t = float(params.get("wall_thickness_m", max(0.002, 0.05 * throat_r)))
    exit_mach = params.get("exit_mach")
    expansion_ratio = params.get("expansion_ratio")
    if exit_mach is None and expansion_ratio is None:
        exit_mach = 2.5
    moc = NozzleContourMOC()
    contour = moc.generate_contour(
        throat_radius_m=throat_r,
        exit_mach=float(exit_mach) if exit_mach is not None else None,
        expansion_ratio=float(expansion_ratio) if expansion_ratio is not None else None,
        nozzle_type=nozzle_type,  # type: ignore[arg-type]
    )
    inner = contour.points
    x0, xL = inner[0][0], inner[-1][0]
    # Filled profiles down to the axis (y=0); revolving each gives a solid of
    # revolution. Cutting inner from outer yields a watertight wall tube — far
    # more robust in OpenCASCADE than revolving a thin closed band.
    inner_filled = [(x0, 0.0)] + list(inner) + [(xL, 0.0)]
    outer_filled = [(x0, 0.0)] + [(x, r + wall_t) for x, r in inner] + [(xL, 0.0)]

    script = (
        f"# {nozzle_type} C-D nozzle — throat r={throat_r} m, "
        f"Me={contour.exit_mach:.3f}, eps={contour.expansion_ratio:.3f}\n"
        f"_inner = {_fmt_points(inner_filled)}\n"
        f"_outer = {_fmt_points(outer_filled)}\n"
        f"_ax0, _ax1 = (0, 0, 0), (1, 0, 0)\n"
        f'_in = cq.Workplane("XY").polyline(_inner).close().revolve(360.0, _ax0, _ax1)\n'
        f'_out = cq.Workplane("XY").polyline(_outer).close().revolve(360.0, _ax0, _ax1)\n'
        f"result = _out.cut(_in)\n"
    )
    return BuildSpec(
        script=script,
        components=["nozzle_wall_solid_of_revolution"],
        derived={
            "nozzle_type": contour.nozzle_type,
            "throat_radius_m": throat_r,
            "exit_radius_m": round(contour.exit_radius_m, 6),
            "length_m": round(contour.length_m, 6),
            "expansion_ratio": round(contour.expansion_ratio, 4),
            "exit_mach": round(contour.exit_mach, 4),
            "initial_wall_angle_deg": round(contour.initial_wall_angle_deg, 3),
            "wall_thickness_m": wall_t,
        },
    )


# --------------------------------------------------------------------------- #
# Two-ramp external-compression supersonic inlet  (propulsion)
# --------------------------------------------------------------------------- #
def supersonic_inlet_2ramp(params: Dict[str, Any]) -> BuildSpec:
    a1 = float(params.get("ramp1_angle_deg", 8.0))
    a2 = float(params.get("ramp2_angle_deg", 14.0))
    l1 = float(params.get("ramp1_length_m", 0.30))
    l2 = float(params.get("ramp2_length_m", 0.20))
    width = float(params.get("width_m", 0.25))

    p0 = (0.0, 0.0)
    p1 = (l1 * math.cos(math.radians(a1)), l1 * math.sin(math.radians(a1)))
    p2 = (p1[0] + l2 * math.cos(math.radians(a2)), p1[1] + l2 * math.sin(math.radians(a2)))
    # close the wedge down to the baseline to make a watertight prism
    pts = [p0, p1, p2, (p2[0], 0.0)]

    script = (
        f"# 2-ramp external-compression inlet — ramp1={a1} deg, ramp2={a2} deg, "
        f"width={width} m\n"
        f"_pts = {_fmt_points(pts)}\n"
        f'result = cq.Workplane("XY").polyline(_pts).close().extrude({width})\n'
    )
    return BuildSpec(
        script=script,
        components=["ramp_body", "compression_surface", "sidewall_extrusion"],
        derived={
            "ramp1_angle_deg": a1,
            "ramp2_angle_deg": a2,
            "ramp1_length_m": l1,
            "ramp2_length_m": l2,
            "width_m": width,
            "total_turn_deg": a1 + a2,
            "ramp_tip_height_m": round(p2[1], 6),
        },
    )


# --------------------------------------------------------------------------- #
# Ogive / nose cone  (aerodynamic surface)
# --------------------------------------------------------------------------- #
def ogive_nose_cone(params: Dict[str, Any]) -> BuildSpec:
    shape = str(params.get("shape", "ogive"))
    base_r = float(params.get("base_radius_m", 0.15))
    length = float(params.get("length_m", 0.9))
    n = int(params.get("n_points", 60))

    profile = nose_cone_profile(shape, base_r, length, n=n)  # tip(0,0)->base(L,R)
    # close along the axis: ... -> (L, R) -> (L, 0) -> back to tip (0,0)
    loop = list(profile) + [(length, 0.0)]

    script = (
        f"# {shape} nose cone — base r={base_r} m, length={length} m\n"
        f"_profile = {_fmt_points(loop)}\n"
        f'result = (cq.Workplane("XY").polyline(_profile).close()\n'
        f"          .revolve(360.0, (0, 0, 0), (1, 0, 0)))\n"
    )
    fineness = length / (2.0 * base_r)
    return BuildSpec(
        script=script,
        components=["nose_cone_solid_of_revolution"],
        derived={
            "shape": shape,
            "base_radius_m": base_r,
            "length_m": length,
            "fineness_ratio": round(fineness, 4),
        },
    )


#: Registry mapping geometry_type -> builder function.
BUILDERS = {
    "naca_airfoil": naca_airfoil,
    "airfoil": naca_airfoil,
    "cd_nozzle": cd_nozzle,
    "nozzle": cd_nozzle,
    "convergent_divergent_nozzle": cd_nozzle,
    "supersonic_inlet": supersonic_inlet_2ramp,
    "supersonic_2ramp_inlet": supersonic_inlet_2ramp,
    "scramjet_inlet": supersonic_inlet_2ramp,
    "ogive": ogive_nose_cone,
    "nose_cone": ogive_nose_cone,
}
