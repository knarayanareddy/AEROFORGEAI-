"""Shared data structures used across the AeroForge pipeline.

These types are the contracts between agents. Natural language becomes a
:class:`StructuredDesignIntent`; the physics agent augments it; the planner turns
it into a :class:`GeometryTaskDAG`; execution produces :class:`GeometryResults`;
validation produces a :class:`ValidationReport`; and everything is bundled into a
:class:`CadOutputPackage`.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Enumerations
# --------------------------------------------------------------------------- #
class GeometryFamily(str, Enum):
    PROPULSION = "propulsion"
    AERODYNAMIC_SURFACE = "aerodynamic_surface"
    STRUCTURAL = "structural"
    UNKNOWN = "unknown"


class Dimensionality(str, Enum):
    TWO_D = "2D"
    TWO_HALF_D = "2.5D"
    THREE_D = "3D"


class Symmetry(str, Enum):
    NONE = "none"
    PLANAR = "planar"
    AXISYMMETRIC = "axisymmetric"
    PERIODIC = "periodic"


class FlowRegime(str, Enum):
    SUBSONIC = "subsonic"
    TRANSONIC = "transonic"
    SUPERSONIC = "supersonic"
    HYPERSONIC = "hypersonic"
    UNKNOWN = "unknown"

    @staticmethod
    def from_mach(mach: float) -> "FlowRegime":
        if mach < 0.8:
            return FlowRegime.SUBSONIC
        if mach < 1.2:
            return FlowRegime.TRANSONIC
        if mach < 5.0:
            return FlowRegime.SUPERSONIC
        return FlowRegime.HYPERSONIC


class AutonomyLevel(int, Enum):
    COPILOT = 0
    ASSISTED = 1
    SUPERVISED = 2
    AUTONOMOUS = 3
    FULL_AUTO = 4


# --------------------------------------------------------------------------- #
# Intent
# --------------------------------------------------------------------------- #
class PerformanceTarget(BaseModel):
    metric: str
    value: Optional[float] = None
    operator: str = "eq"  # one of: eq | gte | lte | minimize | maximize
    units: Optional[str] = None


class Envelope(BaseModel):
    max_length_m: Optional[float] = None
    max_width_m: Optional[float] = None
    max_height_m: Optional[float] = None


class Ambiguity(BaseModel):
    field: str
    question: str


class StructuredDesignIntent(BaseModel):
    """Machine-processable representation of a natural-language design request."""

    design_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    raw_input: str = ""

    geometry_type: str = "unknown"
    geometry_family: GeometryFamily = GeometryFamily.UNKNOWN
    dimensionality: Dimensionality = Dimensionality.THREE_D
    symmetry: Symmetry = Symmetry.NONE

    mach_design_point: Optional[float] = None
    mach_min: Optional[float] = None
    mach_max: Optional[float] = None
    altitude_m: Optional[float] = None
    reynolds_number: Optional[float] = None
    flow_regime: FlowRegime = FlowRegime.UNKNOWN

    performance_targets: List[PerformanceTarget] = Field(default_factory=list)

    material: Optional[str] = None
    manufacturing_process: Optional[str] = None
    tolerance_class: str = "medium"
    thermal_limit_K: Optional[float] = None

    envelope: Envelope = Field(default_factory=Envelope)

    # Free-form parameters parsed from the prompt (chord, span, throat radius, ...).
    parameters: Dict[str, Any] = Field(default_factory=dict)

    ambiguities: List[Ambiguity] = Field(default_factory=list)
    intent_confidence: float = 0.0

    def target(self, metric: str) -> Optional[PerformanceTarget]:
        for t in self.performance_targets:
            if t.metric == metric:
                return t
        return None


class PhysicsAugmentedIntent(BaseModel):
    """Design intent after the physics constraint agent has enriched it."""

    intent: StructuredDesignIntent
    # Computed physics quantities (e.g. ramp_angle_deg, throat_area_m2,
    # contraction_ratio, shock_system, total_pressure_recovery, ...).
    physics: Dict[str, Any] = Field(default_factory=dict)
    # Human-readable provenance for every computed quantity.
    derivations: List[str] = Field(default_factory=list)
    physics_computations: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Geometry task DAG
# --------------------------------------------------------------------------- #
@dataclass
class GeometryTask:
    """A single node in the geometry build DAG."""

    id: str
    name: str
    type: str  # cadquery | freecad_script | openscad | api_call
    params: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: List[Dict[str, str]] = field(default_factory=list)
    validation_checks: List[str] = field(default_factory=list)
    timeout_s: int = 120
    max_retries: int = 3


@dataclass
class GeometryTaskDAG:
    """A directed acyclic graph of geometry tasks."""

    tasks: List[GeometryTask] = field(default_factory=list)

    def by_id(self, task_id: str) -> GeometryTask:
        for t in self.tasks:
            if t.id == task_id:
                return t
        raise KeyError(task_id)

    def topological_sort(self) -> List[List[GeometryTask]]:
        """Return tasks grouped into layers (Kahn's algorithm).

        Tasks within a layer have no inter-dependencies and may run in parallel.
        Raises :class:`ValueError` if the graph contains a cycle.
        """
        remaining = {t.id: set(t.depends_on) for t in self.tasks}
        layers: List[List[GeometryTask]] = []
        done: set[str] = set()

        while remaining:
            ready = [tid for tid, deps in remaining.items() if deps <= done]
            if not ready:
                raise ValueError(f"Cycle or missing dependency in DAG: {remaining}")
            layers.append([self.by_id(tid) for tid in ready])
            done.update(ready)
            for tid in ready:
                remaining.pop(tid)
        return layers


# --------------------------------------------------------------------------- #
# Execution + results
# --------------------------------------------------------------------------- #
@dataclass
class ExecutionResult:
    """Result of running a CAD script in an adapter sandbox."""

    success: bool
    stdout: str = ""
    stderr: str = ""
    artifacts: Dict[str, str] = field(default_factory=dict)  # logical name -> file path
    metrics: Dict[str, Any] = field(default_factory=dict)  # topology metrics from the kernel
    error: Optional[str] = None
    duration_s: float = 0.0


@dataclass
class TaskResult:
    task: GeometryTask
    code: str
    success: bool
    attempts: int
    artifacts: Dict[str, str] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class GeometryResults:
    results: List[TaskResult] = field(default_factory=list)

    def extend(self, items: List[TaskResult]) -> None:
        self.results.extend(items)

    @property
    def succeeded(self) -> bool:
        return bool(self.results) and all(r.success for r in self.results)

    def primary_artifact(self, fmt: str = "step") -> Optional[str]:
        """Return the path of the last produced artifact of a given format."""
        path: Optional[str] = None
        for r in self.results:
            for name, p in r.artifacts.items():
                if p.lower().endswith(f".{fmt.lower()}"):
                    path = p
        return path

    def all_artifacts(self) -> Dict[str, str]:
        merged: Dict[str, str] = {}
        for r in self.results:
            merged.update(r.artifacts)
        return merged

    def primary_metrics(self) -> Dict[str, Any]:
        """Topology metrics from the last successful task (the assembled part)."""
        for r in reversed(self.results):
            if r.success and r.metrics:
                return r.metrics
        return {}


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #
class ValidationCheck(BaseModel):
    name: str
    passed: bool
    severity: str = "error"  # error | warning | info
    detail: str = ""
    value: Optional[float] = None


class ValidationStageResult(BaseModel):
    stage: str
    passed: bool
    checks: List[ValidationCheck] = Field(default_factory=list)

    @property
    def warnings(self) -> List[str]:
        return [c.detail for c in self.checks if c.severity == "warning" and not c.passed]


class ConfidenceBreakdown(BaseModel):
    template_conformance: float = 0.0
    physics_pass_rate: float = 0.0
    manufacturing_feasibility: float = 0.0
    topology_integrity: float = 0.0
    overall: float = 0.0


class ValidationReport(BaseModel):
    passed: bool = False
    stages: List[ValidationStageResult] = Field(default_factory=list)
    confidence: ConfidenceBreakdown = Field(default_factory=ConfidenceBreakdown)
    warnings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

    @property
    def watertight(self) -> bool:
        for s in self.stages:
            for c in s.checks:
                if c.name == "watertight_solid":
                    return c.passed
        return False


# --------------------------------------------------------------------------- #
# Output package
# --------------------------------------------------------------------------- #
class GeometryMetrics(BaseModel):
    bounding_box_m: Dict[str, float] = Field(default_factory=dict)
    volume_m3: Optional[float] = None
    surface_area_m2: Optional[float] = None
    n_faces: Optional[int] = None
    n_edges: Optional[int] = None
    n_vertices: Optional[int] = None
    watertight: Optional[bool] = None


@dataclass
class CadOutputPackage:
    """The complete, traceable result of a design run."""

    design_id: str
    intent: StructuredDesignIntent
    augmented: PhysicsAugmentedIntent
    artifacts: Dict[str, str]
    validation: ValidationReport
    metrics: GeometryMetrics
    report_path: Optional[str] = None
    cep_manifest_path: Optional[str] = None
    output_dir: Optional[str] = None
    session_id: Optional[str] = None
    provider: str = "offline/heuristic"
    model: str = "rule-based"
