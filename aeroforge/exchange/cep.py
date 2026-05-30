"""CAD Exchange Protocol (CEP) — the Phase 1 / Phase 2 boundary.

A CEP package carries everything a downstream CFD pipeline needs to begin meshing
and solver setup without any knowledge of how the geometry was produced: the
geometry files, the design intent, recommended solver/turbulence/mesh hints, the
validation summary, and full provenance. This module builds and writes the
``cep_manifest.json`` that accompanies every design output.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from ..types import (
    CadOutputPackage,
    FlowRegime,
    StructuredDesignIntent,
)

CEP_VERSION = "1.0"


def _cfd_hints(intent: StructuredDesignIntent, physics: Dict[str, Any]) -> Dict[str, Any]:
    """Derive first-order CFD setup hints from the design intent."""
    regime = intent.flow_regime
    mach = intent.mach_design_point

    if regime == FlowRegime.HYPERSONIC or (mach and mach >= 5.0):
        solver, flow_type = "rhoCentralFoam", "compressible_hypersonic"
        shock_refine = True
    elif regime == FlowRegime.SUPERSONIC or (mach and mach >= 1.2):
        solver, flow_type = "rhoCentralFoam", "compressible_supersonic"
        shock_refine = True
    elif regime == FlowRegime.TRANSONIC or (mach and mach >= 0.8):
        solver, flow_type = "rhoSimpleFoam", "compressible_transonic"
        shock_refine = True
    else:
        solver, flow_type = "simpleFoam", "incompressible_subsonic"
        shock_refine = False

    return {
        "recommended_solver": solver,
        "flow_type": flow_type,
        "turbulence_model": "k_omega_SST",
        "wall_treatment": "low_Re_wall_functions",
        "fluid": "air_ideal_gas",
        "boundary_conditions": {
            "inlet": {"type": f"{regime.value}_inlet" if mach else "velocity_inlet", "mach": mach},
            "outlet": {"type": "pressure_outlet"},
            "walls": {"type": "no_slip_adiabatic"},
        },
        "mesh_hints": {
            "target_y_plus": 1.0,
            "shock_refinement_required": shock_refine,
            "estimated_cell_count": "1M-5M",
        },
    }


class CEPBuilder:
    """Builds and writes CEP packages."""

    def build_manifest(self, pkg: CadOutputPackage, aeroforge_version: str) -> Dict[str, Any]:
        intent = pkg.intent
        physics = pkg.augmented.physics
        m = pkg.metrics

        return {
            "cep_version": CEP_VERSION,
            "aeroforge_version": aeroforge_version,
            "package_id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "geometry": {
                "primary_file": Path(pkg.artifacts.get("step", "")).name or None,
                "formats_available": [k.upper() for k in pkg.artifacts.keys()],
                "bounding_box_m": m.bounding_box_m,
                "volume_m3": m.volume_m3,
                "surface_area_m2": m.surface_area_m2,
                "topology": {
                    "watertight": m.watertight,
                    "n_faces": m.n_faces,
                    "n_edges": m.n_edges,
                    "n_vertices": m.n_vertices,
                },
            },
            "design_intent": {
                "component_type": intent.geometry_type,
                "geometry_family": intent.geometry_family.value,
                "mach_design_point": intent.mach_design_point,
                "flow_regime": intent.flow_regime.value,
                "symmetry": intent.symmetry.value,
            },
            "cfd_hints": _cfd_hints(intent, physics),
            "validation": {
                "confidence_score": pkg.validation.confidence.overall,
                "all_stages_passed": pkg.validation.passed,
                "warnings": pkg.validation.warnings,
                "design_report": Path(pkg.report_path).name if pkg.report_path else None,
            },
            "provenance": {
                "physics_computations": pkg.augmented.physics_computations,
                "llm_provider": pkg.provider,
                "model": pkg.model,
                "session_id": pkg.session_id,
            },
        }

    def write(self, pkg: CadOutputPackage, out_dir: Path, aeroforge_version: str) -> Path:
        manifest = self.build_manifest(pkg, aeroforge_version)
        path = Path(out_dir) / "cep_manifest.json"
        path.write_text(json.dumps(manifest, indent=2, default=str))
        return path
