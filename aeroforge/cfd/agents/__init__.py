"""CFD multi-agent pipeline.

Agent hierarchy (design doc Part 2, §2.2):

    CFD Orchestration Agent
    ├── Geometry Preparation Agent
    ├── Meshing Agent  (+ Mesh Correction sub-agent)
    ├── Physics Configuration Agent
    ├── Solver Execution Agent  (+ Adaptive Control via Monitoring Agent)
    ├── Monitoring Agent
    ├── Post-Processing Agent
    └── Design Loop Agent
"""

from __future__ import annotations

from .cfd_orchestration_agent import AeroForgeCFD, CFDRunPackage
from .design_loop_agent import DesignLoopAgent
from .geometry_preparation_agent import GeometryPreparationAgent
from .meshing_agent import MeshingAgent
from .monitoring_agent import MonitoringAgent
from .physics_configuration_agent import PhysicsConfigurationAgent
from .post_processing_agent import PostProcessingAgent
from .solver_execution_agent import SolverExecutionAgent

__all__ = [
    "AeroForgeCFD",
    "CFDRunPackage",
    "GeometryPreparationAgent",
    "MeshingAgent",
    "PhysicsConfigurationAgent",
    "SolverExecutionAgent",
    "MonitoringAgent",
    "PostProcessingAgent",
    "DesignLoopAgent",
]
