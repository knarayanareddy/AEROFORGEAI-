"""Shared pytest fixtures and CAD-availability gating."""

from __future__ import annotations

import pytest


def _cadquery_available() -> bool:
    try:
        import cadquery  # noqa: F401

        return True
    except Exception:
        return False


CAD_AVAILABLE = _cadquery_available()

# Skip any test marked @pytest.mark.cad when the kernel is missing.
cad_required = pytest.mark.skipif(not CAD_AVAILABLE, reason="CadQuery/OpenCASCADE not installed")


@pytest.fixture(scope="session")
def forge():
    from aeroforge import AeroForge

    return AeroForge()
