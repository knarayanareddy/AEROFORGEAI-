# OpenFOAM case templates

The OpenFOAM dictionaries (`controlDict`, `fvSchemes`, `fvSolution`,
`thermophysicalProperties`, `turbulenceProperties`, and the `0/` fields) are
generated programmatically by the Physics Configuration Agent
(`aeroforge/cfd/physics/`) rather than copied from static templates, so they are
always consistent with the selected solver, turbulence model, and flow regime.

This directory is reserved for any hand-tuned reference dictionaries you wish to
override the generators with in future.
