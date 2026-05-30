"""AeroForge command-line interface.

Commands:
    aeroforge design "<natural language request>"   run the full pipeline
    aeroforge doctor                                 environment diagnostics
    aeroforge templates                              list parametric templates
    aeroforge skills                                 list available skills
    aeroforge version                                print version
"""

from __future__ import annotations

import json as _json
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .. import __version__
from ..config import AeroForgeConfig
from ..exceptions import AeroForgeError

console = Console()


@click.group(help="AeroForge AI — natural language to validated aerospace CAD.")
@click.version_option(__version__, prog_name="aeroforge")
def cli() -> None:
    pass


@cli.command()
@click.argument("request", nargs=-1, required=True)
@click.option("--out", "out_dir", type=click.Path(), default=None, help="Output directory.")
@click.option("--adapter", default=None, help="CAD adapter (cadquery, freecad, openscad).")
@click.option(
    "--format", "formats", default="step,stl,iges,brep", help="Comma-separated export formats."
)
@click.option("--json", "as_json", is_flag=True, help="Emit a JSON summary instead of a table.")
def design(request, out_dir, adapter, formats, as_json) -> None:
    """Generate validated aerospace CAD geometry from a natural-language REQUEST."""
    from ..adapters import get_adapter
    from ..agents.orchestration_agent import AeroForge

    prompt = " ".join(request)
    config = AeroForgeConfig.load()
    if adapter:
        config.default_adapter = adapter
    fmt_list = [f.strip() for f in formats.split(",") if f.strip()]

    forge = AeroForge(config=config)
    forge.execution_agent.formats = tuple(fmt_list)

    try:
        with console.status("[bold cyan]Designing…[/]"):
            pkg = forge.design(prompt, out_dir=Path(out_dir) if out_dir else None)
    except AeroForgeError as exc:
        console.print(f"[bold red]Design failed:[/] {exc}")
        raise SystemExit(1)

    if as_json:
        console.print_json(_json.dumps(_summary(pkg)))
        return

    v = pkg.validation
    status_color = "green" if v.passed else "yellow"
    console.print(
        Panel.fit(
            f"[bold]{pkg.intent.geometry_type}[/]  ·  confidence "
            f"[bold {status_color}]{v.confidence.overall:.2f}[/]  ·  "
            f"{'PASSED' if v.passed else 'NEEDS REVIEW'}",
            title="AeroForge Design",
            border_style=status_color,
        )
    )

    t = Table(show_header=True, header_style="bold")
    t.add_column("Output")
    t.add_column("Path")
    for fmt, path in pkg.artifacts.items():
        t.add_row(fmt.upper(), path)
    if pkg.report_path:
        t.add_row("REPORT", pkg.report_path)
    if pkg.cep_manifest_path:
        t.add_row("CEP", pkg.cep_manifest_path)
    console.print(t)

    if v.warnings:
        console.print("[yellow]Warnings:[/]")
        for w in v.warnings:
            console.print(f"  • {w}")
    if v.recommendations:
        console.print("[cyan]Recommendations:[/]")
        for r in v.recommendations:
            console.print(f"  • {r}")


