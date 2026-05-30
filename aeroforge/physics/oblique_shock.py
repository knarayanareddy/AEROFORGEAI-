"""Oblique-shock relations for supersonic / hypersonic inlet design.

Implements the theta-beta-Mach (theta-beta-M) relation and the multi-shock total
pressure recovery used to size and validate compression inlets.

Reference: Anderson, *Modern Compressible Flow*, 3rd ed., Ch. 4;
NASA TN D-4112 (multi-ramp external-compression inlets).
"""

from __future__ import annotations

import math
from typing import List

from scipy.optimize import brentq, minimize_scalar

from ..exceptions import PhysicsConstraintError
from .normal_shock import NormalShockRelations

GAMMA_AIR = 1.4


class ObliqueShockRelations:
    """Analytical oblique-shock relations (all angles in degrees)."""

    # ------------------------------------------------------------------ #
    # Core theta-beta-M relation
    # ------------------------------------------------------------------ #
    @staticmethod
    def deflection_from_shock_angle(
        mach: float, beta_deg: float, gamma: float = GAMMA_AIR
    ) -> float:
        """Flow deflection theta (deg) produced by a shock at wave angle beta."""
        beta = math.radians(beta_deg)
        m2 = mach * mach
        num = m2 * math.sin(beta) ** 2 - 1.0
        den = m2 * (gamma + math.cos(2.0 * beta)) + 2.0
        tan_theta = 2.0 / math.tan(beta) * (num / den)
        return math.degrees(math.atan(tan_theta))

    @staticmethod
    def max_deflection_angle(mach: float, gamma: float = GAMMA_AIR) -> float:
        """Maximum flow deflection (deg) for an attached shock at this Mach.

        Beyond this the shock detaches (becomes a bow shock).
        """
        if mach <= 1.0:
            raise PhysicsConstraintError(f"Oblique shock requires M > 1 (got {mach})")
        mu = math.degrees(math.asin(1.0 / mach))  # Mach angle (theta = 0 here)
        res = minimize_scalar(
            lambda b: -ObliqueShockRelations.deflection_from_shock_angle(mach, b, gamma),
            bounds=(mu + 1e-4, 89.999),
            method="bounded",
            options={"xatol": 1e-6},
        )
        return float(-res.fun)

    @staticmethod
    def shock_angle_from_deflection(
        mach: float,
        deflection_deg: float,
        weak_shock: bool = True,
        gamma: float = GAMMA_AIR,
    ) -> float:
        """Solve the theta-beta-M relation for the shock-wave angle beta (deg).

        Args:
            mach: upstream Mach number (> 1).
            deflection_deg: flow deflection (ramp) angle theta.
            weak_shock: return the weak (smaller beta) solution if True, else strong.

        Raises:
            PhysicsConstraintError: if no attached-shock solution exists.
        """
        if mach <= 1.0:
            raise PhysicsConstraintError(f"Oblique shock requires M > 1 (got {mach})")
        if deflection_deg <= 0.0:
            return math.degrees(math.asin(1.0 / mach))  # Mach wave

        theta_max = ObliqueShockRelations.max_deflection_angle(mach, gamma)
        if deflection_deg > theta_max + 1e-6:
            raise PhysicsConstraintError(
                f"Deflection {deflection_deg:.2f} deg exceeds max {theta_max:.2f} deg "
                f"at M={mach:.2f}; shock would detach."
            )

        mu = math.degrees(math.asin(1.0 / mach))
        beta_at_max = minimize_scalar(
            lambda b: -ObliqueShockRelations.deflection_from_shock_angle(mach, b, gamma),
            bounds=(mu + 1e-4, 89.999),
            method="bounded",
            options={"xatol": 1e-6},
        ).x

        def f(b: float) -> float:
            return (
                ObliqueShockRelations.deflection_from_shock_angle(mach, b, gamma) - deflection_deg
            )

        if weak_shock:
            return float(brentq(f, mu + 1e-6, beta_at_max, xtol=1e-8))
        return float(brentq(f, beta_at_max, 89.9999, xtol=1e-8))

    # ------------------------------------------------------------------ #
    # Downstream state
    # ------------------------------------------------------------------ #
    @staticmethod
    def downstream_mach(
        mach: float, deflection_deg: float, weak_shock: bool = True, gamma: float = GAMMA_AIR
    ) -> float:
        """Mach number downstream of an oblique shock turning the flow by theta."""
        beta = ObliqueShockRelations.shock_angle_from_deflection(
            mach, deflection_deg, weak_shock, gamma
        )
        mn1 = mach * math.sin(math.radians(beta))
        mn2 = NormalShockRelations.mach_downstream(mn1, gamma)
        return mn2 / math.sin(math.radians(beta - deflection_deg))

    @staticmethod
    def total_pressure_ratio_single(
        mach: float, deflection_deg: float, gamma: float = GAMMA_AIR
    ) -> float:
        """Stagnation-pressure recovery across one weak oblique shock."""
        beta = ObliqueShockRelations.shock_angle_from_deflection(mach, deflection_deg, True, gamma)
        mn1 = mach * math.sin(math.radians(beta))
        return NormalShockRelations.total_pressure_ratio(mn1, gamma)

    # ------------------------------------------------------------------ #
    # Multi-shock inlet performance
    # ------------------------------------------------------------------ #
    @staticmethod
    def total_pressure_recovery(
        mach: float,
        ramp_angles_deg: List[float],
        terminal_normal_shock: bool = True,
        gamma: float = GAMMA_AIR,
    ) -> float:
        """Total pressure recovery of a system of oblique shocks.

        Each ramp turns the flow by its deflection angle (a weak oblique shock);
        the running Mach number is reduced after each. A terminal normal shock at
        the throat is included by default (typical external-compression inlet).

        Returns p0_exit / p0_freestream in (0, 1].
        """
        recovery = 1.0
        m = mach
        for theta in ramp_angles_deg:
            beta = ObliqueShockRelations.shock_angle_from_deflection(m, theta, True, gamma)
            mn1 = m * math.sin(math.radians(beta))
            recovery *= NormalShockRelations.total_pressure_ratio(mn1, gamma)
            m = ObliqueShockRelations.downstream_mach(m, theta, True, gamma)
        if terminal_normal_shock and m > 1.0:
            recovery *= NormalShockRelations.total_pressure_ratio(m, gamma)
        return recovery

    @staticmethod
    def optimal_ramp_angles_for_recovery(
        mach: float,
        n_ramps: int,
        target_recovery: float | None = None,
        gamma: float = GAMMA_AIR,
    ) -> List[float]:
        """Compute ramp angles that maximise total pressure recovery.

        Uses a coordinate-ascent search (a practical realisation of the
        Oswatitsch equal-strength-shock criterion, which states that recovery is
        maximised when all shocks — including the terminal normal shock — are of
        equal strength). Returns ``n_ramps`` deflection angles in degrees.

        If ``target_recovery`` is given and unreachable, a
        :class:`PhysicsConstraintError` is raised.
        """
        if n_ramps < 1:
            raise ValueError("n_ramps must be >= 1")

        # Initial guess: gently increasing ramp angles.
        theta_max0 = ObliqueShockRelations.max_deflection_angle(mach, gamma)
        base = min(theta_max0 * 0.4, 10.0)
        angles = [base * (1.0 + 0.25 * i) for i in range(n_ramps)]

        def recovery(a: List[float]) -> float:
            try:
                return ObliqueShockRelations.total_pressure_recovery(mach, a, True, gamma)
            except PhysicsConstraintError:
                return -1.0

        # Coordinate ascent with shrinking step — robust and dependency-light.
        step = 2.0
        for _ in range(60):
            improved = False
            for i in range(n_ramps):
                for delta in (step, -step):
                    trial = list(angles)
                    trial[i] = max(1.0, trial[i] + delta)
                    if recovery(trial) > recovery(angles):
                        angles = trial
                        improved = True
            if not improved:
                step *= 0.5
                if step < 1e-3:
                    break

        best = recovery(angles)
        if target_recovery is not None and best + 1e-6 < target_recovery:
            raise PhysicsConstraintError(
                f"Max achievable recovery {best:.3f} < target {target_recovery:.3f} "
                f"with {n_ramps} ramp(s) at M={mach:.2f}. Add ramps or relax target."
            )
        return [round(a, 3) for a in angles]

    @staticmethod
    def mass_capture_ratio(mach: float, mach_design: float) -> float:
        """First-order mass-capture ratio for an external-compression inlet.

        At/above the design Mach the system shock sits on the cowl lip (MCR ~ 1).
        Below design, the shock stands ahead of the lip and spillage reduces
        capture. This is a documented first-order estimate, not a CFD result.
        """
        if mach >= mach_design:
            return 1.0
        return max(0.0, (mach / mach_design) ** 2)
