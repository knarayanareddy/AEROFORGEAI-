"""Tests for the heuristic (offline) intent parser."""

from __future__ import annotations

from aeroforge.agents.intent_agent import IntentAgent
from aeroforge.types import FlowRegime, GeometryFamily


def parse(text):
    return IntentAgent(llm=None).parse(text)


def test_naca_airfoil_with_dimensions():
    intent = parse("Design a NACA 2412 airfoil at 2 m chord, 5 m span")
    assert intent.geometry_type == "naca_airfoil"
    assert intent.geometry_family == GeometryFamily.AERODYNAMIC_SURFACE
    assert intent.parameters["naca_code"] == "2412"
    assert intent.parameters["chord_m"] == 2.0
    assert intent.parameters["span_m"] == 5.0


def test_supersonic_inlet_mach_and_recovery():
    intent = parse("2-ramp supersonic inlet for Mach 2.5, total pressure recovery > 0.85")
    assert intent.geometry_type == "supersonic_inlet"
    assert intent.mach_design_point == 2.5
    assert intent.flow_regime == FlowRegime.SUPERSONIC
    t = intent.target("total_pressure_recovery")
    assert t is not None and t.value == 0.85


def test_scramjet_hypersonic_and_material():
    intent = parse("mixed-compression scramjet inlet for Mach 5.5, titanium, 12 kg/s mass flow")
    assert intent.geometry_type == "scramjet_inlet"
    assert intent.flow_regime == FlowRegime.HYPERSONIC
    assert intent.material == "titanium_6al4v"
    assert intent.thermal_limit_K is not None
    assert intent.target("mass_flow_rate_kg_s").value == 12.0


def test_nozzle_exit_mach_and_type():
    intent = parse("Rao bell nozzle, throat radius 0.05 m, exit Mach 3.0")
    assert intent.geometry_type == "cd_nozzle"
    assert intent.parameters["throat_radius_m"] == 0.05
    assert intent.parameters["exit_mach"] == 3.0
    assert intent.parameters["nozzle_type"] == "bell"


def test_unit_conversion_mm():
    intent = parse("conical nozzle, throat radius 50 mm, exit Mach 2")
    assert intent.parameters["throat_radius_m"] == 0.05


def test_ogive_von_karman():
    intent = parse("Von Karman nose cone, base radius 0.15 m, length 1.2 m")
    assert intent.geometry_type == "ogive"
    assert intent.parameters["shape"] == "von_karman"
    assert intent.parameters["base_radius_m"] == 0.15
    assert intent.parameters["length_m"] == 1.2


def test_confidence_is_set():
    intent = parse("NACA 0012 fin, chord 0.3 m, span 0.4 m")
    assert 0.4 <= intent.intent_confidence <= 1.0
