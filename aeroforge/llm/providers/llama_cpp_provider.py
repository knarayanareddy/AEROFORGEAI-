"""llama.cpp provider — local inference via an llama-server endpoint.

Targets the OpenAI-compatible ``/v1/chat/completions`` endpoint exposed by
``llama-server``. Standard-library HTTP only; reports unavailable when no server
is reachable. Suited to CPU-only or mixed environments.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Optional

from .base import LLMProvider, LLMResponse


class LlamaCppProvider(LLMProvider):
    name = "llama_cpp"

    def __init__(self, endpoint: str = "http://localhost:8080", default_model: str = "local-gguf"):
        self.endpoint = endpoint.rstrip("/")
        self.default_model = default_model

    def is_available(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.endpoint}/health")
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
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system or "You are an aerospace CAD assistant."},
                {"role": "user", "content": prompt},
            ],
        }
        req = urllib.request.Request(
            f"{self.endpoint}/v1/chat/completions",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310
                body = json.loads(resp.read().decode())
            text = body["choices"][0]["message"]["content"]
            usage = body.get("usage", {})
            return LLMResponse(
                text=text,
                provider="llama_cpp",
                model=mdl,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
            )
        except (urllib.error.URLError, TimeoutError, OSError, KeyError) as exc:
            return LLMResponse(
                text=None, provider="llama_cpp", model=mdl, available=False, error=str(exc)
            )
