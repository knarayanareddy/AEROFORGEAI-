"""Local vector store for semantic retrieval.

Production deployments use ChromaDB/Qdrant with ``nomic-embed-text`` embeddings
served by Ollama. To stay fully offline and dependency-light, this development
store builds a TF-IDF representation over token + character-trigram features and
ranks by cosine similarity — no embedding model required. The interface
(``add`` / ``query``) matches what a swap-in embedding store would expose.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _features(text: str) -> Counter:
    text = text.lower()
    tokens = _TOKEN_RE.findall(text)
    feats = Counter(tokens)
    # character trigrams add robustness to morphology / typos
    squashed = " ".join(tokens)
    for i in range(len(squashed) - 2):
        feats["#" + squashed[i : i + 3]] += 1
    return feats


@dataclass
class Document:
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    feats: Counter = field(default_factory=Counter)


class VectorStore:
    """TF-IDF cosine-similarity store (offline embedding-free)."""

    def __init__(self) -> None:
        self._docs: List[Document] = []
        self._idf: Dict[str, float] = {}
        self._dirty = False

    def add(self, text: str, metadata: Dict[str, Any] | None = None) -> None:
        self._docs.append(Document(text=text, metadata=metadata or {}, feats=_features(text)))
        self._dirty = True

    def add_many(self, items: List[Tuple[str, Dict[str, Any]]]) -> None:
        for text, meta in items:
            self.add(text, meta)

    def _build_idf(self) -> None:
        n = len(self._docs)
        df: Counter = Counter()
        for d in self._docs:
            df.update(set(d.feats))
        self._idf = {term: math.log((1 + n) / (1 + dfi)) + 1.0 for term, dfi in df.items()}
        self._dirty = False

    def _vec(self, feats: Counter) -> Dict[str, float]:
        return {t: c * self._idf.get(t, 1.0) for t, c in feats.items()}

    @staticmethod
    def _cosine(a: Dict[str, float], b: Dict[str, float]) -> float:
        if not a or not b:
            return 0.0
        common = set(a) & set(b)
        dot = sum(a[t] * b[t] for t in common)
        na = math.sqrt(sum(v * v for v in a.values()))
        nb = math.sqrt(sum(v * v for v in b.values()))
        return dot / (na * nb) if na and nb else 0.0

    def query(self, text: str, k: int = 5) -> List[Tuple[float, Document]]:
        if not self._docs:
            return []
        if self._dirty:
            self._build_idf()
        qv = self._vec(_features(text))
        scored = [(self._cosine(qv, self._vec(d.feats)), d) for d in self._docs]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [(round(s, 4), d) for s, d in scored[:k] if s > 0]

    def __len__(self) -> int:
        return len(self._docs)
