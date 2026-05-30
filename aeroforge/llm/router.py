"""Request router — maps a task type to a provider/model.

Implements the design doc's routing rules: code generation, complex reasoning,
fast interaction, and embedding each map to a configured ``provider/model``
string, with a privacy override that forces local inference for IP-sensitive
work.
"""

from __future__ import annotations

from typing import Optional, Tuple

from ..config import LLMConfig

# Logical task types used across the pipeline.
TASK_CODE_GENERATION = "code_generation"
TASK_COMPLEX_REASONING = "complex_reasoning"
TASK_FAST_INTERACTION = "fast_interaction"
TASK_EMBEDDING = "embedding"


class RequestRouter:
    """Resolves task types to (provider, model) using the LLM config routing."""

    def __init__(self, config: LLMConfig):
        self.config = config

    def route(self, task_type: str, ip_sensitive: bool = False) -> Tuple[str, Optional[str]]:
        """Return (provider_name, model_name_or_None) for a task type."""
        routing = self.config.routing
        if ip_sensitive and routing.ip_sensitive_override:
            return self._split(routing.ip_sensitive_override)

        mapping = {
            TASK_CODE_GENERATION: routing.code_generation,
            TASK_COMPLEX_REASONING: routing.complex_reasoning,
            TASK_FAST_INTERACTION: routing.fast_interaction,
            TASK_EMBEDDING: routing.embedding,
        }
        target = mapping.get(task_type) or routing.default_provider
        return self._split(target)

    @staticmethod
    def _split(target: str) -> Tuple[str, Optional[str]]:
        if target and "/" in target:
            provider, model = target.split("/", 1)
            return provider, model
        return target, None
