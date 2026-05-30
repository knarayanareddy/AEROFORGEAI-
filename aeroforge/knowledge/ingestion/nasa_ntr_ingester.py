"""NASA Technical Reports Server (NTRS) ingester.

Tags ingested documents as NASA technical reports so retrieval can weight or
filter by source authority. Network fetching from the NTRS API is future work;
this ingester operates on already-downloaded report files.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from ..vector_store import VectorStore
from .pdf_ingester import PDFIngester


class NasaNtrIngester(PDFIngester):
    """Ingests NASA technical reports with NTRS provenance tags."""

    source_type = "nasa_ntr"

    def __init__(self, store: VectorStore):
        super().__init__(store)

    def ingest_report(self, path: Path, report_id: Optional[str] = None) -> int:
        return self.ingest_file(
            path, {"report_id": report_id or Path(path).stem, "authority": "NASA"}
        )
