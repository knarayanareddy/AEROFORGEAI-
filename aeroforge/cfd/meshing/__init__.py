"""Meshing pipeline: adapters, y+ estimation, quality validation, refinement."""

from __future__ import annotations

from typing import Dict, Type

from .base import MeshToolAdapter
from .blockmesh_adapter import BlockMeshAdapter
from .gmsh_adapter import GmshAdapter
from .mesh_quality_validator import MeshQualityValidator
from .netgen_adapter import NetgenAdapter
from .refinement_zones import RefinementZone, RefinementZoneEngine
from .snappyhex_adapter import SnappyHexAdapter
from .yplus_estimator import YPlusEstimator

_REGISTRY: Dict[str, Type[MeshToolAdapter]] = {
    "gmsh": GmshAdapter,
    "blockmesh": BlockMeshAdapter,
    "snappyhexmesh": SnappyHexAdapter,
    "netgen": NetgenAdapter,
}


def get_mesher(name: str = "gmsh") -> MeshToolAdapter:
    """Instantiate a mesher, falling back to Gmsh when the requested one is absent."""
    key = name.lower()
    if key not in _REGISTRY:
        raise KeyError(f"Unknown mesher '{name}'. Known: {sorted(_REGISTRY)}")
    mesher = _REGISTRY[key]()
    if not mesher.is_available() and key != "gmsh":
        gm = GmshAdapter()
        if gm.is_available():
            return gm
    return mesher


def available_meshers() -> Dict[str, bool]:
    return {n: c().is_available() for n, c in _REGISTRY.items()}


__all__ = [
    "MeshToolAdapter",
    "GmshAdapter",
    "BlockMeshAdapter",
    "SnappyHexAdapter",
    "NetgenAdapter",
    "YPlusEstimator",
    "MeshQualityValidator",
    "RefinementZoneEngine",
    "RefinementZone",
    "get_mesher",
    "available_meshers",
]
