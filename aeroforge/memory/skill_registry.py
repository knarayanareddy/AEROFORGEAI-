"""Skill registry.

Skills are reusable, parameterised design procedures stored as YAML (built-in or
community). Each maps to a geometry builder with curated default parameters and
provenance. The registry loads them and lets the agent look one up by name or by
the geometry type it produces.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

_DEFAULT_SKILLS_DIR = Path(__file__).resolve().parents[2] / "skills"


@dataclass
class Skill:
    name: str
    category: str
    builder: str
    description: str = ""
    default_params: Dict[str, Any] = field(default_factory=dict)
    source: str = "built-in"
    references: List[str] = field(default_factory=list)


class SkillRegistry:
    """Loads and indexes design skills from one or more directories."""

    def __init__(self, directories: Optional[List[Path]] = None):
        self.directories = directories or [_DEFAULT_SKILLS_DIR]
        self._skills: Dict[str, Skill] = {}
        self.reload()

    def reload(self) -> None:
        self._skills.clear()
        for directory in self.directories:
            if not directory.exists():
                continue
            for path in sorted(directory.rglob("*.yaml")):
                data = yaml.safe_load(path.read_text()) or {}
                skill = data.get("skill", data)
                name = skill.get("name") or path.stem
                self._skills[name] = Skill(
                    name=name,
                    category=skill.get("category", "uncategorized"),
                    builder=skill.get("builder", ""),
                    description=skill.get("description", ""),
                    default_params=skill.get("default_params", {}),
                    source=skill.get("source", "built-in"),
                    references=skill.get("references", []),
                )

    def get(self, name: str) -> Optional[Skill]:
        return self._skills.get(name)

    def all(self) -> List[Skill]:
        return list(self._skills.values())

    def for_builder(self, builder: str) -> List[Skill]:
        return [s for s in self._skills.values() if s.builder == builder]
