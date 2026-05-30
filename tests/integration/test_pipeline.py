"""End-to-end pipeline integration tests (require the CadQuery kernel)."""

from __future__ import annotations

import os

import pytest

from tests.conftest import cad_required

pytestmark = [pytest.mark.integration, cad_required]


def _run(forge, prompt, out_dir):
    return forge.design(prompt, out_dir=out_dir)


def test_airfoil_end_to_end(forge, tmp_path):
    pkg = _run(forge, "Design a NACA 2412 airfoil at 2 m chord, 5 m span", tmp_path / "naca")
    assert pkg.intent.geometry_type == "naca_airfoil"
    assert "step" in pkg.artifacts and os.path.getsize(pkg.artifacts["step"]) > 0
    assert pkg.metrics.watertight
    assert pkg.validation.passed
    assert os.path.exists(pkg.report_path)
    assert os.path.exists(pkg.cep_manifest_path)


def test_nozzle_end_to_end(forge, tmp_path):
    pkg = _run(forge, "Rao bell nozzle, throat radius 0.05 m, exit Mach 3.0", tmp_path / "noz")
    assert pkg.intent.geometry_type == "cd_nozzle"
    assert pkg.metrics.volume_m3 and pkg.metrics.volume_m3 > 0
    assert pkg.augmented.physics["expansion_ratio"] > 1.0
    for fmt in ("step", "stl", "brep"):
        assert fmt in pkg.artifacts


def test_inlet_end_to_end(forge, tmp_path):
    pkg = _run(forge, "2-ramp supersonic inlet for Mach 2.5, recovery > 0.85", tmp_path / "inlet")
    assert pkg.intent.geometry_type == "supersonic_inlet"
    assert "total_pressure_recovery" in pkg.augmented.physics
    assert pkg.validation.confidence.overall > 0.5


def test_cep_manifest_well_formed(forge, tmp_path):
    import json

    pkg = _run(forge, "ogive nose cone, base radius 0.15 m, length 0.9 m", tmp_path / "ogive")
    manifest = json.loads(open(pkg.cep_manifest_path).read())
    assert manifest["cep_version"] == "1.0"
    assert manifest["geometry"]["primary_file"].endswith(".step")
    assert "cfd_hints" in manifest and "recommended_solver" in manifest["cfd_hints"]
