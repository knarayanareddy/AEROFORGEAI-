"""Calorically perfect ideal-gas model with Sutherland viscosity.

Used to populate fluid properties for incompressible-to-hypersonic air flows.
Self-contained (no Phase 1 imports).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Sutherland's law constants for air.
_MU_REF = 1.716e-5  # Pa.s at T_REF
_T_REF = 273.15  # K
_S = 110.4  # K


@dataclass
class IdealGas:
    name: str = "air"
    gamma: float = 1.4
    R: float = 287.05  # J/(kg.K)

    def density(self, pressure_pa: float, temperature_K: float) -> float:
        return pressure_pa / (self.R * temperature_K)

    def speed_of_sound(self, temperature_K: float) -> float:
        return math.sqrt(self.gamma * self.R * temperature_K)

    def sutherland_viscosity(self, temperature_K: float) -> float:
        """Dynamic viscosity (Pa.s) via Sutherland's law."""
        t = temperature_K
        return _MU_REF * (t / _T_REF) ** 1.5 * (_T_REF + _S) / (t + _S)
