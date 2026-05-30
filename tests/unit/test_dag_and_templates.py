"""Tests for the geometry task DAG and the template library."""

from __future__ import annotations

import pytest

from aeroforge.templates import default_library
from aeroforge.types import GeometryTask, GeometryTaskDAG


class TestGeometryTaskDAG:
    def test_topological_layers(self):
        # diamond: t1 -> t2,t3 -> t4
        tasks = [
            GeometryTask(id="t1", name="a", type="cadquery"),
            GeometryTask(id="t2", name="b", type="cadquery", depends_on=["t1"]),
            GeometryTask(id="t3", name="c", type="cadquery", depends_on=["t1"]),
            GeometryTask(id="t4", name="d", type="cadquery", depends_on=["t2", "t3"]),
        ]
        layers = GeometryTaskDAG(tasks=tasks).topological_sort()
        assert [t.id for t in layers[0]] == ["t1"]
        assert set(t.id for t in layers[1]) == {"t2", "t3"}
        assert [t.id for t in layers[2]] == ["t4"]

    def test_cycle_detected(self):
        tasks = [
            GeometryTask(id="a", name="a", type="cadquery", depends_on=["b"]),
            GeometryTask(id="b", name="b", type="cadquery", depends_on=["a"]),
        ]
        with pytest.raises(ValueError):
            GeometryTaskDAG(tasks=tasks).topological_sort()


class TestTemplateLibrary:
    def test_loads_ten_templates(self):
        lib = default_library()
        assert len(lib.ids()) == 10

    def test_every_template_maps_to_a_builder(self):
        from aeroforge.geometry.builders import BUILDERS

        for t in default_library().all():
            assert t.builder in BUILDERS, f"{t.id} -> unknown builder {t.builder}"

    def test_range_check_flags_out_of_range(self):
        t = default_library().get("naca4_airfoil")
        issues = t.check_ranges({"chord_m": 999.0})
        assert any("chord_m" in i for i in issues)

    def test_range_check_passes_in_range(self):
        t = default_library().get("naca4_airfoil")
        assert t.check_ranges({"chord_m": 2.0, "span_m": 5.0}) == []

    def test_geometry_type_mapping(self):
        lib = default_library()
        assert lib.find_for_geometry_type("supersonic_inlet").id == "supersonic_2ramp_inlet"
        assert lib.find_for_geometry_type("scramjet_inlet").id == "scramjet_inlet_2ramp"
