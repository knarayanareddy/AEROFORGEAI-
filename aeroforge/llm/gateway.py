"""LLM Gateway.

The single entry point the agent core uses for all LLM work. It:

* instantiates providers from the :class:`LLMConfig`,
* routes a task type to a provider/model (:class:`RequestRouter`),
* walks the configured fallback chain when a provider is unavailable,
* always ends at the :class:`OfflineProvider` so a missing LLM degrades to an
  ``available=False`` response (never an exception), and
* audit-logs every call (no exceptions — design doc requirement).

The agent core never imports a provider directly; it only calls ``complete``.
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional

from ..config import LLMConfig
from .providers import (
    AnthropicProvider,
    LlamaCppProvider,
    LLMProvider,
    LLMResponse,
    OfflineProvider,
    OllamaProvider,
    OpenAIProvider,
)
from .router import RequestRouter

_PROVIDER_CLASSES = {
    "ollama": OllamaProvider,
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "llama_cpp": LlamaCppProvider,
}


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class LLMGateway:
    """Routing, fallback, cost tracking, and audit for all LLM calls."""

    def __init__(self, config: Optional[LLMConfig] = None, audit_logger=None):
        self.config = config or LLMConfig.default()
        self.router = RequestRouter(self.config)
        self.audit = audit_logger
        self._providers: Dict[str, LLMProvider] = self._build_providers()
        self._offline = OfflineProvider()
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

    def _build_providers(self) -> Dict[str, LLMProvider]:
        providers: Dict[str, LLMProvider] = {}
        for name, pcfg in self.config.providers.items():
            cls = _PROVIDER_CLASSES.get(name)
            if not cls:
                continue
            kwargs = {}
            if name in ("ollama", "llama_cpp") and pcfg.endpoint:
                kwargs["endpoint"] = pcfg.endpoint
            if name in ("anthropic", "openai") and pcfg.api_key:
                kwargs["api_key"] = pcfg.api_key
            if pcfg.models.get("coding"):
                kwargs["default_model"] = pcfg.models["coding"]
            try:
                providers[name] = cls(**kwargs)
            except Exception:  # pragma: no cover
                continue
        return providers

    def available_providers(self) -> Dict[str, bool]:
        out = {name: p.is_available() for name, p in self._providers.items()}
        out["offline"] = True
        return out

    def complete(
        self,
        task_type: str,
        prompt: str,
        system: Optional[str] = None,
        ip_sensitive: bool = False,
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        """Route and execute a completion with fallback + audit logging."""
        provider_name, model = self.router.route(task_type, ip_sensitive=ip_sensitive)

        # Build the ordered list of candidates: routed provider, then fallbacks.
        order: List[str] = [provider_name]
        for entry in self.config.fallback_chain:
            pname = entry.split("/", 1)[0]
            if pname not in order:
                order.append(pname)

        start = time.time()
        last: Optional[LLMResponse] = None
        for pname in order:
            provider = self._providers.get(pname)
            if provider is None or not provider.is_available():
                continue
            resp = provider.complete(
                prompt, system=system, model=model, temperature=temperature, max_tokens=max_tokens
            )
            last = resp
            if resp.ok:
                self._track(resp)
                self._log(task_type, resp, time.time() - start)
                return resp

        # Nothing available -> offline signal.
        resp = self._offline.complete(prompt, system=system)
        self._log(task_type, last or resp, time.time() - start)
        return last if (last and not last.available) else resp

    def _track(self, resp: LLMResponse) -> None:
        self.total_prompt_tokens += resp.prompt_tokens or _estimate_tokens("")
        self.total_completion_tokens += resp.completion_tokens or _estimate_tokens(resp.text or "")

    def _log(self, task_type: str, resp: LLMResponse, duration_s: float) -> None:
        if self.audit is None:
            return
        try:
            self.audit.log_event(
                {
                    "type": "llm_call",
                    "task_type": task_type,
                    "provider": resp.provider,
                    "model": resp.model,
                    "available": resp.available,
                    "prompt_tokens": resp.prompt_tokens,
                    "completion_tokens": resp.completion_tokens,
                    "duration_s": round(duration_s, 4),
                    "error": resp.error,
                }
            )
        except Exception:  # pragma: no cover - logging must never break the pipeline
            pass
