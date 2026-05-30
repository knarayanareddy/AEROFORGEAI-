"""AWS Batch execution target — interface stub.

Submitting CFD jobs to AWS Batch (job definitions, queues, S3 case staging) is a
Phase 2 cloud roadmap item. Stub defines the contract.
"""

from __future__ import annotations

from pathlib import Path

from .compute_target import ComputeTarget, JobSubmission


class AWSBatchExecutor(ComputeTarget):
    name = "aws_batch"

    def is_available(self) -> bool:
        return False

    def submit(self, case_dir: Path, command: str, cores: int = 64) -> JobSubmission:
        return JobSubmission(
            "aws_stub", "aws_batch", submitted=False, detail="AWS Batch executor is a roadmap stub."
        )
