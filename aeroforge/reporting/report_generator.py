"""Markdown design-report generator.

Turns a :class:`CadOutputPackage` into an engineer-readable Markdown report with
full provenance: the parsed intent, the physics computations and their
derivations, geometry metrics, the five-stage validation result with a
confidence breakdown, warnings/recommendations, and an export-control advisory.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from ..security.itar_checker import ItarChecker
from ..types import CadOutputPackage


def _fmt(value, nd: int = 4) -> str:
    if isinstance(value, float):
        return f"{value:.{nd}g}"
    return str(value)


class ReportGenerator:
    """Generates Markdown design reports."""

    def __init__(self) -> None:
        self._itar = ItarChecker()

    def generate(self, pkg: CadOutputPackage, aeroforge_version: str = "0.1.0") -> str:
        intent = pkg.intent
        aug = pkg.augmented
        val = pkg.validation
        m = pkg.metrics
        lines: List[str] = []

        lines.append(f"# AeroForge AI — Design Report")
        lines.append("")
        lines.append(f"**Design ID:** `{pkg.design_id}`  ")
        lines.append(f"**Generated:** {datetime.now(timezone.utc).isoformat()}  ")
        lines.append(f"**AeroForge version:** {aeroforge_version}  ")
        lines.append(f"**Confidence score:** {val.confidence.overall:.2f} / 1.00  ")
        status = "PASSED" if val.passed else "NEEDS REVIEW"
        lines.append(f"**Validation:** {status}")
        lines.append("")

        # Request
        lines.append("## 1. Design Request")
        lines.append("")
        lines.append(f"> {intent.raw_input or '(no raw input)'}")
        lines.append("")

        # Intent
        lines.append("## 2. Parsed Design Intent")
        lines.append("")
        lines.append("| Field | Value |")
        lines.append("|---|---|")
        lines.append(f"| Geometry type | `{intent.geometry_type}` |")
        lines.append(f"| Family | {intent.geometry_family.value} |")
        lines.append(f"| Flow regime | {intent.flow_regime.value} |")
        if intent.mach_design_point is not None:
            lines.append(f"| Design Mach | {intent.mach_design_point} |")
        if intent.material:
            lines.append(f"| Material | {intent.material} |")
        if intent.thermal_limit_K:
            lines.append(f"| Thermal limit | {intent.thermal_limit_K} K |")
        lines.append(f"| Intent confidence | {intent.intent_confidence:.2f} |")
        lines.append("")
        if intent.performance_targets:
            lines.append("**Performance targets:**")
            lines.append("")
            for t in intent.performance_targets:
                v = "" if t.value is None else _fmt(t.value)
                lines.append(f"- {t.metric} {t.operator} {v} {t.units or ''}".rstrip())
            lines.append("")

        # Physics
        lines.append("## 3. Physics Computations")
        lines.append("")
        if aug.physics_computations:
            lines.append(f"Methods applied: {', '.join(aug.physics_computations)}")
            lines.append("")
        if aug.physics:
            lines.append("| Quantity | Value |")
            lines.append("|---|---|")
            for k, v in aug.physics.items():
                lines.append(f"| {k} | {_fmt(v)} |")
            lines.append("")
        if aug.derivations:
            lines.append("**Derivations:**")
            lines.append("")
            for d in aug.derivations:
                lines.append(f"- {d}")
            lines.append("")

        # Geometry metrics
        lines.append("## 4. Generated Geometry")
        lines.append("")
        lines.append("| Metric | Value |")
        lines.append("|---|---|")
        if m.volume_m3 is not None:
            lines.append(f"| Volume | {_fmt(m.volume_m3)} m³ |")
        if m.surface_area_m2 is not None:
            lines.append(f"| Surface area | {_fmt(m.surface_area_m2)} m² |")
        if m.bounding_box_m:
            bb = m.bounding_box_m
            lines.append(
                f"| Bounding box | {_fmt(bb.get('x'))} × {_fmt(bb.get('y'))} × {_fmt(bb.get('z'))} m |"
            )
        lines.append(f"| Watertight | {m.watertight} |")
        lines.append(f"| Faces / Edges / Vertices | {m.n_faces} / {m.n_edges} / {m.n_vertices} |")
        lines.append("")
        if pkg.artifacts:
            lines.append("**Exported files:**")
            lines.append("")
            for fmt, path in pkg.artifacts.items():
                lines.append(f"- `{fmt.upper()}`: `{Path(path).name}`")
            lines.append("")

        # Validation
        lines.append("## 5. Validation Report")
        lines.append("")
        lines.append("| Stage | Result | Checks |")
        lines.append("|---|---|---|")
        for s in val.stages:
            passed_n = sum(1 for c in s.checks if c.passed)
            lines.append(
                f"| {s.stage} | {'PASS' if s.passed else 'FAIL'} | {passed_n}/{len(s.checks)} |"
            )
        lines.append("")
        lines.append("**Confidence breakdown:**")
        lines.append("")
        cb = val.confidence
        lines.append(f"- Topology integrity: {cb.topology_integrity:.2f}")
        lines.append(f"- Physics pass rate: {cb.physics_pass_rate:.2f}")
        lines.append(f"- Manufacturing feasibility: {cb.manufacturing_feasibility:.2f}")
        lines.append(f"- Template conformance: {cb.template_conformance:.2f}")
        lines.append(f"- **Overall: {cb.overall:.2f}**")
        lines.append("")

        # Detailed checks
        lines.append("<details><summary>Detailed checks</summary>")
        lines.append("")
        for s in val.stages:
            lines.append(f"**{s.stage}**")
            lines.append("")
            for c in s.checks:
                mark = "✅" if c.passed else ("⚠️" if c.severity == "warning" else "❌")
                lines.append(f"- {mark} `{c.name}` — {c.detail}")
            lines.append("")
        lines.append("</details>")
        lines.append("")

        if val.warnings:
            lines.append("### Warnings")
            lines.append("")
            for w in val.warnings:
                lines.append(f"- ⚠️ {w}")
            lines.append("")
        if val.recommendations:
            lines.append("### Recommendations")
            lines.append("")
            for r in val.recommendations:
                lines.append(f"- {r}")
            lines.append("")

        # Export control advisory
        advisory = self._itar.review(intent)
        if advisory.flagged:
            lines.append("## 6. Export-Control Advisory")
            lines.append("")
            for cat in advisory.categories:
                lines.append(f"- {cat}")
            for n in advisory.notes:
                lines.append(f"  - {n}")
            lines.append("")
            lines.append(f"> {advisory.disclaimer}")
            lines.append("")

        # Provenance
        lines.append("## 7. Provenance")
        lines.append("")
        lines.append(f"- LLM provider: `{pkg.provider}` (model: `{pkg.model}`)")
        lines.append(f"- Session: `{pkg.session_id}`")
        if pkg.cep_manifest_path:
            lines.append(f"- CEP handoff manifest: `{Path(pkg.cep_manifest_path).name}`")
        lines.append("")
        lines.append("---")
        lines.append(
            "*Generated by AeroForge AI — human review required before manufacture or export.*"
        )
        lines.append("")
        return "\n".join(lines)

    def write(self, pkg: CadOutputPackage, out_dir: Path, aeroforge_version: str = "0.1.0") -> Path:
        text = self.generate(pkg, aeroforge_version)
        path = Path(out_dir) / "design_report.md"
        path.write_text(text)
        return path


__all__ = ["ReportGenerator"]
