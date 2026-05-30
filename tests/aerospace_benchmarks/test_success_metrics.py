"""Aerospace success-metric benchmarks from the design doc roadmap.

Phase 1.0: "Design a NACA 2412 airfoil ... -> STEP file".
Phase 1.1: "Design a 2-ramp supersonic inlet for Mach 2.5 -> STEP + report".
These assert the headline capabilities actually produce valid, exported geometry.
"""

from __future__ import annotations

import os
import time

import pytest

from tests.conftest import cad_required

pytestmark = [pytest.mark.integration, cad_required]


def test_phase_1_0_airfoil_success_metric(forge, tmp_path):
    start = time.time()
    pkg = forge.design("Design a NACA 2412 airfoil at 2 m chord, 5 m span", out_dir=tmp_path)
    elapsed = time.time() - start
    assert os.path.getsize(pkg.artifacts["step"]) > 0
    assert pkg.validation.passed
    assert elapsed < 60.0  # success metric: < 60 s


def test_phase_1_1_inlet_success_metric(forge, tmp_path):
    pkg = forge.design("Design a 2-ramp supersonic inlet for Mach 2.5", out_dir=tmp_path)
    assert os.path.getsize(pkg.artifacts["step"]) > 0
    assert os.path.exists(pkg.report_path)
    # recovery must be physically computed
    assert 0.0 < pkg.augmented.physics["total_pressure_recovery"] <= 1.0


def test_titanium_thermal_advisory_present_for_hypersonic(forge, tmp_path):
    pkg = forge.design("scramjet inlet for Mach 6, titanium", out_dir=tmp_path)
    # Ti at hypersonic stagnation should raise a thermal warning in validation.
    warnings = " ".join(pkg.validation.warnings).lower()
    assert "thermal" in warnings or pkg.validation.confidence.overall < 1.0
