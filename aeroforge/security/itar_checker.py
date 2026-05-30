"""ITAR / EAR advisory checker.

Flags geometry families and flight regimes that *commonly* fall under the U.S.
Munitions List (USML, ITAR) or the Commerce Control List (EAR) so the report can
surface an export-control advisory. Categories of interest include USML Category
IV (launch vehicles, missiles) and VIII (aircraft), and hypersonic technologies.

IMPORTANT: this is an automated advisory to prompt human review. It is NOT a
legal determination and must not be relied upon for compliance decisions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from ..types import FlowRegime, StructuredDesignIntent


@dataclass
class ExportControlAdvisory:
    flagged: bool
    categories: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    disclaimer: str = (
        "Automated advisory only — not legal advice. Consult an export-control "
        "officer before sharing or exporting any flagged design."
    )


class ItarChecker:
    """Heuristic export-control advisory generator."""

    def review(self, intent: StructuredDesignIntent) -> ExportControlAdvisory:
        categories: List[str] = []
        notes: List[str] = []

        gtype = (intent.geometry_type or "").lower()
        if any(k in gtype for k in ("scramjet", "inlet", "nozzle", "combustor")):
            categories.append("USML Cat IV (propulsion / launch & missile systems) — possible")
            notes.append(f"Propulsion geometry '{intent.geometry_type}' may be controlled.")

        if intent.flow_regime == FlowRegime.HYPERSONIC or (
            intent.mach_design_point and intent.mach_design_point >= 5.0
        ):
            categories.append("Hypersonic technology — heightened export-control scrutiny")
            notes.append("Hypersonic flight regime (M>=5) is subject to strict controls.")

        if any(k in (intent.raw_input or "").lower() for k in ("missile", "weapon", "warhead")):
            categories.append("USML Cat IV (missiles / ordnance) — likely")

        return ExportControlAdvisory(flagged=bool(categories), categories=categories, notes=notes)
