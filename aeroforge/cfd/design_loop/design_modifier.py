"""Design modifier — proposes geometry parameter changes for Phase 1.

Turns quantified performance gaps into structured modification requests that the
Phase 1 CAD system can apply, e.g. ``{"param": "ramp2_angle_deg", "delta": +1.0}``.
This is the Phase 2 → Phase 1 half of the integration contract (emitted as JSON,
no code coupling).
"""

from __future__ import annotations

from typing import Any, Dict, List

# Heuristic: which geometry parameter to nudge to improve a given metric, and the
# sign of the nudge. Magnitudes scale with the gap.
_LEVERS = {
    "total_pressure_recovery": [("ramp1_angle_deg", +1.0), ("ramp2_angle_deg", +1.0)],
    "mass_flow_rate_kg_s": [("width_m", +1.0)],
    "drag_coefficient": [("ramp2_angle_deg", -1.0)],
    "cowl_drag_coefficient": [("cowl_lip_bluntness_m", -1.0)],
}


class DesignModifier:
    """Proposes structured parameter modifications from performance gaps."""

    def propose(self, gaps: List[Dict[str, Any]], component_type: str = "") -> List[Dict[str, Any]]:
        mods: List[Dict[str, Any]] = []
        for gap in gaps:
            metric = gap.get("metric")
            levers = _LEVERS.get(metric)
            if not levers:
                continue
            # Step size proportional to the relative gap, capped for stability.
            target = gap.get("target") or 1.0
            rel = min(0.5, abs(gap.get("gap", 0.0)) / abs(target)) if target else 0.1
            for param, direction in levers:
                step = direction * round(max(0.5, 5.0 * rel), 2)
                mods.append(
                    {
                        "param": param,
                        "delta": step,
                        "reason": f"close gap on {metric} (gap={gap.get('gap')})",
                        "component": component_type,
                    }
                )
        return mods
