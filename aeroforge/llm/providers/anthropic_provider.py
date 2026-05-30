"""Anthropic (Claude) provider — cloud BYOK backend.

Uses the official ``anthropic`` SDK if it is installed and ``ANTHROPIC_API_KEY``
is set. Both are optional: absent either, the provider reports unavailable.
"""

from __future__ import annotations

import os
from typing import Optional

from .base import LLMProvider, LLMResponse


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, api_key: Optional[str] = None, default_model: str = "claude-sonnet-4-5"):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY") or ""
        self.default_model = default_model

    def is_available(self) -> bool:
        if not self.api_key:
            return False
        try:
            import anthropic  # noqa: F401

            return True
        except Exception:
            return False

    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        mdl = model or self.default_model
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=self.api_key)
            msg = client.messages.create(
                model=mdl,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system or "You are an aerospace CAD design assistant.",
                messages=[{"role": "user", "content": prompt}],
            )
            text = "".join(
                block.text for block in msg.content if getattr(block, "type", "") == "text"
            )
            return LLMResponse(
                text=text,
                provider="anthropic",
                model=mdl,
                prompt_tokens=getattr(msg.usage, "input_tokens", 0),
                completion_tokens=getattr(msg.usage, "output_tokens", 0),
            )
        except Exception as exc:  # noqa: BLE001
            return LLMResponse(
                text=None, provider="anthropic", model=mdl, available=False, error=str(exc)
            )
