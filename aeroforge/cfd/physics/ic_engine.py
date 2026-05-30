"""Initial-condition engine.

Poor initialisation is a leading cause of divergence in high-speed flows. This
engine picks a graduated initialisation strategy by regime and emits the
``internalField`` values plus a human-readable strategy note. (Field BC files
already carry the chosen internalField; this records the rationale and any
potential-flow / ramped-BC recommendation.)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

from ..types import FlowConditions, FlowRegime


@dataclass
class InitStrategy:
    method: str
    internal_fields: Dict[str, str]
    notes: List[str] = field(default_factory=list)


class InitialConditionEngine:
    """Selects an initialisation strategy for robust convergence."""

    def configure(self, flow: FlowConditions) -> InitStrategy:
        u = round(flow.velocity_ms, 3)
        internal = {
            "U": f"({u} 0 0)",
            "p": (str(round(flow.pressure_pa, 1)) if flow.is_compressible else "0"),
        }
        if flow.is_compressible:
            internal["T"] = str(round(flow.temperature_K, 2))

        if flow.regime in (FlowRegime.SUPERSONIC, FlowRegime.HYPERSONIC):
            return InitStrategy(
                method="ramped_freestream",
                internal_fields=internal,
                notes=[
                    "High-speed flow: initialise to freestream and ramp inlet Mach over "
                    "the first ~500 iterations (deferred correction) to avoid a startup "
                    "shock that diverges the solver.",
                    "Use localEuler pseudo-transient stepping with a low initial Courant "
                    "number, then increase.",
                ],
            )
        if flow.regime == FlowRegime.TRANSONIC:
            return InitStrategy(
                method="potential_flow_seed",
                internal_fields=internal,
                notes=["Seed with potentialFoam, then start the compressible solver."],
            )
        return InitStrategy(
            method="uniform_freestream",
            internal_fields=internal,
            notes=["Uniform freestream initialisation is adequate for this regime."],
        )
