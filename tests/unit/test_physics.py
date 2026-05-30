"""Physics validated against textbook / NASA reference values.

References: Anderson, *Modern Compressible Flow* (compressible-flow tables).
"""

from __future__ import annotations

import math

import pytest

from aeroforge.exceptions import PhysicsConstraintError
from aeroforge.physics.isentropic import IsentropicRelations as ISA
from aeroforge.physics.normal_shock import NormalShockRelations as NS
from aeroforge.physics.nozzle_design import NozzleContourMOC
from aeroforge.physics.oblique_shock import ObliqueShockRelations as OS
from aeroforge.physics.prandtl_meyer import PrandtlMeyer as PM


class TestIsentropic:
    def test_area_mach_ratio_M2(self):
        assert ISA.area_mach_ratio(2.0) == pytest.approx(1.6875, rel=1e-4)

    def test_stagnation_pressure_ratio_M2(self):
        assert ISA.stagnation_pressure_ratio(2.0) == pytest.approx(7.8244, rel=1e-4)

    def test_stagnation_temperature_ratio_M2(self):
        assert ISA.stagnation_temperature_ratio(2.0) == pytest.approx(1.8, rel=1e-6)

    def test_area_ratio_unity_at_M1(self):
        assert ISA.area_mach_ratio(1.0) == pytest.approx(1.0, abs=1e-6)

    def test_mach_from_area_ratio_roundtrip(self):
        assert ISA.mach_from_area_ratio(1.6875, supersonic=True) == pytest.approx(2.0, rel=1e-4)
        assert ISA.mach_from_area_ratio(1.6875, supersonic=False) < 1.0


class TestNormalShock:
    def test_downstream_mach_M2(self):
        assert NS.mach_downstream(2.0) == pytest.approx(0.57735, rel=1e-4)

    def test_pressure_ratio_M2(self):
        assert NS.static_pressure_ratio(2.0) == pytest.approx(4.5, rel=1e-6)

    def test_total_pressure_ratio_M2(self):
        assert NS.total_pressure_ratio(2.0) == pytest.approx(0.72087, rel=1e-4)

    def test_no_loss_at_M1(self):
        assert NS.total_pressure_ratio(1.0) == pytest.approx(1.0, abs=1e-9)


class TestObliqueShock:
    def test_weak_shock_angle_M2_theta10(self):
        beta = OS.shock_angle_from_deflection(2.0, 10.0, weak_shock=True)
        assert beta == pytest.approx(39.314, abs=0.05)

    def test_strong_shock_angle_M2_theta10(self):
        beta = OS.shock_angle_from_deflection(2.0, 10.0, weak_shock=False)
        assert 80.0 < beta < 86.0

    def test_max_deflection_M2(self):
        assert OS.max_deflection_angle(2.0) == pytest.approx(22.97, abs=0.1)

    def test_detached_shock_raises(self):
        with pytest.raises(PhysicsConstraintError):
            OS.shock_angle_from_deflection(2.0, 30.0)  # exceeds theta_max

    def test_multi_shock_beats_single_normal(self):
        rec_multi = OS.total_pressure_recovery(2.5, [8.0, 14.0])
        rec_normal = NS.total_pressure_ratio(2.5)
        assert rec_multi > rec_normal

    def test_optimal_ramps_attached_and_ordered_recovery(self):
        angles = OS.optimal_ramp_angles_for_recovery(3.0, n_ramps=2)
        assert len(angles) == 2
        rec = OS.total_pressure_recovery(3.0, angles)
        assert 0.0 < rec <= 1.0
        # optimal should beat an arbitrary small-angle split
        assert rec >= OS.total_pressure_recovery(3.0, [3.0, 3.0])


class TestPrandtlMeyer:
    def test_nu_M2(self):
        assert PM.nu_deg(2.0) == pytest.approx(26.3798, abs=0.01)

    def test_nu_M3(self):
        assert PM.nu_deg(3.0) == pytest.approx(49.7573, abs=0.01)

    def test_inverse_roundtrip(self):
        assert PM.mach_from_nu(PM.nu_deg(2.5)) == pytest.approx(2.5, rel=1e-4)


class TestNozzleContours:
    @pytest.mark.parametrize("ntype", ["conical", "bell", "min_length"])
    def test_exit_radius_matches_area_ratio(self, ntype):
        c = NozzleContourMOC().generate_contour(0.05, exit_mach=2.5, nozzle_type=ntype)
        expected_re = 0.05 * math.sqrt(ISA.area_mach_ratio(2.5))
        assert c.exit_radius_m == pytest.approx(expected_re, rel=1e-3)

    @pytest.mark.parametrize("ntype", ["conical", "bell", "min_length"])
    def test_radius_monotonic(self, ntype):
        c = NozzleContourMOC().generate_contour(0.05, exit_mach=3.0, nozzle_type=ntype)
        rs = c.r
        assert all(rs[i + 1] >= rs[i] - 1e-9 for i in range(len(rs) - 1))

    def test_min_length_shorter_than_conical(self):
        moc = NozzleContourMOC()
        conical = moc.generate_contour(0.05, exit_mach=3.5, nozzle_type="conical")
        ml = moc.generate_contour(0.05, exit_mach=3.5, nozzle_type="min_length")
        assert ml.length_m < conical.length_m

    def test_min_length_initial_angle_is_half_nu(self):
        c = NozzleContourMOC().generate_contour(0.05, exit_mach=2.8, nozzle_type="min_length")
        assert c.initial_wall_angle_deg == pytest.approx(PM.nu_deg(2.8) / 2.0, rel=1e-3)
