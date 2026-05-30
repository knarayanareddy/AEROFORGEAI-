"""LLM provider abstraction layer (BYOK + local-first)."""

from __future__ import annotations

from .gateway import LLMGateway
from .prompt_registry import PromptTemplate, all_prompts, get_prompt
from .providers import LLMProvider, LLMResponse
from .router import (
    TASK_CODE_GENERATION,
    TASK_COMPLEX_REASONING,
    TASK_EMBEDDING,
    TASK_FAST_INTERACTION,
    RequestRouter,
)

__all__ = [
    "LLMGateway",
    "RequestRouter",
    "LLMProvider",
    "LLMResponse",
    "PromptTemplate",
    "get_prompt",
    "all_prompts",
    "TASK_CODE_GENERATION",
    "TASK_COMPLEX_REASONING",
    "TASK_FAST_INTERACTION",
    "TASK_EMBEDDING",
]
