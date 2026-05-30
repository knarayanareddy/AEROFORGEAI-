"""CAD tool integration layer.

Implements the Adapter Pattern: a uniform :class:`CadToolAdapter` interface with
concrete backends. CadQuery is the default working backend; FreeCAD/OpenSCAD work
when their binaries are installed; commercial backends are Phase 1.3 stubs.
"""

from __future__ import annotations

from typing import Dict, Type

from .base import CadToolAdapter
from .cadquery_adapter import CadQueryAdapter
from .freecad_adapter import FreeCadAdapter
from .fusion360_adapter import Fusion360Adapter
from .onshape_adapter import OnshapeAdapter
from .openscad_adapter import OpenScadAdapter

_REGISTRY: Dict[str, Type[CadToolAdapter]] = {
    "cadquery": CadQueryAdapter,
    "freecad": FreeCadAdapter,
    "openscad": OpenScadAdapter,
    "fusion360": Fusion360Adapter,
    "onshape": OnshapeAdapter,
}


def get_adapter(name: str = "cadquery", **kwargs) -> CadToolAdapter:
    """Instantiate a CAD adapter by name.

    Falls back to CadQuery when the requested adapter exists but its backend is
    not installed, so the pipeline keeps working in headless environments.
    """
    key = name.lower()
    if key not in _REGISTRY:
        raise KeyError(f"Unknown CAD adapter '{name}'. Known: {sorted(_REGISTRY)}")
    adapter = _REGISTRY[key](**kwargs)
    if not adapter.is_available() and key != "cadquery":
        cq = CadQueryAdapter()
        if cq.is_available():
            return cq
    return adapter


def available_adapters() -> Dict[str, bool]:
    """Return {adapter_name: is_available} for diagnostics."""
    out: Dict[str, bool] = {}
    for name, cls in _REGISTRY.items():
        try:
            out[name] = cls().is_available()
        except Exception:
            out[name] = False
    return out


__all__ = [
    "CadToolAdapter",
    "CadQueryAdapter",
    "FreeCadAdapter",
    "OpenScadAdapter",
    "Fusion360Adapter",
    "OnshapeAdapter",
    "get_adapter",
    "available_adapters",
]
