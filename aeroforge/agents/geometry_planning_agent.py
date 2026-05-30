"""Geometry Planning Agent.

Decomposes an augmented design intent into a :class:`GeometryTaskDAG` — a
directed acyclic graph of geometry build tasks with dependency ordering. For the
Phase-1 parametric single-solid components this is a one-node build DAG; the DAG
machinery (layered topological execution) generalises to multi-component
assemblies (cowl + ramp + throat + bleed) targeted in later phases.
"""

from __future__ import annotations

from typing import Any, Dict

from ..types import GeometryTask, GeometryTaskDAG, PhysicsAugmentedIntent


class GeometryPlanningAgent:
    """Builds the ordered geometry task DAG."""

    def plan(self, augmented: PhysicsAugmentedIntent) -> GeometryTaskDAG:
        intent = augmented.intent
        params: Dict[str, Any] = {**(intent.parameters or {}), **(augmented.physics or {})}

        build = GeometryTask(
            id="build_main",
            name=intent.geometry_type,
            type="cadquery",
            params=params,
            depends_on=[],
            outputs=[{"type": "shape", "name": "result", "format": "brep"}],
            validation_checks=["watertight", "non_degenerate_volume", "no_self_intersections"],
            timeout_s=120,
            max_retries=3,
        )
        return GeometryTaskDAG(tasks=[build])
