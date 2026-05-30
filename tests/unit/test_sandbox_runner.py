"""Direct tests for the CadQuery sandbox runner and adapter.

The runner normally executes in a child process (so it is invisible to coverage);
here we also call ``main`` in-process to exercise and verify it directly.
"""

from __future__ import annotations

import json

import pytest

from tests.conftest import cad_required

pytestmark = cad_required


def test_runner_success(tmp_path):
    from aeroforge.security import _cq_runner

    job = {
        "code": "result = cq.Workplane('XY').box(0.1, 0.1, 0.1)",
        "result_var": "result",
        "exports": {"step": str(tmp_path / "b.step"), "stl": str(tmp_path / "b.stl")},
    }
    job_path = tmp_path / "job.json"
    job_path.write_text(json.dumps(job))
    rc = _cq_runner.main(str(job_path))
    assert rc == 0
    assert (tmp_path / "b.step").exists()


def test_runner_missing_result_var(tmp_path):
    from aeroforge.security import _cq_runner

    job = {"code": "x = 1", "result_var": "result", "exports": {}}
    job_path = tmp_path / "job.json"
    job_path.write_text(json.dumps(job))
    rc = _cq_runner.main(str(job_path))
    assert rc == 1


def test_adapter_reports_error_on_bad_geometry():
    from aeroforge.adapters import get_adapter

    adapter = get_adapter("cadquery")
    res = adapter.execute_script(
        "result = cq.Workplane('XY').circle(-1).extrude(1)",
        {"stl": "/tmp/bad.stl"},
        timeout_s=30,
    )
    assert res.success is False
    assert res.error
