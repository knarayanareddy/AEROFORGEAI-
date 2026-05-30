"""REST API for the AeroForge platform (Part 3).

Exposes the Phase-1 design pipeline, the Phase-2 CFD pipeline, the closed
optimization loop, and the compliance advisory over HTTP, and serves a minimal
single-page web UI (with a Three.js STL preview).

Run with:  uvicorn aeroforge.platform.api:app --reload    (or `aeroforge serve`)
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from .. import __version__

_WEB_DIR = Path(__file__).parent / "web"


# --------------------------------------------------------------------------- #
# Request models
# --------------------------------------------------------------------------- #
class DesignRequest(BaseModel):
    request: str
    formats: List[str] = ["step", "stl"]


class CFDRequest(BaseModel):
    design_id: str


class OptimizeRequest(BaseModel):
    request: str
    targets: Optional[List[Dict[str, Any]]] = None
    objectives: Optional[Dict[str, str]] = None
    max_iterations: int = 8


class ComplianceRequest(BaseModel):
    request: str


def create_app(output_dir: Optional[Path] = None) -> FastAPI:
    from ..adapters import available_adapters
    from ..agents.orchestration_agent import AeroForge
    from ..cfd.solvers import available_solvers
    from ..templates import default_library
    from .compliance import ComplianceChecker
    from .optimization_loop import OptimizationLoop

    app = FastAPI(
        title="AeroForge AI",
        version=__version__,
        description="Natural-language aerospace CAD + CFD automation API",
    )
    out_root = Path(output_dir or os.environ.get("AEROFORGE_API_OUT", "aeroforge_api_out"))
    out_root.mkdir(parents=True, exist_ok=True)
    forge = AeroForge()
    # Route all design output under out_root/<design_id> so files are retrievable.
    forge.config.output_dir = out_root

    def _design_dir(design_id: str) -> Path:
        # design_id is a UUID; reject anything with path separators.
        if "/" in design_id or ".." in design_id:
            raise HTTPException(400, "invalid design_id")
        return out_root / design_id

    @app.get("/", response_class=HTMLResponse)
    def index() -> Any:
        idx = _WEB_DIR / "index.html"
        return idx.read_text() if idx.exists() else "<h1>AeroForge AI</h1>"

    @app.get("/health")
    def health() -> Dict[str, Any]:
        return {
            "status": "ok",
            "version": __version__,
            "adapters": available_adapters(),
            "solvers": available_solvers(),
        }

    @app.get("/api/templates")
    def templates() -> List[Dict[str, str]]:
        return [
            {"id": t.id, "name": t.name, "category": t.category, "builder": t.builder}
            for t in default_library().all()
        ]

    @app.post("/api/design")
    def design(req: DesignRequest) -> Dict[str, Any]:
        forge.execution_agent.formats = tuple(req.formats)
        try:
            # out_dir=None -> writes to forge.config.output_dir / design_id (= out_root/<id>).
            pkg = forge.design(req.request)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(422, f"design failed: {exc}")
        files = {
            fmt: f"/api/file/{pkg.design_id}/{Path(p).name}" for fmt, p in pkg.artifacts.items()
        }
        return {
            "design_id": pkg.design_id,
            "geometry_type": pkg.intent.geometry_type,
            "confidence": pkg.validation.confidence.overall,
            "passed": pkg.validation.passed,
            "physics": pkg.augmented.physics,
            "files": files,
            "warnings": pkg.validation.warnings,
        }

    @app.get("/api/file/{design_id}/{name}")
    def get_file(design_id: str, name: str) -> Any:
        if "/" in name or ".." in name:
            raise HTTPException(400, "invalid filename")
        path = _design_dir(design_id) / name
        if not path.exists():
            raise HTTPException(404, "file not found")
        return FileResponse(str(path))

    @app.post("/api/cfd")
    def cfd(req: CFDRequest) -> Dict[str, Any]:
        from ..cfd import AeroForgeCFD

        cep = _design_dir(req.design_id)
        if not (cep / "cep_manifest.json").exists():
            raise HTTPException(404, "CEP package not found for design_id")
        run = AeroForgeCFD().run(cep, out_dir=cep / "cfd")
        return {
            "component": run.prep.manifest.component_type,
            "domain": run.prep.domain_type.value,
            "mesh": {
                "cells": run.mesh.n_cells,
                "success": run.mesh.success,
                "quality_passed": run.mesh.quality.passed if run.mesh.quality else None,
            },
            "solver": run.config.solver,
            "turbulence_model": run.config.turbulence_model,
            "decision": run.decision.decision.value,
            "rationale": run.decision.rationale,
        }

    @app.post("/api/optimize")
    def optimize(req: OptimizeRequest) -> Dict[str, Any]:
        loop = OptimizationLoop(forge=forge, max_iterations=req.max_iterations)
        result = loop.optimize(
            req.request, targets=req.targets, objectives=req.objectives, out_dir=out_root / "opt"
        )
        return {
            "converged": result.converged,
            "final_decision": result.final_decision,
            "evaluator": result.evaluator,
            "iterations_run": result.iterations_run,
            "best_quantities": result.best_quantities,
            "best_parameters": result.best_parameters,
            "history": result.history,
            "rationale": result.rationale,
        }

    @app.post("/api/compliance")
    def compliance(req: ComplianceRequest) -> Dict[str, Any]:
        intent = forge.intent_agent.parse(req.request)
        report = ComplianceChecker().review(intent)
        return vars(report)

    return app


app = create_app()
