"""Fusion 360 adapter — interface stub (design doc Phase 1.3).

Fusion 360 exposes a REST API plus a Python add-in model with OAuth2 auth. This
stub defines the contract and authentication surface so the rest of the pipeline
can target it; the network implementation is future work.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from ..exceptions import AdapterNotAvailableError
from ..types import ExecutionResult
from .base import CadToolAdapter


class Fusion360Adapter(CadToolAdapter):
    """Commercial CAD adapter for Autodesk Fusion 360 (not yet implemented)."""

    name = "fusion360"
    script_language = "python-fusion"
    supported_exports: List[str] = ["step", "iges", "stl"]

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id
        self.client_secret = client_secret

    def is_available(self) -> bool:
        return False  # network/OAuth implementation pending (Phase 1.3)

    def execute_script(
        self, script: str, exports: Dict[str, str], timeout_s: int = 120
    ) -> ExecutionResult:
        raise AdapterNotAvailableError(
            "Fusion 360 adapter is a Phase 1.3 stub. Configure OAuth2 credentials "
            "and implement the REST bridge to enable it."
        )
