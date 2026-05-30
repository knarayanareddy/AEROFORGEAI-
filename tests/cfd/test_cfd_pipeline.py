"""End-to-end Phase 1 → Phase 2 integration test (requires CadQuery + Gmsh)."""

from __future__ import annotations

import os

import pytest

from tests.conftest import cad_required


def _gmsh_available() -> bool:
    try:
        import gmsh  # noqa: F401

        return True
    except Exception:
        return False


pytestmark = [
    pytest.mark.integration,
    cad_required,
    pytest.mark.skipif(not _gmsh_available(), reason="gmsh not installed"),
]


def test_cad_to_cfd_external_flow(tmp_path):
    from aeroforge import AeroForge
    from aeroforge.cfd import AeroForgeCFD

    cad = AeroForge().design(
        "ogive nose cone, base radius 0.15 m, length 1.0 m", out_dir=tmp_path / "cad"
    )
    cep_dir = os.path.dirname(cad.cep_manifest_path)

    run = AeroForgeCFD().run(cep_dir, out_dir=tmp_path / "cfd")
    # Real mesh produced from the STEP.
    assert run.mesh.success and run.mesh.n_cells > 1000
    # Full OpenFOAM case assembled.
    assert "system/controlDict" in run.config.files
    assert {"0/U", "0/p"} <= set(run.config.files)
    assert os.path.isdir(run.case_dir)
    assert os.path.exists(run.report_path)
    # No solver here → honest "assembled but not solved" escalation.
    from aeroforge.cfd.types import LoopDecision

    assert run.decision.decision == LoopDecision.ESCALATE


def test_cfd_solver_config_matches_regime(tmp_path):
    from aeroforge import AeroForge
    from aeroforge.cfd import AeroForgeCFD

    cad = AeroForge().design(
        "2-ramp supersonic inlet for Mach 2.5, recovery > 0.85", out_dir=tmp_path / "cad"
    )
    run = AeroForgeCFD().run(os.path.dirname(cad.cep_manifest_path), out_dir=tmp_path / "cfd")
    assert run.prep.flow_conditions.regime.value == "supersonic"
    assert run.config.solver in ("rhoSimpleFoam", "rhoCentralFoam")
    assert run.config.turbulence_model == "kOmegaSST"
