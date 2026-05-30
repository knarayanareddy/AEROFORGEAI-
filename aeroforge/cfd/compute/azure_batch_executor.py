"""Azure Batch execution target — interface stub (roadmap)."""

from __future__ import annotations

from pathlib import Path

from .compute_target import ComputeTarget, JobSubmission


class AzureBatchExecutor(ComputeTarget):
    name = "azure_batch"

    def is_available(self) -> bool:
        return False

    def submit(self, case_dir: Path, command: str, cores: int = 64) -> JobSubmission:
        return JobSubmission(
            "azure_stub",
            "azure_batch",
            submitted=False,
            detail="Azure Batch executor is a roadmap stub.",
        )
