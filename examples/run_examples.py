"""Run a set of representative AeroForge designs and print a summary.

Usage:
    python examples/run_examples.py [output_dir]

Produces STEP/IGES/STL/BREP geometry, a Markdown design report, and a CEP
manifest for each example under the chosen output directory (default ./out).
"""

from __future__ import annotations

import sys
from pathlib import Path

from aeroforge import AeroForge

EXAMPLES = [
    "Design a NACA 2412 airfoil at 2 m chord, 5 m span",
    "Design a NACA 0012 control fin, chord 0.3 m, span 0.4 m",
    "Design a Rao bell nozzle, throat radius 0.05 m, exit Mach 3.0",
    "Design a minimum-length nozzle, throat radius 0.04 m, exit Mach 2.8",
    "Design a 2-ramp supersonic inlet for Mach 2.5, total pressure recovery > 0.85, titanium",
    "Design a mixed-compression scramjet inlet for Mach 5.5, 12 kg/s mass flow",
    "Design a Von Karman nose cone, base radius 0.15 m, length 1.2 m",
]


def main() -> None:
    out_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("out")
    forge = AeroForge()
    print(f"{'component':18s} {'conf':>5s} {'passed':>7s}  files")
    print("-" * 70)
    for prompt in EXAMPLES:
        pkg = forge.design(prompt, out_dir=out_root / prompt[7:30].strip().replace(" ", "_"))
        files = ",".join(pkg.artifacts.keys())
        print(f"{pkg.intent.geometry_type:18s} "
              f"{pkg.validation.confidence.overall:5.2f} "
              f"{str(pkg.validation.passed):>7s}  {files}")
    print(f"\nOutputs written under: {out_root.resolve()}")


if __name__ == "__main__":
    main()
