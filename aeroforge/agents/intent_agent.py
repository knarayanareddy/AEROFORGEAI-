"""Intent Agent — natural language -> StructuredDesignIntent.

Two paths:

* **Heuristic (default, offline):** a deterministic regex/keyword parser that
  extracts geometry type, flight regime, dimensions, materials, and performance
  targets. This runs with zero dependencies on any LLM — the foundation of the
  offline-safe pipeline.
* **LLM-assisted (optional):** when the gateway has a live provider, the parsed
  JSON is used to fill gaps the heuristics miss. The heuristic result is always
  computed as a fallback, so a flaky or unavailable LLM never breaks parsing.
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional, Tuple

from ..llm.gateway import LLMGateway
from ..llm.prompt_registry import get_prompt
from ..llm.router import TASK_FAST_INTERACTION
from ..types import (
    Dimensionality,
    FlowRegime,
    GeometryFamily,
    PerformanceTarget,
    StructuredDesignIntent,
    Symmetry,
)

_UNIT_TO_M = {"mm": 0.001, "cm": 0.01, "m": 1.0, "in": 0.0254, "inch": 0.0254, "ft": 0.3048}

# geometry-type keyword table (checked in order; first match wins)
_GEOMETRY_KEYWORDS: List[Tuple[str, str, GeometryFamily]] = [
    ("scramjet", "scramjet_inlet", GeometryFamily.PROPULSION),
    ("mixed-compression", "supersonic_inlet", GeometryFamily.PROPULSION),
    ("inlet", "supersonic_inlet", GeometryFamily.PROPULSION),
    ("intake", "supersonic_inlet", GeometryFamily.PROPULSION),
    ("nozzle", "cd_nozzle", GeometryFamily.PROPULSION),
    ("nose cone", "ogive", GeometryFamily.AERODYNAMIC_SURFACE),
    ("nosecone", "ogive", GeometryFamily.AERODYNAMIC_SURFACE),
    ("ogive", "ogive", GeometryFamily.AERODYNAMIC_SURFACE),
    ("nose", "ogive", GeometryFamily.AERODYNAMIC_SURFACE),
    ("fin", "naca_symmetric_fin", GeometryFamily.AERODYNAMIC_SURFACE),
    ("airfoil", "naca_airfoil", GeometryFamily.AERODYNAMIC_SURFACE),
    ("aerofoil", "naca_airfoil", GeometryFamily.AERODYNAMIC_SURFACE),
    ("wing", "naca_airfoil", GeometryFamily.AERODYNAMIC_SURFACE),
    ("naca", "naca_airfoil", GeometryFamily.AERODYNAMIC_SURFACE),
]

_MATERIALS = {
    "ti-6al-4v": "titanium_6al4v",
    "ti6al4v": "titanium_6al4v",
    "titanium": "titanium_6al4v",
    "inconel": "inconel_718",
    "c/sic": "c_sic",
    "cmc": "c_sic",
    "aluminum": "aluminum_7075",
    "aluminium": "aluminum_7075",
    "steel": "stainless_steel_316",
}

# rough thermal limits (K) for advisory thermal checks
_MATERIAL_THERMAL_K = {
    "titanium_6al4v": 700.0,
    "inconel_718": 980.0,
    "c_sic": 1900.0,
    "aluminum_7075": 450.0,
    "stainless_steel_316": 1100.0,
}


class IntentAgent:
    """Parses free-form requests into a structured design intent."""

    def __init__(self, llm: Optional[LLMGateway] = None):
        self.llm = llm

    def parse(self, text: str) -> StructuredDesignIntent:
        intent = self._heuristic_parse(text)
        if self.llm is not None:
            self._augment_with_llm(text, intent)
        return intent

    # ------------------------------------------------------------------ #
    # Heuristic parser
    # ------------------------------------------------------------------ #
    def _heuristic_parse(self, text: str) -> StructuredDesignIntent:
        low = text.lower()
        matched_fields = 0

        gtype, family = "naca_airfoil", GeometryFamily.AERODYNAMIC_SURFACE
        for kw, gt, fam in _GEOMETRY_KEYWORDS:
            if kw in low:
                gtype, family = gt, fam
                matched_fields += 1
                break

        intent = StructuredDesignIntent(raw_input=text, geometry_type=gtype, geometry_family=family)
        params: Dict[str, float] = {}

        # Mach number
        mach = self._first_float(
            low,
            [
                r"mach\s*(?:number\s*)?(?:of\s*)?([0-9]+\.?[0-9]*)",
                r"\bm\s*=\s*([0-9]+\.?[0-9]*)",
                r"\bm([0-9]+\.?[0-9]*)\b",
            ],
        )
        if mach is not None:
            intent.mach_design_point = mach
            intent.flow_regime = FlowRegime.from_mach(mach)
            matched_fields += 1

        # NACA code
        naca = re.search(r"naca\s*([0-9]{4})", low)
        if naca:
            params["naca_code"] = naca.group(1)
            matched_fields += 1

        # Dimensions
        chord = self._dim(low, r"chord")
        if chord is not None:
            params["chord_m"] = chord
        span = self._dim(low, r"span")
        if span is not None:
            params["span_m"] = span
        throat = self._dim(low, r"throat(?:\s*radius)?")
        if throat is not None:
            params["throat_radius_m"] = throat
        base_r = self._dim(low, r"base\s*radius")
        if base_r is not None:
            params["base_radius_m"] = base_r
        length = self._dim(low, r"length")
        if length is not None:
            params["length_m"] = length

        # Exit Mach for nozzles
        exit_mach = self._first_float(low, [r"exit\s*mach\s*(?:of\s*)?([0-9]+\.?[0-9]*)"])
        if exit_mach is None and gtype == "cd_nozzle" and mach is not None and "exit" not in low:
            # a bare Mach for a nozzle most likely means the exit Mach
            exit_mach = mach
        if exit_mach is not None:
            params["exit_mach"] = exit_mach

        # Nozzle subtype
        if gtype == "cd_nozzle":
            if "conical" in low:
                params["nozzle_type"] = "conical"
            elif "min" in low and "length" in low or "moc" in low:
                params["nozzle_type"] = "min_length"
            elif "bell" in low or "rao" in low:
                params["nozzle_type"] = "bell"

        # Ogive subtype
        if gtype == "ogive":
            if "von karman" in low or "von kármán" in low or "haack" in low:
                params["shape"] = "von_karman"
            elif "conical" in low or "cone" in low:
                params["shape"] = "conical"
            else:
                params["shape"] = "ogive"

        # Ramp angles (explicit)
        ramps = re.findall(r"ramp\s*(?:angle\s*)?(?:of\s*)?([0-9]+\.?[0-9]*)\s*(?:deg|degree)", low)
        if len(ramps) >= 1:
            params["ramp1_angle_deg"] = float(ramps[0])
        if len(ramps) >= 2:
            params["ramp2_angle_deg"] = float(ramps[1])

        # Performance targets
        targets: List[PerformanceTarget] = []
        rec = re.search(
            r"(?:total\s*)?pressure\s*recovery\s*(?:of\s*|>=?\s*|>\s*|=\s*)?([0-9]*\.?[0-9]+)", low
        )
        if rec:
            op = (
                "gte"
                if (">" in low.split("recovery")[1][:3] if "recovery" in low else False)
                else "gte"
            )
            targets.append(
                PerformanceTarget(
                    metric="total_pressure_recovery", value=float(rec.group(1)), operator=op
                )
            )
        # mass flow in either word order: "mass flow 12 kg/s" or "12 kg/s mass flow"
        mflow = re.search(r"([0-9]*\.?[0-9]+)\s*kg\s*/?\s*s", low) or re.search(
            r"mass\s*flow\s*(?:rate)?\s*(?:of\s*)?([0-9]*\.?[0-9]+)\s*kg", low
        )
        if mflow:
            targets.append(
                PerformanceTarget(
                    metric="mass_flow_rate_kg_s",
                    value=float(mflow.group(1)),
                    operator="eq",
                    units="kg/s",
                )
            )
        if "minimum" in low and "drag" in low or "min drag" in low:
            targets.append(PerformanceTarget(metric="drag_coefficient", operator="minimize"))
        if targets:
            intent.performance_targets = targets
            matched_fields += 1

        # Material + thermal
        for key, norm in _MATERIALS.items():
            if key in low:
                intent.material = norm
                intent.thermal_limit_K = _MATERIAL_THERMAL_K.get(norm)
                matched_fields += 1
                break
        thermal = re.search(r"thermal\s*limit\s*(?:of\s*)?([0-9]+\.?[0-9]*)\s*k", low)
        if thermal:
            intent.thermal_limit_K = float(thermal.group(1))

        # Symmetry / dimensionality defaults by family
        if family == GeometryFamily.PROPULSION and gtype in ("cd_nozzle",):
            intent.symmetry = Symmetry.AXISYMMETRIC
        elif gtype in ("supersonic_inlet", "scramjet_inlet"):
            intent.symmetry = Symmetry.PLANAR
        elif gtype == "ogive":
            intent.symmetry = Symmetry.AXISYMMETRIC

        intent.parameters = params
        # Confidence grows with the number of recognised fields.
        intent.intent_confidence = round(min(0.95, 0.45 + 0.12 * matched_fields), 2)
        return intent

    # ------------------------------------------------------------------ #
    # Optional LLM augmentation
    # ------------------------------------------------------------------ #
    def _augment_with_llm(self, text: str, intent: StructuredDesignIntent) -> None:
        prompt = get_prompt("intent_parse")
        resp = self.llm.complete(  # type: ignore[union-attr]
            TASK_FAST_INTERACTION,
            prompt.render(raw_input=text),
            system=prompt.system,
            ip_sensitive=False,
        )
        if not resp.ok or not resp.text:
            return
        try:
            data = json.loads(self._extract_json(resp.text))
        except Exception:
            return
        # Only fill gaps; never override a confident heuristic value.
        if intent.mach_design_point is None and data.get("mach_design_point"):
            intent.mach_design_point = float(data["mach_design_point"])
            intent.flow_regime = FlowRegime.from_mach(intent.mach_design_point)
        if not intent.material and data.get("material"):
            intent.material = str(data["material"])
        for k, v in (data.get("parameters") or {}).items():
            intent.parameters.setdefault(k, v)
        intent.intent_confidence = max(
            intent.intent_confidence, float(data.get("intent_confidence", 0) or 0)
        )

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _first_float(text: str, patterns: List[str]) -> Optional[float]:
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                try:
                    return float(m.group(1))
                except ValueError:
                    continue
        return None

    @staticmethod
    def _dim(text: str, label: str) -> Optional[float]:
        """Parse a labelled dimension in either order, with unit conversion.

        Handles 'chord of 2 m', '2 m chord', 'chord 2m', 'chord=2'.
        """
        unit = r"(mm|cm|m|in|inch|ft)?"
        patterns = [
            rf"{label}\s*(?:of\s*|=\s*|:\s*)?([0-9]+\.?[0-9]*)\s*{unit}",
            rf"([0-9]+\.?[0-9]*)\s*{unit}\s*(?:of\s*)?{label}",
        ]
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                val = float(m.group(1))
                u = (m.group(2) or "m").lower()
                return val * _UNIT_TO_M.get(u, 1.0)
        return None

    @staticmethod
    def _extract_json(text: str) -> str:
        start = text.find("{")
        end = text.rfind("}")
        return text[start : end + 1] if start >= 0 and end > start else text
