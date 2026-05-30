"""Sandboxed execution of generated CAD scripts.

The :class:`CadSandbox` launches the CadQuery runner (:mod:`_cq_runner`) in a
separate Python process with a wall-clock timeout. Subprocess isolation means a
runaway or crashing geometry script cannot take down the agent, and lets us hard
-kill on timeout — the behaviour the design doc specifies for the Execution
Agent's sandbox.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, Optional

from ..types import ExecutionResult

_RUNNER = Path(__file__).with_name("_cq_runner.py")


class CadSandbox:
    """Executes CadQuery scripts in an isolated subprocess."""

    def __init__(self, timeout_s: int = 120, python_executable: Optional[str] = None):
        self.timeout_s = timeout_s
        self.python = python_executable or sys.executable

    def execute_cadquery(
        self,
        code: str,
        exports: Dict[str, str],
        result_var: str = "result",
        timeout_s: Optional[int] = None,
    ) -> ExecutionResult:
        """Run ``code`` and export its ``result`` shape to the given paths.

        Args:
            code: Python source that defines ``result`` (a CadQuery Workplane/Shape).
            exports: mapping of format -> output path, e.g. ``{"step": "/tmp/a.step"}``.
            result_var: name of the variable holding the shape.
            timeout_s: per-call override of the wall-clock timeout.
        """
        timeout = timeout_s or self.timeout_s
        for path in exports.values():
            Path(path).parent.mkdir(parents=True, exist_ok=True)

        job = {"code": code, "result_var": result_var, "exports": exports}
        start = time.time()
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as jf:
            json.dump(job, jf)
            job_path = jf.name

        try:
            proc = subprocess.run(
                [self.python, str(_RUNNER), job_path],
                capture_output=True,
                text=True,
                timeout=timeout,
                env=self._safe_env(),
            )
        except subprocess.TimeoutExpired:
            os.unlink(job_path)
            return ExecutionResult(
                success=False,
                error=f"Execution timed out after {timeout}s",
                duration_s=time.time() - start,
            )
        finally:
            if os.path.exists(job_path):
                os.unlink(job_path)

        status = self._parse_status(proc.stdout)
        duration = time.time() - start

        if status and status.get("success"):
            return ExecutionResult(
                success=True,
                stdout=proc.stdout,
                stderr=proc.stderr,
                artifacts=status.get("exports", {}),
                metrics=status.get("metrics", {}),
                duration_s=duration,
            )

        error = (status or {}).get("error") if status else None
        if not error:
            error = (proc.stderr or "Unknown sandbox failure").strip()[-1500:]
        return ExecutionResult(
            success=False,
            stdout=proc.stdout,
            stderr=proc.stderr,
            error=error,
            duration_s=duration,
        )

    @staticmethod
    def _parse_status(stdout: str) -> Optional[dict]:
        for line in stdout.splitlines():
            if line.startswith("AEROFORGE_RESULT::"):
                try:
                    return json.loads(line[len("AEROFORGE_RESULT::") :])
                except json.JSONDecodeError:  # pragma: no cover
                    return None
        return None

    @staticmethod
    def _safe_env() -> Dict[str, str]:
        """A minimal environment for the child — no secrets are forwarded."""
        keep = (
            "PATH",
            "HOME",
            "LANG",
            "LC_ALL",
            "PYTHONPATH",
            "LD_LIBRARY_PATH",
            "HTTPS_PROXY",
            "HTTP_PROXY",
        )
        env = {k: os.environ[k] for k in keep if k in os.environ}
        env["AEROFORGE_SANDBOX"] = "1"
        return env
