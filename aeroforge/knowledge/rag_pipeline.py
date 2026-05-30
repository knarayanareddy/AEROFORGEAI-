"""RAG pipeline: fuse vector retrieval with knowledge-graph traversal.

Given a design question, retrieves the most relevant text snippets (vector store)
AND the related design rules / parameters / validation sources (knowledge graph),
then fuses them into a single context payload for design assistance — mirroring
the "Context Fusion" stage in the design doc's RAG diagram.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .graph import AerospaceKnowledgeGraph
from .vector_store import VectorStore

# Seed corpus: concise, real aerospace design guidance (offline knowledge base).
_SEED_SNIPPETS: List[tuple] = [
    (
        "Supersonic inlets above Mach 2 require boundary-layer bleed to prevent "
        "shock-boundary-layer interaction from separating the flow and causing inlet "
        "unstart.",
        {"topic": "inlet", "source": "NASA TN D-4112"},
    ),
    (
        "For multi-ramp external-compression inlets, total pressure recovery is "
        "maximised when all oblique shocks plus the terminal normal shock are of equal "
        "strength (the Oswatitsch criterion).",
        {"topic": "inlet", "source": "Oswatitsch"},
    ),
    (
        "Mass capture ratio reaches unity when the system shock is positioned on the "
        "cowl lip at the design Mach number (shock-on-lip condition).",
        {"topic": "inlet", "source": "Seddon & Goldsmith"},
    ),
    (
        "Hypersonic scramjet inlets need blunted leading edges to manage extreme "
        "stagnation heating, trading a small total-pressure penalty for survivability.",
        {"topic": "scramjet", "source": "Heiser & Pratt"},
    ),
    (
        "A minimum-length nozzle uses a sharp throat with maximum wall angle equal to "
        "half the Prandtl-Meyer angle for the exit Mach number, giving uniform "
        "shock-free exit flow.",
        {"topic": "nozzle", "source": "Anderson Ch.11"},
    ),
    (
        "Rao thrust-optimised bell nozzles achieve ~99% of ideal thrust at ~80% of the "
        "length of an equivalent 15-degree cone.",
        {"topic": "nozzle", "source": "Rao 1958"},
    ),
    (
        "The isentropic area-Mach relation sets the nozzle exit-to-throat area ratio "
        "required to reach a target exit Mach number.",
        {"topic": "nozzle", "source": "Anderson Ch.5"},
    ),
    (
        "NACA 4-digit airfoils encode maximum camber, camber position, and thickness; "
        "the 00xx series is symmetric and common for control surfaces and fins.",
        {"topic": "airfoil", "source": "Abbott & von Doenhoff"},
    ),
    (
        "Tangent-ogive nose cones balance low wave drag with internal volume; the Von "
        "Karman (LD-Haack) series minimises wave drag for a given length and base "
        "diameter.",
        {"topic": "nose_cone", "source": "Chin / Haack"},
    ),
    (
        "Ti-6Al-4V is limited to roughly 700 K sustained service temperature; above "
        "this, nickel superalloys (Inconel 718) or ceramic-matrix composites (C/SiC) "
        "are required.",
        {"topic": "material", "source": "MMPDS"},
    ),
    (
        "Contraction ratio of an inlet duct governs the internal compression and must "
        "be kept below the value that would drive the throat to choke and unstart.",
        {"topic": "inlet", "source": "Mattingly"},
    ),
    (
        "Thin cowl-lip sections combine high thermal load and high stress; minimum wall "
        "thickness and leading-edge radius must satisfy both manufacturing and thermal "
        "limits.",
        {"topic": "manufacturing", "source": "ARP755"},
    ),
]


@dataclass
class RAGContext:
    query: str
    snippets: List[Dict[str, Any]] = field(default_factory=list)
    related_rules: List[str] = field(default_factory=list)
    related_parameters: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)
    matched_entities: List[str] = field(default_factory=list)


class RAGPipeline:
    """Hybrid retrieval over the vector store and the knowledge graph."""

    def __init__(
        self,
        graph: Optional[AerospaceKnowledgeGraph] = None,
        store: Optional[VectorStore] = None,
    ):
        self.graph = graph or AerospaceKnowledgeGraph()
        self.store = store or VectorStore()
        if len(self.store) == 0:
            self.store.add_many(_SEED_SNIPPETS)

    def query(self, text: str, k: int = 4) -> RAGContext:
        ctx = RAGContext(query=text)

        for score, doc in self.store.query(text, k=k):
            ctx.snippets.append({"score": score, "text": doc.text, **doc.metadata})

        # Knowledge-graph traversal for any entities named in the query.
        low = text.lower()
        for node in self.graph.g.nodes:
            if node.lower().replace("_", " ") in low or node.lower() in low:
                ctx.matched_entities.append(node)
                ntype = self.graph.node_type(node)
                if ntype == "Component":
                    ctx.related_rules.extend(self.graph.requirements_for(node))
                    for rel, nb, _ in self.graph.neighbors(node):
                        if rel == "VALIDATED_BY":
                            ctx.references.append(nb)
                if ntype == "PhysicsParameter":
                    ctx.related_parameters.extend(self.graph.affects(node))

        ctx.related_rules = sorted(set(ctx.related_rules))
        ctx.related_parameters = sorted(set(ctx.related_parameters))
        ctx.references = sorted(set(ctx.references)) or sorted(
            {s.get("source") for s in ctx.snippets if s.get("source")}
        )
        ctx.matched_entities = sorted(set(ctx.matched_entities))
        return ctx
