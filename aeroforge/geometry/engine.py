"""Aerospace Geometry Engine.

Sits between the LLM/agent layer and the CAD adapter. Given a physics-augmented
design intent, it selects the correct parametric builder, merges user parameters
with physics-derived quantities, and returns a CadQuery :class:`BuildSpec`.
"""

from __future__ import annotations

from typing import Any, Dict

from ..exceptions import GeometryPlanError
from ..types import PhysicsAugmentedIntent
from .builders import BUILDERS, BuildSpec


class AerospaceGeometryEngine:
    """Selects and parameterises analytic aerospace geometry builders."""

    def supported_types(self) -> list[str]:
        return sorted(set(BUILDERS.keys()))

    def build(self, augmented: PhysicsAugmentedIntent) -> BuildSpec:
        """Produce a CadQuery build spec for the given augmented intent."""
        intent = augmented.intent
        gtype = intent.geometry_type
        builder = BUILDERS.get(gtype)
        if builder is None:
            raise GeometryPlanError(
                f"No geometry builder for type '{gtype}'. " f"Supported: {self.supported_types()}"
            )

        params: Dict[str, Any] = {}
        params.update(intent.parameters or {})
        # Physics-derived parameters take precedence over raw user values where
        # the physics agent computed an authoritative value (e.g. ramp angles).
        params.update(augmented.physics or {})
        return builder(params)
