"""Tests for the Part-3 REST API (FastAPI TestClient)."""

from __future__ import annotations

import pytest

from tests.conftest import cad_required


@pytest.fixture(scope="module")
def client():
    fastapi = pytest.importorskip("fastapi")  # noqa: F841
    import tempfile

    from fastapi.testclient import TestClient

    from aeroforge.platform.api import create_app

    return TestClient(create_app(output_dir=tempfile.mkdtemp()))


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and "adapters" in body and "solvers" in body


def test_templates(client):
    r = client.get("/api/templates")
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert "naca4_airfoil" in ids and len(ids) == 10


def test_index_served(client):
    r = client.get("/")
    assert r.status_code == 200 and "AeroForge" in r.text


def test_compliance_endpoint(client):
    r = client.post("/api/compliance", json={"request": "scramjet inlet for Mach 6"})
    assert r.status_code == 200
    assert r.json()["export_control_flagged"] is True


@cad_required
def test_design_endpoint_and_file(client):
    r = client.post(
        "/api/design",
        json={"request": "NACA 2412 airfoil, 2 m chord, 5 m span", "formats": ["step", "stl"]},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["geometry_type"] == "naca_airfoil"
    assert "stl" in d["files"]
    # the STL file route resolves
    f = client.get(d["files"]["stl"])
    assert f.status_code == 200 and len(f.content) > 0
