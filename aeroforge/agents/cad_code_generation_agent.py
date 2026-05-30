"""CAD Code Generation Agent.

Produces the CadQuery script for a geometry task. The default path is
deterministic: it calls the Aerospace Geometry Engine, which renders a validated
analytic builder into a self-contained CadQuery script. When an LLM is available
the agent can be asked to author or repair scripts, but the deterministic path
guarantees the pipeline always produces a script — no model required.
"""

from __future__ import annotations

from typing import Optional

from ..geometry.builders import BuildSpec
from ..geometry.engine import AerospaceGeometryEngine
from ..llm.gateway import LLMGateway
from ..types import GeometryTask, PhysicsAugmentedIntent


class CADCodeGenerationAgent:
    """Generates CadQuery scripts for geometry tasks."""

    def __init__(
        self, engine: Optional[AerospaceGeometryEngine] = None, llm: Optional[LLMGateway] = None
    ):
        self.engine = engine or AerospaceGeometryEngine()
        self.llm = llm

    def generate(self, task: GeometryTask, augmented: PhysicsAugmentedIntent) -> BuildSpec:
        """Render a build spec (script + derived metadata) for the task."""
        # Deterministic, template-backed generation via the geometry engine.
        spec = self.engine.build(augmented)
        return spec
