"""Physics configuration engine for CFD."""

from __future__ import annotations

from .atmosphere import build_flow_conditions, isa
from .bc_generator import BoundaryConditionGenerator
from .convergence_strategy import ConvergencePlan, ConvergenceStrategy
from .ic_engine import InitialConditionEngine, InitStrategy
from .scheme_configurator import SchemeConfigurator
from .solver_selector import SolverChoice, SolverSelector
from .turbulence_advisor import TurbulenceAdvisor, TurbulenceChoice

__all__ = [
    "build_flow_conditions",
    "isa",
    "SolverSelector",
    "SolverChoice",
    "TurbulenceAdvisor",
    "TurbulenceChoice",
    "SchemeConfigurator",
    "BoundaryConditionGenerator",
    "InitialConditionEngine",
    "InitStrategy",
    "ConvergenceStrategy",
    "ConvergencePlan",
]
