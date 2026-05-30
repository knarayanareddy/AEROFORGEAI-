"""Knowledge ingestion: load domain documents into the vector store."""

from __future__ import annotations

from .aiaa_paper_ingester import AiaaPaperIngester
from .nasa_ntr_ingester import NasaNtrIngester
from .pdf_ingester import PDFIngester, chunk_text

__all__ = ["PDFIngester", "NasaNtrIngester", "AiaaPaperIngester", "chunk_text"]
