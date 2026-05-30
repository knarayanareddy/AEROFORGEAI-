"""Standalone CadQuery sandbox runner (executed as a subprocess).

This module is intentionally dependency-free apart from CadQuery itself so it can
be launched as an isolated child process. It reads a JSON "job" file describing:

    {
      "code": "<python source defining a `result` shape>",
      "result_var": "result",
      "exports": {"step": "/path/out.step", "stl": "/path/out.stl"}
    }

It executes the code in a restricted namespace, exports the resulting shape to
each requested format, and prints a single JSON status line to stdout. Running in
a child process means timeouts and hard crashes never take down the parent agent.
"""

from __future__ import annotations

import json
import sys
import traceback

# Builtins that geometry scripts are permitted to use. Deliberately excludes
# open/eval/exec/__import__/compile and friends.
_SAFE_BUILTINS = {
    "abs",
    "min",
    "max",
    "round",
    "range",
    "len",
    "enumerate",
    "zip",
    "map",
    "filter",
    "sum",
    "sorted",
    "list",
    "tuple",
    "dict",
    "set",
    "float",
    "int",
    "bool",
    "str",
    "print",
    "pow",
    "divmod",
    "reversed",
    "all",
    "any",
}


def _restricted_builtins() -> dict:
    import builtins as _b

    return {name: getattr(_b, name) for name in _SAFE_BUILTINS if hasattr(_b, name)}


def _export_iges(shape, path: str) -> None:
    """Write IGES via the OpenCASCADE kernel (CadQuery 2.5 has no IGES export)."""
    from OCP.IGESControl import IGESControl_Writer

    writer = IGESControl_Writer()
    writer.AddShape(shape.wrapped)
    writer.ComputeModel()
    if not writer.Write(path):
        raise RuntimeError("IGESControl_Writer.Write returned False")


def main(job_path: str) -> int:
    with open(job_path) as fh:
        job = json.load(fh)

    status = {"success": False, "error": None, "exports": {}, "metrics": {}}

    try:
        import math

        import cadquery as cq
        from cadquery import exporters

        namespace = {
            "__builtins__": _restricted_builtins(),
            "cq": cq,
            "cadquery": cq,
            "math": math,
        }
        try:
            import numpy as _np

            namespace["np"] = _np
            namespace["numpy"] = _np
        except Exception:  # pragma: no cover
            pass

        exec(compile(job["code"], "<aeroforge_geometry>", "exec"), namespace)  # noqa: S102

        result_var = job.get("result_var", "result")
        if result_var not in namespace:
            raise RuntimeError(
                f"Geometry script did not define '{result_var}'. "
                "A CadQuery Workplane or Shape is required."
            )
        result = namespace[result_var]

        # Normalise to a cq.Shape for export + metrics.
        shape = result.val() if isinstance(result, cq.Workplane) else result

        fmt_map = {
            "step": getattr(exporters.ExportTypes, "STEP", None),
            "stl": getattr(exporters.ExportTypes, "STL", None),
            "iges": getattr(exporters.ExportTypes, "IGES", None),
        }
        status["export_errors"] = {}
        for fmt, path in job.get("exports", {}).items():
            fmt = fmt.lower()
            try:
                if fmt == "brep":
                    shape.exportBrep(path)
                elif fmt == "iges" and fmt_map["iges"] is None:
                    _export_iges(shape, path)  # CadQuery dropped IGES; use OCC kernel
                elif fmt in fmt_map and fmt_map[fmt] is not None:
                    exporters.export(result, path, exportType=fmt_map[fmt])
                else:
                    exporters.export(result, path)
                status["exports"][fmt] = path
            except Exception as exc:  # one bad format must not sink a valid build
                status["export_errors"][fmt] = f"{type(exc).__name__}: {exc}"

        # Topology metrics (best-effort).
        try:
            bb = shape.BoundingBox()
            try:
                shape_type = shape.ShapeType()
            except Exception:
                shape_type = type(shape).__name__
            status["metrics"] = {
                "volume_m3": float(shape.Volume()),
                "area_m2": float(shape.Area()),
                "bbox": {"x": float(bb.xlen), "y": float(bb.ylen), "z": float(bb.zlen)},
                "n_faces": len(shape.Faces()),
                "n_edges": len(shape.Edges()),
                "n_vertices": len(shape.Vertices()),
                "n_solids": len(shape.Solids()),
                "shape_type": str(shape_type),
                "is_valid": bool(shape.isValid()),
            }
        except Exception:  # pragma: no cover
            pass

        requested = job.get("exports", {})
        if requested and not status["exports"]:
            status["error"] = "All exports failed: " + json.dumps(status["export_errors"])
            status["success"] = False
        else:
            status["success"] = True

    except Exception as exc:  # noqa: BLE001
        status["error"] = f"{type(exc).__name__}: {exc}"
        status["traceback"] = traceback.format_exc()

    print("AEROFORGE_RESULT::" + json.dumps(status))
    return 0 if status["success"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
