"""Unit tests for the CFD physics configuration engine (no solver/kernel needed)."""

from __future__ import annotations

import pytest

from aeroforge.cfd.meshing.yplus_estimator import YPlusEstimator
from aeroforge.cfd.physics import (
    BoundaryConditionGenerator,
    SchemeConfigurator,
    SolverSelector,
    TurbulenceAdvisor,
    build_flow_conditions,
    isa,
)
from aeroforge.cfd.physics.solver_selector import SolverChoice
from aeroforge.cfd.types import BoundaryPatch, FlowRegime, PatchType


class TestAtmosphere:
    def test_sea_level(self):
        t, p, rho = isa(0.0)
        assert t == pytest.approx(288.15, abs=0.1)
        assert p == pytest.approx(101325, rel=1e-3)
        assert rho == pytest.approx(1.225, rel=1e-2)

    def test_tropopause_11km(self):
        t, p, _ = isa(11000.0)
        assert t == pytest.approx(216.65, abs=0.2)
        assert p == pytest.approx(22632, rel=2e-2)

    def test_flow_conditions_mach2(self):
        f = build_flow_conditions(mach=2.0, characteristic_length_m=1.0, altitude_m=0.0)
        assert f.velocity_ms == pytest.approx(2.0 * f.fluid.speed_of_sound, rel=1e-6)
        assert f.regime == FlowRegime.SUPERSONIC
        assert f.reynolds_number > 0


class TestSolverSelection:
    def test_hypersonic(self):
        assert SolverSelector().select(FlowRegime.HYPERSONIC).solver == "rhoCentralFoam"

    def test_incompressible_steady(self):
        assert (
            SolverSelector().select(FlowRegime.INCOMPRESSIBLE, steady=True).solver == "simpleFoam"
        )

    def test_supersonic_steady_is_compressible(self):
        c = SolverSelector().select(FlowRegime.SUPERSONIC, steady=True)
        assert c.is_compressible and c.solver == "rhoSimpleFoam"

    def test_reacting(self):
        assert (
            SolverSelector().select(FlowRegime.SUPERSONIC, reacting=True).solver == "reactingFoam"
        )


class TestTurbulence:
    def test_inlet_uses_sst_low_re(self):
        c = TurbulenceAdvisor().advise(FlowRegime.SUPERSONIC, "supersonic_inlet")
        assert c.model == "kOmegaSST" and c.wall_treatment == "low_Re" and c.target_yplus == 1.0

    def test_low_re_laminar_cutoff(self):
        c = TurbulenceAdvisor().advise(FlowRegime.SUBSONIC, "airfoil", reynolds_number=1e4)
        assert c.model == "laminar"


class TestYPlus:
    def test_first_layer_positive_and_small(self):
        f = build_flow_conditions(mach=0.5, characteristic_length_m=1.0, altitude_m=0.0)
        bl = YPlusEstimator().compute_first_layer_height(1.0, f.velocity_ms, 1.0, f.fluid, 0.5)
        assert 0 < bl.first_layer_height_m < 1e-3
        assert 1.0 < bl.growth_ratio <= 1.3
        assert bl.n_layers >= 1

    def test_higher_yplus_gives_taller_first_cell(self):
        f = build_flow_conditions(mach=0.5, characteristic_length_m=1.0)
        est = YPlusEstimator()
        a = est.compute_first_layer_height(1.0, f.velocity_ms, 1.0, f.fluid, 0.5)
        b = est.compute_first_layer_height(30.0, f.velocity_ms, 1.0, f.fluid, 0.5)
        assert b.first_layer_height_m > a.first_layer_height_m


class TestBCAndSchemes:
    def _patches(self):
        return [
            BoundaryPatch("inlet", PatchType.INLET, "patch"),
            BoundaryPatch("outlet", PatchType.OUTLET, "patch"),
            BoundaryPatch("walls", PatchType.WALL, "wall"),
        ]

    def test_compressible_bc_fields(self):
        f = build_flow_conditions(mach=2.5, characteristic_length_m=0.5, altitude_m=15000)
        sel = SolverSelector().select(f.regime)
        turb = TurbulenceAdvisor().advise(f.regime, "supersonic_inlet")
        fields = BoundaryConditionGenerator().generate(self._patches(), f, turb, sel)
        assert {"U", "p", "T", "k", "omega", "nut"} <= set(fields)
        assert "noSlip" in fields["U"]  # wall BC present

    def test_schemes_compressible_uses_minmod(self):
        sel = SolverChoice("rhoCentralFoam", True, True, "")
        assert "Minmod" in SchemeConfigurator().generate(sel)
