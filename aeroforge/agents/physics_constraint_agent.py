"""Physics Constraint Agent.

Enriches a parsed intent with computed, physics-derived parameters BEFORE any
geometry is generated — the design doc's "physics-aware, not physics-dependent"
principle. For an inlet it computes optimal ramp angles and the resulting total
pressure recovery; for a nozzle it computes the area expansion ratio from the
exit Mach number; etc. Every computed value is recorded with a derivation string
for full traceability.
"""

from __future__ import annotations

from typing import Any, Dict, List

from ..physics.isentropic import IsentropicRelations
from ..physics.oblique_shock import ObliqueShockRelations
from ..physics.prandtl_meyer import PrandtlMeyer
from ..templates import TemplateLibrary, default_library
from ..types import PhysicsAugmentedIntent, StructuredDesignIntent


class PhysicsConstraintAgent:
    """Applies analytical aerospace physics to a design intent."""

    def __init__(self, templates: TemplateLibrary | None = None):
        self.templates = templates or default_library()

    def augment(self, intent: StructuredDesignIntent) -> PhysicsAugmentedIntent:
        physics: Dict[str, Any] = {}
        derivations: List[str] = []
        computations: List[str] = []
        warnings: List[str] = []

        gtype = (intent.geometry_type or "").lower()
        params = intent.parameters or {}

        if "inlet" in gtype or "scramjet" in gtype:
            self._inlet(intent, params, physics, derivations, computations, warnings)
        elif "nozzle" in gtype:
            self._nozzle(intent, params, physics, derivations, computations, warnings)
        else:
            # Aerodynamic surfaces: carry user params through; light physics.
            physics.update(params)
            if intent.mach_design_point and "chord_m" in params:
                derivations.append(
                    f"Flow regime classified as '{intent.flow_regime.value}' "
                    f"from design Mach {intent.mach_design_point}."
                )

        return PhysicsAugmentedIntent(
            intent=intent,
            physics=physics,
            derivations=derivations,
            physics_computations=computations,
            warnings=warnings,
        )

    # ------------------------------------------------------------------ #
    def _inlet(self, intent, params, physics, derivations, computations, warnings):
        physics.update(params)  # carry lengths/width through
        mach = intent.mach_design_point or params.get("mach_design")
        template = self.templates.find_for_geometry_type(intent.geometry_type)

        a1 = params.get("ramp1_angle_deg")
        a2 = params.get("ramp2_angle_deg")

        target = 0.80
        t = intent.target("total_pressure_recovery")
        if t and t.value:
            target = t.value

        if a1 is None or a2 is None:
            if mach is not None:
                try:
                    angles = ObliqueShockRelations.optimal_ramp_angles_for_recovery(
                        float(mach), n_ramps=2
                    )
                    a1, a2 = angles[0], angles[1]
                    computations.append("oblique_shock")
                    derivations.append(
                        f"Optimal 2-ramp angles ({a1:.2f} deg, {a2:.2f} deg) computed for "
                        f"M={mach} via equal-strength-shock (Oswatitsch) criterion."
                    )
                except Exception as exc:  # PhysicsConstraintError etc.
                    warnings.append(f"Ramp optimisation failed ({exc}); using template defaults.")
            if (a1 is None or a2 is None) and template:
                d = template.defaults()
                a1 = a1 or d.get("ramp1_angle_deg", 8.0)
                a2 = a2 or d.get("ramp2_angle_deg", 14.0)
                derivations.append("Ramp angles taken from validated template defaults.")

        physics["ramp1_angle_deg"] = a1
        physics["ramp2_angle_deg"] = a2

        if mach is not None and a1 is not None and a2 is not None:
            try:
                rec = ObliqueShockRelations.total_pressure_recovery(float(mach), [a1, a2])
                physics["total_pressure_recovery"] = round(rec, 4)
                computations.append("oblique_shock")
                derivations.append(
                    f"Total pressure recovery {rec:.3f} through 2 oblique shocks + "
                    f"terminal normal shock at M={mach}."
                )
                if rec < target:
                    warnings.append(
                        f"Recovery {rec:.3f} below target {target:.3f}; consider more ramps."
                    )
                mcr = ObliqueShockRelations.mass_capture_ratio(float(mach), float(mach))
                physics["mass_capture_ratio"] = round(mcr, 3)
            except Exception as exc:
                warnings.append(f"Recovery computation failed: {exc}")

    # ------------------------------------------------------------------ #
    def _nozzle(self, intent, params, physics, derivations, computations, warnings):
        physics.update(params)
        exit_mach = params.get("exit_mach")
        expansion_ratio = params.get("expansion_ratio")
        physics.setdefault("nozzle_type", params.get("nozzle_type", "bell"))

        if exit_mach is not None:
            eps = IsentropicRelations.area_mach_ratio(float(exit_mach))
            physics["expansion_ratio"] = round(eps, 4)
            computations.append("isentropic")
            derivations.append(
                f"Area expansion ratio Ae/At = {eps:.3f} from exit Mach {exit_mach} "
                f"(isentropic area-Mach relation)."
            )
            nu = PrandtlMeyer.nu_deg(float(exit_mach))
            physics["prandtl_meyer_nu_deg"] = round(nu, 3)
            if physics["nozzle_type"] == "min_length":
                physics["initial_wall_angle_deg"] = round(nu / 2.0, 3)
                computations.append("method_of_characteristics")
                derivations.append(
                    f"Minimum-length nozzle initial wall angle = nu(Me)/2 = {nu/2:.2f} deg."
                )
        elif expansion_ratio is not None:
            me = IsentropicRelations.mach_from_area_ratio(float(expansion_ratio), supersonic=True)
            physics["exit_mach"] = round(me, 4)
            computations.append("isentropic")
            derivations.append(
                f"Exit Mach {me:.3f} inferred from expansion ratio {expansion_ratio} "
                f"(isentropic area-Mach relation)."
            )
        else:
            physics["exit_mach"] = 2.5
            warnings.append("No exit Mach or expansion ratio given; defaulting Me=2.5.")
