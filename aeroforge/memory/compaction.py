"""Context compaction.

When a session's event log grows past a threshold, compact it into a short
summary so downstream LLM context stays within budget (design doc: compaction at
~80% window utilisation). Deterministic and dependency-free.
"""

from __future__ import annotations

from typing import Dict, List

from .session_memory import AgentSession


def compact_session(session: AgentSession, max_events: int = 40) -> Dict[str, object]:
    """Return a compact summary of a session's events."""
    events = session.events
    summary = {
        "session_id": session.session_id,
        "geometry_type": session.intent.geometry_type,
        "total_events": len(events),
        "total_attempts": session.total_attempts,
        "corrections": session.correction_count,
        "kinds": _count_kinds(events),
    }
    if len(events) > max_events:
        summary["recent_events"] = events[-max_events:]
        summary["compacted"] = True
    else:
        summary["events"] = events
        summary["compacted"] = False
    return summary


def _count_kinds(events: List[Dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for e in events:
        counts[e.get("kind", "?")] = counts.get(e.get("kind", "?"), 0) + 1
    return counts
