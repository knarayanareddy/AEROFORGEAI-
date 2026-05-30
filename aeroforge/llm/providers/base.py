"""LLM provider interface.

Every backend (cloud or local) implements :class:`LLMProvider`. The gateway only
talks to this interface, so adding a provider never touches the agent code.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResponse:
    """Result of an LLM call (or a structured 'unavailable' signal)."""

    text: Optional[str]
    provider: str
    model: str
    available: bool = True
    prompt_tokens: int = 0
    completion_tokens: int = 0
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.available and self.text is not None and self.error is None


class LLMProvider(abc.ABC):
    """Abstract base for LLM providers."""

    name: str = "abstract"

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Return True if this provider can currently serve requests."""

    @abc.abstractmethod
    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        """Generate a completion. Implementations must never raise on a normal
        API error — return an :class:`LLMResponse` with ``error`` set instead."""
