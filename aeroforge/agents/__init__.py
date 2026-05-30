"""Multi-agent pipeline for CAD generation.

Agent hierarchy (design doc 2.2):

    Orchestration Agent
    ├── Intent Agent
    ├── Physics Constraint Agent
    ├── Geometry Planning Agent
    ├── CAD Code Generation Agent
    ├── Execution Agent
    │   └── Error Correction Agent (sub-agent)
    ├── Validation Agent
    └── Report Agent
"""

from __future__ import annotations

from .cad_code_generation_agent import CADCodeGenerationAgent
from .error_correction_agent import ErrorCorrectionAgent
from .execution_agent import ExecutionAgent
from .geometry_planning_agent import GeometryPlanningAgent
from .intent_agent import IntentAgent
from .orchestration_agent import AeroForge
from .physics_constraint_agent import PhysicsConstraintAgent
from .report_agent import ReportAgent
from .validation_agent import ValidationAgent

__all__ = [
    "AeroForge",
    "IntentAgent",
    "PhysicsConstraintAgent",
    "GeometryPlanningAgent",
    "CADCodeGenerationAgent",
    "ExecutionAgent",
    "ErrorCorrectionAgent",
    "ValidationAgent",
    "ReportAgent",
]
