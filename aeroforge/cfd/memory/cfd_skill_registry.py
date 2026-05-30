"""CFD skill registry.

Stores reusable CFD setups (solver + turbulence + mesh strategy + scheme choices)
keyed by flow scenario, so a proven configuration can be recalled for a similar
case. Skills are YAML, loaded from a directory.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

_DEFAULT_DIR = Path(__file__).resolve().parents[3] / "skills" / "cfd"


@dataclass
class CFDSkill:
    name: str
    regime: str
    solver: str
    turbulence_model: str
    settings: Dict[str, Any] = field(default_factory=dict)
    source: str = "built-in"


class CFDSkillRegistry:
    """Loads and indexes CFD skills."""

    def __init__(self, directory: Optional[Path] = None):
        self.directory = directory or _DEFAULT_DIR
        self._skills: Dict[str, CFDSkill] = {}
        self.reload()

    def reload(self) -> None:
        self._skills.clear()
        if not self.directory.exists():
            return
        for p in sorted(self.directory.rglob("*.yaml")):
            data = (yaml.safe_load(p.read_text()) or {}).get("skill", {})
            name = data.get("name") or p.stem
            self._skills[name] = CFDSkill(
                name=name,
                regime=data.get("regime", ""),
                solver=data.get("solver", ""),
                turbulence_model=data.get("turbulence_model", ""),
                settings=data.get("settings", {}),
                source=data.get("source", "built-in"),
            )

    def all(self) -> List[CFDSkill]:
        return list(self._skills.values())

    def for_regime(self, regime: str) -> List[CFDSkill]:
        return [s for s in self._skills.values() if s.regime == regime]
