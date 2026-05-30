"""Stage 3: physics-constraint validation.

Re-derives the governing physics from the final parameters and checks that the
geometry is physically realisable: shocks remain attached, recovery meets target,
nozzle flow is supersonic and area-monotonic, and material thermal limits are
respected at the stagnation condition.
"""

from __future__ import annotations

from ..exceptions import PhysicsConstraintError
from ..physics.oblique_shock import ObliqueShockRelations
from ..types import FlowRegime, ValidationCheck, ValidationStageResult
from .base import ValidationContext

# Representative free-stream static temperature (K) for stagnation estimates when
# altitude data is absent (roughly the 11-25 km tropopause value).
_T_FREESTREAM_K = 220.0


class PhysicsValidator:
    """Stage 3 physics checks."""

    def validate(self, ctx: ValidationContext) -> ValidationStageResult:
        intent = ctx.augmented.intent
        physics = {**ctx.augmented.physics, **ctx.derived}
        gtype = (intent.geometry_type or "").lower()
        checks = []

        if "inlet" in gtype or "scramjet" in gtype:
            checks += self._inlet_checks(intent, physics)
        if "nozzle" in gtype:
            checks += self._nozzle_checks(physics)

        # Thermal limit at stagnation (applies to high-speed parts).
        checks += self._thermal_checks(intent)

        if not checks:
            checks.append(
                ValidationCheck(
                    name="physics_realisability",
                    passed=True,
                    detail="no flow-physics constraints applicable to this component",
                    severity="info",
                )
            )
        return ValidationStageResult(
            stage="physics",
            passed=all(c.passed for c in checks if c.severity == "error"),
            checks=checks,
        )

    def _inlet_checks(self, intent, physics):
        checks = []
        a1 = physics.get("ramp1_angle_deg")
        a2 = physics.get("ramp2_angle_deg")
        mach = intent.mach_design_point or physics.get("mach_design")

        if a1 is not None and a2 is not None:
            checks.append(
                ValidationCheck(
                    name="ramp_angle_ordering",
                    passed=a2 > a1,
                    detail=f"ramp2 ({a2} deg) must exceed ramp1 ({a1} deg)",
                )
            )

        if mach and a1 is not None and a2 is not None:
            # Check each shock stays attached at its local Mach number.
            attached = True
            detail = "shocks attached"
            try:
                m = float(mach)
                theta_max1 = ObliqueShockRelations.max_deflection_angle(m)
                if a1 > theta_max1:
                    attached = False
                    detail = f"ramp1 {a1} deg > max {theta_max1:.2f} deg at M={m:.2f} (detached)"
                else:
                    m2 = ObliqueShockRelations.downstream_mach(m, a1)
                    if m2 > 1.0:
                        theta_max2 = ObliqueShockRelations.max_deflection_angle(m2)
                        if a2 > theta_max2:
                            attached = False
                            detail = f"ramp2 {a2} deg > max {theta_max2:.2f} deg at M={m2:.2f}"
                    else:
                        attached = False
                        detail = "flow subsonic after ramp1 — shock structure invalid"
            except PhysicsConstraintError as exc:
                attached = False
                detail = str(exc)
            checks.append(ValidationCheck(name="shock_attachment", passed=attached, detail=detail))

            # Total pressure recovery vs. target / floor.
            try:
                rec = ObliqueShockRelations.total_pressure_recovery(float(mach), [a1, a2])
                target = 0.80
                t = intent.target("total_pressure_recovery")
                if t and t.value:
                    target = t.value
                checks.append(
                    ValidationCheck(
                        name="total_pressure_recovery",
                        passed=rec >= target - 1e-3,
                        value=rec,
                        detail=f"recovery {rec:.3f} vs target {target:.3f}",
                        severity="warning" if rec < target else "info",
                    )
                )
            except PhysicsConstraintError:
                pass
        return checks

    def _nozzle_checks(self, physics):
        checks = []
        me = physics.get("exit_mach")
        eps = physics.get("expansion_ratio")
        if me is not None:
            checks.append(
                ValidationCheck(
                    name="supersonic_exit",
                    passed=float(me) > 1.0,
                    value=float(me),
                    detail=f"exit Mach {float(me):.3f} must be > 1 for a C-D nozzle",
                )
            )
        if eps is not None:
            checks.append(
                ValidationCheck(
                    name="area_expansion",
                    passed=float(eps) > 1.0,
                    value=float(eps),
                    detail=f"expansion ratio {float(eps):.3f} must exceed 1",
                )
            )
        return checks

    def _thermal_checks(self, intent):
        checks = []
        mach = intent.mach_design_point
        limit = intent.thermal_limit_K
        if mach and limit:
            t0 = _T_FREESTREAM_K * (1.0 + 0.2 * mach * mach)  # gamma=1.4 stagnation temp
            checks.append(
                ValidationCheck(
                    name="thermal_limit",
                    passed=t0 <= limit,
                    value=t0,
                    detail=f"stagnation T0 ~ {t0:.0f} K vs material limit {limit:.0f} K",
                    severity="warning" if t0 > limit else "info",
                )
            )
        return checks
