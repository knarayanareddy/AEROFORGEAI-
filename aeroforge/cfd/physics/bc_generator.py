"""Boundary-condition generator — produces the OpenFOAM ``0/`` directory.

Builds field files (U, p, T, and turbulence fields k/omega/nut) with per-patch
boundary entries derived from the patch map, flow conditions, turbulence model,
and solver type. Subsonic vs. supersonic inlets/outlets get different BC types,
and walls get low-Re wall-function or noSlip treatment as appropriate.
"""

from __future__ import annotations

import math
from typing import Dict, List

from ..types import BoundaryPatch, FlowConditions, PatchType
from .solver_selector import SolverChoice
from .turbulence_advisor import TurbulenceChoice


def _foam_header(field_class: str, obj: str) -> str:
    return (
        "FoamFile\n{\n    version 2.0;\n    format ascii;\n"
        f"    class {field_class};\n    object {obj};\n}}\n"
    )


class BoundaryConditionGenerator:
    """Generates 0/ directory field files for OpenFOAM."""

    def generate(
        self,
        patches: List[BoundaryPatch],
        flow: FlowConditions,
        turbulence: TurbulenceChoice,
        solver: SolverChoice,
    ) -> Dict[str, str]:
        fields: Dict[str, str] = {}
        fields["U"] = self._velocity(patches, flow)
        fields["p"] = self._pressure(patches, flow, solver)
        if solver.is_compressible:
            fields["T"] = self._temperature(patches, flow)
        if turbulence.model in ("kOmegaSST",):
            k, omega, nut = self._turbulence_inlet_values(flow)
            fields["k"] = self._k(patches, k, turbulence)
            fields["omega"] = self._omega(patches, omega, turbulence)
            fields["nut"] = self._nut(patches, nut, turbulence)
        return fields

    # ------------------------------------------------------------------ #
    def _supersonic(self, flow: FlowConditions) -> bool:
        return flow.mach >= 1.0

    def _boundary_block(self, entries: Dict[str, str]) -> str:
        out = "boundaryField\n{\n"
        for patch, body in entries.items():
            out += f"    {patch}\n    {{\n{body}    }}\n"
        out += "}\n"
        return out

    def _velocity(self, patches, flow) -> str:
        u = round(flow.velocity_ms, 3)
        entries = {}
        for p in patches:
            if p.patch_type == PatchType.INLET:
                entries[p.name] = (
                    f"        type            fixedValue;\n        value           uniform ({u} 0 0);\n"
                )
            elif p.patch_type == PatchType.OUTLET:
                entries[p.name] = (
                    "        type            zeroGradient;\n"
                    if self._supersonic(flow)
                    else "        type            pressureInletOutletVelocity;\n        value           uniform (0 0 0);\n"
                )
            elif p.patch_type == PatchType.WALL:
                entries[p.name] = "        type            noSlip;\n"
            elif p.patch_type == PatchType.SYMMETRY:
                entries[p.name] = "        type            symmetryPlane;\n"
            else:  # FARFIELD
                entries[p.name] = (
                    f"        type            freestreamVelocity;\n        freestreamValue uniform ({u} 0 0);\n"
                )
        return (
            _foam_header("volVectorField", "U")
            + "\ndimensions      [0 1 -1 0 0 0 0];\n"
            + f"internalField   uniform ({u} 0 0);\n\n"
            + self._boundary_block(entries)
        )

    def _pressure(self, patches, flow, solver) -> str:
        if solver.is_compressible:
            dims = "[1 -1 -2 0 0 0 0]"
            internal = round(flow.pressure_pa, 1)
        else:
            dims = "[0 2 -2 0 0 0 0]"  # kinematic pressure
            internal = 0.0
        entries = {}
        for p in patches:
            if p.patch_type == PatchType.INLET:
                entries[p.name] = (
                    "        type            zeroGradient;\n"
                    if not self._supersonic(flow)
                    else f"        type            fixedValue;\n        value           uniform {internal};\n"
                )
            elif p.patch_type == PatchType.OUTLET:
                entries[p.name] = (
                    "        type            zeroGradient;\n"
                    if self._supersonic(flow)
                    else f"        type            fixedValue;\n        value           uniform {internal};\n"
                )
            elif p.patch_type == PatchType.SYMMETRY:
                entries[p.name] = "        type            symmetryPlane;\n"
            else:
                entries[p.name] = "        type            zeroGradient;\n"
        return (
            _foam_header("volScalarField", "p")
            + f"\ndimensions      {dims};\n"
            + f"internalField   uniform {internal};\n\n"
            + self._boundary_block(entries)
        )

    def _temperature(self, patches, flow) -> str:
        t = round(flow.temperature_K, 2)
        entries = {}
        for p in patches:
            if p.patch_type == PatchType.INLET:
                entries[p.name] = (
                    f"        type            fixedValue;\n        value           uniform {t};\n"
                )
            elif p.patch_type == PatchType.WALL:
                entries[p.name] = "        type            zeroGradient;\n"  # adiabatic
            elif p.patch_type == PatchType.SYMMETRY:
                entries[p.name] = "        type            symmetryPlane;\n"
            else:
                entries[p.name] = "        type            zeroGradient;\n"
        return (
            _foam_header("volScalarField", "T")
            + "\ndimensions      [0 0 0 1 0 0 0];\n"
            + f"internalField   uniform {t};\n\n"
            + self._boundary_block(entries)
        )

    def _turbulence_inlet_values(self, flow):
        intensity = 0.05
        u = max(flow.velocity_ms, 1e-6)
        k = 1.5 * (intensity * u) ** 2
        length_scale = 0.07 * flow.characteristic_length_m
        cmu = 0.09
        omega = (k**0.5) / (cmu**0.25 * max(length_scale, 1e-6))
        nut = k / omega if omega > 0 else 0.0
        return round(k, 6), round(omega, 4), round(nut, 8)

    def _k(self, patches, k, turb) -> str:
        entries = {}
        for p in patches:
            if p.patch_type == PatchType.INLET:
                entries[p.name] = (
                    f"        type            fixedValue;\n        value           uniform {k};\n"
                )
            elif p.patch_type == PatchType.OUTLET:
                entries[p.name] = (
                    f"        type            inletOutlet;\n        inletValue      uniform {k};\n        value           uniform {k};\n"
                )
            elif p.patch_type == PatchType.WALL:
                entries[p.name] = (
                    f"        type            kqRWallFunction;\n        value           uniform {k};\n"
                )
            elif p.patch_type == PatchType.SYMMETRY:
                entries[p.name] = "        type            symmetryPlane;\n"
            else:
                entries[p.name] = (
                    f"        type            fixedValue;\n        value           uniform {k};\n"
                )
        return (
            _foam_header("volScalarField", "k")
            + "\ndimensions      [0 2 -2 0 0 0 0];\n"
            + f"internalField   uniform {k};\n\n"
            + self._boundary_block(entries)
        )

    def _omega(self, patches, omega, turb) -> str:
        entries = {}
        for p in patches:
            if p.patch_type == PatchType.INLET:
                entries[p.name] = (
                    f"        type            fixedValue;\n        value           uniform {omega};\n"
                )
            elif p.patch_type == PatchType.OUTLET:
                entries[p.name] = (
                    f"        type            inletOutlet;\n        inletValue      uniform {omega};\n        value           uniform {omega};\n"
                )
            elif p.patch_type == PatchType.WALL:
                entries[p.name] = (
                    f"        type            omegaWallFunction;\n        value           uniform {omega};\n"
                )
            elif p.patch_type == PatchType.SYMMETRY:
                entries[p.name] = "        type            symmetryPlane;\n"
            else:
                entries[p.name] = (
                    f"        type            fixedValue;\n        value           uniform {omega};\n"
                )
        return (
            _foam_header("volScalarField", "omega")
            + "\ndimensions      [0 0 -1 0 0 0 0];\n"
            + f"internalField   uniform {omega};\n\n"
            + self._boundary_block(entries)
        )

    def _nut(self, patches, nut, turb) -> str:
        wall_fn = "nutLowReWallFunction" if turb.wall_treatment == "low_Re" else "nutkWallFunction"
        entries = {}
        for p in patches:
            if p.patch_type == PatchType.WALL:
                entries[p.name] = (
                    f"        type            {wall_fn};\n        value           uniform 0;\n"
                )
            elif p.patch_type == PatchType.SYMMETRY:
                entries[p.name] = "        type            symmetryPlane;\n"
            else:
                entries[p.name] = (
                    "        type            calculated;\n        value           uniform 0;\n"
                )
        return (
            _foam_header("volScalarField", "nut")
            + "\ndimensions      [0 2 -1 0 0 0 0];\n"
            + f"internalField   uniform {nut};\n\n"
            + self._boundary_block(entries)
        )
