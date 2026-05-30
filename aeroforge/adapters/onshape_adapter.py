"""Onshape adapter — interface stub (design doc Phase 1.3).

Onshape is cloud-native with a REST API (FeatureScript) and API-key (BYOK) auth.
This stub defines the contract; the network implementation is future work.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from ..exceptions import AdapterNotAvailableError
from ..types import ExecutionResult
from .base import CadToolAdapter


class OnshapeAdapter(CadToolAdapter):
    """Commercial CAD adapter for Onshape (not yet implemented)."""

    name = "onshape"
    script_language = "featurescript"
    supported_exports: List[str] = ["step", "iges", "stl"]

    def __init__(self, access_key: Optional[str] = None, secret_key: Optional[str] = None):
        self.access_key = access_key
        self.secret_key = secret_key

    def is_available(self) -> bool:
        return False  # REST implementation pending (Phase 1.3)

    def execute_script(
        self, script: str, exports: Dict[str, str], timeout_s: int = 120
    ) -> ExecutionResult:
        raise AdapterNotAvailableError(
            "Onshape adapter is a Phase 1.3 stub. Configure API keys and implement "
            "the REST bridge to enable it."
        )
