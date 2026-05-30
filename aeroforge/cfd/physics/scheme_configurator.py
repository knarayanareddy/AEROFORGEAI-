"""Numerical scheme configurator — generates the OpenFOAM ``fvSchemes`` dict.

Picks shock-robust, bounded schemes for compressible/supersonic flow and
standard second-order schemes for incompressible flow. Wrong schemes cause
divergence or excessive numerical diffusion, so this is regime-aware.
"""

from __future__ import annotations

from .solver_selector import SolverChoice

_HEADER = """/*--------------------------------*- C++ -*----------------------------------*\\
| AeroForge AI — auto-generated fvSchemes                                      |
\\*---------------------------------------------------------------------------*/
FoamFile
{{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      fvSchemes;
}}
"""


class SchemeConfigurator:
    """Generates the ``system/fvSchemes`` dictionary content."""

    def generate(self, solver: SolverChoice, steady: bool = True) -> str:
        ddt = (
            "steadyState"
            if steady and not solver.density_based
            else "localEuler" if steady else "Euler"
        )

        if solver.is_compressible:
            div = (
                "    default         none;\n"
                "    div(phi,U)      Gauss Minmod;\n"
                "    div(phi,e)      Gauss Minmod;\n"
                "    div(phi,K)      Gauss linear;\n"
                "    div(phi,k)      Gauss limitedLinear 1;\n"
                "    div(phi,omega)  Gauss limitedLinear 1;\n"
                "    div(((rho*nuEff)*dev2(T(grad(U))))) Gauss linear;\n"
            )
            grad = (
                "    default         Gauss linear;\n"
                "    grad(p)         cellLimited Gauss linear 1;\n"
                "    grad(U)         cellLimited Gauss linear 1;\n"
            )
        else:
            div = (
                "    default         none;\n"
                "    div(phi,U)      bounded Gauss linearUpwind grad(U);\n"
                "    div(phi,k)      bounded Gauss limitedLinear 1;\n"
                "    div(phi,omega)  bounded Gauss limitedLinear 1;\n"
                "    div((nuEff*dev2(T(grad(U))))) Gauss linear;\n"
            )
            grad = "    default         Gauss linear;\n"

        return (
            _HEADER.format()
            + "\nddtSchemes\n{\n    default         "
            + ddt
            + ";\n}\n"
            + "\ngradSchemes\n{\n"
            + grad
            + "}\n"
            + "\ndivSchemes\n{\n"
            + div
            + "}\n"
            + "\nlaplacianSchemes\n{\n    default         Gauss linear limited corrected 0.5;\n}\n"
            + "\ninterpolationSchemes\n{\n    default         linear;\n}\n"
            + "\nsnGradSchemes\n{\n    default         limited corrected 0.5;\n}\n"
            + "\nfluxRequired\n{\n    default         no;\n    p;\n"
            + ("    rho;\n" if solver.density_based else "")
            + "}\n"
        )
