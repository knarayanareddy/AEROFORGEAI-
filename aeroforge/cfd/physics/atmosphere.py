"""International Standard Atmosphere (ISA) and flow-condition setup.

Computes ambient temperature, pressure, and density at altitude (0–32 km, the
range covering airbreathing-propulsion design points), then assembles the
:class:`FlowConditions` (velocity, Reynolds number, fluid properties) the CFD
pipeline needs. Self-contained.
"""

from __future__ import annotations

import math

from ..types import FlowConditions, FlowRegime, FluidProperties
from .thermophysical.ideal_gas import IdealGas

_G0 = 9.80665  # m/s^2
_R = 287.05  # J/(kg.K)

# ISA layers: (base altitude m, base temp K, lapse rate K/m, base pressure Pa)
_LAYERS = [
    (0.0, 288.15, -0.0065, 101325.0),
    (11000.0, 216.65, 0.0, 22632.06),
    (20000.0, 216.65, 0.001, 5474.89),
    (32000.0, 228.65, 0.0028, 868.02),
]


def isa(altitude_m: float) -> tuple[float, float, float]:
    """Return (temperature_K, pressure_pa, density) at the given altitude."""
    altitude_m = max(0.0, min(altitude_m, 47000.0))
    t, p = 288.15, 101325.0
    for i, (h_b, t_b, lapse, p_b) in enumerate(_LAYERS):
        h_top = _LAYERS[i + 1][0] if i + 1 < len(_LAYERS) else 47000.0
        if altitude_m <= h_top:
            dh = altitude_m - h_b
            if abs(lapse) < 1e-12:
                t = t_b
                p = p_b * math.exp(-_G0 * dh / (_R * t_b))
            else:
                t = t_b + lapse * dh
                p = p_b * (t / t_b) ** (-_G0 / (_R * lapse))
            break
    rho = p / (_R * t)
    return t, p, rho


def build_flow_conditions(
    mach: float,
    characteristic_length_m: float,
    altitude_m: float = 0.0,
    fluid_name: str = "air",
) -> FlowConditions:
    """Build complete free-stream flow conditions from Mach + altitude."""
    gas = IdealGas(name=fluid_name)
    t, p, rho = isa(altitude_m)
    mu = gas.sutherland_viscosity(t)
    a = gas.speed_of_sound(t)
    velocity = mach * a
    nu = mu / rho
    re = velocity * characteristic_length_m / nu if nu > 0 else 0.0

    fluid = FluidProperties(
        name=fluid_name,
        density=rho,
        dynamic_viscosity=mu,
        temperature_K=t,
        pressure_pa=p,
        gamma=gas.gamma,
        R=gas.R,
    )
    return FlowConditions(
        mach=mach,
        regime=FlowRegime.from_mach(mach),
        velocity_ms=velocity,
        temperature_K=t,
        pressure_pa=p,
        density=rho,
        reynolds_number=re,
        characteristic_length_m=characteristic_length_m,
        fluid=fluid,
    )
