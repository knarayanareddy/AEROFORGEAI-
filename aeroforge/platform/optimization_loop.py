"""Closed CAD → CFD → CAD optimization loop (Part 3 flagship).

Ties Phase 1 (geometry) and Phase 2 (evaluation) into an automatic iteration:

    parse intent → design (Phase 1) → evaluate (analytical or CFD) →
    target check (ACCEPT / ITERATE / ESCALATE) → propose parameter changes →
    re-design … until targets are met, no progress is possible, or the
    iteration budget is exhausted.

It reuses the Phase-2 design-loop components (``TargetChecker``, ``DesignModifier``,
``ParetoTracker``, ``IterationHistory``) and the Phase-1 ``design_intent`` entry
point. Offline it is driven by the analytical evaluator; with a CFD solver
installed it is driven by simulated results.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..agents.orchestration_agent import AeroForge
from ..cfd.design_loop import (
    DesignModifier,
    IterationHistory,
    ParetoTracker,
    TargetChecker,
)
from ..cfd.types import LoopDecision
from ..types import CadOutputPackage, StructuredDesignIntent
from .evaluators import AnalyticalEvaluator, CFDEvaluator, PerformanceEvaluator


@dataclass
class OptimizationResult:
    converged: bool
    final_decision: str
    evaluator: str
    iterations_run: int
    best_quantities: Dict[str, float]
    best_parameters: Dict[str, Any]
    best_package: Optional[CadOutputPackage]
    history: List[Dict[str, Any]] = field(default_factory=list)
    pareto_front: List[Dict[str, Any]] = field(default_factory=list)
    rationale: str = ""


class OptimizationLoop:
    """Automatic multi-objective CAD↔CFD design iteration."""

    def __init__(
        self,
        forge: Optional[AeroForge] = None,
        evaluator: Optional[PerformanceEvaluator] = None,
        max_iterations: int = 8,
    ):
        self.forge = forge or AeroForge()
        self.evaluator = evaluator
        self.max_iterations = max_iterations

    # ------------------------------------------------------------------ #
    def _pick_evaluator(self) -> PerformanceEvaluator:
        if self.evaluator is not None:
            return self.evaluator
        from ..cfd.solvers import available_solvers

        if any(available_solvers().values()):
            return CFDEvaluator()
        return AnalyticalEvaluator()

    def optimize(
        self,
        request: str,
        targets: Optional[List[Dict[str, Any]]] = None,
        objectives: Optional[Dict[str, str]] = None,
        param_overrides: Optional[Dict[str, Any]] = None,
        out_dir: Optional[Path] = None,
    ) -> OptimizationResult:
        evaluator = self._pick_evaluator()
        working: StructuredDesignIntent = self.forge.intent_agent.parse(request)
        if param_overrides:
            working.parameters.update(param_overrides)

        # Default targets come from the parsed performance targets.
        if targets is None:
            targets = [
                {"metric": t.metric, "value": t.value, "operator": t.operator}
                for t in working.performance_targets
                if t.value is not None
            ]

        checker = TargetChecker()
        modifier = DesignModifier()
        pareto = ParetoTracker(objectives) if objectives else None
        history = IterationHistory()
        base_dir = (
            Path(out_dir)
            if out_dir
            else (self.forge.config.output_dir / f"opt_{working.design_id}")
        )

        best_pkg: Optional[CadOutputPackage] = None
        best_q: Dict[str, float] = {}
        best_params: Dict[str, Any] = {}
        final_decision = "ESCALATE"
        rationale = "No targets specified; returned the first design."
        prev_score: Optional[tuple] = None

        for i in range(self.max_iterations):
            pkg = self.forge.design_intent(
                working.model_copy(deep=True), out_dir=base_dir / f"iter_{i}"
            )
            quantities = evaluator.evaluate(pkg)
            if not quantities and evaluator.source == "cfd":
                quantities = AnalyticalEvaluator().evaluate(pkg)  # fallback when unsolved

            # The CFD checker tells us whether targets are met and which gaps remain;
            # the optimizer drives its own ITERATE/ESCALATE policy (iterate while a gap
            # remains and budget/progress allow, rather than giving up on the first
            # moderate gap).
            decision = checker.check(quantities, targets, iterations_used=0, max_iterations=99)
            accepted = (not targets) or decision.decision == LoopDecision.ACCEPT
            gaps = decision.gaps
            mods = modifier.propose(gaps, working.geometry_type) if gaps else []

            last_iter = i == self.max_iterations - 1
            score = self._score(quantities, targets)
            stalled = prev_score is not None and score <= prev_score  # no improvement
            if accepted:
                label = "ACCEPT"
            elif not mods or last_iter or stalled:
                label = "ESCALATE"
            else:
                label = "ITERATE"

            history.record(label, quantities, mods)
            if pareto is not None:
                pareto.add(f"iter_{i}", quantities)
            if best_pkg is None or self._is_better(quantities, best_q, targets):
                best_pkg, best_q, best_params = pkg, dict(quantities), dict(pkg.augmented.physics)

            if label in ("ACCEPT", "ESCALATE"):
                final_decision = label
                rationale = (
                    decision.rationale
                    if accepted
                    else (
                        "Targets unmet and no further progress/levers available."
                        if (stalled or not mods)
                        else f"Targets unmet after the {self.max_iterations}-iteration budget."
                    )
                )
                break

            prev_score = score
            for mod in mods:  # apply proposed parameter changes for the next design
                param = mod["param"]
                base = working.parameters.get(param, pkg.augmented.physics.get(param, 0.0))
                try:
                    working.parameters[param] = round(float(base) + float(mod["delta"]), 4)
                except (TypeError, ValueError):
                    continue

        return OptimizationResult(
            converged=final_decision == "ACCEPT",
            final_decision=final_decision,
            evaluator=evaluator.source,
            iterations_run=len(history),
            best_quantities=best_q,
            best_parameters=best_params,
            best_package=best_pkg,
            history=[vars(it) for it in history.iterations],
            pareto_front=[
                {"design_id": p.design_id, **p.objectives}
                for p in (pareto.front() if pareto else [])
            ],
            rationale=rationale,
        )

    # ------------------------------------------------------------------ #
    @staticmethod
    def _score(qty: Dict[str, float], targets: List[Dict[str, Any]]) -> tuple:
        """(#targets met, -total relative gap) — higher is better."""
        met = 0
        gap = 0.0
        for t in targets:
            v = qty.get(t["metric"])
            if v is None or t.get("value") is None:
                continue
            op, tgt = t.get("operator", "gte"), t["value"]
            ok = (v >= tgt) if op == "gte" else (v <= tgt) if op == "lte" else abs(v - tgt) < 1e-6
            met += int(ok)
            gap += abs(v - tgt) / (abs(tgt) or 1.0)
        return (met, -gap)

    def _is_better(
        self, q: Dict[str, float], best: Dict[str, float], targets: List[Dict[str, Any]]
    ) -> bool:
        """Prefer the design that satisfies more targets, then the smaller gap."""
        return self._score(q, targets) > self._score(best, targets)
