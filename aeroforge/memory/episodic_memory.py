"""Episodic (long-term) memory of past designs.

Persists a compact JSON record of each completed design to
``~/.aeroforge/episodes`` so the system can recall similar past designs to seed
new ones — the "past successful designs" knowledge source in the design doc.
Retrieval is a lightweight similarity over geometry type, Mach, and material.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class EpisodicMemory:
    """File-backed store of past design episodes."""

    def __init__(self, directory: Optional[Path] = None):
        self.directory = directory or (Path.home() / ".aeroforge" / "episodes")
        self.directory.mkdir(parents=True, exist_ok=True)

    def record(self, episode: Dict[str, Any]) -> Path:
        episode = {"recorded_at": datetime.now(timezone.utc).isoformat(), **episode}
        design_id = episode.get("design_id", datetime.now().strftime("%Y%m%d%H%M%S"))
        path = self.directory / f"{design_id}.json"
        path.write_text(json.dumps(episode, indent=2, default=str))
        return path

    def all(self) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for p in sorted(self.directory.glob("*.json")):
            try:
                out.append(json.loads(p.read_text()))
            except json.JSONDecodeError:
                continue
        return out

    def recall_similar(
        self, geometry_type: str, mach: Optional[float] = None, limit: int = 3
    ) -> List[Dict[str, Any]]:
        """Return past episodes most similar to the query (simple heuristic)."""
        scored: List[tuple] = []
        for ep in self.all():
            score = 0.0
            if ep.get("geometry_type") == geometry_type:
                score += 1.0
            if mach is not None and ep.get("mach_design_point") is not None:
                score += max(0.0, 1.0 - abs(ep["mach_design_point"] - mach) / 5.0)
            if score > 0:
                scored.append((score, ep))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [ep for _, ep in scored[:limit]]
