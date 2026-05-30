"""ParaView automation driver — interface stub.

Visualisation (contour plots, slices, streamlines, Schlieren) is driven via
``pvpython``/``pvbatch``. This stub defines the contract and emits a ready-to-run
pvpython script; executing it requires a ParaView install.
"""

from __future__ import annotations

import shutil
from pathlib import Path


class ParaViewDriver:
    """Generates ParaView batch scripts for results visualisation."""

    def is_available(self) -> bool:
        return shutil.which("pvpython") is not None or shutil.which("pvbatch") is not None

    def write_script(self, case_dir: Path) -> Path:
        case_dir = Path(case_dir)
        script = case_dir / "visualize.py"
        script.write_text(
            "# AeroForge ParaView batch script (run with: pvpython visualize.py)\n"
            "from paraview.simple import *\n"
            "case = OpenFOAMReader(FileName='case.foam')\n"
            "Show(case); ResetCamera()\n"
            "SaveScreenshot('mach_contour.png')\n"
        )
        (case_dir / "case.foam").write_text("")  # OpenFOAM reader trigger file
        return script
