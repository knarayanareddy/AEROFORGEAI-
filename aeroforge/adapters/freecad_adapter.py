"""FreeCAD adapter — open-source CAD backend driven via ``freecadcmd``.

FreeCAD is the design doc's primary professional backend. This adapter shells out
to the headless ``freecadcmd`` interpreter, so it works wherever FreeCAD is
installed and degrades gracefully (``is_available()`` returns False) where it is
not — for example inside this CI sandbox, where CadQuery is used instead.

Generated scripts must define a ``result`` shape (a ``Part.Shape``) and may set a
``doc_name``. The adapter appends an export harness that writes the requested
formats and prints a status line.
"""

from __future__ import annotations

import json
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

_EXPORT_HARNESS = """
# --- AeroForge export harness (appended) ---
import Part as _Part, json as _json
_exports = {exports!r}
_status = {{"success": False, "exports": {{}}, "error": None}}
try:
    _shape = result.Shape if hasattr(result, "Shape") else result
    for _fmt, _path in _exports.items():
        _Part.export([_shape], _path) if _fmt in ("step", "stp", "iges", "igs") \\
            else _shape.exportStl(_path)
        _status["exports"][_fmt] = _path
    _status["success"] = True
except Exception as _e:
    _status["error"] = "%s: %s" % (type(_e).__name__, _e)
print("AEROFORGE_RESULT::" + _json.dumps(_status))
"""


class FreeCadAdapter(CadToolAdapter):
    """CAD adapter that executes scripts through headless FreeCAD."""

    name = "freecad"
    script_language = "python-freecad"
    supported_exports: List[str] = ["step", "iges", "stl", "brep"]

    def __init__(self, timeout_s: int = 120, binary: Optional[str] = None):
        self.timeout_s = timeout_s
        self._binary = binary or shutil.which("freecadcmd") or shutil.which("FreeCADCmd")

    def is_available(self) -> bool:
        return self._binary is not None

    def execute_script(
        self, script: str, exports: Dict[str, str], timeout_s: int = 120
    ) -> ExecutionResult:
        if not self.is_available():
            raise AdapterNotAvailableError(
                "freecadcmd not found on PATH. Install FreeCAD or use the "
                "'cadquery' adapter (pip install cadquery)."
            )
        for path in exports.values():
            Path(path).parent.mkdir(parents=True, exist_ok=True)

        wrapped = script + _EXPORT_HARNESS.format(exports=exports)
        start = time.time()
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as sf:
            sf.write(wrapped)
            script_path = sf.name
        try:
            proc = subprocess.run(
                [self._binary, "-c", script_path],
                capture_output=True,
                text=True,
                timeout=timeout_s or self.timeout_s,
                env={k: v for k, v in os.environ.items() if k in ("PATH", "HOME", "LANG")},
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(success=False, error=f"FreeCAD timed out after {timeout_s}s")
        finally:
            os.unlink(script_path)

        status = None
        for line in proc.stdout.splitlines():
            if line.startswith("AEROFORGE_RESULT::"):
                status = json.loads(line[len("AEROFORGE_RESULT::") :])
        if status and status.get("success"):
            return ExecutionResult(
                success=True,
                stdout=proc.stdout,
                stderr=proc.stderr,
                artifacts=status["exports"],
                duration_s=time.time() - start,
            )
        return ExecutionResult(
            success=False,
            stdout=proc.stdout,
            stderr=proc.stderr,
            error=(status or {}).get("error") or proc.stderr[-1500:],
            duration_s=time.time() - start,
        )
