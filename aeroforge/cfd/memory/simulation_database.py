"""Simulation history database.

Persists a compact record of every CFD run (component, regime, solver, mesh size,
convergence, key quantities) to disk so the system can recall settings that
worked for similar cases — the CFD analogue of Phase 1's episodic memory.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class SimulationDatabase:
    """File-backed store of CFD simulation records."""

    def __init__(self, directory: Optional[Path] = None):
        self.directory = directory or (Path.home() / ".aeroforge" / "cfd_simulations")
        self.directory.mkdir(parents=True, exist_ok=True)

    def record(self, run: Dict[str, Any]) -> Path:
        run = {"recorded_at": datetime.now(timezone.utc).isoformat(), **run}
        rid = run.get("run_id", datetime.now().strftime("%Y%m%d%H%M%S%f"))
        path = self.directory / f"{rid}.json"
        path.write_text(json.dumps(run, indent=2, default=str))
        return path

    def all(self) -> List[Dict[str, Any]]:
        out = []
        for p in sorted(self.directory.glob("*.json")):
            try:
                out.append(json.loads(p.read_text()))
            except json.JSONDecodeError:
                continue
        return out

    def recall_similar(
        self, component_type: str, regime: str, limit: int = 3
    ) -> List[Dict[str, Any]]:
        scored = []
        for r in self.all():
            score = (r.get("component_type") == component_type) + (r.get("regime") == regime)
            if score:
                scored.append((score, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [r for _, r in scored[:limit]]
