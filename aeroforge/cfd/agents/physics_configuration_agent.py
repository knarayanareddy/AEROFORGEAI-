"""Physics Configuration Agent.

Assembles a complete :class:`SolverConfigPackage` from a prepared geometry: picks
the solver and turbulence model, generates numerical schemes, boundary and
initial conditions, convergence settings, and the thermophysical/turbulence
property dictionaries. The output is the full set of OpenFOAM case files (as
in-memory strings) ready to be written to a case directory.
"""

from __future__ import annotations

from typing import Dict

from ..physics.bc_generator import BoundaryConditionGenerator
from ..physics.convergence_strategy import ConvergenceStrategy
from ..physics.ic_engine import InitialConditionEngine
from ..physics.scheme_configurator import SchemeConfigurator
from ..physics.solver_selector import SolverSelector
from ..physics.turbulence_advisor import TurbulenceAdvisor
from ..types import GeometryPreparationPackage, SolverConfigPackage


def _foam(obj: str, cls: str, body: str) -> str:
    return (
        f"FoamFile\n{{\n    version 2.0;\n    format ascii;\n    class {cls};\n"
        f"    object {obj};\n}}\n\n{body}"
    )


class PhysicsConfigurationAgent:
    """Builds the complete solver configuration for a CFD case."""

    def __init__(self) -> None:
        self.solver_selector = SolverSelector()
        self.turbulence_advisor = TurbulenceAdvisor()
        self.schemes = SchemeConfigurator()
        self.bc = BoundaryConditionGenerator()
        self.ic = InitialConditionEngine()
        self.convergence = ConvergenceStrategy()

    def configure(
        self, prep: GeometryPreparationPackage, steady: bool = True, max_iterations: int = 2000
    ) -> SolverConfigPackage:
        flow = prep.flow_conditions
        ctype = prep.manifest.component_type if prep.manifest else ""
        reacting = "combustor" in (ctype or "").lower()

        solver = self.solver_selector.select(flow.regime, steady=steady, reacting=reacting)
        turb = self.turbulence_advisor.advise(
            flow.regime, ctype, reacting=reacting, reynolds_number=flow.reynolds_number
        )
        conv = self.convergence.configure(solver, flow.regime, max_iterations=max_iterations)
        init = self.ic.configure(flow)

        files: Dict[str, str] = {}
        # system/
        files["system/controlDict"] = conv.control_dict
        files["system/fvSchemes"] = self.schemes.generate(solver, steady=steady)
        files["system/fvSolution"] = conv.fv_solution
        # constant/
        files["constant/turbulenceProperties"] = self._turbulence_properties(turb)
        if solver.is_compressible:
            files["constant/thermophysicalProperties"] = self._thermo_properties(flow)
        else:
            files["constant/transportProperties"] = self._transport_properties(flow)
        # 0/
        for field, content in self.bc.generate(prep.patches, flow, turb, solver).items():
            files[f"0/{field}"] = content

        notes = [solver.rationale, turb.rationale, *init.notes]
        return SolverConfigPackage(
            solver=solver.solver,
            turbulence_model=turb.model,
            wall_treatment=turb.wall_treatment,
            files=files,
            notes=notes,
        )

    # ------------------------------------------------------------------ #
    def _turbulence_properties(self, turb) -> str:
        if turb.model == "laminar":
            body = "simulationType laminar;\n"
        else:
            body = (
                "simulationType RAS;\n\nRAS\n{\n"
                f"    RASModel        {turb.model};\n"
                "    turbulence      on;\n    printCoeffs     on;\n}\n"
            )
        return _foam("turbulenceProperties", "dictionary", body)

    def _thermo_properties(self, flow) -> str:
        cp = flow.fluid.gamma * flow.fluid.R / (flow.fluid.gamma - 1.0)
        mol_weight = 28.96  # air g/mol
        body = (
            "thermoType\n{\n    type            hePsiThermo;\n    mixture         pureMixture;\n"
            "    transport       sutherland;\n    thermo          hConst;\n"
            "    equationOfState perfectGas;\n    specie          specie;\n    energy          sensibleInternalEnergy;\n}\n\n"
            "mixture\n{\n    specie\n    {\n"
            f"        molWeight       {mol_weight};\n    }}\n"
            "    thermodynamics\n    {\n"
            f"        Cp              {round(cp, 2)};\n        Hf              0;\n    }}\n"
            "    transport\n    {\n        As              1.4792e-06;\n        Ts              116;\n    }\n}\n"
        )
        return _foam("thermophysicalProperties", "dictionary", body)

    def _transport_properties(self, flow) -> str:
        body = (
            "transportModel  Newtonian;\n"
            f"nu              {flow.fluid.kinematic_viscosity:.6e};\n"
        )
        return _foam("transportProperties", "dictionary", body)
