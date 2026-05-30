"""OpenAI provider — cloud BYOK backend.

Uses the official ``openai`` SDK if installed and ``OPENAI_API_KEY`` is set.
Both optional; absent either, reports unavailable.
"""

from __future__ import annotations

import os
from typing import Optional

from .base import LLMProvider, LLMResponse


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, api_key: Optional[str] = None, default_model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY") or ""
        self.default_model = default_model

    def is_available(self) -> bool:
        if not self.api_key:
            return False
        try:
            import openai  # noqa: F401

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
            import openai

            client = openai.OpenAI(api_key=self.api_key)
            resp = client.chat.completions.create(
                model=mdl,
                temperature=temperature,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system or "You are an aerospace CAD assistant."},
                    {"role": "user", "content": prompt},
                ],
            )
            usage = resp.usage
            return LLMResponse(
                text=resp.choices[0].message.content,
                provider="openai",
                model=mdl,
                prompt_tokens=getattr(usage, "prompt_tokens", 0),
                completion_tokens=getattr(usage, "completion_tokens", 0),
            )
        except Exception as exc:  # noqa: BLE001
            return LLMResponse(
                text=None, provider="openai", model=mdl, available=False, error=str(exc)
            )
