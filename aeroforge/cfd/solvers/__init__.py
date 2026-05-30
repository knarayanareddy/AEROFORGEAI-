"""CFD solver integration layer."""

from __future__ import annotations

from typing import Dict, Type

from .base import SolverAdapter
from .fluent_adapter import FluentAdapter
from .openfoam_adapter import OpenFOAMAdapter
from .starccm_adapter import StarCCMAdapter
from .su2_adapter import SU2Adapter

_REGISTRY: Dict[str, Type[SolverAdapter]] = {
    "openfoam": OpenFOAMAdapter,
    "su2": SU2Adapter,
    "fluent": FluentAdapter,
    "starccm": StarCCMAdapter,
}


def get_solver(name: str = "openfoam", **kwargs) -> SolverAdapter:
    key = name.lower()
    if key not in _REGISTRY:
        raise KeyError(f"Unknown solver '{name}'. Known: {sorted(_REGISTRY)}")
    return _REGISTRY[key](**kwargs)


def available_solvers() -> Dict[str, bool]:
    out = {}
    for n, c in _REGISTRY.items():
        try:
            out[n] = c().is_available()
        except Exception:
            out[n] = False
    return out


__all__ = [
    "SolverAdapter",
    "OpenFOAMAdapter",
    "SU2Adapter",
    "FluentAdapter",
    "StarCCMAdapter",
    "get_solver",
    "available_solvers",
]