@cli.command()
def doctor() -> None:
    """Check the environment: adapters, LLM providers, templates."""
    from ..agents.orchestration_agent import AeroForge

    info = AeroForge().doctor()
    console.print(Panel.fit(f"AeroForge {info['version']}", border_style="cyan"))

    t = Table(title="CAD Adapters", show_header=True, header_style="bold")
    t.add_column("Adapter")
    t.add_column("Available")
    for name, ok in info["adapters"].items():
        t.add_row(name, "[green]yes[/]" if ok else "[dim]no[/]")
    console.print(t)

    t2 = Table(title="LLM Providers", show_header=True, header_style="bold")
    t2.add_column("Provider")
    t2.add_column("Available")
    for name, ok in info["llm_providers"].items():
        t2.add_row(name, "[green]yes[/]" if ok else "[dim]no[/]")
    console.print(t2)
    mode = "LLM-assisted" if info["llm_active"] else "offline (heuristic)"
    console.print(
        f"Mode: [bold]{mode}[/]  ·  Templates: {info['templates']}  ·  "
        f"Default adapter: {info['default_adapter']}"
    )
    if not info["adapters"].get("cadquery"):
        console.print(
            "[red]CadQuery not available — install with: pip install 'aeroforge-core[cad]'[/]"
        )

    # Phase 2 (CFD) tooling.
    try:
        from ..cfd import AeroForgeCFD

        cfd_info = AeroForgeCFD().doctor()
        tm = Table(title="CFD Meshers / Solvers", show_header=True, header_style="bold")
        tm.add_column("Tool")
        tm.add_column("Available")
        for name, ok in {**cfd_info["meshers"], **cfd_info["solvers"]}.items():
            tm.add_row(name, "[green]yes[/]" if ok else "[dim]no[/]")
        console.print(tm)
    except Exception:
        pass


@cli.command()
@click.argument("cep_path", type=click.Path(exists=True))
@click.option("--out", "out_dir", type=click.Path(), default=None, help="Output directory.")
@click.option("--mesher", default="gmsh", help="Mesher (gmsh).")
@click.option("--solver", default="openfoam", help="Solver (openfoam, su2).")
def cfd(cep_path, out_dir, mesher, solver) -> None:
    """Run the CFD pipeline on a Phase-1 CEP package (directory or manifest)."""
    from pathlib import Path

    from ..cfd import AeroForgeCFD

    forge = AeroForgeCFD(mesher=mesher, solver=solver)
    with console.status("[bold cyan]Running CFD pipeline…[/]"):
        run = forge.run(Path(cep_path), out_dir=Path(out_dir) if out_dir else None)

    m, c, r, d = run.mesh, run.config, run.result, run.decision
    color = "green" if r.success else "yellow"
    console.print(
        Panel.fit(
            f"[bold]{run.prep.manifest.component_type}[/] · {run.prep.domain_type.value} · "
            f"M{run.prep.flow_conditions.mach} ({run.prep.flow_conditions.regime.value})",
            title="AeroForge CFD",
            border_style=color,
        )
    )
    t = Table(show_header=True, header_style="bold")
    t.add_column("Stage")
    t.add_column("Result")
    t.add_row(
        "Mesh",
        f"{m.mesher}: {m.n_cells:,} cells "
        f"(quality {'OK' if m.quality and m.quality.passed else 'flagged'})",
    )
    t.add_row("Solver", f"{c.solver} · turbulence {c.turbulence_model} ({c.wall_treatment})")
    t.add_row("Run", "solved" if r.success else "case assembled (solver not installed)")
    t.add_row("Decision", d.decision.value)
    if run.case_dir:
        t.add_row("Case dir", run.case_dir)
    if run.report_path:
        t.add_row("Report", run.report_path)
    console.print(t)
    if d.modifications:
        console.print("[cyan]Proposed Phase-1 modifications:[/]")
        for mod in d.modifications:
            console.print(f"  • {mod['param']} {mod['delta']:+g} ({mod['reason']})")
    console.print(f"[dim]{d.rationale}[/]")


@cli.command()
@click.option("--json", "as_json", is_flag=True)
def templates(as_json) -> None:
    """List the parametric aerospace templates."""
    from ..templates import default_library

    lib = default_library()
    if as_json:
        console.print_json(_json.dumps([t.id for t in lib.all()]))
        return
    t = Table(title="Aerospace Templates", show_header=True, header_style="bold")
    t.add_column("ID")
    t.add_column("Name")
    t.add_column("Category")
    t.add_column("Builder")
    for tpl in lib.all():
        t.add_row(tpl.id, tpl.name, tpl.category, tpl.builder)
    console.print(t)


