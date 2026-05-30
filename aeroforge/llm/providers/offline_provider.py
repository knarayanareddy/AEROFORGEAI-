"""Offline provider — the always-available no-op backend.

When no cloud key and no local model are configured, the gateway routes here.
It reports ``available=False`` with no text, which signals callers (e.g. the
Intent Agent) to fall back to their deterministic heuristic paths. This is what
lets the entire pipeline run with zero credentials and zero GPU.
"""

from __future__ import annotations

from typing import Optional

from .base import LLMProvider, LLMResponse


class OfflineProvider(LLMProvider):
    name = "offline"

    def is_available(self) -> bool:
        return False

    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        return LLMResponse(
            text=None,
            provider="offline",
            model="none",
            available=False,
            error="No LLM provider configured; using deterministic heuristics.",
        )
