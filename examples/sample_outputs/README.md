# Sample Outputs

Each subdirectory holds the `design_report.md` and `cep_manifest.json` produced by AeroForge for a representative request. Geometry files (STEP/IGES/STL/BREP) are build output and are not committed — regenerate them with:

```bash
python examples/run_examples.py ./out
```

- `naca2412_airfoil/` — Design a NACA 2412 airfoil at 2 m chord, 5 m span
- `bell_nozzle_M3/` — Design a Rao bell nozzle, throat radius 0.05 m, exit Mach 3.0
- `supersonic_inlet_M2p5/` — Design a 2-ramp supersonic inlet for Mach 2.5, total pressure recovery > 0.85, titanium
