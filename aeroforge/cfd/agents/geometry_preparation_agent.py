"""Geometry Preparation Agent — CEP ingestion and domain setup.

Reads a Phase-1 CEP package (``cep_manifest.json`` + geometry file), validates
it, classifies the simulation domain (internal vs. external flow), identifies the
boundary patches, and derives free-stream flow conditions. This is the entry
point for every CFD run and the only place the Phase 1 → Phase 2 contract (the
CEP JSON) is read.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from ..exceptions import CEPIngestionError
from ..physics.atmosphere import build_flow_conditions
from ..types import (
    BoundaryPatch,
    CEPManifest,
    DomainType,
    FlowRegime,
    GeometryPreparationPackage,
    PatchType,
)

_INTERNAL = ("nozzle", "inlet", "scramjet", "duct", "combustor", "diffuser")
_EXTERNAL = ("airfoil", "wing", "nose", "ogive", "cone", "fuselage", "fairing", "body", "fin")

# Default operating altitudes (m) by regime when the CEP gives no explicit one.
_DEFAULT_ALT = {
    FlowRegime.HYPERSONIC: 25000.0,
    FlowRegime.SUPERSONIC: 15000.0,
    FlowRegime.TRANSONIC: 11000.0,
    FlowRegime.SUBSONIC: 3000.0,
    FlowRegime.INCOMPRESSIBLE: 0.0,
}


class GeometryPreparationAgent:
    """Ingests a CEP package and prepares geometry + conditions for meshing."""

    def ingest_cep(self, cep_path: Path) -> GeometryPreparationPackage:
        cep_path = Path(cep_path)
        manifest_file = cep_path if cep_path.is_file() else cep_path / "cep_manifest.json"
        if not manifest_file.exists():
            raise CEPIngestionError(f"CEP manifest not found at {manifest_file}")
        try:
            data = json.loads(manifest_file.read_text())
        except json.JSONDecodeError as exc:
            raise CEPIngestionError(f"Malformed CEP manifest: {exc}") from exc

        manifest = CEPManifest.from_dict(data)
        warnings: List[str] = []

        # Resolve geometry file path (relative to the manifest directory).
        geom_file: Optional[str] = None
        if manifest.primary_geometry_file:
            candidate = manifest_file.parent / manifest.primary_geometry_file
            if candidate.exists():
                geom_file = str(candidate)
            else:
                warnings.append(
                    f"Geometry file {manifest.primary_geometry_file} not found; "
                    "domain will use a representative box."
                )

        domain_type = self._classify_domain(manifest.component_type)
        char_len = self._characteristic_length(manifest)
        regime = FlowRegime.from_mach(manifest.mach_design_point)
        altitude = self._altitude(manifest, regime)
        mach = manifest.mach_design_point or 0.3

        flow = build_flow_conditions(
            mach=mach, characteristic_length_m=char_len, altitude_m=altitude
        )
        patches = self._identify_patches(domain_type, manifest.component_type)

        return GeometryPreparationPackage(
            manifest=manifest,
            geometry_file=geom_file,
            domain_type=domain_type,
            patches=patches,
            flow_conditions=flow,
            characteristic_length_m=char_len,
            warnings=warnings,
        )

    # ------------------------------------------------------------------ #
    def _classify_domain(self, component_type: str) -> DomainType:
        c = (component_type or "").lower()
        if any(k in c for k in _INTERNAL):
            return DomainType.INTERNAL_FLOW
        if any(k in c for k in _EXTERNAL):
            return DomainType.EXTERNAL_FLOW
        return DomainType.EXTERNAL_FLOW

    def _characteristic_length(self, manifest: CEPManifest) -> float:
        bb = manifest.bounding_box_m or {}
        dims = [v for v in (bb.get("x"), bb.get("y"), bb.get("z")) if v]
        return max(dims) if dims else 1.0

    def _altitude(self, manifest: CEPManifest, regime: FlowRegime) -> float:
        bcs = manifest.cfd_hints.get("boundary_conditions", {}).get("inlet", {})
        # If the CEP carries inlet p/T we could invert ISA; default by regime instead.
        return _DEFAULT_ALT.get(regime, 0.0)

    def _identify_patches(self, domain: DomainType, component_type: str) -> List[BoundaryPatch]:
        if domain == DomainType.INTERNAL_FLOW:
            patches = [
                BoundaryPatch("inlet", PatchType.INLET, "patch"),
                BoundaryPatch("outlet", PatchType.OUTLET, "patch"),
                BoundaryPatch("walls", PatchType.WALL, "wall"),
            ]
            if any(k in component_type.lower() for k in ("inlet", "scramjet", "ramp")):
                patches.append(BoundaryPatch("symmetry_plane", PatchType.SYMMETRY, "symmetryPlane"))
            return patches
        return [
            BoundaryPatch("farfield", PatchType.FARFIELD, "patch"),
            BoundaryPatch("body", PatchType.WALL, "wall"),
        ]
