"""Residual tracker — parses OpenFOAM solver logs.

Extracts per-field initial residuals over iterations from a solver log so the
monitoring agent can judge convergence/divergence. Works on a log file or a
string (the latter makes it unit-testable without running a solver).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Tuple

# Matches lines like: "smoothSolver:  Solving for Ux, Initial residual = 0.0123, ..."
_RESIDUAL_RE = re.compile(r"Solving for (\w+),\s*Initial residual = ([0-9.eE+-]+)", re.IGNORECASE)
_TIME_RE = re.compile(r"^Time = ([0-9.eE+-]+)", re.MULTILINE)


class ResidualTracker:
    """Parses solver logs into residual histories."""

    def parse_text(self, text: str) -> Tuple[Dict[str, float], int, bool]:
        history: Dict[str, List[float]] = {}
        for field, value in _RESIDUAL_RE.findall(text):
            try:
                history.setdefault(field, []).append(float(value))
            except ValueError:
                continue
        iterations = len(_TIME_RE.findall(text))
        final = {f: vals[-1] for f, vals in history.items() if vals}
        converged = bool(final) and all(v < 1e-3 for v in final.values())
        return final, iterations, converged

    def parse_log(self, log_path: Path) -> Tuple[Dict[str, float], int, bool]:
        p = Path(log_path)
        if not p.exists():
            return {}, 0, False
        return self.parse_text(p.read_text(errors="ignore"))

    def history(self, text: str) -> Dict[str, List[float]]:
        history: Dict[str, List[float]] = {}
        for field, value in _RESIDUAL_RE.findall(text):
            try:
                history.setdefault(field, []).append(float(value))
            except ValueError:
                continue
        return history
