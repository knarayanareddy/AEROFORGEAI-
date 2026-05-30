"""Shared data structures for the CFD pipeline (Phase 2).

These are the contracts between CFD agents. A CEP package becomes a
:class:`SimulationContext`; geometry prep yields a :class:`GeometryPreparationPackage`;
meshing yields a :class:`MeshPackage`; physics config yields a
:class:`SolverConfigPackage`; the solver yields :class:`SimulationResult`; the
design loop yields a :class:`DesignLoopDecision`.

Self-contained: no imports from the Phase 1 ``aeroforge`` modules.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


# --------------------------------------------------------------------------- #
# Enumerations
# --------------------------------------------------------------------------- #
class FlowRegime(str, Enum):
    INCOMPRESSIBLE = "incompressible"
    SUBSONIC = "subsonic"
    TRANSONIC = "transonic"
    SUPERSONIC = "supersonic"
    HYPERSONIC = "hypersonic"

    @staticmethod
    def from_mach(mach: Optional[float]) -> "FlowRegime":
        if mach is None:
            return FlowRegime.SUBSONIC
        if mach < 0.3:
            return FlowRegime.INCOMPRESSIBLE
        if mach < 0.8:
            return FlowRegime.SUBSONIC
        if mach < 1.2:
            return FlowRegime.TRANSONIC
        if mach < 5.0:
            return FlowRegime.SUPERSONIC
        return FlowRegime.HYPERSONIC


class DomainType(str, Enum):
    INTERNAL_FLOW = "internal_flow"
    EXTERNAL_FLOW = "external_flow"
    MIXED = "mixed"


class PatchType(str, Enum):
    INLET = "inlet"
    OUTLET = "outlet"
    WALL = "wall"
    SYMMETRY = "symmetry"
    FARFIELD = "farfield"


class LoopDecision(str, Enum):
    ACCEPT = "ACCEPT"
    ITERATE = "ITERATE"
    ESCALATE = "ESCALATE"


# --------------------------------------------------------------------------- #
# CEP (parsed from JSON — the only Phase 1 contract)
# --------------------------------------------------------------------------- #
@dataclass
class CEPManifest:
    """Parsed view of a Phase 1 cep_manifest.json."""

    raw: Dict[str, Any]
    cep_version: str
    primary_geometry_file: Optional[str]
    component_type: str
    flow_regime: str
    mach_design_point: Optional[float]
    cfd_hints: Dict[str, Any] = field(default_factory=dict)
    bounding_box_m: Dict[str, float] = field(default_factory=dict)
    performance_targets: List[Dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CEPManifest":
        geom = d.get("geometry", {})
        intent = d.get("design_intent", {})
        return cls(
            raw=d,
            cep_version=d.get("cep_version", "1.0"),
            primary_geometry_file=geom.get("primary_file"),
            component_type=intent.get("component_type", "unknown"),
            flow_regime=intent.get("flow_regime", "subsonic"),
            mach_design_point=intent.get("mach_design_point"),
            cfd_hints=d.get("cfd_hints", {}),
            bounding_box_m=geom.get("bounding_box_m", {}),
            performance_targets=d.get("design_intent", {}).get("performance_targets", []),
        )


@dataclass
class FluidProperties:
    """Thermophysical properties of the working fluid."""

    name: str = "air"
    density: float = 1.225  # kg/m^3
    dynamic_viscosity: float = 1.789e-5  # Pa.s
    temperature_K: float = 288.15
    pressure_pa: float = 101325.0
    gamma: float = 1.4
    R: float = 287.05

    @property
    def kinematic_viscosity(self) -> float:
        return self.dynamic_viscosity / self.density

    @property
    def speed_of_sound(self) -> float:
        return (self.gamma * self.R * self.temperature_K) ** 0.5


@dataclass
class FlowConditions:
    """Free-stream / operating flow conditions for the simulation."""

    mach: float
    regime: FlowRegime
    velocity_ms: float
    temperature_K: float
    pressure_pa: float
    density: float
    reynolds_number: float
    characteristic_length_m: float
    fluid: FluidProperties

    @property
    def is_compressible(self) -> bool:
        return self.mach >= 0.3


@dataclass
class BoundaryPatch:
    name: str
    patch_type: PatchType
    openfoam_type: str
    notes: str = ""


# --------------------------------------------------------------------------- #
# Pipeline packages
# --------------------------------------------------------------------------- #
@dataclass
class GeometryPreparationPackage:
    manifest: CEPManifest
    geometry_file: Optional[str]
    domain_type: DomainType
    patches: List[BoundaryPatch]
    flow_conditions: FlowConditions
    characteristic_length_m: float
    warnings: List[str] = field(default_factory=list)


@dataclass
class BoundaryLayerSpec:
    first_layer_height_m: float
    growth_ratio: float
    n_layers: int
    total_thickness_m: float
    target_yplus: float
    estimated_actual_yplus: float


@dataclass
class MeshQualityReport:
    passed: bool
    fatal: bool
    metrics: Dict[str, float] = field(default_factory=dict)
    grades: Dict[str, str] = field(default_factory=dict)  # metric -> excellent/acceptable/reject
    warnings: List[str] = field(default_factory=list)


@dataclass
class MeshPackage:
    mesh_file: Optional[str]
    format: str
    n_nodes: int
    n_cells: int
    boundary_layer: Optional[BoundaryLayerSpec]
    quality: Optional[MeshQualityReport]
    mesher: str
    success: bool = True
    error: Optional[str] = None


@dataclass
class SolverConfigPackage:
    solver: str
    turbulence_model: str
    wall_treatment: str
    files: Dict[str, str] = field(default_factory=dict)  # relative path -> content
    notes: List[str] = field(default_factory=list)


@dataclass
class SimulationResult:
    success: bool
    converged: bool
    iterations: int
    final_residuals: Dict[str, float] = field(default_factory=dict)
    quantities: Dict[str, float] = field(default_factory=dict)
    case_dir: Optional[str] = None
    log_file: Optional[str] = None
    error: Optional[str] = None
    note: str = ""


@dataclass
class DesignLoopDecision:
    decision: LoopDecision
    rationale: str
    gaps: List[Dict[str, Any]] = field(default_factory=list)
    modifications: List[Dict[str, Any]] = field(default_factory=list)
