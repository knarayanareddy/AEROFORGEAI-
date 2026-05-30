"""Compute infrastructure: local, HPC (Slurm), and cloud execution targets."""

from __future__ import annotations

from typing import Dict, Type

from .aws_batch_executor import AWSBatchExecutor
from .azure_batch_executor import AzureBatchExecutor
from .compute_target import ComputeTarget, JobSubmission
from .local_executor import LocalExecutor
from .slurm_executor import SlurmExecutor

_REGISTRY: Dict[str, Type[ComputeTarget]] = {
    "local": LocalExecutor,
    "slurm": SlurmExecutor,
    "aws_batch": AWSBatchExecutor,
    "azure_batch": AzureBatchExecutor,
}


def get_compute_target(name: str = "local", **kwargs) -> ComputeTarget:
    key = name.lower()
    if key not in _REGISTRY:
        raise KeyError(f"Unknown compute target '{name}'. Known: {sorted(_REGISTRY)}")
    return _REGISTRY[key](**kwargs)


__all__ = [
    "ComputeTarget",
    "JobSubmission",
    "LocalExecutor",
    "SlurmExecutor",
    "AWSBatchExecutor",
    "AzureBatchExecutor",
    "get_compute_target",
]
