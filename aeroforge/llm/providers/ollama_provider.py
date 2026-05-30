"""Ollama provider — local LLM inference (privacy-first default).

Talks to a local Ollama server (default ``http://localhost:11434``) using only
the standard library, so it adds no dependencies. When Ollama is not running,
``is_available()`` returns False and the gateway falls back. This is the design
doc's BYOK + local-first backbone: aerospace IP never leaves the machine.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Optional

from .base import LLMProvider, LLMResponse


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(
        self, endpoint: str = "http://localhost:11434", default_model: str = "qwen2.5-coder:7b"
    ):
        self.endpoint = endpoint.rstrip("/")
        self.default_model = default_model

    def is_available(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.endpoint}/api/tags")
            with urllib.request.urlopen(req, timeout=1.5):  # noqa: S310
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
        payload = {
            "model": mdl,
            "prompt": prompt,
            "system": system or "",
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self.endpoint}/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310
                body = json.loads(resp.read().decode())
            return LLMResponse(
                text=body.get("response", ""),
                provider="ollama",
                model=mdl,
                prompt_tokens=body.get("prompt_eval_count", 0),
                completion_tokens=body.get("eval_count", 0),
            )
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            return LLMResponse(
                text=None, provider="ollama", model=mdl, available=False, error=str(exc)
            )
