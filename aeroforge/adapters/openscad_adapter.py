"""OpenSCAD adapter — code-first parametric modelling (STL output).

OpenSCAD is a pure scripting modeller: the entire part is described in code,
which is convenient for LLM generation. It exports STL only (no STEP), so it is
best for rapid concept geometry rather than the professional STEP pipeline.
Degrades gracefully when the ``openscad`` binary is absent.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional

from ..exceptions import AdapterNotAvailableError
from ..types import ExecutionResult
from .base import CadToolAdapter


class OpenScadAdapter(CadToolAdapter):
    """CAD adapter that renders OpenSCAD source to STL."""

    name = "openscad"
    script_language = "openscad"
    supported_exports: List[str] = ["stl"]

    def __init__(self, timeout_s: int = 120, binary: Optional[str] = None):
        self.timeout_s = timeout_s
        self._binary = binary or shutil.which("openscad")

    def is_available(self) -> bool:
        return self._binary is not None

    def execute_script(
        self, script: str, exports: Dict[str, str], timeout_s: int = 120
    ) -> ExecutionResult:
        if not self.is_available():
            raise AdapterNotAvailableError("openscad binary not found on PATH.")
        stl_path = exports.get("stl")
        if not stl_path:
            raise ValueError("OpenSCAD adapter only exports STL; provide exports={'stl': path}")
        Path(stl_path).parent.mkdir(parents=True, exist_ok=True)

        start = time.time()
        with tempfile.NamedTemporaryFile("w", suffix=".scad", delete=False) as sf:
            sf.write(script)
            scad_path = sf.name
        try:
            proc = subprocess.run(
                [self._binary, "-o", stl_path, scad_path],
                capture_output=True,
                text=True,
                timeout=timeout_s or self.timeout_s,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(success=False, error=f"OpenSCAD timed out after {timeout_s}s")
        finally:
            os.unlink(scad_path)

        ok = proc.returncode == 0 and os.path.exists(stl_path)
        return ExecutionResult(
            success=ok,
            stdout=proc.stdout,
            stderr=proc.stderr,
            artifacts={"stl": stl_path} if ok else {},
            error=None if ok else proc.stderr[-1500:],
            duration_s=time.time() - start,
        )
