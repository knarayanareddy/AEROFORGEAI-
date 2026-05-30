"""Tests for the validation engine, LLM gateway, and knowledge subsystem."""

from __future__ import annotations

from aeroforge.agents.physics_constraint_agent import PhysicsConstraintAgent
from aeroforge.config import LLMConfig
from aeroforge.knowledge import AerospaceKnowledgeGraph, RAGPipeline
from aeroforge.llm.gateway import LLMGateway
from aeroforge.llm.router import TASK_CODE_GENERATION, RequestRouter
from aeroforge.templates import default_library
from aeroforge.types import StructuredDesignIntent
from aeroforge.validation import GeometryValidator


def _good_metrics():
    return {
        "is_valid": True,
        "n_solids": 1,
        "shape_type": "Solid",
        "volume_m3": 1.0e-3,
        "area_m2": 0.5,
        "bbox": {"x": 0.2, "y": 0.1, "z": 0.1},
        "n_faces": 30,
        "n_edges": 60,
        "n_vertices": 32,
    }


class TestValidation:
    def test_valid_solid_passes_topology(self):
        intent = StructuredDesignIntent(geometry_type="cd_nozzle", parameters={"exit_mach": 2.5})
        aug = PhysicsConstraintAgent().augment(intent)
        report = GeometryValidator().validate(_good_metrics(), aug, derived=aug.physics)
        topo = next(s for s in report.stages if s.stage == "topology")
        assert topo.passed
        assert report.confidence.overall > 0.5

    def test_degenerate_solid_fails_topology(self):
        bad = _good_metrics()
        bad.update({"is_valid": False, "volume_m3": 0.0, "n_solids": 0, "shape_type": "Shell"})
        intent = StructuredDesignIntent(geometry_type="cd_nozzle", parameters={"exit_mach": 2.5})
        aug = PhysicsConstraintAgent().augment(intent)
        report = GeometryValidator().validate(bad, aug, derived=aug.physics)
        assert not report.passed

    def test_detached_shock_flags_physics(self):
        intent = StructuredDesignIntent(
            geometry_type="supersonic_inlet",
            mach_design_point=2.0,
            parameters={"ramp1_angle_deg": 25.0, "ramp2_angle_deg": 28.0},
        )
        aug = PhysicsConstraintAgent().augment(intent)
        report = GeometryValidator().validate(
            _good_metrics(),
            aug,
            derived={**aug.physics},
            template=default_library().find_for_geometry_type("supersonic_inlet"),
        )
        phys = next(s for s in report.stages if s.stage == "physics")
        assert not phys.passed  # 25 deg exceeds max deflection at M2


class TestLLMGateway:
    def test_offline_gateway_reports_unavailable(self):
        gw = LLMGateway(LLMConfig.default())
        resp = gw.complete(TASK_CODE_GENERATION, "build a cube")
        assert resp.available is False
        assert resp.text is None

    def test_router_splits_provider_model(self):
        cfg = LLMConfig.default()
        cfg.routing.code_generation = "ollama/qwen2.5-coder:32b"
        provider, model = RequestRouter(cfg).route(TASK_CODE_GENERATION)
        assert provider == "ollama" and model == "qwen2.5-coder:32b"


class TestKnowledge:
    def test_graph_affects(self):
        g = AerospaceKnowledgeGraph()
        assert "ramp_angle" in g.affects("total_pressure_recovery")

    def test_rag_returns_relevant_snippet(self):
        ctx = RAGPipeline().query("scramjet inlet pressure recovery")
        assert ctx.snippets
        assert "scramjet_inlet" in ctx.matched_entities
