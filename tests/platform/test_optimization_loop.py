"""Tests for the closed CAD->evaluate->CAD optimization loop (requires CAD kernel)."""

from __future__ import annotations

import pytest

from tests.conftest import cad_required

pytestmark = [pytest.mark.integration, cad_required]


def test_loop_converges_from_suboptimal_start(tmp_path):
    from aeroforge.platform.evaluators import AnalyticalEvaluator
    from aeroforge.platform.optimization_loop import OptimizationLoop

    loop = OptimizationLoop(evaluator=AnalyticalEvaluator(), max_iterations=8)
    res = loop.optimize(
        "2-ramp supersonic inlet for Mach 2.5",
        targets=[{"metric": "total_pressure_recovery", "value": 0.80, "operator": "gte"}],
        param_overrides={"ramp1_angle_deg": 6.0, "ramp2_angle_deg": 9.0},
        out_dir=tmp_path,
    )
    assert res.evaluator == "analytical"
    assert res.iterations_run >= 1
    assert res.converged is True
    assert res.best_quantities["total_pressure_recovery"] >= 0.80


def test_loop_escalates_on_unreachable_target(tmp_path):
    from aeroforge.platform.evaluators import AnalyticalEvaluator
    from aeroforge.platform.optimization_loop import OptimizationLoop

    loop = OptimizationLoop(evaluator=AnalyticalEvaluator(), max_iterations=5)
    res = loop.optimize(
        "2-ramp supersonic inlet for Mach 2.5",
        targets=[{"metric": "total_pressure_recovery", "value": 0.999, "operator": "gte"}],
        out_dir=tmp_path,
    )
    assert res.converged is False
    assert res.final_decision in ("ESCALATE", "ITERATE")


def test_analytical_evaluator_reads_recovery(tmp_path):
    from aeroforge import AeroForge
    from aeroforge.platform.evaluators import AnalyticalEvaluator

    pkg = AeroForge().design("2-ramp supersonic inlet for Mach 2.5", out_dir=tmp_path)
    q = AnalyticalEvaluator().evaluate(pkg)
    assert "total_pressure_recovery" in q and 0.0 < q["total_pressure_recovery"] <= 1.0
