"""Document ingestion into the vector store.

Provides text chunking (512-token windows with 64-token overlap, per the design
doc) and a PDF/text loader. PDF parsing uses ``pypdf`` when available; otherwise
plain-text and Markdown sources are supported directly. Chunks are added to a
:class:`VectorStore` with provenance metadata.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional

from ..vector_store import VectorStore

_TOKEN_RE = re.compile(r"\S+")


def chunk_text(text: str, chunk_tokens: int = 512, overlap: int = 64) -> List[str]:
    """Split text into overlapping token windows."""
    tokens = _TOKEN_RE.findall(text)
    if not tokens:
        return []
    step = max(1, chunk_tokens - overlap)
    chunks = []
    for start in range(0, len(tokens), step):
        window = tokens[start : start + chunk_tokens]
        if window:
            chunks.append(" ".join(window))
        if start + chunk_tokens >= len(tokens):
            break
    return chunks


def _read(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        try:
            import pypdf  # optional dependency

            reader = pypdf.PdfReader(str(path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(f"PDF ingestion needs 'pypdf' (pip install pypdf): {exc}") from exc
    return path.read_text(errors="ignore")


class PDFIngester:
    """Ingests PDF/text/markdown documents into a vector store."""

    source_type = "document"

    def __init__(self, store: VectorStore):
        self.store = store

    def ingest_file(self, path: Path, extra_metadata: Optional[Dict] = None) -> int:
        path = Path(path)
        text = _read(path)
        chunks = chunk_text(text)
        meta_base = {"source": path.name, "source_type": self.source_type}
        if extra_metadata:
            meta_base.update(extra_metadata)
        for i, chunk in enumerate(chunks):
            self.store.add(chunk, {**meta_base, "chunk": i})
        return len(chunks)

    def ingest_directory(self, directory: Path, pattern: str = "*") -> int:
        total = 0
        for p in sorted(Path(directory).glob(pattern)):
            if p.is_file() and p.suffix.lower() in (".pdf", ".txt", ".md"):
                total += self.ingest_file(p)
        return total
