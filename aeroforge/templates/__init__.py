"""Parametric aerospace template library.

Loads the validated component templates (YAML) and exposes lookup plus parameter
range-checking. Templates encode known-good parameter envelopes and the builder
each maps to, so the physics and validation agents can clamp/flag out-of-range
requests against literature-validated bounds.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

_GEOMETRY_DIR = Path(__file__).parent / "geometry"


@dataclass
class Template:
    id: str
    name: str
    category: str
    builder: str
    parameters: Dict[str, Any]
    derived_quantities: Dict[str, Any]
    constraints: List[str]
    manufacturing_constraints: Dict[str, Any]
    output_geometry: Dict[str, Any]
    validated_against: List[str]
    raw: Dict[str, Any]

    def defaults(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        for pname, spec in self.parameters.items():
            if isinstance(spec, dict) and "default" in spec:
                out[pname] = spec["default"]
        return out

    def check_ranges(self, params: Dict[str, Any]) -> List[str]:
        """Return a list of human-readable range violations (empty if all OK)."""
        issues: List[str] = []
        for pname, value in params.items():
            spec = self.parameters.get(pname)
            if not isinstance(spec, dict):
                continue
            rng = spec.get("range")
            if rng and isinstance(value, (int, float)):
                lo, hi = rng
                if value < lo or value > hi:
                    issues.append(f"{pname}={value} outside validated range [{lo}, {hi}]")
        return issues


class TemplateLibrary:
    """In-memory index of all geometry templates."""

    def __init__(self, directory: Optional[Path] = None):
        self.directory = directory or _GEOMETRY_DIR
        self._templates: Dict[str, Template] = {}
        self._load()

    def _load(self) -> None:
        for path in sorted(self.directory.glob("*.yaml")):
            data = yaml.safe_load(path.read_text()) or {}
            t = data.get("template", {})
            if not t.get("id"):
                continue
            self._templates[t["id"]] = Template(
                id=t["id"],
                name=t.get("name", t["id"]),
                category=t.get("category", "uncategorized"),
                builder=t.get("builder", ""),
                parameters=t.get("parameters", {}),
                derived_quantities=t.get("derived_quantities", {}),
                constraints=t.get("constraints", []),
                manufacturing_constraints=t.get("manufacturing_constraints", {}),
                output_geometry=t.get("output_geometry", {}),
                validated_against=t.get("validated_against", []),
                raw=t,
            )

    def get(self, template_id: str) -> Optional[Template]:
        return self._templates.get(template_id)

    def all(self) -> List[Template]:
        return list(self._templates.values())

    def ids(self) -> List[str]:
        return sorted(self._templates)

    def for_builder(self, builder: str) -> List[Template]:
        return [t for t in self._templates.values() if t.builder == builder]

    #: Explicit geometry_type -> representative template id (most specific match).
    _TYPE_TO_TEMPLATE = {
        "naca_airfoil": "naca4_airfoil",
        "airfoil": "naca4_airfoil",
        "naca_symmetric_fin": "naca_symmetric_fin",
        "cd_nozzle": "cd_nozzle_bell_rao",
        "nozzle": "cd_nozzle_bell_rao",
        "convergent_divergent_nozzle": "cd_nozzle_bell_rao",
        "supersonic_inlet": "supersonic_2ramp_inlet",
        "supersonic_2ramp_inlet": "supersonic_2ramp_inlet",
        "scramjet_inlet": "scramjet_inlet_2ramp",
        "ogive": "tangent_ogive_nose",
        "nose_cone": "tangent_ogive_nose",
    }

    def find_for_geometry_type(self, geometry_type: str) -> Optional[Template]:
        """Map a geometry type to its most representative validated template."""
        if geometry_type in self._templates:
            return self._templates[geometry_type]
        mapped = self._TYPE_TO_TEMPLATE.get(geometry_type)
        if mapped and mapped in self._templates:
            return self._templates[mapped]
        for t in self._templates.values():
            if t.builder == geometry_type or geometry_type in t.id:
                return t
        return None


@lru_cache(maxsize=1)
def default_library() -> TemplateLibrary:
    return TemplateLibrary()
