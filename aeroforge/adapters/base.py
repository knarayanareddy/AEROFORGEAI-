"""CAD tool adapter interface.

Every CAD backend (FreeCAD, CadQuery, OpenSCAD, Fusion 360, ...) implements
:class:`CadToolAdapter`. The agent core only ever talks to this interface, so a
new tool can be added without touching the pipeline — the Adapter Pattern from
the design doc.
"""

from __future__ import annotations

import abc
from typing import Dict, List

from ..types import ExecutionResult


class CadToolAdapter(abc.ABC):
    """Abstract base for all CAD backends."""

    #: Human-readable backend name.
    name: str = "abstract"
    #: Geometry script language the code-generation agent should target.
    script_language: str = "python"
    #: Export formats this adapter can write.
    supported_exports: List[str] = []

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Return True if the backend is installed and usable on this machine."""

    @abc.abstractmethod
    def execute_script(
        self, script: str, exports: Dict[str, str], timeout_s: int = 120
    ) -> ExecutionResult:
        """Execute a geometry script and write the requested export files.

        Args:
            script: backend-specific source code that builds one shape.
            exports: mapping of format -> absolute output path.
            timeout_s: wall-clock timeout for the execution.
        """

    def capabilities(self) -> Dict[str, object]:
        """Describe what this adapter can do (used by ``aeroforge doctor``)."""
        return {
            "name": self.name,
            "available": self.is_available(),
            "script_language": self.script_language,
            "exports": list(self.supported_exports),
        }

    def __repr__(self) -> str:  # pragma: no cover - trivial
        return f"<{type(self).__name__} available={self.is_available()}>"
