"""Reacting-mixture thermophysics — interface stub (Phase 2 roadmap).

Scramjet combustor simulations need finite-rate chemistry (e.g. H2-air or
hydrocarbon mechanisms) coupled to the flow solver (reactingFoam). This stub
defines the integration point; combustion modelling is future work.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class ReactingMixture:
    fuel: str = "H2"
    oxidizer: str = "air"
    mechanism: str = "unset"
    species: List[str] = field(default_factory=lambda: ["O2", "N2"])
    note: str = "finite-rate chemistry not yet implemented (Phase 2 roadmap)"
