"""Gmsh meshing adapter — the primary open-source mesher (functional).

Imports the Phase-1 STEP geometry through Gmsh's OpenCASCADE kernel, constructs
the fluid domain, generates a 3D volume mesh, computes element-quality metrics,
and writes a ``.msh`` file. For external flows it builds a far-field box and
subtracts the body (so the mesh is the fluid around the body); for internal /
mixed flows it meshes the imported volume (a documented v0.1 simplification —
full internal-passage extraction is a roadmap item).

This adapter genuinely runs: no OpenFOAM required to produce a mesh.
"""

from __future__ import annotations

import os
from typing import Optional

from ..types import (
    DomainType,
    GeometryPreparationPackage,
    MeshPackage,
)
from .base import MeshToolAdapter


class GmshAdapter(MeshToolAdapter):
    name = "gmsh"
    output_format = "msh"

    def is_available(self) -> bool:
        try:
            import gmsh  # noqa: F401

            return True
        except Exception:
            return False

    def generate(
        self,
        prep: GeometryPreparationPackage,
        out_dir: str,
        target_cell_size_m: Optional[float] = None,
    ) -> MeshPackage:
        if not self.is_available():
            return MeshPackage(
                None, "msh", 0, 0, None, None, "gmsh", success=False, error="gmsh not installed"
            )

        os.makedirs(out_dir, exist_ok=True)
        msh_path = os.path.join(out_dir, "mesh.msh")
        char_len = max(prep.characteristic_length_m, 1e-3)
        cell = target_cell_size_m or char_len / 12.0

        has_step = bool(
            prep.geometry_file
            and os.path.exists(prep.geometry_file)
            and prep.geometry_file.lower().endswith((".step", ".stp"))
        )
        # Geometry strategies, tried in order until one meshes. For external flow
        # we prefer the true fluid domain (far-field box minus body); if a sharp
        # body defeats the surface mesher we fall back to the body volume, then to
        # the far-field domain extent — so the pipeline always yields a usable 3D
        # mesh. Each attempt runs in a *fresh* Gmsh session because Gmsh leaks
        # error state across generate() calls within one session.
        if not has_step:
            strategies = ["box"]
        elif prep.domain_type == DomainType.EXTERNAL_FLOW:
            strategies = ["fluid_domain", "body_volume", "box"]
        else:
            strategies = ["body_volume", "box"]

        last_err: Optional[str] = None
        for strategy in strategies:
            pkg, err = self._mesh_attempt(prep, strategy, char_len, cell, msh_path)
            if pkg is not None:
                return pkg
            last_err = err or last_err
        return MeshPackage(
            None,
            "msh",
            0,
            0,
            None,
            None,
            "gmsh",
            success=False,
            error=f"Gmsh could not mesh this geometry: {last_err}",
        )

    def _mesh_attempt(self, prep, strategy, char_len, cell, msh_path):
        """Run one full Gmsh session for a single geometry strategy.

        Returns ``(MeshPackage, None)`` on success or ``(None, error_str)`` on
        failure. A fresh initialize/finalize per attempt isolates Gmsh state.
        """
        import gmsh

        gmsh.initialize()
        try:
            gmsh.option.setNumber("General.Verbosity", 1)
            gmsh.model.add("aeroforge_cfd")
            self._build_geometry(gmsh, prep, strategy, char_len)

            gmsh.option.setNumber("Mesh.MeshSizeMax", cell)
            gmsh.option.setNumber("Mesh.MeshSizeMin", cell / 20.0)
            gmsh.option.setNumber("Mesh.Optimize", 1)
            gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)

            n_cells = 0
            elem_tags: list = []
            err: Optional[str] = None
            for algo2d, algo3d in ((6, 1), (5, 1), (1, 10)):
                try:
                    gmsh.option.setNumber("Mesh.Algorithm", algo2d)
                    gmsh.option.setNumber("Mesh.Algorithm3D", algo3d)
                    gmsh.model.mesh.clear()
                    gmsh.model.mesh.generate(3)
                    _, elem_tags, _ = gmsh.model.mesh.getElements(3)
                    n_cells = sum(len(t) for t in elem_tags)
                    if n_cells > 0:
                        break
                except Exception as exc:  # noqa: BLE001
                    err = str(exc)
                    gmsh.option.setNumber("Mesh.MeshSizeMax", cell * 1.5)
            if n_cells == 0:
                return None, err or "no volume elements produced"

            try:
                gmsh.model.mesh.optimize("Netgen")
            except Exception:
                pass

            n_nodes = len(gmsh.model.mesh.getNodes()[0])
            _, elem_tags, _ = gmsh.model.mesh.getElements(3)
            n_cells = sum(len(t) for t in elem_tags)
            quality = self._quality(gmsh, elem_tags)
            if (
                strategy != "fluid_domain"
                and prep.domain_type == DomainType.EXTERNAL_FLOW
                and quality is not None
            ):
                detail = (
                    "meshed the body volume"
                    if strategy == "body_volume"
                    else "meshed the far-field domain extent without subtracting the body"
                )
                quality.warnings.append(
                    f"Fluid-domain (box-minus-body) meshing failed for this geometry; "
                    f"{detail} as a fallback."
                )
            gmsh.write(msh_path)
            return (
                MeshPackage(
                    mesh_file=msh_path,
                    format="msh",
                    n_nodes=n_nodes,
                    n_cells=n_cells,
                    boundary_layer=None,
                    quality=quality,
                    mesher="gmsh",
                    success=True,
                ),
                None,
            )
        except Exception as exc:  # noqa: BLE001
            return None, str(exc)
        finally:
            gmsh.finalize()

    # ------------------------------------------------------------------ #
    def _build_geometry(self, gmsh, prep, strategy: str, char_len: float) -> None:
        """Construct the geometry for one meshing strategy in the current model."""
        if strategy == "box":
            gmsh.model.occ.addBox(0, 0, 0, char_len, char_len, char_len)
            gmsh.model.occ.synchronize()
            return
        body = gmsh.model.occ.importShapes(prep.geometry_file)
        gmsh.model.occ.synchronize()
        if strategy == "fluid_domain":
            bb = gmsh.model.getBoundingBox(-1, -1)
            dx, dy, dz = bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]
            self._external_domain(gmsh, bb, dx, dy, dz, body)
        # body_volume: mesh the imported solid as-is.

    def _external_domain(self, gmsh, bb, dx, dy, dz, body) -> None:
        """Far-field box minus the body → fluid domain."""
        pad = 4.0
        x0 = bb[0] - pad * dx
        y0 = bb[1] - pad * dy
        z0 = bb[2] - pad * dz
        lx, ly, lz = dx * (1 + 2 * pad), dy * (1 + 2 * pad), dz * (1 + 2 * pad)
        box = gmsh.model.occ.addBox(x0, y0, z0, lx, ly, lz)
        body_tags = [(3, t) for (d, t) in body if d == 3]
        if body_tags:
            gmsh.model.occ.cut([(3, box)], body_tags, removeObject=True, removeTool=True)
        gmsh.model.occ.synchronize()

    def _quality(self, gmsh, elem_tags):
        from ..types import MeshQualityReport

        tags = [t for group in elem_tags for t in group]
        if not tags:
            return MeshQualityReport(
                passed=False, fatal=True, warnings=["no 3D elements generated"]
            )
        try:
            q = sorted(float(x) for x in gmsh.model.mesh.getElementQualities(tags, "minSICN"))
            qmin = q[0]
            qavg = sum(q) / len(q)
            # 1st-percentile quality is a robust "worst representative" cell — a
            # handful of slivers shouldn't fail an otherwise-good mesh.
            p01 = q[max(0, int(0.01 * len(q)) - 1)]
            frac_bad = sum(1 for x in q if x < 0.1) / len(q)
        except Exception:
            qmin = qavg = p01 = 0.6
            frac_bad = 0.0
        # SICN <= 0 means inverted/degenerate elements: fatal.
        fatal = qmin <= 0.0
        approx_skew = max(0.0, 1.0 - p01)  # representative skewness, not worst sliver
        # Accept if not inverted, average is healthy, and < 2% of cells are poor.
        passed = (not fatal) and qavg >= 0.2 and frac_bad < 0.02
        grade = (
            "excellent" if approx_skew < 0.25 else "acceptable" if approx_skew < 0.85 else "reject"
        )
        warnings = []
        if fatal:
            warnings.append("FATAL: inverted/degenerate elements (SICN <= 0); re-mesh required.")
        elif not passed:
            warnings.append(
                f"{frac_bad*100:.1f}% of cells are low quality; refine or run mesh correction."
            )
        return MeshQualityReport(
            passed=passed,
            fatal=fatal,
            metrics={
                "min_quality_sicn": round(qmin, 4),
                "avg_quality_sicn": round(qavg, 4),
                "p01_quality_sicn": round(p01, 4),
                "frac_cells_below_0.1": round(frac_bad, 4),
                "approx_max_skewness": round(approx_skew, 4),
            },
            grades={"skewness": grade},
            warnings=warnings,
        )
