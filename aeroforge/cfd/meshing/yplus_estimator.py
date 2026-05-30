"""y+ estimator & boundary-layer configuration.

Computes the first-cell wall height required to hit a target y+ before any mesh
is generated, using a flat-plate skin-friction correlation (Schlichting for
incompressible; a Van Driest-type compressibility correction for high speed),
then sizes the inflation-layer growth ratio and count to cover the boundary
layer. Pure analytics — unit-tested.

Reference: Schlichting, *Boundary-Layer Theory*; White, *Viscous Fluid Flow*.
"""

from __future__ import annotations

import math

from ..types import BoundaryLayerSpec, FluidProperties


class YPlusEstimator:
    """Computes inflation-layer parameters for a target y+."""

    def compute_first_layer_height(
        self,
        target_yplus: float,
        freestream_velocity_ms: float,
        characteristic_length_m: float,
        fluid: FluidProperties,
        mach: float = 0.0,
        max_layers: int = 40,
    ) -> BoundaryLayerSpec:
        nu = fluid.kinematic_viscosity
        re = freestream_velocity_ms * characteristic_length_m / nu if nu > 0 else 1.0
        re = max(re, 1e3)

        # Skin friction (flat-plate turbulent).
        cf = 0.026 / re ** (1.0 / 7.0)
        if mach >= 0.3:
            # Van Driest-type compressibility correction (reduces Cf).
            cf /= (1.0 + 0.144 * mach * mach) ** 0.65

        tau_w = 0.5 * fluid.density * freestream_velocity_ms**2 * cf
        u_tau = math.sqrt(max(tau_w, 1e-12) / fluid.density)
        delta_s = target_yplus * nu / u_tau

        delta_99 = 0.37 * characteristic_length_m / re**0.2
        total_target = 1.5 * delta_99

        growth_ratio, n_layers = self._layer_parameters(delta_s, total_target, max_layers)
        total_thickness = (
            delta_s * (growth_ratio**n_layers - 1) / (growth_ratio - 1)
            if growth_ratio > 1
            else delta_s * n_layers
        )
        return BoundaryLayerSpec(
            first_layer_height_m=delta_s,
            growth_ratio=round(growth_ratio, 4),
            n_layers=n_layers,
            total_thickness_m=total_thickness,
            target_yplus=target_yplus,
            estimated_actual_yplus=target_yplus * 0.95,
        )

    @staticmethod
    def _layer_parameters(first: float, total: float, max_layers: int) -> tuple[float, int]:
        """Pick growth ratio in [1.1, 1.3] and layer count to span `total`."""
        if first <= 0 or total <= first:
            return 1.2, 1
        for gr in (1.10, 1.15, 1.20, 1.25, 1.30):
            # n such that geometric sum >= total
            n = math.log(1 + total / first * (gr - 1)) / math.log(gr)
            n_int = int(math.ceil(n))
            if 1 <= n_int <= max_layers:
                return gr, n_int
        return 1.30, max_layers
