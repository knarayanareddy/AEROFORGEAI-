"""Versioned prompt template registry.

All prompts are version-controlled (design doc AI/LLM standard). Each entry has a
semantic version so prompt changes are auditable. Templates use ``str.format``
fields.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class PromptTemplate:
    id: str
    version: str
    system: str
    template: str

    def render(self, **kwargs) -> str:
        return self.template.format(**kwargs)


_REGISTRY: Dict[str, PromptTemplate] = {
    "intent_parse": PromptTemplate(
        id="intent_parse",
        version="1.0.0",
        system=(
            "You are an aerospace design intent parser. Extract a STRICT JSON object "
            "matching the AeroForge StructuredDesignIntent schema from the user's "
            "request. Use SI units. Output JSON only, no prose."
        ),
        template=(
            "User request:\n{raw_input}\n\n"
            "Return JSON with keys: geometry_type, geometry_family, dimensionality, "
            "symmetry, mach_design_point, material, performance_targets (list of "
            "{{metric,value,operator}}), parameters (object of numeric params such as "
            "chord_m, span_m, throat_radius_m, exit_mach, ramp1_angle_deg), and "
            "intent_confidence (0-1)."
        ),
    ),
    "cad_codegen": PromptTemplate(
        id="cad_codegen",
        version="1.0.0",
        system=(
            "You generate CadQuery (Python) scripts for aerospace geometry. The script "
            "MUST assign the final shape to a variable named `result`. Only `cq`, "
            "`math`, and `np` are available. No file I/O, no imports."
        ),
        template=(
            "Component: {component}\nParameters (SI): {params}\n"
            "Physics context: {physics}\n\n"
            "Write a CadQuery script that builds this part and assigns it to `result`."
        ),
    ),
    "error_correction": PromptTemplate(
        id="error_correction",
        version="1.0.0",
        system=(
            "You fix failing CadQuery scripts. Return only a corrected script that "
            "assigns the shape to `result`. Preserve the design intent."
        ),
        template=(
            "Failed script:\n{code}\n\nError:\n{error}\n\n" "Return a corrected CadQuery script."
        ),
    ),
    "design_report": PromptTemplate(
        id="design_report",
        version="1.0.0",
        system="You write concise aerospace design reports for engineers.",
        template=(
            "Summarise this design for an engineering review.\nIntent: {intent}\n"
            "Physics: {physics}\nValidation: {validation}\n"
        ),
    ),
}


def get_prompt(prompt_id: str) -> PromptTemplate:
    if prompt_id not in _REGISTRY:
        raise KeyError(f"Unknown prompt '{prompt_id}'. Known: {sorted(_REGISTRY)}")
    return _REGISTRY[prompt_id]


def all_prompts() -> Dict[str, PromptTemplate]:
    return dict(_REGISTRY)
