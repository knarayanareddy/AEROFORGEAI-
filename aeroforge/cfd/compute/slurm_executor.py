"""Slurm HPC execution target — generates and submits batch job scripts.

Writes a Slurm ``sbatch`` script (partitions, MPI ranks, decomposition,
solver launch) and submits it with ``sbatch`` when available. The script is
always written (useful even without a scheduler present), so users can submit it
on their own cluster.
"""

from __future__ import annotations

import shutil
import subprocess
import uuid
from pathlib import Path

from .compute_target import ComputeTarget, JobSubmission


class SlurmExecutor(ComputeTarget):
    name = "slurm"

    def __init__(self, partition: str = "compute", time_limit: str = "08:00:00"):
        self.partition = partition
        self.time_limit = time_limit

    def is_available(self) -> bool:
        return shutil.which("sbatch") is not None

    def generate_script(self, case_dir: Path, command: str, cores: int = 64) -> Path:
        case_dir = Path(case_dir)
        nodes = max(1, cores // 32)
        script = (
            "#!/bin/bash\n"
            f"#SBATCH --job-name=aeroforge_cfd\n"
            f"#SBATCH --partition={self.partition}\n"
            f"#SBATCH --nodes={nodes}\n"
            f"#SBATCH --ntasks={cores}\n"
            f"#SBATCH --time={self.time_limit}\n"
            "#SBATCH --output=slurm-%j.out\n\n"
            "set -e\n"
            "# Decompose, run in parallel, then reconstruct (OpenFOAM).\n"
            f"decomposePar -force\n"
            f"mpirun -np {cores} {command} -parallel\n"
            "reconstructPar -latestTime\n"
        )
        path = case_dir / "submit.slurm"
        path.write_text(script)
        return path

    def submit(self, case_dir: Path, command: str, cores: int = 64) -> JobSubmission:
        script = self.generate_script(case_dir, command, cores)
        job_id = f"slurm_{uuid.uuid4().hex[:8]}"
        if not self.is_available():
            return JobSubmission(
                job_id,
                "slurm",
                submitted=False,
                script_path=str(script),
                detail=(
                    "Slurm not available here; script written to "
                    f"{script}. Submit with: sbatch {script.name}"
                ),
            )
        try:
            out = subprocess.check_output(["sbatch", str(script)], cwd=case_dir, text=True)
            return JobSubmission(
                out.strip().split()[-1],
                "slurm",
                submitted=True,
                script_path=str(script),
                detail=out.strip(),
            )
        except Exception as exc:  # noqa: BLE001
            return JobSubmission(
                job_id, "slurm", submitted=False, script_path=str(script), detail=str(exc)
            )
