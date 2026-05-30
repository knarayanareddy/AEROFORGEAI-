"""Unit tests for the CFD design loop, monitoring, and CEP ingestion."""

from __future__ import annotations

import json

from aeroforge.cfd.agents.geometry_preparation_agent import GeometryPreparationAgent
from aeroforge.cfd.design_loop import DesignModifier, ParetoTracker, TargetChecker
from aeroforge.cfd.monitoring import ConvergenceDetector, ConvergenceState, ResidualTracker
from aeroforge.cfd.types import DomainType, LoopDecision


class TestTargetChecker:
    def test_accept_when_met(self):
        d = TargetChecker().check(
            {"total_pressure_recovery": 0.9},
            [{"metric": "total_pressure_recovery", "value": 0.85, "operator": "gte"}],
        )
        assert d.decision == LoopDecision.ACCEPT

    def test_iterate_when_close(self):
        d = TargetChecker().check(
            {"total_pressure_recovery": 0.83},
            [{"metric": "total_pressure_recovery", "value": 0.85, "operator": "gte"}],
            iterations_used=0,
        )
        assert d.decision == LoopDecision.ITERATE
        assert d.gaps and d.gaps[0]["metric"] == "total_pressure_recovery"

    def test_escalate_when_far(self):
        d = TargetChecker().check(
            {"total_pressure_recovery": 0.4},
            [{"metric": "total_pressure_recovery", "value": 0.85, "operator": "gte"}],
        )
        assert d.decision == LoopDecision.ESCALATE


class TestDesignModifier:
    def test_proposes_ramp_changes_for_recovery_gap(self):
        mods = DesignModifier().propose(
            [{"metric": "total_pressure_recovery", "target": 0.85, "gap": -0.03}], "inlet"
        )
        params = {m["param"] for m in mods}
        assert "ramp1_angle_deg" in params and "ramp2_angle_deg" in params


class TestPareto:
    def test_dominance(self):
        p = ParetoTracker({"recovery": "maximize", "drag": "minimize"})
        assert p.add("a", {"recovery": 0.8, "drag": 0.10}) is True
        # b is dominated by a (worse recovery, worse drag)
        assert p.add("b", {"recovery": 0.7, "drag": 0.12}) is False
        # c is non-dominated (better drag, worse recovery)
        assert p.add("c", {"recovery": 0.75, "drag": 0.08}) is True


class TestMonitoring:
    SAMPLE_LOG = """
Time = 1
smoothSolver:  Solving for Ux, Initial residual = 0.1, Final residual = 1e-3
smoothSolver:  Solving for omega, Initial residual = 0.2, Final residual = 1e-3
Time = 2
smoothSolver:  Solving for Ux, Initial residual = 1e-6, Final residual = 1e-8
smoothSolver:  Solving for omega, Initial residual = 1e-6, Final residual = 1e-8
"""

    def test_residual_parse(self):
        finals, iters, converged = ResidualTracker().parse_text(self.SAMPLE_LOG)
        assert iters == 2
        assert finals["Ux"] == 1e-6
        assert converged is True

    def test_convergence_detector(self):
        hist = ResidualTracker().history(self.SAMPLE_LOG)
        a = ConvergenceDetector().assess(hist, target=1e-4)
        assert a.state == ConvergenceState.CONVERGED


class TestCEPIngestion:
    def test_ingest_minimal_manifest(self, tmp_path):
        manifest = {
            "cep_version": "1.0",
            "geometry": {
                "primary_file": "x.step",
                "bounding_box_m": {"x": 1.2, "y": 0.3, "z": 0.3},
            },
            "design_intent": {
                "component_type": "supersonic_inlet",
                "flow_regime": "supersonic",
                "mach_design_point": 2.5,
            },
            "cfd_hints": {"mesh_hints": {"shock_refinement_required": True}},
        }
        (tmp_path / "cep_manifest.json").write_text(json.dumps(manifest))
        prep = GeometryPreparationAgent().ingest_cep(tmp_path)
        assert prep.domain_type == DomainType.INTERNAL_FLOW
        assert prep.flow_conditions.mach == 2.5
        assert any(p.name == "inlet" for p in prep.patches)