@cli.command()
@click.argument("question", nargs=-1, required=True)
def knowledge(question) -> None:
    """Query the aerospace knowledge base (graph + RAG)."""
    from ..knowledge import RAGPipeline

    q = " ".join(question)
    ctx = RAGPipeline().query(q)
    console.print(Panel.fit(q, title="Knowledge Query", border_style="cyan"))
    if ctx.matched_entities:
        console.print(f"[bold]Entities:[/] {', '.join(ctx.matched_entities)}")
    if ctx.related_rules:
        console.print(f"[bold]Design rules:[/] {', '.join(ctx.related_rules)}")
    if ctx.references:
        console.print(f"[bold]References:[/] {', '.join(ctx.references)}")
    console.print("[bold]Top passages:[/]")
    for s in ctx.snippets:
        console.print(f"  • [dim]({s.get('source','?')})[/] {s['text']}")


@cli.command()
@click.argument("request", nargs=-1, required=True)
@click.option("--iterations", default=8, help="Max optimization iterations.")
@click.option("--out", "out_dir", type=click.Path(), default=None)
def optimize(request, iterations, out_dir) -> None:
    """Run the closed CAD->evaluate->CAD optimization loop for a REQUEST."""
    from pathlib import Path

    from ..platform.optimization_loop import OptimizationLoop

    loop = OptimizationLoop(max_iterations=iterations)
    with console.status("[bold cyan]Optimizing…[/]"):
        res = loop.optimize(" ".join(request), out_dir=Path(out_dir) if out_dir else None)

    color = "green" if res.converged else "yellow"
    console.print(
        Panel.fit(
            f"[bold {color}]{res.final_decision}[/] after {res.iterations_run} iteration(s) "
            f"· evaluator: {res.evaluator}",
            title="AeroForge Optimization",
            border_style=color,
        )
    )
    t = Table(show_header=True, header_style="bold")
    t.add_column("Iter")
    t.add_column("Decision")
    t.add_column("Quantities")
    for i, h in enumerate(res.history, 1):
        q = ", ".join(f"{k}={float(v):.3f}" for k, v in h["quantities"].items())
        t.add_row(str(i), h["decision"], q or "—")
    console.print(t)
    if res.best_quantities:
        console.print(
            "[bold]Best:[/] "
            + ", ".join(f"{k}={float(v):.4f}" for k, v in res.best_quantities.items())
        )
    console.print(f"[dim]{res.rationale}[/]")


@cli.command()
@click.option("--host", default="127.0.0.1")
@click.option("--port", default=8000, type=int)
def serve(host, port) -> None:
    """Launch the REST API + web console (Part 3 platform)."""
    try:
        import uvicorn
    except ImportError:
        console.print("[red]Install the web extra: pip install 'aeroforge-core[web]'[/]")
        raise SystemExit(1)
    console.print(f"[cyan]AeroForge console at http://{host}:{port}[/]")
    uvicorn.run("aeroforge.platform.api:app", host=host, port=port, reload=False)


@cli.command()
def version() -> None:
    """Print the AeroForge version."""
    console.print(f"AeroForge AI {__version__}")


@cli.command()
def skills() -> None:
    """List available design skills."""
    from ..memory.skill_registry import SkillRegistry

    reg = SkillRegistry()
    t = Table(title="Skills", show_header=True, header_style="bold")
    t.add_column("Name")
    t.add_column("Category")
    t.add_column("Builder")
    t.add_column("Source")
    for s in reg.all():
        t.add_row(s.name, s.category, s.builder, s.source)
    console.print(t)


def _summary(pkg) -> dict:
    return {
        "design_id": pkg.design_id,
        "geometry_type": pkg.intent.geometry_type,
        "confidence": pkg.validation.confidence.overall,
        "passed": pkg.validation.passed,
        "artifacts": pkg.artifacts,
        "report": pkg.report_path,
        "cep_manifest": pkg.cep_manifest_path,
        "warnings": pkg.validation.warnings,
    }


if __name__ == "__main__":
    cli()
