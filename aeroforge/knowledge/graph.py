"""Aerospace Knowledge Graph (development backend: NetworkX).

A structured graph of aerospace entities and relations that lets the system
reason relationally — "what affects total pressure recovery?", "what does a
Mach-5 inlet require?". Production deployments target Neo4j; this NetworkX
implementation is dependency-light, fully in-memory, and seeded with real
design relationships drawn from the literature cited in the design doc.

Node types:  Component, PhysicsParameter, Material, ManufacturingProcess,
             DesignRule, FlowPhenomenon, Constraint, Standard, ValidationSource
Relations:   AFFECTS, REQUIRES, CONSTRAINS, VALIDATED_BY, IS_SUBCOMPONENT_OF,
             MANUFACTURED_BY, INCOMPATIBLE_WITH, SUPERSEDES
"""

from __future__ import annotations

import warnings
from typing import Dict, List, Tuple

warnings.filterwarnings("ignore", message="networkx backend defined more than once")
import networkx as nx


class AerospaceKnowledgeGraph:
    """Relational knowledge over aerospace design entities."""

    def __init__(self) -> None:
        self.g = nx.MultiDiGraph()
        self._seed()

    # ------------------------------------------------------------------ #
    def add_entity(self, name: str, node_type: str, **attrs) -> None:
        self.g.add_node(name, node_type=node_type, **attrs)

    def add_relation(self, src: str, relation: str, dst: str, **attrs) -> None:
        self.g.add_edge(src, dst, key=relation, relation=relation, **attrs)

    # ------------------------------------------------------------------ #
    def affects(self, parameter: str) -> List[str]:
        """Return entities that AFFECT the given parameter."""
        out = []
        for u, v, k in self.g.in_edges(parameter, keys=True):
            if k == "AFFECTS":
                out.append(u)
        return sorted(set(out))

    def requirements_for(self, component: str) -> List[str]:
        """Return design rules / phenomena a component REQUIRES."""
        out = []
        for u, v, k in self.g.out_edges(component, keys=True):
            if k == "REQUIRES":
                out.append(v)
        return sorted(set(out))

    def constraints_on(self, entity: str) -> List[Tuple[str, str]]:
        out = []
        for u, v, k in self.g.edges(keys=True):
            if k == "CONSTRAINS" and (u == entity or v == entity):
                out.append((u, v))
        return out

    def neighbors(self, entity: str) -> List[Tuple[str, str, str]]:
        """Return (relation, neighbor, direction) tuples around an entity."""
        edges: List[Tuple[str, str, str]] = []
        for u, v, k in self.g.out_edges(entity, keys=True):
            edges.append((k, v, "out"))
        for u, v, k in self.g.in_edges(entity, keys=True):
            edges.append((k, u, "in"))
        return edges

    def node_type(self, name: str) -> str:
        return self.g.nodes.get(name, {}).get("node_type", "Unknown")

    def stats(self) -> Dict[str, int]:
        return {"nodes": self.g.number_of_nodes(), "edges": self.g.number_of_edges()}

    # ------------------------------------------------------------------ #
    def _seed(self) -> None:
        components = [
            "scramjet_inlet",
            "supersonic_inlet",
            "convergent_divergent_nozzle",
            "bell_nozzle",
            "naca_airfoil",
            "ogive_nose_cone",
            "cowl_lip",
            "throat",
        ]
        for c in components:
            self.add_entity(c, "Component")

        params = [
            "total_pressure_recovery",
            "mass_capture_ratio",
            "mach_number",
            "ramp_angle",
            "contraction_ratio",
            "expansion_ratio",
            "exit_mach",
            "wall_temperature",
            "drag_coefficient",
        ]
        for p in params:
            self.add_entity(p, "PhysicsParameter")

        for m, tmax in [
            ("Ti_6Al4V", 700),
            ("Inconel_718", 980),
            ("C_SiC", 1900),
            ("Aluminum_7075", 450),
        ]:
            self.add_entity(m, "Material", max_temp_K=tmax)

        for proc in ["EDM", "additive_Ti", "investment_casting", "cnc_5axis"]:
            self.add_entity(proc, "ManufacturingProcess")

        for rule in [
            "boundary_layer_bleed",
            "shock_on_lip",
            "leading_edge_bluntness",
            "isentropic_compression",
        ]:
            self.add_entity(rule, "DesignRule")

        for phen in ["shock_BL_interaction", "flow_separation", "shock_train", "unstart"]:
            self.add_entity(phen, "FlowPhenomenon")

        for std in ["NASA_TN_D4112", "AIAA_1990_0474", "MIL_E_5007", "ARP755"]:
            self.add_entity(std, "ValidationSource")

        # Relations (real aerospace knowledge)
        rels = [
            ("ramp_angle", "AFFECTS", "total_pressure_recovery"),
            ("ramp_angle", "AFFECTS", "mass_capture_ratio"),
            ("contraction_ratio", "AFFECTS", "total_pressure_recovery"),
            ("mach_number", "AFFECTS", "total_pressure_recovery"),
            ("expansion_ratio", "AFFECTS", "exit_mach"),
            ("shock_BL_interaction", "AFFECTS", "total_pressure_recovery"),
            ("scramjet_inlet", "REQUIRES", "boundary_layer_bleed"),
            ("scramjet_inlet", "REQUIRES", "leading_edge_bluntness"),
            ("supersonic_inlet", "REQUIRES", "boundary_layer_bleed"),
            ("supersonic_inlet", "REQUIRES", "shock_on_lip"),
            ("scramjet_inlet", "REQUIRES", "isentropic_compression"),
            ("Ti_6Al4V", "CONSTRAINS", "wall_temperature"),
            ("Inconel_718", "CONSTRAINS", "wall_temperature"),
            ("cowl_lip", "IS_SUBCOMPONENT_OF", "scramjet_inlet"),
            ("throat", "IS_SUBCOMPONENT_OF", "scramjet_inlet"),
            ("cowl_lip", "MANUFACTURED_BY", "EDM"),
            ("scramjet_inlet", "VALIDATED_BY", "NASA_TN_D4112"),
            ("supersonic_inlet", "VALIDATED_BY", "AIAA_1990_0474"),
            ("shock_BL_interaction", "AFFECTS", "flow_separation"),
            ("unstart", "AFFECTS", "mass_capture_ratio"),
            ("leading_edge_bluntness", "INCOMPATIBLE_WITH", "additive_Ti"),
        ]
        for s, r, d in rels:
            self.add_relation(s, r, d)
