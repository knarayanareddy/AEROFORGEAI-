"""Per-run session memory.

Tracks the live state of a single design run: the intent, every task attempt
(including failures and the errors that drove error-correction), timings, and the
final outcome. The orchestrator threads one :class:`AgentSession` through the
whole pipeline so the report and audit log can reconstruct exactly what happened.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..types import GeometryTask, StructuredDesignIntent


@dataclass
class TaskAttemptLog:
    task_id: str
    attempt: int
    success: bool
    error: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class AgentSession:
    session_id: str
    intent: StructuredDesignIntent
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    events: List[Dict[str, Any]] = field(default_factory=list)
    attempts: List[TaskAttemptLog] = field(default_factory=list)

    def log(self, kind: str, **data: Any) -> None:
        self.events.append({"kind": kind, "ts": datetime.now(timezone.utc).isoformat(), **data})

    def log_task_attempt(self, task: GeometryTask, attempt: int, error: Optional[str]) -> None:
        self.attempts.append(TaskAttemptLog(task.id, attempt, success=False, error=error))
        self.log("task_attempt", task_id=task.id, attempt=attempt, error=error)

    def log_task_success(self, task: GeometryTask, attempt: int) -> None:
        self.attempts.append(TaskAttemptLog(task.id, attempt, success=True))
        self.log("task_success", task_id=task.id, attempt=attempt)

    @property
    def total_attempts(self) -> int:
        return len(self.attempts)

    @property
    def correction_count(self) -> int:
        return sum(1 for a in self.attempts if not a.success)


class AgentMemory:
    """Factory and recorder for sessions."""

    def __init__(self) -> None:
        self.sessions: Dict[str, AgentSession] = {}

    def new_session(self, intent: StructuredDesignIntent) -> AgentSession:
        sid = f"session_{uuid.uuid4().hex[:8]}"
        session = AgentSession(session_id=sid, intent=intent)
        self.sessions[sid] = session
        return session

    def record_success(self, session: AgentSession, summary: Dict[str, Any]) -> None:
        session.log("run_success", **summary)

    def record_failure(self, session: AgentSession, error: str) -> None:
        session.log("run_failure", error=error)
