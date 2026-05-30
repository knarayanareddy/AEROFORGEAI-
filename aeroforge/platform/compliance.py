"""Compliance advisory module (FAA / EASA / ITAR / EAR).

Aggregates export-control screening (reusing the Phase-1 ITAR/EAR advisory) with
airworthiness-standard pointers (FAA 14 CFR Part 33 / EASA CS-E for engines,
Part 25/CS-25 for transport airframes) into a single compliance report.

This is an automated *advisory* to route designs to the right human reviewers —
it is NOT a certification or a legal determination.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from ..security.itar_checker import ItarChecker
from ..types import StructuredDesignIntent


@dataclass
class ComplianceReport:
    export_control_flagged: bool
    export_categories: List[str] = field(default_factory=list)
    airworthiness_standards: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    disclaimer: str = (
        "Automated advisory only — not a certification or legal determination. "
        "Route flagged designs to an export-control officer and the appropriate "
        "airworthiness authority before sharing, exporting, or certifying."
    )


_PROPULSION = ("nozzle", "inlet", "scramjet", "combustor", "turbine", "compressor")
_AIRFRAME = ("airfoil", "wing", "fuselage", "fin", "nose", "ogive", "fairing")


class ComplianceChecker:
    """Produces a combined export-control + airworthiness advisory."""

    def __init__(self) -> None:
        self._itar = ItarChecker()

    def review(self, intent: StructuredDesignIntent) -> ComplianceReport:
        advisory = self._itar.review(intent)
        gtype = (intent.geometry_type or "").lower()
        standards: List[str] = []
        notes: List[str] = []

        if any(k in gtype for k in _PROPULSION):
            standards.append("FAA 14 CFR Part 33 / EASA CS-E (engine airworthiness)")
            notes.append("Propulsion component: engine certification standards apply.")
        if any(k in gtype for k in _AIRFRAME):
            standards.append("FAA 14 CFR Part 25 / EASA CS-25 (transport-category airframe)")
            notes.append("Aerodynamic surface: airframe structural/airworthiness standards apply.")
        if intent.mach_design_point and intent.mach_design_point >= 1.0:
            standards.append("Supersonic ops: special airworthiness + noise/sonic-boom review")

        return ComplianceReport(
            export_control_flagged=advisory.flagged,
            export_categories=advisory.categories,
            airworthiness_standards=standards or ["No specific standard auto-matched"],
            notes=advisory.notes + notes,
        )
