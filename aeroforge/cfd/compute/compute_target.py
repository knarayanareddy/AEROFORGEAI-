"""Compute target abstraction.

A uniform interface over where a simulation runs: local workstation, an HPC
cluster (Slurm), or a cloud batch service. The solver-execution agent picks a
target and submits through this interface.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass
from pathlib import Path


@dataclass
class JobSubmission:
    job_id: str
    target: str
    submitted: bool
    detail: str = ""
    script_path: str | None = None


class ComputeTarget(abc.ABC):
    name: str = "abstract"

    @abc.abstractmethod
    def is_available(self) -> bool: ...

    @abc.abstractmethod
    def submit(self, case_dir: Path, command: str, cores: int = 4) -> JobSubmission: ...
