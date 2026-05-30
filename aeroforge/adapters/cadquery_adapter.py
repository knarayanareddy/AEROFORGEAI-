"""CadQuery adapter — the primary, pure-Python CAD backend for Phase 1.

CadQuery wraps the same OpenCASCADE kernel that FreeCAD uses, so it produces
true STEP / IGES / STL / BREP output, but installs from PyPI with no GUI and is
trivially unit-testable. Generated scripts run inside the :class:`CadSandbox`
subprocess for isolation.
"""

from __future__ import annotations

from typing import Dict, List

from ..security.sandbox import CadSandbox
from ..types import ExecutionResult
from .base import CadToolAdapter


class CadQueryAdapter(CadToolAdapter):
    """Primary CAD adapter backed by CadQuery + OpenCASCADE."""

    name = "cadquery"
    script_language = "python-cadquery"
    supported_exports: List[str] = ["step", "stl", "iges", "brep"]

    def __init__(self, timeout_s: int = 120):
        self._sandbox = CadSandbox(timeout_s=timeout_s)

    def is_available(self) -> bool:
        try:
            import cadquery  # noqa: F401

            return True
        except Exception:
            return False

    def execute_script(
        self, script: str, exports: Dict[str, str], timeout_s: int = 120
    ) -> ExecutionResult:
        return self._sandbox.execute_cadquery(script, exports, timeout_s=timeout_s)
