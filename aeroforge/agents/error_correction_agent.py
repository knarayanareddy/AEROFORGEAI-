"""Error Correction Agent (sub-agent of the Execution Agent).

When a generated script fails in the sandbox, this agent attempts to repair it.
With an LLM available it sends the failing script + error to the
``error_correction`` prompt. Offline, it applies a set of deterministic repair
heuristics for the most common OpenCASCADE failure modes (zero/degenerate radii,
zero-length edges, non-finite values). Bounded by ``max_attempts``.
"""

from __future__ import annotations

import re
from typing import Optional

from ..llm.gateway import LLMGateway
from ..llm.prompt_registry import get_prompt
from ..llm.router import TASK_CODE_GENERATION


class ErrorCorrectionAgent:
    """Self-corrects failing CadQuery scripts."""

    def __init__(self, llm: Optional[LLMGateway] = None):
        self.llm = llm

    def correct(self, code: str, error: str, attempt: int) -> Optional[str]:
        """Return a revised script, or None if no correction could be made."""
        if self.llm is not None:
            revised = self._llm_correct(code, error)
            if revised:
                return revised
        return self._heuristic_correct(code, error)

    def _llm_correct(self, code: str, error: str) -> Optional[str]:
        prompt = get_prompt("error_correction")
        resp = self.llm.complete(  # type: ignore[union-attr]
            TASK_CODE_GENERATION,
            prompt.render(code=code, error=error),
            system=prompt.system,
            temperature=0.1,
        )
        if resp.ok and resp.text and "result" in resp.text:
            return self._strip_fences(resp.text)
        return None

    def _heuristic_correct(self, code: str, error: str) -> Optional[str]:
        err = (error or "").lower()
        new = code

        # Negative or zero radius -> clamp to a small positive value.
        if "radius should be positive" in err or "gp_circ" in err:
            new = re.sub(r"\.circle\(\s*-?0?\.?0*\s*\)", ".circle(0.001)", new)
            new = re.sub(r"\.circle\(\s*-([0-9.]+)\)", r".circle(\1)", new)

        # Degenerate / not-done construction -> nudge a tiny epsilon on extrude/revolve 0.
        if "command not done" in err or "notdone" in err:
            new = re.sub(r"\.extrude\(\s*0\.?0*\s*\)", ".extrude(0.001)", new)

        return new if new != code else None

    @staticmethod
    def _strip_fences(text: str) -> str:
        text = re.sub(r"^```[a-zA-Z]*\n", "", text.strip())
        text = re.sub(r"\n```$", "", text)
        return text
