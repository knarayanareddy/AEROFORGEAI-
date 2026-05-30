"""Configuration for AeroForge.

Configuration is layered:

1. Built-in defaults (this module).
2. ``~/.aeroforge/llm_config.yaml`` and ``user_preferences.yaml`` if present.
3. Environment variables (e.g. ``ANTHROPIC_API_KEY``) referenced as ``${VAR}``.

Nothing here requires any secret to be set: with no keys and no local LLM the
system runs fully offline using the heuristic intent parser.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from pydantic import BaseModel, Field

from .types import AutonomyLevel

_ENV_PATTERN = re.compile(r"\$\{([A-Z0-9_]+)\}")


def _expand_env(value: Any) -> Any:
    """Recursively expand ``${VAR}`` references in strings using os.environ."""
    if isinstance(value, str):
        return _ENV_PATTERN.sub(lambda m: os.environ.get(m.group(1), ""), value)
    if isinstance(value, dict):
        return {k: _expand_env(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand_env(v) for v in value]
    return value


class ProviderConfig(BaseModel):
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    binary_path: Optional[str] = None
    model_path: Optional[str] = None
    models: Dict[str, str] = Field(default_factory=dict)
    enabled: bool = False
    privacy_mode: bool = False
    gpu_layers: int = 0
    context_size: int = 8192
    threads: int = 8


class RoutingConfig(BaseModel):
    default_provider: str = "offline"
    code_generation: Optional[str] = None
    complex_reasoning: Optional[str] = None
    fast_interaction: Optional[str] = None
    embedding: Optional[str] = None
    ip_sensitive_override: str = "ollama"


class LLMConfig(BaseModel):
    providers: Dict[str, ProviderConfig] = Field(default_factory=dict)
    routing: RoutingConfig = Field(default_factory=RoutingConfig)
    fallback_chain: list[str] = Field(default_factory=list)

    @classmethod
    def from_yaml(cls, path: Path) -> "LLMConfig":
        data = yaml.safe_load(path.read_text()) or {}
        return cls.model_validate(_expand_env(data))

    @classmethod
    def default(cls) -> "LLMConfig":
        """A safe, offline-first default configuration."""
        return cls(
            providers={
                "ollama": ProviderConfig(
                    endpoint="http://localhost:11434",
                    models={
                        "reasoning": "deepseek-r1:70b",
                        "coding": "qwen2.5-coder:32b",
                        "fast": "qwen2.5-coder:7b",
                        "embedding": "nomic-embed-text",
                    },
                    enabled=False,
                    privacy_mode=True,
                ),
                "anthropic": ProviderConfig(
                    api_key="${ANTHROPIC_API_KEY}",
                    models={
                        "reasoning": "claude-opus-4-5",
                        "coding": "claude-sonnet-4-5",
                        "fast": "claude-haiku-4-5",
                    },
                    enabled=False,
                ),
                "openai": ProviderConfig(
                    api_key="${OPENAI_API_KEY}",
                    models={"reasoning": "o3", "coding": "gpt-4.5", "fast": "gpt-4o-mini"},
                    enabled=False,
                ),
            },
            routing=RoutingConfig(default_provider="offline"),
            fallback_chain=["offline"],
        )


class AeroForgeConfig(BaseModel):
    """Top-level runtime configuration."""

    autonomy_level: AutonomyLevel = AutonomyLevel.SUPERVISED
    default_adapter: str = "cadquery"
    max_correction_attempts: int = 3
    execution_timeout_s: int = 120
    precision_mm: float = 0.001
    privacy_mode: bool = False
    output_dir: Path = Field(default_factory=lambda: Path.cwd() / "out")
    config_home: Path = Field(default_factory=lambda: Path.home() / ".aeroforge")
    llm: LLMConfig = Field(default_factory=LLMConfig.default)

    model_config = {"arbitrary_types_allowed": True}

    @classmethod
    def load(cls, config_home: Optional[Path] = None) -> "AeroForgeConfig":
        """Load configuration from ``~/.aeroforge`` with offline-safe fallbacks."""
        home = config_home or Path(os.environ.get("AEROFORGE_HOME", Path.home() / ".aeroforge"))
        cfg = cls(config_home=home)

        prefs = home / "user_preferences.yaml"
        if prefs.exists():
            data = _expand_env(yaml.safe_load(prefs.read_text()) or {})
            for key in (
                "autonomy_level",
                "default_adapter",
                "max_correction_attempts",
                "execution_timeout_s",
                "precision_mm",
                "privacy_mode",
            ):
                if key in data:
                    setattr(cfg, key, data[key])

        llm_path = home / "llm_config.yaml"
        if llm_path.exists():
            cfg.llm = LLMConfig.from_yaml(llm_path)

        return cfg

    def ensure_output_dir(self) -> Path:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        return self.output_dir
