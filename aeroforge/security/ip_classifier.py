"""IP-sensitivity classifier.

A lightweight keyword/heuristic classifier that flags design intent likely to
involve sensitive or proprietary aerospace IP. When flagged, the LLM gateway is
asked to route IP-sensitive work to **local** inference only (privacy override),
honouring the design doc's "no aerospace IP through third-party APIs" principle.

This is a heuristic aid, not a compliance determination.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

_SENSITIVE_TERMS = [
    "classified",
    "proprietary",
    "itar",
    "ear99",
    "export controlled",
    "weapon",
    "missile",
    "warhead",
    "hypersonic glide",
    "reentry vehicle",
    "military",
    "defense",
    "darpa",
    "afrl",
    "restricted",
]


@dataclass
class IPClassification:
    is_sensitive: bool
    score: float
    matched_terms: List[str] = field(default_factory=list)
    reason: str = ""


class IPClassifier:
    """Flags IP-sensitive intent to force local-only LLM routing."""

    def classify(self, text: str) -> IPClassification:
        low = (text or "").lower()
        matched = [t for t in _SENSITIVE_TERMS if re.search(r"\b" + re.escape(t), low)]
        score = min(1.0, 0.34 * len(matched))
        sensitive = bool(matched)
        reason = (
            f"Matched sensitive terms: {', '.join(matched)}"
            if matched
            else "No sensitive terms detected"
        )
        return IPClassification(
            is_sensitive=sensitive, score=score, matched_terms=matched, reason=reason
        )
