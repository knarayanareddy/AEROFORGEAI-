"""Tests for the Part-3 compliance advisory and analytical evaluator."""

from __future__ import annotations

from aeroforge.agents.intent_agent import IntentAgent
from aeroforge.platform.compliance import ComplianceChecker


def test_scramjet_flags_export_control():
    intent = IntentAgent().parse("scramjet inlet for Mach 6, titanium")
    report = ComplianceChecker().review(intent)
    assert report.export_control_flagged is True
    assert any("USML" in c for c in report.export_categories)
    assert any("Part 33" in s or "CS-E" in s for s in report.airworthiness_standards)


def test_airfoil_airframe_standard():
    intent = IntentAgent().parse("NACA 2412 airfoil, 2 m chord, 5 m span")
    report = ComplianceChecker().review(intent)
    assert any("Part 25" in s or "CS-25" in s for s in report.airworthiness_standards)


def test_supersonic_adds_special_review():
    intent = IntentAgent().parse("2-ramp supersonic inlet for Mach 2.5")
    report = ComplianceChecker().review(intent)
    assert any("Supersonic" in s for s in report.airworthiness_standards)
