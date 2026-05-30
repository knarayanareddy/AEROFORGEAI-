"""Local execution target — runs the solver on the local machine."""

from __future__ import annotations

import shutil
import subprocess
import uuid
from pathlib import Path

from .compute_target import ComputeTarget, JobSubmission


class LocalExecutor(ComputeTarget):
    name = "local"

    def is_available(self) -> bool:
        return True

    def submit(self, case_dir: Path, command: str, cores: int = 4) -> JobSubmission:
        case_dir = Path(case_dir)
        binary = command.split()[0]
        job_id = f"local_{uuid.uuid4().hex[:8]}"
        if shutil.which(binary) is None:
            return JobSubmission(
                job_id,
                "local",
                submitted=False,
                detail=f"'{binary}' not installed; cannot run locally.",
            )
        try:
            log = case_dir / "log.run"
            with log.open("w") as fh:
                subprocess.Popen(command.split(), cwd=case_dir, stdout=fh, stderr=subprocess.STDOUT)
            return JobSubmission(
                job_id, "local", submitted=True, detail=f"started '{command}' (log: {log})"
            )
        except Exception as exc:  # noqa: BLE001
            return JobSubmission(job_id, "local", submitted=False, detail=str(exc))
