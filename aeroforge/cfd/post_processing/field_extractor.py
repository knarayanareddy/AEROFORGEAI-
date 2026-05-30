"""Field / force extractor.

Reads OpenFOAM ``postProcessing/`` outputs (e.g. surfaceFieldValue for
stagnation pressures, forceCoeffs for Cd/Cl) when a run has produced them. When
no results are present (no solver here), returns an empty set with a note so the
report can say "awaiting solver results" rather than fabricating numbers.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple


class FieldExtractor:
    """Extracts scalar quantities from a finished case's postProcessing dir."""

    def extract(self, case_dir: Path) -> Tuple[Dict[str, float], str]:
        case_dir = Path(case_dir)
        pp = case_dir / "postProcessing"
        if not pp.exists():
            return {}, "No postProcessing output found (solver has not run)."

        fields: Dict[str, float] = {}
        # forceCoeffs (Cd/Cl) — last data line, columns vary by version.
        for fc in pp.rglob("coefficient*.dat"):
            try:
                last = [ln for ln in fc.read_text().splitlines() if ln and not ln.startswith("#")][
                    -1
                ].split()
                if len(last) >= 4:
                    fields["Cd"] = float(last[1])
                    fields["Cl"] = float(last[3])
            except Exception:
                continue
        return fields, (
            "Extracted from postProcessing."
            if fields
            else "postProcessing present but no recognised data."
        )
