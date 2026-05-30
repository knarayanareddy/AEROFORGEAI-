"""AIAA paper ingester.

Tags ingested documents as AIAA papers (propulsion / aerodynamics focus) for
source-aware retrieval. Operates on already-downloaded PDFs/text.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..vector_store import VectorStore
from .pdf_ingester import PDFIngester


class AiaaPaperIngester(PDFIngester):
    """Ingests AIAA papers with citation provenance tags."""

    source_type = "aiaa_paper"

    def __init__(self, store: VectorStore):
        super().__init__(store)

    def ingest_paper(self, path: Path, aiaa_id: Optional[str] = None) -> int:
        return self.ingest_file(path, {"aiaa_id": aiaa_id or Path(path).stem, "authority": "AIAA"})
