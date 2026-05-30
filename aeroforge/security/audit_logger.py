"""Append-only audit logger.

Every LLM call and every design run is logged as a JSON line. The design doc
requires that *all* LLM calls are logged with no exceptions; this logger is the
sink. It writes to ``~/.aeroforge/audit.log`` by default.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


class AuditLogger:
    """Thread-safe append-only JSON-lines audit logger."""

    def __init__(self, path: Optional[Path] = None):
        self.path = path or (Path.home() / ".aeroforge" / "audit.log")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def log_event(self, event: Dict[str, Any]) -> None:
        record = {"ts": datetime.now(timezone.utc).isoformat(), **event}
        line = json.dumps(record, default=str)
        with self._lock:
            with open(self.path, "a") as fh:
                fh.write(line + "\n")

    def tail(self, n: int = 20) -> list[str]:
        if not self.path.exists():
            return []
        return self.path.read_text().splitlines()[-n:]
