# AeroForge AI — Part 2: CFD Automation System

PART 2 — CFD Automation System
Section 1: CFD System Vision & Philosophy
1.1 The Problem
Computational Fluid Dynamics is the backbone of aerospace propulsion and aerodynamic design validation. Yet today, running a single CFD case on a scramjet inlet or turbofan nacelle requires:

2–5 days of expert pre-processing (meshing, boundary condition setup, solver configuration)
Deep knowledge of solver-specific syntax (OpenFOAM dictionaries, Fluent TUI commands, SU2 config files)
Manual interpretation of convergence behavior, residual plots, and field data
Bespoke post-processing scripts for every new geometry type
Complete restart if the mesh quality is poor or boundary conditions diverge
The result: a single design-simulate-analyze cycle takes a week. A proper design space exploration (10–50 variants) takes months. This is the core bottleneck in aerospace propulsion development.

1.2 The CFD Automation Vision
Phase 2 of AeroForge AI closes this loop:

text

Engineer says:
"Validate the scramjet inlet from last session at Mach 5.5 cruise.
 I need total pressure recovery, mass capture ratio, and shock structure.
 If recovery is below 0.85, try increasing the second ramp angle by 1°
 and re-run. Give me the best design within 5 iterations."

AeroForge CFD Agent:
→ Ingests CEP package from Phase 1 (geometry + CFD hints)
→ Generates high-quality boundary-layer-resolved mesh via Gmsh/blockMesh
→ Configures rhoCentralFoam for hypersonic compressible flow
→ Submits and monitors simulation (local HPC or cloud)
→ Extracts: pressure recovery, mass capture ratio, shock angles
→ Compares against targets
→ If target not met: modifies ramp angle, re-generates geometry via Phase 1 agent,
  re-meshes, re-runs (autonomous design loop)
→ Returns: best design STEP file + CFD results + ranked comparison report
1.3 Design Philosophy (CFD-Specific)
1.3.1 Solver Agnosticism
The CFD system wraps every solver behind a SolverAdapter interface. Switching from OpenFOAM to Ansys Fluent to SU2 requires only swapping the adapter — the upstream agents, mesh pipeline, and post-processing layer are identical.

1.3.2 Mesh-First Quality Guarantee
Bad mesh = bad results, regardless of solver sophistication. The meshing pipeline has its own validation layer that refuses to submit a simulation until mesh quality metrics (skewness, aspect ratio, orthogonality, y⁺ estimate) pass domain-appropriate thresholds.

1.3.3 Physics-Aware Configuration
The CFD agent does not blindly fill in solver settings. It uses the same Aerospace Knowledge Graph from Phase 1 to select appropriate turbulence models, numerical schemes, relaxation factors, and convergence criteria based on the flow regime, geometry type, and accuracy requirements.

1.3.4 Convergence-Aware Autonomy
Simulations are monitored continuously. The agent detects divergence, stagnation, and numerical instability early — and responds autonomously by adjusting relaxation factors, switching numerical schemes, or flagging for human intervention — before wasting compute.

1.3.5 Multi-Fidelity by Design
Not every design iteration needs a full 3D RANS simulation. The CFD system implements a fidelity ladder:

text

FIDELITY LADDER (ascending cost, ascending accuracy)

L0: Analytical estimates (oblique shock theory, isentropic relations)
    → milliseconds, ±10-15% accuracy, no mesh required

L1: 2D RANS (OpenFOAM / SU2, structured 2D mesh)
    → 5–30 minutes, ±5-8% accuracy, ~50k cells

L2: 3D RANS coarse (OpenFOAM, unstructured 3D mesh)
    → 1–4 hours, ±3-5% accuracy, ~1-2M cells

L3: 3D RANS fine + wall-resolved BL
    → 4–12 hours, ±1-3% accuracy, ~5-20M cells

L4: DDES/DES (Detached Eddy Simulation)
    → 1–3 days, ±0.5-2% accuracy, 20-100M cells

L5: LES / DNS (future)
    → Days-weeks, near DNS accuracy

Default exploration strategy:
  L0 → filter → L1 → filter → L2 (final validation at L3)
1.3.6 Clean Phase 1 Independence
Phase 2 has zero code dependencies on Phase 1. It communicates exclusively through the CAD Exchange Protocol (CEP) defined at the end of Part 1. You can feed CEP packages from FreeCAD, CATIA, or any external CAD tool directly into the CFD pipeline.

Section 2: System Architecture
2.1 Top-Level CFD Architecture
text

╔═══════════════════════════════════════════════════════════════════════╗
║                     AEROFORGE AI — PHASE 2                           ║
║                     CFD AUTOMATION SYSTEM                            ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌───────────────────────────────────────────────────────────────┐   ║
║  │                      INPUT LAYER                              │   ║
║  │  CEP Package (from Phase 1) · Direct STEP/IGES · CLI · API    │   ║
║  └───────────────────────────┬───────────────────────────────────┘   ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │               CFD ORCHESTRATION AGENT                         │   ║
║  │  CEP Ingestor · Fidelity Selector · Task Planner              │   ║
║  │  Autonomy Controller · Iteration Manager · Session State      │   ║
║  └───────────────────────────┬───────────────────────────────────┘   ║
║                              │                                       ║
║        ┌─────────────────────┼────────────────────────┐             ║
║        │                     │                        │             ║
║  ┌─────▼──────┐    ┌─────────▼─────────┐    ┌────────▼──────────┐  ║
║  │  LLM       │    │  AEROSPACE        │    │  MEMORY &         │  ║
║  │  GATEWAY   │    │  KNOWLEDGE        │    │  SIMULATION       │  ║
║  │  (Part 1)  │    │  GRAPH (Part 1)   │    │  HISTORY          │  ║
║  └─────┬──────┘    └─────────┬─────────┘    └────────┬──────────┘  ║
║        │                     │                        │             ║
║  ┌─────▼─────────────────────▼────────────────────────▼──────────┐  ║
║  │                   GEOMETRY PREPARATION AGENT                  │  ║
║  │  CEP Validator · Geometry Cleaner · Domain Extractor          │  ║
║  │  Flow Region Definer · Symmetry Detector                      │  ║
║  └───────────────────────────┬───────────────────────────────────┘  ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │                    MESHING PIPELINE                           │   ║
║  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │   ║
║  │  │  Gmsh      │  │ blockMesh  │  │ snappyHex  │  + more     │   ║
║  │  │  Adapter   │  │ Adapter    │  │ Adapter    │             │   ║
║  │  └────────────┘  └────────────┘  └────────────┘             │   ║
║  │  Mesh Quality Validator · y⁺ Estimator · Refinement Engine   │   ║
║  └───────────────────────────┬───────────────────────────────────┘  ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │               PHYSICS CONFIGURATION ENGINE                    │   ║
║  │  Turbulence Selector · Scheme Advisor · BC Generator          │   ║
║  │  Initial Condition Engine · Convergence Strategy              │   ║
║  └───────────────────────────┬───────────────────────────────────┘   ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │               CFD SOLVER INTEGRATION LAYER                    │   ║
║  │  ┌────────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐  │   ║
║  │  │ OpenFOAM   │  │  SU2       │  │  Fluent │  │  STAR-   │  │   ║
║  │  │ Adapter    │  │  Adapter   │  │  Adapter│  │  CCM+    │  │   ║
║  │  └────────────┘  └────────────┘  └─────────┘  └──────────┘  │   ║
║  └───────────────────────────┬───────────────────────────────────┘  ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │            SIMULATION MONITORING AGENT                        │   ║
║  │  Residual Tracker · Convergence Detector · Divergence Handler │   ║
║  │  Resource Monitor · Adaptive Scheme Controller               │   ║
║  └───────────────────────────┬───────────────────────────────────┘  ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │            POST-PROCESSING & RESULTS AGENT                    │   ║
║  │  Field Extractor · Integral Quantity Calc · ParaView Driver   │   ║
║  │  Visualization Generator · Results Validator · Report Builder │   ║
║  └───────────────────────────┬───────────────────────────────────┘  ║
║                              │                                       ║
║  ┌───────────────────────────▼───────────────────────────────────┐   ║
║  │            DESIGN LOOP CONTROLLER                             │   ║
║  │  Target Checker · Design Modifier (→ Phase 1) · Iteration Log │   ║
║  │  Convergence Criterion · Pareto Front Tracker                 │   ║
║  └───────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════╝
2.2 Agent Hierarchy
text

CFD ORCHESTRATION AGENT (COA)
│
├── GEOMETRY PREPARATION AGENT (GPA)
│   ├── Validates incoming CEP package
│   ├── Cleans and heals geometry for meshing
│   ├── Extracts fluid domain (subtracts solid from bounding box)
│   └── Identifies and labels boundary patches
│
├── MESHING AGENT (MA)
│   ├── Selects meshing strategy
│   ├── Configures meshing tool
│   ├── Executes mesh generation
│   ├── Validates mesh quality
│   └── SUB-AGENT: MESH CORRECTION AGENT (MCA)
│       └── Self-corrects poor mesh quality metrics
│
├── PHYSICS CONFIGURATION AGENT (PhCA)
│   ├── Selects turbulence model
│   ├── Configures numerical schemes
│   ├── Generates boundary conditions
│   ├── Sets initial conditions
│   └── Configures convergence criteria
│
├── SOLVER EXECUTION AGENT (SEA)
│   ├── Prepares solver case directory
│   ├── Submits simulation (local/HPC/cloud)
│   ├── Monitors execution
│   └── SUB-AGENT: ADAPTIVE CONTROL AGENT (ACA)
│       └── Adjusts solver settings mid-run on instability
│
├── POST-PROCESSING AGENT (PPA)
│   ├── Extracts field data
│   ├── Computes integral quantities
│   ├── Generates visualizations
│   └── Produces results report
│
└── DESIGN LOOP AGENT (DLA)
    ├── Checks results against targets
    ├── Decides on design modifications
    ├── Invokes Phase 1 CAD agent if geometry change needed
    └── Manages iteration history and Pareto front
2.3 Data Flow — Full CFD Pipeline
text

CEP PACKAGE (from Phase 1 or external)
         │
         ▼
[Geometry Preparation Agent]
  ├── Validates CEP manifest
  ├── Loads STEP geometry
  ├── Repairs surface topology (if needed)
  ├── Extracts fluid domain bounding box
  ├── Identifies boundary patches (inlet, outlet, walls, symmetry)
  └── Outputs: GeometryPreparationPackage
         │
         ▼
[Meshing Agent]
  ├── Selects meshing strategy (structured/unstructured/hybrid)
  ├── Configures mesher (Gmsh / blockMesh / snappyHexMesh)
  ├── Generates mesh
  ├── Runs mesh quality checks (skewness, aspect ratio, y⁺)
  └── Outputs: MeshPackage (.msh / OpenFOAM polyMesh / .cas)
         │
         ▼
[Physics Configuration Agent]
  ├── Reads flow regime from CEP hints (Mach 5.5, compressible)
  ├── Selects solver (rhoCentralFoam)
  ├── Selects turbulence model (k-ω SST)
  ├── Generates all solver config files
  └── Outputs: SolverConfigPackage
         │
         ▼
[Solver Execution Agent]
  ├── Assembles case directory
  ├── Submits to compute target
  ├── Streams residuals in real-time
  └── Outputs: RawSimulationResults
         │
         ▼
[Post-Processing Agent]
  ├── Extracts field data (p, T, U, Mach, etc.)
  ├── Computes integral quantities (pt recovery, Cd, Cl, etc.)
  ├── Generates plots and visualizations
  └── Outputs: ProcessedResultsPackage
         │
         ▼
[Design Loop Agent]
  ├── Compares results against design targets
  ├── Decides: ACCEPT | ITERATE | ESCALATE
  │     ACCEPT  → Package results for user
  │     ITERATE → Modify parameters, re-trigger Phase 1 if needed
  │     ESCALATE → Human review required
  └── Outputs: FinalDesignReport or NextIterationTrigger
Section 3: CEP Ingestion & Geometry Preparation
3.1 CEP Ingestor
The CEP Ingestor is the entry point for all CFD runs. It reads the CEP manifest from Part 1 and builds a complete simulation context before any meshing begins.

Python

# /aeroforge/cfd/agents/geometry_preparation_agent.py

class GeometryPreparationAgent:
    """
    Ingests CEP package and prepares geometry for CFD meshing.
    Performs geometry healing, domain extraction, and patch identification.
    """

    async def ingest_cep(self, cep_path: Path) -> GeometryPreparationPackage:
        """
        Full ingestion pipeline from CEP package to mesh-ready geometry.
        """
        # Step 1: Validate CEP manifest
        manifest = await self._validate_manifest(cep_path / "cep_manifest.json")

        # Step 2: Load and inspect geometry
        geometry = await self._load_geometry(cep_path / manifest.geometry.primary_file)

        # Step 3: Geometry healing (fill gaps, fix normals, remove slivers)
        healed = await self._heal_geometry(geometry)

        # Step 4: Determine simulation domain type
        domain_type = await self._classify_domain(manifest, healed)
        # → INTERNAL_FLOW | EXTERNAL_FLOW | MIXED

        # Step 5: Extract fluid domain
        fluid_domain = await self._extract_fluid_domain(healed, domain_type, manifest)

        # Step 6: Identify and label boundary patches
        patches = await self._identify_boundary_patches(fluid_domain, manifest)

        # Step 7: Detect symmetry planes
        symmetry = await self._detect_symmetry(fluid_domain, manifest)

        return GeometryPreparationPackage(
            original_cep=manifest,
            healed_geometry=healed,
            fluid_domain=fluid_domain,
            boundary_patches=patches,
            symmetry_planes=symmetry,
            domain_type=domain_type,
            bounding_box=fluid_domain.bounding_box,
            characteristic_lengths=self._compute_char_lengths(fluid_domain)
        )
3.2 Fluid Domain Extraction
For internal flow (inlets, ducts, nozzles), the fluid domain IS the flow passage geometry. For external flow (airfoils, full bodies), the fluid domain is a bounding volume MINUS the solid body:

text

INTERNAL FLOW (e.g., scramjet inlet duct):
  Fluid domain = solid duct interior surfaces
  → Extract internal faces as boundary
  → Flow passes THROUGH the geometry

EXTERNAL FLOW (e.g., airfoil in freestream):
  Fluid domain = farfield box − solid body
  → Subtract geometry from rectangular/C-type/O-type domain
  → Flow passes AROUND the geometry

  Farfield sizing rules (auto-computed):
  ├── Subsonic:   20× chord in all directions
  ├── Supersonic: 15× upstream, 30× downstream
  ├── Hypersonic: 10× upstream (bow shock), 40× downstream
  └── Always aligned with freestream direction
3.3 Boundary Patch Identification
The agent automatically identifies and labels boundary patches using geometry analysis + LLM reasoning:

Python

PATCH IDENTIFICATION LOGIC:

INLET:
  ├── For internal flow: surface facing upstream (min X or normal ≈ -freestream)
  ├── Supersonic/hypersonic: "supersonic_inlet" type
  └── Subsonic: "total_pressure_inlet" or "velocity_inlet"

OUTLET:
  ├── Surface facing downstream (max X or normal ≈ +freestream)
  ├── Supersonic: "supersonic_outlet" (zero gradient)
  └── Subsonic: "pressure_outlet"

WALL:
  ├── All remaining solid surfaces
  ├── Sub-classify: "adiabatic_wall" | "isothermal_wall" | "heat_flux_wall"
  └── Bleed slot surfaces: "bleed_outlet" (special sub-type)

SYMMETRY:
  ├── Detected from CEP manifest symmetry flag
  └── Applied as "symmetry_plane" patch type

FARFIELD (external flow only):
  ├── Outer bounding surfaces of domain
  └── Type: "freestream" or "characteristic_farfield"
3.4 Geometry Healing
The healing pipeline fixes common geometry issues that arise from CAD-to-CFD translation:

text

HEALING OPERATIONS (in order):

1. DUPLICATE FACE REMOVAL
   └── Removes coincident surfaces from boolean operations

2. SMALL FEATURE REMOVAL
   └── Eliminates slivers, tiny faces < 1% characteristic length
       that would cause degenerate mesh cells

3. SURFACE NORMAL FIXING
   └── Ensures all normals point consistently outward/inward

4. GAP CLOSING
   └── Seals small gaps (< tolerance) in surface meshes
       Common after STEP import / CAD-to-mesh conversion

5. SHARP FEATURE PRESERVATION
   └── Marks sharp edges (angle > threshold) for mesh refinement
       Critical for: cowl lips, ramp corners, throat edges

6. TOPOLOGY SIMPLIFICATION
   └── Merges near-coplanar faces to reduce patch count
       Reduces solver overhead without losing geometry fidelity

OUTPUT: Healed STEP + Defect Report + Preserved Feature Map
Section 4: Meshing Pipeline
4.1 Meshing Strategy Selection
The meshing agent uses a strategy matrix to select the optimal meshing approach based on geometry complexity, flow regime, and accuracy requirements:

text

MESHING STRATEGY MATRIX

┌────────────────────┬──────────────────┬────────────────────────────┐
│ GEOMETRY TYPE      │ FLOW REGIME      │ RECOMMENDED STRATEGY       │
├────────────────────┼──────────────────┼────────────────────────────┤
│ 2D airfoil         │ Subsonic         │ C-mesh, structured (Gmsh)  │
│ 2D airfoil         │ Transonic        │ C-mesh, structured (Gmsh)  │
│ 2D airfoil         │ Supersonic       │ H-mesh + shock refine      │
│ 2D duct/inlet      │ Any              │ Structured quad (blockMesh)│
│ 3D wing            │ Subsonic         │ Hybrid O-H (snappyHex)     │
│ 3D wing            │ Supersonic       │ Structured + unstr. hybrid │
│ 3D inlet (simple)  │ Supersonic       │ blockMesh + layers         │
│ 3D inlet (complex) │ Supersonic/hyper │ Gmsh + snappyHexMesh       │
│ Full body external │ Any              │ snappyHexMesh + BL layers  │
│ Nozzle (axisym)    │ Supersonic       │ Structured axisymmetric    │
│ Combustor          │ Reacting         │ Unstructured + local refine│
│ Turbine blade      │ Transonic        │ Multi-block structured     │
└────────────────────┴──────────────────┴────────────────────────────┘
4.2 Meshing Tool Integration Layer
text

┌─────────────────────────────────────────────────────────────────────┐
│                   MeshToolAdapter (Abstract)                        │
│                                                                     │
│  + generate(config: MeshConfig) → MeshResult                       │
│  + validate(mesh: MeshObject) → MeshQualityReport                  │
│  + refine(mesh, region: RefinementZone) → MeshResult               │
│  + export(mesh, format, path) → ExportResult                       │
│  + get_statistics() → MeshStatistics                               │
│  + estimate_cell_count(config) → int                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
      ┌────────────────────┼──────────────────────┐
      │                    │                      │
┌─────▼────────┐  ┌────────▼────────┐  ┌─────────▼─────────┐
│   GMSH       │  │   blockMesh     │  │  snappyHexMesh    │
│   ADAPTER    │  │   ADAPTER       │  │  ADAPTER          │
├──────────────┤  ├─────────────────┤  ├───────────────────┤
│ • Python API │  │ • blockMeshDict │  │ • snappyHexMesh   │
│ • .geo/.msh  │  │   generation    │  │   Dict generation │
│ • All element│  │ • Hex-dominant  │  │ • Surface snapping│
│   types      │  │ • Fast + clean  │  │ • BL layer adding │
│ • Structured │  │ • Best: simple  │  │ • Best: complex   │
│   & unstr.   │  │   geometries    │  │   3D geometries   │
│ • Best: 2D + │  └─────────────────┘  └───────────────────┘
│   structured │
│   3D         │  ┌─────────────────┐  ┌───────────────────┐
└──────────────┘  │  NETGEN         │  │  ANSYS MESHING    │
                  │  ADAPTER        │  │  ADAPTER (future) │
                  ├─────────────────┤  ├───────────────────┤
                  │ • OpenCASCADE   │  │ • Fluent/Workbench│
                  │   integration   │  │ • .msh export     │
                  │ • Auto mesh     │  │ • Inflation layers│
                  │ • Good for BRep │  │ • Commercial grade│
                  │   inputs        │  └───────────────────┘
                  └─────────────────┘
4.3 Gmsh Adapter (Primary Open-Source Mesher)
Python

# /aeroforge/cfd/meshing/gmsh_adapter.py

class GmshAdapter(MeshToolAdapter):
    """
    Primary meshing adapter using Gmsh Python API.
    Supports structured, unstructured, and hybrid meshes.
    Produces OpenFOAM-compatible .msh files via gmshToFoam.
    """

    async def generate(self, config: MeshConfig) -> MeshResult:
        """
        Full mesh generation pipeline.
        """
        import gmsh
        gmsh.initialize()

        try:
            # Load geometry
            gmsh.model.occ.importShapes(str(config.geometry_path))
            gmsh.model.occ.synchronize()

            # Apply global mesh size
            gmsh.option.setNumber("Mesh.CharacteristicLengthMin",
                                   config.min_cell_size_m)
            gmsh.option.setNumber("Mesh.CharacteristicLengthMax",
                                   config.max_cell_size_m)

            # Apply refinement zones (shocks, boundary layers, wakes)
            for zone in config.refinement_zones:
                await self._apply_refinement_zone(zone)

            # Boundary layer inflation
            if config.boundary_layer:
                await self._apply_boundary_layer_inflation(config.boundary_layer)

            # Generate mesh
            gmsh.model.mesh.generate(config.dimensionality)

            # Apply smoothing passes
            for _ in range(config.smoothing_passes):
                gmsh.model.mesh.optimize("Netgen")

            # Export
            output_path = config.output_dir / f"{config.case_name}.msh"
            gmsh.write(str(output_path))

            stats = self._extract_statistics()
            return MeshResult(
                path=output_path,
                format="gmsh_msh2",
                statistics=stats,
                success=True
            )

        finally:
            gmsh.finalize()

    async def _apply_boundary_layer_inflation(
        self,
        bl_config: BoundaryLayerConfig
    ) -> None:
        """
        Applies structured boundary layer inflation from wall surfaces.
        Critical for accurate wall-bounded flow prediction.
        """
        import gmsh
        f = gmsh.model.mesh.field

        field_id = f.add("BoundaryLayer")
        f.setNumbers(field_id, "CurvesList", bl_config.wall_curve_tags)
        f.setNumbers(field_id, "SurfacesList", bl_config.wall_surface_tags)
        f.setNumber(field_id, "Size", bl_config.first_layer_thickness_m)
        f.setNumber(field_id, "Ratio", bl_config.growth_ratio)
        f.setNumber(field_id, "Thickness", bl_config.total_thickness_m)
        f.setNumber(field_id, "NbLayers", bl_config.n_layers)
        f.setAsBoundaryLayer(field_id)
4.4 blockMesh Adapter (Structured Hex Meshing)
For geometries amenable to structured meshing (axisymmetric nozzles, 2D ducts, simple inlets), blockMeshDict generation is automated:

Python

# /aeroforge/cfd/meshing/blockmesh_adapter.py

class BlockMeshAdapter(MeshToolAdapter):
    """
    Generates blockMeshDict for structured hex meshing in OpenFOAM.
    Specialized for aerospace duct and nozzle geometries.
    Produces high-quality, low-skewness hex meshes ideal for high-speed flow.
    """

    async def generate_nozzle_mesh(
        self,
        contour_points: List[Tuple[float, float]],
        config: BlockMeshConfig
    ) -> str:
        """
        Generates blockMeshDict for axisymmetric nozzle (2D wedge or 3D revolved).
        Uses spline interpolation for smooth nozzle wall representation.
        """
        spline_points = self._format_spline(contour_points)

        # LLM generates blockMeshDict structure from geometry description
        dict_content = await self.llm.generate(
            task_type="cfd_config_generation",
            prompt=BLOCKMESH_PROMPT_TEMPLATE.format(
                spline_points=spline_points,
                n_axial_cells=config.n_axial,
                n_radial_cells=config.n_radial,
                inlet_radius=config.inlet_radius,
                throat_radius=config.throat_radius,
                exit_radius=config.exit_radius,
                axial_grading=config.axial_grading,
                radial_grading=config.radial_grading
            )
        )

        # Validate the generated dictionary
        validated = await self._validate_blockmesh_dict(dict_content)
        return validated
Auto-Generated blockMeshDict (Example — C-D Nozzle):
C++

/*
 * Auto-generated by AeroForge AI — blockMesh Adapter
 * Geometry: Convergent-Divergent Nozzle (Rao Optimum)
 * Throat Radius: 0.05m | Exit Mach: 3.0 | Area Ratio: 4.23
 * Session: session_3142 | Generated: 2026-05-06
 */

FoamFile { version 2.0; format ascii; class dictionary; object blockMeshDict; }

scale 1.0;

vertices
(
    // Axial stations: x = [converging | throat | diverging]
    (0.00  0.000 -0.001) // v0  inlet_axis
    (0.00  0.085  0.000) // v1  inlet_wall
    ...
);

blocks
(
    hex (0 2 3 1 4 6 7 5)
    ( 120  40  1 )           // cells: axial, radial, azimuthal (2D)
    simpleGrading (
        ( (0.3 0.3 4.0)(0.4 0.4 1.0)(0.3 0.3 0.25) )  // axial: refine at throat
        4.0                                              // radial: refine near wall
        1                                               // azimuthal: uniform
    )
);

boundary
(
    inlet    { type patch;    faces ((0 1 5 4)); }
    outlet   { type patch;    faces ((2 3 7 6)); }
    wall     { type wall;     faces ((1 3 7 5)); }
    axis     { type symmetry; faces ((0 2 6 4)); }
    front    { type empty;    faces (...); }
    back     { type empty;    faces (...); }
);
4.5 y⁺ Estimator & Boundary Layer Configuration
Getting the first-cell height right is critical for accurate wall-bounded flow. The y⁺ estimator computes the required first layer thickness analytically before any mesh is generated:

Python

# /aeroforge/cfd/meshing/yplus_estimator.py

class YPlusEstimator:
    """
    Computes required first-cell height for target y⁺.

    y⁺ targeting strategy:
    - y⁺ ≈ 1  : Wall-resolved (k-ω SST low-Re, SA, DNS/LES)
    - y⁺ ≈ 30-300 : Wall functions (k-ε standard, k-ω high-Re)

    Aerospace defaults:
    - External aero (RANS): y⁺ = 1 (resolve viscous sublayer)
    - Internal flow (RANS): y⁺ = 1-5
    - High Re industrial:   y⁺ = 30-100 with wall functions
    """

    def compute_first_layer_height(
        self,
        target_yplus: float,
        freestream_velocity_ms: float,
        characteristic_length_m: float,
        fluid: FluidProperties,
        mach: float = 0.0
    ) -> BoundaryLayerSpec:

        Re = (freestream_velocity_ms * characteristic_length_m
              / fluid.kinematic_viscosity)

        # Skin friction from flat plate correlation
        if mach < 0.3:
            # Incompressible: Schlichting correlation
            Cf = 0.026 / (Re ** (1/7))
        else:
            # Compressible: Van Driest II correlation
            Cf = self._van_driest_skin_friction(Re, mach, fluid)

        # Wall shear stress
        tau_w = 0.5 * fluid.density * freestream_velocity_ms**2 * Cf

        # Friction velocity
        u_tau = math.sqrt(tau_w / fluid.density)

        # Required first layer height
        delta_s = target_yplus * fluid.kinematic_viscosity / u_tau

        # BL thickness estimate (99% thickness)
        delta_99 = 0.37 * characteristic_length_m / (Re ** 0.2)

        # Growth ratio and layer count
        growth_ratio, n_layers = self._compute_layer_parameters(
            first_height=delta_s,
            total_thickness=delta_99 * 1.5,
            max_layers=40
        )

        return BoundaryLayerSpec(
            first_layer_height_m=delta_s,
            growth_ratio=growth_ratio,
            n_layers=n_layers,
            total_thickness_m=delta_s * (growth_ratio**n_layers - 1) / (growth_ratio - 1),
            target_yplus=target_yplus,
            estimated_actual_yplus=target_yplus * 0.95  # conservative
        )
4.6 Mesh Quality Validation
No simulation proceeds until the mesh passes quality thresholds:

Python

MESH QUALITY METRICS AND THRESHOLDS

┌────────────────────────┬─────────────┬────────────┬──────────────┐
│ METRIC                 │ EXCELLENT   │ ACCEPTABLE │ REJECT       │
├────────────────────────┼─────────────┼────────────┼──────────────┤
│ Max skewness           │ < 0.25      │ < 0.85     │ ≥ 0.85       │
│ Min orthogonality (°)  │ > 70        │ > 15       │ ≤ 15         │
│ Max aspect ratio       │ < 5         │ < 100      │ ≥ 1000       │
│ Max non-orthogonality  │ < 35        │ < 70       │ ≥ 85         │
│ Max face twist (°)     │ < 10        │ < 45       │ ≥ 60         │
│ Min cell volume        │ > 0         │ > 0        │ ≤ 0 (fatal)  │
│ Max volume ratio       │ < 5         │ < 100      │ ≥ 1000       │
│ y⁺ (target 1)         │ 0.5–2.0     │ 0.3–5.0    │ > 30         │
│ y⁺ (target 30-300)    │ 30–200      │ 20–300     │ > 500        │
│ BL coverage (%)        │ > 99        │ > 95       │ < 90         │
└────────────────────────┴─────────────┴────────────┴──────────────┘

REJECTION ACTIONS:
  Fatal metric (min vol ≤ 0)  → Block simulation, re-mesh required
  Poor quality (near limits)  → Warn user, log, allow with flag
  Accepted with warnings      → Proceed with caution note in report
4.7 Refinement Zone Engine
For aerospace flows, different regions of the domain require different levels of mesh refinement. The Refinement Zone Engine automatically identifies these regions:

Python

# Auto-detected refinement zones for aerospace applications

REFINEMENT_ZONES = {

    "shock_wave_region": {
        "detection": "Estimated from oblique shock angles in CEP manifest",
        "target_cell_size": "0.5% of characteristic length",
        "zone_type": "box_or_cone aligned with shock",
        "applicable_to": ["supersonic_inlet", "nozzle", "external_body"]
    },

    "boundary_layer_region": {
        "detection": "All wall surfaces within y⁺ estimate thickness × 3",
        "target_cell_size": "Computed by y⁺ estimator",
        "zone_type": "surface offset inflation layers",
        "applicable_to": ["all wall-bounded flows"]
    },

    "wake_region": {
        "detection": "Downstream of trailing edges / bluff bodies",
        "target_cell_size": "2% of chord/length",
        "zone_type": "conical wake box",
        "applicable_to": ["airfoils", "nozzle exits", "struts"]
    },

    "shear_layer_region": {
        "detection": "Mixing layers, jet boundaries",
        "target_cell_size": "1% of mixing layer length",
        "zone_type": "cylinder along shear axis",
        "applicable_to": ["combustors", "jet plumes", "ejectors"]
    },

    "leading_edge_region": {
        "detection": "Geometry features with radius < 5% chord",
        "target_cell_size": "0.1% chord",
        "zone_type": "sphere of influence at LE",
        "applicable_to": ["airfoils", "cowl lips", "nose tips"]
    },

    "throat_region": {
        "detection": "Minimum area cross-section in flow path",
        "target_cell_size": "0.5% of throat dimension",
        "zone_type": "box around throat ± 2 diameters",
        "applicable_to": ["nozzles", "venturis", "choked ducts"]
    }
}
Section 5: Physics Configuration Engine
5.1 Overview
The Physics Configuration Engine (PCE) is one of the most knowledge-intensive components of Phase 2. It translates high-level flow physics descriptions from the CEP manifest into complete, solver-ready configuration files. It must make expert-level decisions about:

Which solver to use
Which turbulence model is most appropriate
What numerical schemes are stable and accurate for this regime
What boundary conditions to apply and how to set their values
What initial conditions to use for fastest convergence
When and how aggressively to ramp up solver settings
text

CEP CFD Hints + Flow Regime
             │
             ▼
    ┌──────────────────────────────────────────────┐
    │         PHYSICS CONFIGURATION ENGINE         │
    │                                              │
    │  1. SOLVER SELECTOR                          │
    │     └── Picks correct OpenFOAM solver        │
    │         (or equivalent in other tools)        │
    │                                              │
    │  2. TURBULENCE MODEL ADVISOR                 │
    │     └── Selects model + wall treatment       │
    │                                              │
    │  3. NUMERICAL SCHEME CONFIGURATOR            │
    │     └── div, grad, laplacian schemes         │
    │                                              │
    │  4. BOUNDARY CONDITION GENERATOR             │
    │     └── All patches, all fields              │
    │                                              │
    │  5. INITIAL CONDITION ENGINE                 │
    │     └── Uniform fields or mapped from L0/L1  │
    │                                              │
    │  6. CONVERGENCE STRATEGY PLANNER             │
    │     └── Relaxation, residuals, iterations    │
    └──────────────────────────────────────────────┘
             │
             ▼
    Complete Solver Configuration Package
5.2 Solver Selection Matrix (OpenFOAM)
text

OPENFOAM SOLVER SELECTION TREE

FLOW TYPE?
│
├── INCOMPRESSIBLE (Ma < 0.3)
│   ├── Steady-state → simpleFoam (RANS)
│   ├── Unsteady    → pimpleFoam (RANS) / pisoFoam (DNS/LES)
│   └── Rotating    → MRFSimpleFoam
│
├── COMPRESSIBLE (Ma 0.3 – 0.9, no shocks)
│   ├── Steady-state → rhoSimpleFoam
│   └── Unsteady    → rhoPimpleFoam
│
├── TRANSONIC / SUPERSONIC (Ma 0.8 – 5.0, shocks present)
│   ├── Steady-state → rhoSimpleFoam (with shock-robust schemes)
│   └── Unsteady    → rhoCentralFoam (density-based, Kurganov-Tadmor)
│
├── HYPERSONIC (Ma > 5.0, high-temp effects)
│   ├── Calorically perfect gas → rhoCentralFoam
│   ├── High-temperature real gas → rhoCentralFoam + thermophysical lib
│   └── Reacting (scramjet combustor) → reactingFoam / PDRFoam
│
├── COMBUSTION
│   ├── Premixed     → XiFoam / PDRFoam
│   ├── Non-premixed → reactingFoam
│   └── Supersonic   → detonationFoam (OpenFOAM v2306+)
│
└── MULTI-PHASE (rocket nozzle film cooling, etc.)
    └── interFoam (VOF), twoPhaseEulerFoam
5.3 Turbulence Model Advisor
text

TURBULENCE MODEL SELECTION MATRIX

┌────────────────────────────┬──────────────────────────┬───────────────┐
│ FLOW SCENARIO              │ RECOMMENDED MODEL        │ WALL TREATMENT│
├────────────────────────────┼──────────────────────────┼───────────────┤
│ External aero, attached BL │ k-ω SST                  │ Low-Re (y⁺≈1) │
│ External aero, separated   │ k-ω SST / SA-neg         │ Low-Re        │
│ Inlet, no separation       │ k-ω SST                  │ Low-Re        │
│ Inlet, shock-BL interaction│ k-ω SST-SSTLM (transition│ Low-Re        │
│ Supersonic duct            │ k-ω SST                  │ Low-Re        │
│ Hypersonic inlet           │ k-ω SST                  │ Low-Re        │
│ Combustor (non-reacting)   │ k-ε Realizable           │ Wall function │
│ Combustor (reacting)       │ k-ε + flamelet model     │ Wall function │
│ Turbomachinery             │ k-ω SST                  │ Low-Re        │
│ High Re industrial duct    │ k-ε Standard             │ Wall function │
│ LES candidate              │ Dynamic Smagorinsky      │ Wall-resolved │
│ Laminar (Re < 5×10⁵)       │ laminar (no model)       │ N/A           │
└────────────────────────────┴──────────────────────────┴───────────────┘

SPECIAL CONSIDERATIONS:
  Shock-BL interaction → Mandatory: SST with Bradshaw limiter
  Adverse pressure gradient → SST outperforms k-ε significantly
  Free shear flows (jets, wakes) → k-ε or SST, comparable performance
  Reattaching flows → SA-neg or SST-v2f preferred
5.4 Numerical Scheme Configuration
The scheme configurator selects appropriate numerical schemes for each term in the governing equations. Wrong schemes = divergence or excessive numerical diffusion.

Python

# Auto-generated fvSchemes dictionary (OpenFOAM)
# Scenario: Mach 5.5 hypersonic inlet, k-ω SST

FoamFile { class dictionary; object fvSchemes; }

ddtSchemes
{
    // Steady-state: local Euler for robust convergence ramp-up
    default         localEuler;
}

gradSchemes
{
    default         Gauss linear;
    // Limited gradient for bounded pressure in shock regions
    grad(p)         cellLimited Gauss linear 1;
    grad(U)         cellLimited Gauss linear 1;
}

divSchemes
{
    default         none;
    // Central scheme: essential for compressible/shock flows
    div(phi,U)      Gauss Minmod;
    div(phi,e)      Gauss Minmod;
    div(phi,K)      Gauss linear;
    // Turbulence: bounded to prevent negative k/omega
    div(phi,k)      Gauss limitedLinear 1;
    div(phi,omega)  Gauss limitedLinear 1;
    // Viscous stress
    div(((rho*nuEff)*dev2(T(grad(U))))) Gauss linear;
}

laplacianSchemes
{
    default         Gauss linear limited corrected 0.5;
}

interpolationSchemes
{
    default         linear;
    // Reconstruct for compressible: Kurganov-Tadmor flux
    interpolate(rho) linear;
}

snGradSchemes
{
    default         limited corrected 0.5;
}

fluxRequired
{
    default         no;
    p               ;
    rho             ;
}
5.5 Boundary Condition Generator
The BC Generator uses the patch map from Section 3.3 plus the flow conditions from the CEP manifest to produce complete 0/ directory files:

Python

# /aeroforge/cfd/physics/bc_generator.py

class BoundaryConditionGenerator:
    """
    Generates all boundary condition files for the CFD solver.
    For OpenFOAM: populates the 0/ directory.
    For SU2: populates the config file [MARKER_*] sections.
    For Fluent: populates the boundary-conditions section.
    """

    async def generate_openfoam_bcs(
        self,
        patches: List[BoundaryPatch],
        flow_conditions: FlowConditions,
        turbulence_model: TurbulenceModel,
        solver: SolverType
    ) -> Dict[str, str]:
        """
        Returns dict of field_name → file_content for 0/ directory.
        """
        fields = {}

        # Core flow fields
        fields["U"]   = self._generate_velocity_bc(patches, flow_conditions)
        fields["p"]   = self._generate_pressure_bc(patches, flow_conditions, solver)
        fields["T"]   = self._generate_temperature_bc(patches, flow_conditions)

        # Compressible-specific
        if solver.is_compressible:
            fields["rho"]  = self._generate_density_bc(patches, flow_conditions)
            fields["e"]    = self._generate_energy_bc(patches, flow_conditions)

        # Turbulence model fields
        fields.update(
            self._generate_turbulence_bcs(patches, flow_conditions, turbulence_model)
        )

        return fields
Example: Supersonic Inlet BC (auto-generated):
C++

// 0/U — Auto-generated by AeroForge AI Physics Configuration Engine
// Case: Scramjet inlet, Mach 5.5, alt 25km
// Session: 3142 | Generated: 2026-05-06

FoamFile { class volVectorField; object U; }

dimensions [0 1 -1 0 0 0 0];  // m/s

internalField  uniform (1645.5 0 0);  // Mach 5.5 at 25km → 1645.5 m/s

boundaryField
{
    inlet
    {
        // Supersonic inlet: all variables specified (no characteristic info from interior)
        type            fixedValue;
        value           uniform (1645.5 0 0);
    }

    outlet
    {
        // Supersonic outlet: zero gradient (flow leaves supersonically)
        type            zeroGradient;
    }

    inlet_ramp_wall
    {
        type            noSlip;    // No-slip wall, low-Re treatment
    }

    cowl_wall
    {
        type            noSlip;
    }

    symmetry_plane
    {
        type            symmetryPlane;
    }

    bleed_slots
    {
        // Bleed outlet: specified pressure slightly below ambient
        type            pressureInletOutletVelocity;
        value           uniform (0 0 0);
    }
}
5.6 Initial Condition Engine
Poor initial conditions are a leading cause of solver divergence in high-speed flows. The IC engine uses a graduated initialization strategy:

text

INITIAL CONDITION STRATEGY:

STRATEGY 1: UNIFORM INITIALIZATION (simplest)
  Use when: Subsonic flows, simple geometries
  Fields: Set all fields to freestream values
  Risk: May diverge for complex flows

STRATEGY 2: POTENTIAL FLOW INITIALIZATION
  Use when: External aerodynamics (transonic, subsonic)
  Method: Run potentialFoam for 1000 iterations first
  Then: Use potentialFoam result as IC for RANS
  Benefit: Better velocity field initialization around body

STRATEGY 3: STEPPED MACH INITIALIZATION
  Use when: Supersonic / hypersonic flows (Ma > 1.5)
  Method:
    Step 1: Initialize at Ma = 0.3 freestream, run 200 iter
    Step 2: Ramp Ma to 1.0, run 500 iter
    Step 3: Ramp Ma to 2.0, run 500 iter
    Step N: Ramp to design Mach, run to convergence
  Benefit: Avoids supersonic initialization instabilities

STRATEGY 4: MAPPED FROM LOWER FIDELITY
  Use when: L2/L3 run, L0/L1 result available from same geometry
  Method: Map L0 analytical result or L1 2D result onto 3D domain
  Benefit: Best initial guess, fastest convergence
  Requires: Consistent mesh topology between fidelity levels

STRATEGY 5: PREVIOUS DESIGN ITERATION MAPPING
  Use when: Design iteration loop (geometry changed < 10%)
  Method: Map previous converged solution onto new mesh (mapFields)
  Benefit: Dramatically faster convergence (~5× fewer iterations)
  Requires: Compatible mesh topology
5.7 Convergence Strategy Configuration
YAML

# Auto-generated fvSolution + controlDict strategy
# Scenario: Steady-state RANS, Mach 5.5 hypersonic inlet

convergence_strategy:
  solver_name: "rhoCentralFoam"
  mode: "pseudo_transient_steady"

  phase_1_startup:
    description: "Conservative startup — low CFL, aggressive relaxation"
    iterations: 500
    CFL_max: 1.0
    relaxation_factors:
      U: 0.5
      p: 0.3
      rho: 0.5
      k: 0.4
      omega: 0.4
    residual_targets:
      U: 1e-4
      p: 1e-4
      k: 1e-5

  phase_2_main:
    description: "Main run — CFL ramp, tighter tolerances"
    iterations: 2000
    CFL_max: 5.0
    CFL_ramp_iterations: 500        # ramp from 1.0 to 5.0 over 500 iters
    relaxation_factors:
      U: 0.7
      p: 0.5
      rho: 0.7
      k: 0.5
      omega: 0.5
    residual_targets:
      U: 1e-5
      p: 1e-5
      k: 1e-6

  phase_3_final:
    description: "Tight convergence for accurate integral quantities"
    iterations: 1000
    CFL_max: 10.0
    residual_targets:
      U: 1e-6
      p: 1e-6

  convergence_criteria:
    # BOTH conditions must be met to declare convergence
    residuals_below: 1e-5           # all residuals
    integral_change_threshold: 0.001 # < 0.1% change in Cd/Cl/pt_recovery
    min_iterations: 500              # never declare convergence before this

  divergence_detection:
    max_residual: 1e6               # trigger divergence handler
    velocity_bound_ms: 5000         # flag if U exceeds this
    pressure_bound_pa: 1e8          # flag if p exceeds this
Section 6: CFD Solver Integration Layer
6.1 Solver Adapter Architecture
Python

# /aeroforge/cfd/solvers/base.py

class SolverAdapter(ABC):
    """
    Abstract base class for all CFD solver adapters.
    Implementing a new solver requires only this interface.
    """

    @abstractmethod
    async def prepare_case(
        self,
        mesh: MeshPackage,
        physics_config: PhysicsConfigPackage,
        output_dir: Path
    ) -> CaseDirectory:
        """Assembles all files needed to run the simulation."""
        ...

    @abstractmethod
    async def submit(
        self,
        case_dir: CaseDirectory,
        compute_target: ComputeTarget
    ) -> SimulationJob:
        """Submits simulation to local/HPC/cloud compute."""
        ...

    @abstractmethod
    async def monitor(
        self,
        job: SimulationJob,
        callback: Callable[[SimulationStatus], None]
    ) -> AsyncIterator[SimulationStatus]:
        """Streams real-time convergence data."""
        ...

    @abstractmethod
    async def extract_results(
        self,
        job: SimulationJob,
        quantities: List[str]
    ) -> SimulationResults:
        """Extracts and returns computed quantities."""
        ...

    @abstractmethod
    async def cleanup(
        self,
        job: SimulationJob,
        keep_last_n_timesteps: int = 1
    ) -> None:
        """Manages disk space after simulation completes."""
        ...
6.2 OpenFOAM Adapter (Primary Solver)
Python

# /aeroforge/cfd/solvers/openfoam_adapter.py

class OpenFOAMAdapter(SolverAdapter):
    """
    Primary CFD solver adapter for OpenFOAM (v2312+).

    Supported solvers:
    - simpleFoam         (steady incompressible RANS)
    - pimpleFoam         (unsteady incompressible RANS/LES)
    - rhoSimpleFoam      (steady compressible RANS)
    - rhoPimpleFoam      (unsteady compressible RANS)
    - rhoCentralFoam     (density-based, high-speed compressible)
    - reactingFoam       (reacting flows, combustion)
    - buoyantSimpleFoam  (buoyancy-driven flows)

    Case structure follows standard OpenFOAM convention:
    case/
    ├── 0/           (boundary + initial conditions)
    ├── constant/    (mesh, thermophysical properties, turbulence model)
    │   ├── polyMesh/
    │   ├── thermophysicalProperties
    │   └── turbulenceProperties
    ├── system/      (solver control, schemes, decomposition)
    │   ├── controlDict
    │   ├── fvSchemes
    │   ├── fvSolution
    │   └── decomposeParDict
    └── postProcess/ (function objects for live monitoring)
    """

    SUPPORTED_SOLVERS = {
        "simpleFoam": {"regime": "incompressible", "mode": "steady"},
        "pimpleFoam": {"regime": "incompressible", "mode": "unsteady"},
        "rhoSimpleFoam": {"regime": "compressible", "mode": "steady"},
        "rhoCentralFoam": {"regime": "compressible_highspeed", "mode": "both"},
        "reactingFoam": {"regime": "reacting", "mode": "unsteady"},
    }

    async def prepare_case(
        self,
        mesh: MeshPackage,
        physics_config: PhysicsConfigPackage,
        output_dir: Path
    ) -> CaseDirectory:
        """
        Assembles complete OpenFOAM case directory from mesh + config.
        """
        case = CaseDirectory(output_dir)

        # Convert mesh to OpenFOAM polyMesh
        await self._convert_mesh(mesh, case.constant_polymesh)

        # Write boundary/initial conditions to 0/
        for field, content in physics_config.boundary_conditions.items():
            (case.zero_dir / field).write_text(content)

        # Write thermophysical properties
        (case.constant_dir / "thermophysicalProperties").write_text(
            physics_config.thermophysical_properties
        )

        # Write turbulence model config
        (case.constant_dir / "turbulenceProperties").write_text(
            physics_config.turbulence_properties
        )

        # Write system/ files
        (case.system_dir / "controlDict").write_text(
            self._generate_control_dict(physics_config)
        )
        (case.system_dir / "fvSchemes").write_text(
            physics_config.fv_schemes
        )
        (case.system_dir / "fvSolution").write_text(
            physics_config.fv_solution
        )

        # Decompose for parallel run if n_cores > 1
        if physics_config.n_cores > 1:
            await self._decompose_parallel(case, physics_config.n_cores)

        return case

    async def submit(
        self,
        case_dir: CaseDirectory,
        compute_target: ComputeTarget
    ) -> SimulationJob:
        """
        Submits OpenFOAM simulation.
        Handles local, MPI parallel, SLURM HPC, and cloud targets.
        """
        solver_cmd = self._build_solver_command(case_dir, compute_target)

        if compute_target.type == ComputeTargetType.LOCAL:
            return await self._submit_local(solver_cmd, case_dir)

        elif compute_target.type == ComputeTargetType.MPI_LOCAL:
            return await self._submit_mpi(solver_cmd, case_dir, compute_target.n_cores)

        elif compute_target.type == ComputeTargetType.SLURM:
            return await self._submit_slurm(solver_cmd, case_dir, compute_target)

        elif compute_target.type == ComputeTargetType.CLOUD_AWS:
            return await self._submit_aws_batch(solver_cmd, case_dir, compute_target)

        elif compute_target.type == ComputeTargetType.CLOUD_AZURE:
            return await self._submit_azure_batch(solver_cmd, case_dir, compute_target)
6.3 SU2 Adapter
SU2 is an open-source, high-fidelity multiphysics solver from Stanford, particularly strong in adjoint-based optimization — making it ideal for the design loop:

Python

# /aeroforge/cfd/solvers/su2_adapter.py

class SU2Adapter(SolverAdapter):
    """
    CFD solver adapter for SU2 (v8.0+).

    Strengths vs OpenFOAM:
    ✅ Native adjoint solver (continuous + discrete)
    ✅ Excellent for shape optimization
    ✅ Unified compressible solver across all Mach regimes
    ✅ Python-scriptable via SU2_CFD
    ✅ Better convergence for some supersonic cases

    Use when:
    - Shape optimization with gradient-based methods
    - Adjoint sensitivity required for Phase 3 optimization
    - Transonic / supersonic external aerodynamics

    Config structure:
    case/
    ├── {case}.cfg      (single config file, all settings)
    ├── {mesh}.su2      (SU2 native mesh format)
    └── solution/       (output fields)
    """

    async def prepare_case(
        self,
        mesh: MeshPackage,
        physics_config: PhysicsConfigPackage,
        output_dir: Path
    ) -> CaseDirectory:
        """
        Generates SU2 config file from physics configuration.
        All settings go into a single .cfg file — simpler than OpenFOAM.
        """
        # Convert mesh to SU2 format (from Gmsh .msh or OpenFOAM polyMesh)
        su2_mesh = await self._convert_to_su2_format(mesh, output_dir)

        # Generate config file (LLM-assisted + template-based)
        config_content = await self._generate_su2_config(
            physics_config,
            su2_mesh,
            output_dir
        )

        (output_dir / f"{physics_config.case_name}.cfg").write_text(config_content)

        return CaseDirectory(output_dir)
6.4 Commercial Solver Adapters
text

┌─────────────────────────────────────────────────────────────────────┐
│              COMMERCIAL SOLVER ADAPTERS (Phase 2.2+)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ANSYS FLUENT                                                       │
│  ├── Interface: PyFluent (official Python API, v0.21+)              │
│  ├── Journal file generation (.jou) for automation                  │
│  ├── Native GPU solver support (Fluent GPU beta)                    │
│  ├── Strengths: Industry standard, DPM, complex chemistry           │
│  └── BYOK: License server credentials in secure config              │
│                                                                     │
│  SIEMENS STAR-CCM+                                                  │
│  ├── Interface: Java macro automation + REST API (v2310+)           │
│  ├── Strengths: Polyhedral meshing, multi-physics, overset mesh     │
│  └── BYOK: License server + Power Token management                  │
│                                                                     │
│  NUMECA FINE/OPEN (now Cadence Fidelity)                            │
│  ├── Interface: Python scripting + batch mode                       │
│  ├── Strengths: Turbomachinery, structured multi-block             │
│  └── Best for: Turbine/compressor blade analysis                    │
│                                                                     │
│  SIMSCALE (Cloud)                                                   │
│  ├── Interface: REST API                                            │
│  ├── No local installation required                                 │
│  └── Best for: Quick cloud-native runs without HPC setup            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
Section 7: Simulation Monitoring Agent
7.1 Real-Time Convergence Monitoring
Python

# /aeroforge/cfd/agents/monitoring_agent.py

class SimulationMonitoringAgent:
    """
    Monitors running CFD simulations in real-time.
    Detects convergence, divergence, and stagnation.
    Intervenes autonomously within configured autonomy level.
    """

    DIVERGENCE_PATTERNS = {
        "residual_explosion": {
            "trigger": "any residual > 1e6",
            "response": "immediate_stop",
            "recovery": "reduce_CFL_by_50pct_and_restart_from_last_checkpoint"
        },
        "pressure_oscillation": {
            "trigger": "p residual oscillating > 10 iterations without trend",
            "response": "reduce_pressure_relaxation_0.3_to_0.1",
            "recovery": "continue_monitoring"
        },
        "velocity_unbounded": {
            "trigger": "max(|U|) > 2 × freestream velocity × safety_factor",
            "response": "flag_and_checkpoint",
            "recovery": "tighten_CFL + increase_limiter_coefficients"
        },
        "nan_detected": {
            "trigger": "NaN in any field",
            "response": "immediate_stop",
            "recovery": "revert_to_last_checkpoint + reduce_schemes_order"
        },
        "stagnation": {
            "trigger": "residuals not improving > 20% over 500 iterations",
            "response": "try_scheme_switch_or_flag_human",
            "recovery": "switch_from_linear_to_limitedLinear_or_upwind"
        }
    }

    async def monitor(
        self,
        job: SimulationJob,
        convergence_criteria: ConvergenceCriteria
    ) -> AsyncIterator[MonitoringUpdate]:
        """
        Streams simulation status. Responds to issues autonomously.
        """
        async for log_line in self._tail_log(job):
            status = self._parse_log_line(log_line)

            # Check for divergence patterns
            issue = self._detect_issue(status, job.history)
            if issue:
                response = await self._handle_issue(issue, job)
                yield MonitoringUpdate(status=status, intervention=response)
                continue

            # Check for convergence
            if await self._check_convergence(status, convergence_criteria, job):
                await self._stop_solver(job)
                yield MonitoringUpdate(status=status, converged=True)
                return

            # Normal update
            yield MonitoringUpdate(status=status)
7.2 Adaptive Scheme Controller
When instability is detected, the controller follows a graduated response:

text

ADAPTIVE RESPONSE LADDER (in order of intervention severity)

LEVEL 1 — CFL REDUCTION (least invasive)
  Trigger: Residuals increasing for > 50 iters
  Action:  Reduce CFL by 50%
  Wait:    200 iterations
  Revert:  Ramp CFL back up slowly if stable

LEVEL 2 — RELAXATION TIGHTENING
  Trigger: Oscillating residuals
  Action:  Reduce all relaxation factors by 30%
  Wait:    300 iterations
  Revert:  Slowly increase after stability confirmed

LEVEL 3 — SCHEME DOWNGRADE
  Trigger: Non-orthogonality or skewness causing issues
  Action:  Switch div schemes from Minmod → limitedLinear → upwind
  Note:    More diffusive but more stable
  Cost:    Some loss in solution accuracy — log for user review

LEVEL 4 — CHECKPOINT + FULL RESTART
  Trigger: Persistent divergence after levels 1-3
  Action:  Revert to last good checkpoint
           Re-run phase_1_startup from checkpoint
  Log:     Full diagnostics for user review

LEVEL 5 — HUMAN ESCALATION
  Trigger: All levels failed, simulation still diverging
  Action:  Stop simulation
           Generate diagnostic report (mesh quality, BC check, scheme review)
           Notify user via configured channel (CLI, email, Slack)
           Await human decision
Section 8: Post-Processing & Results Agent
8.1 Post-Processing Architecture
text

RAW SIMULATION OUTPUT
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│               POST-PROCESSING AGENT                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  FIELD EXTRACTOR                                         │  │
│  │  Raw .foam / .cas → Structured field arrays              │  │
│  │  Fields: U, p, T, Mach, rho, k, omega, yPlus, wallShear │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │  INTEGRAL QUANTITY CALCULATOR                            │  │
│  │  ├── Total pressure recovery: pt_exit / pt_inlet         │  │
│  │  ├── Mass capture ratio: ṁ_actual / ṁ_ideal             │  │
│  │  ├── Kinetic energy efficiency: η_KE                     │  │
│  │  ├── Thrust / net force (nozzles)                        │  │
│  │  ├── Lift coefficient: CL = L / (0.5ρV²S)               │  │
│  │  ├── Drag coefficient: CD = D / (0.5ρV²S)               │  │
│  │  ├── Moment coefficients: Cm, Cn, Cl                     │  │
│  │  ├── Mass flow rate through defined surfaces             │  │
│  │  └── Heat flux at wall patches (q_wall)                  │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │  PARAVIEW DRIVER                                         │  │
│  │  ├── Programmatic ParaView via pvpython                  │  │
│  │  ├── Auto-generates: Mach contours, pressure maps,       │  │
│  │  │   streamlines, shock visualization, y⁺ maps          │  │
│  │  └── Exports: PNG, SVG, VTK, interactive HTML            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │  RESULTS VALIDATOR                                       │  │
│  │  ├── Compares against CEP target values                  │  │
│  │  ├── Cross-checks against analytical estimates (L0)      │  │
│  │  ├── Flags unexpected deviations                         │  │
│  │  └── Assigns result confidence score                     │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │  REPORT BUILDER                                          │  │
│  │  ├── Full structured Markdown/PDF report                 │  │
│  │  ├── Inline plots + captions                             │  │
│  │  ├── Design decisions traceability                       │  │
│  │  └── Recommendations for next iteration                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
8.2 Aerospace-Specific Quantity Extraction
Python

# /aeroforge/cfd/post_processing/aerospace_quantities.py

class AerospaceQuantityExtractor:
    """
    Extracts aerospace-specific performance quantities from CFD results.
    All quantities computed from first principles, not hardcoded formulas.
    """

    async def extract_inlet_performance(
        self,
        results: SimulationResults,
        inlet_geometry: InletGeometry
    ) -> InletPerformanceReport:
        """
        Extracts all standard inlet performance metrics.
        Per: MIL-E-5007, SAE ARP755
        """
        # Total pressure recovery: π_d = pt2_avg / pt0
        pt_field = results.get_field("p_total")
        pt_inlet = await self._area_average(pt_field, "inlet")
        pt_exit  = await self._mass_average(pt_field, "throat")
        pi_d = pt_exit / pt_inlet

        # Mass flow ratio (capture ratio): ṁ_actual / ṁ_∞
        rho_U_field = results.get_field("massFlux")
        m_dot_actual = await self._surface_integral(rho_U_field, "inlet")
        m_dot_ideal  = await self._compute_ideal_mass_flow(results, inlet_geometry)
        mcr = m_dot_actual / m_dot_ideal

        # Distortion coefficient: DC(60)
        dc60 = await self._compute_distortion_coefficient(pt_field, "throat")

        # Kinetic energy efficiency
        eta_ke = await self._compute_kinetic_energy_efficiency(results)

        # Additive drag
        d_add = await self._compute_additive_drag(results, inlet_geometry)

        return InletPerformanceReport(
            total_pressure_recovery=pi_d,
            mass_capture_ratio=mcr,
            distortion_coefficient_dc60=dc60,
            kinetic_energy_efficiency=eta_ke,
            additive_drag_coefficient=d_add,
            meets_recovery_target=pi_d >= inlet_geometry.target_recovery,
            meets_mass_flow_target=abs(m_dot_actual - inlet_geometry.target_mass_flow)
                                   / inlet_geometry.target_mass_flow < 0.02
        )

    async def extract_nozzle_performance(
        self,
        results: SimulationResults,
        nozzle_geometry: NozzleGeometry
    ) -> NozzlePerformanceReport:
        """
        Extracts thrust, specific impulse, nozzle efficiency.
        """
        # Gross thrust
        p_exit_avg = await self._area_average(results.get_field("p"), "outlet")
        U_exit_avg = await self._mass_average(results.get_field("U"), "outlet")
        m_dot      = await self._surface_integral(results.get_field("massFlux"), "outlet")

        F_gross = m_dot * U_exit_avg + (p_exit_avg - nozzle_geometry.p_ambient) * nozzle_geometry.A_exit

        # Specific impulse
        Isp = F_gross / (m_dot * 9.80665)

        # Nozzle efficiency (actual vs ideal isentropic)
        CF_actual = F_gross / (nozzle_geometry.p_chamber * nozzle_geometry.A_throat)
        CF_ideal  = await self._compute_ideal_thrust_coefficient(nozzle_geometry)
        eta_nozzle = CF_actual / CF_ideal

        return NozzlePerformanceReport(
            gross_thrust_N=F_gross,
            specific_impulse_s=Isp,
            thrust_coefficient=CF_actual,
            nozzle_efficiency=eta_nozzle,
            exit_mach=await self._compute_exit_mach(results)
        )
8.3 ParaView Automation Driver
Python

# /aeroforge/cfd/post_processing/paraview_driver.py

class ParaViewDriver:
    """
    Drives ParaView programmatically via pvpython.
    Generates standardized aerospace visualization suite.
    """

    # Standard visualization suite for propulsion components
    AEROSPACE_VIZ_SUITE = {

        "mach_contour": {
            "field": "Mach",
            "type": "surface_contour",
            "colormap": "Cool to Warm",
            "range_auto": True,
            "title": "Mach Number Distribution",
            "key_features": ["shock_location_annotation", "sonic_line"]
        },

        "total_pressure_contour": {
            "field": "p_total",
            "type": "surface_contour",
            "colormap": "Blue to Red Rainbow",
            "title": "Total Pressure Distribution",
            "note": "Key metric: pressure loss across shock system"
        },

        "wall_yplus_map": {
            "field": "yPlus",
            "type": "wall_surface_map",
            "colormap": "Traffic",
            "range": [0, 5],
            "title": "Wall y⁺ Distribution",
            "acceptance_threshold": 5.0
        },

        "shock_structure": {
            "field": "grad_p_mag",
            "type": "schlieren_synthetic",
            "colormap": "Grayscale",
            "title": "Numerical Schlieren (∇ρ)",
            "note": "Visualizes shock and expansion waves"
        },

        "streamlines_colored_mach": {
            "field": "U",
            "type": "streamlines",
            "seed_surface": "inlet",
            "color_by": "Mach",
            "title": "Flow Streamlines Colored by Mach Number"
        },

        "temperature_wall": {
            "field": "T",
            "type": "wall_surface_map",
            "colormap": "Black-Body Radiation",
            "title": "Wall Temperature Distribution",
            "note": "Critical for thermal protection system design"
        },

        "pressure_coefficient_surface": {
            "field": "Cp",
            "type": "surface_map",
            "colormap": "Cool to Warm",
            "title": "Pressure Coefficient Distribution"
        }
    }

    async def generate_full_suite(
        self,
        case_dir: Path,
        output_dir: Path,
        geometry_type: str
    ) -> List[VisualizationOutput]:
        """
        Generates all relevant visualizations for the geometry type.
        """
        # Select appropriate subset from AEROSPACE_VIZ_SUITE
        selected_viz = self._select_visualizations(geometry_type)

        # Write pvpython script
        pv_script = self._generate_pvpython_script(
            case_dir, output_dir, selected_viz
        )

        # Execute in subprocess
        result = await asyncio.create_subprocess_exec(
            "pvpython", "-c", pv_script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await result.communicate()

        return self._collect_outputs(output_dir)
8.4 Results Validation Against Analytical Estimates
Before returning results to the user, the post-processing agent cross-validates CFD results against analytical (L0) estimates:

Python

CROSS-VALIDATION CHECKS:

OBLIQUE SHOCK THEORY CHECK (scramjet inlets):
  ├── CFD measured shock angle ↔ θ-β-M predicted angle
  ├── Tolerance: ± 2° acceptable (BL effects)
  ├── CFD total pressure recovery ↔ Rankine-Hugoniot prediction
  └── Tolerance: CFD should be ≤ analytical (real losses always higher)

ISENTROPIC RELATIONS CHECK (nozzles):
  ├── CFD exit Mach ↔ isentropic Mach from area ratio
  ├── Tolerance: ± 3% acceptable
  ├── CFD thrust coefficient ↔ ideal CF from theory
  └── Tolerance: CFD should be ≤ ideal (friction + non-uniformity)

AIRFOIL THEORY CHECK (2D airfoils):
  ├── CFD CL ↔ thin airfoil theory CL = 2π(α + camber)
  ├── Tolerance: ± 10% acceptable (viscous effects)
  └── CFD CDp ↔ empirical skin friction estimate

FLAG THRESHOLD:
  > 15% deviation from analytical → FLAG for human review
  > 30% deviation from analytical → BLOCK results, demand re-run or review
  Analytical LOWER than CFD (efficiency > ideal) → ALWAYS BLOCK (non-physical)
Section 9: Design Loop Controller
9.1 Overview
The Design Loop Controller (DLC) is what transforms AeroForge from a one-shot simulation tool into an autonomous design exploration system. It closes the full loop:

text

Design Requirements
         │
         ▼
  [CAD Generation]     ←──────────────────────────────┐
         │                                             │
         ▼                                             │
  [CFD Simulation]                                     │
         │                                             │
         ▼                                             │
  [Results Extraction]                                 │
         │                                             │
         ▼                                             │
  [Target Checking] ──── NOT MET? ────→ [Design Modifier]
         │                                             │
       MET?                              ├── Modify CAD params (Phase 1)
         │                               ├── Minor: adjust BC only
         ▼                               └── Major: full re-geometry
  [Accept Design]
9.2 Target Checking Logic
Python

# /aeroforge/cfd/agents/design_loop_agent.py

class DesignLoopAgent:

    async def evaluate_iteration(
        self,
        results: ProcessedResultsPackage,
        targets: List[DesignTarget],
        iteration: int,
        history: IterationHistory
    ) -> DesignDecision:
        """
        Evaluates current iteration and decides next action.
        """
        evaluations = []

        for target in targets:
            value = results.get_quantity(target.metric)
            met = self._evaluate_target(value, target)
            evaluations.append(TargetEvaluation(
                metric=target.metric,
                value=value,
                target=target.value,
                met=met,
                gap=target.value - value,
                gap_pct=(target.value - value) / target.value * 100
            ))

        all_met = all(e.met for e in evaluations)
        critical_failures = [e for e in evaluations
                             if not e.met and e.metric in self.CRITICAL_METRICS]

        if all_met:
            return DesignDecision(
                action=DesignAction.ACCEPT,
                reason="All design targets met",
                final_results=results,
                iterations_used=iteration
            )

        if iteration >= self.max_iterations:
            # Return best result from history even if not fully meeting targets
            best = history.get_best_iteration(
                primary_metric=targets[0].metric
            )
            return DesignDecision(
                action=DesignAction.ACCEPT_BEST,
                reason=f"Max iterations ({self.max_iterations}) reached",
                final_results=best.results,
                iterations_used=iteration,
                unmet_targets=[e for e in evaluations if not e.met]
            )

        # Plan next modification
        modification = await self._plan_modification(evaluations, history)
        return DesignDecision(
            action=DesignAction.ITERATE,
            modification=modification,
            reason=f"Targets not met: {[e.metric for e in evaluations if not e.met]}"
        )
9.3 Design Modification Planner
text

MODIFICATION STRATEGY:

FOR INLET TOTAL PRESSURE RECOVERY TOO LOW:
  ├── MINOR (gap < 2%): Increase ramp angle by 0.5° increments
  ├── MODERATE (gap 2-5%): Recalculate Oswatitsch-optimal ramp angles
  ├── MAJOR (gap > 5%): Add extra compression stage (2-ramp → 3-ramp)
  └── Re-trigger Phase 1 CAD agent with modified parameters

FOR MASS CAPTURE RATIO TOO LOW:
  ├── Increase cowl height (more capture area)
  ├── Adjust cowl position relative to oblique shocks
  └── Check for separated flow causing spillage

FOR NOZZLE THRUST TOO LOW:
  ├── MINOR: Adjust expansion ratio (area ratio optimization)
  ├── MODERATE: Switch from conical to Rao contour
  ├── MAJOR: Redesign chamber pressure assumption
  └── Re-trigger Phase 1 with new nozzle parameters

FOR AIRFOIL CD TOO HIGH:
  ├── Reduce thickness-to-chord ratio
  ├── Adjust leading edge radius
  ├── Shift max-thickness location aft
  └── Consider laminar airfoil family

MODIFICATION BOUNDS:
  ├── Never modify beyond ±20% of original parameter value per iteration
  ├── Respect all physical constraints from Phase 1 knowledge graph
  ├── If modification requires constraint violation → ESCALATE to human
  └── Always log reason for each modification decision
9.4 Pareto Front Tracking
For multi-objective problems (e.g., maximize pressure recovery AND minimize cowl drag), the DLC maintains a Pareto front:

Python

class ParetoFrontTracker:
    """
    Tracks non-dominated designs across all iterations.
    For multi-objective optimization problems.

    Example aerospace objectives:
    - INLET: maximize(pt_recovery) AND minimize(additive_drag)
    - NOZZLE: maximize(thrust) AND minimize(nozzle_length)
    - AIRFOIL: maximize(CL) AND minimize(CD)  → maximize(CL/CD)
    """

    def update(
        self,
        iteration: int,
        design_params: Dict,
        objectives: Dict[str, float]
    ) -> ParetoUpdateResult:
        """
        Adds design to front if non-dominated.
        Removes dominated designs from front.
        """
        new_point = ParetoPoint(
            iteration=iteration,
            params=design_params,
            objectives=objectives
        )

        is_dominated = any(
            self._dominates(existing, new_point)
            for existing in self.front
        )

        if not is_dominated:
            # Remove designs dominated by new point
            self.front = [p for p in self.front
                         if not self._dominates(new_point, p)]
            self.front.append(new_point)
            return ParetoUpdateResult(
                added=True,
                front_size=len(self.front),
                dominated_removed=True
            )

        return ParetoUpdateResult(added=False, front_size=len(self.front))
Section 10: Compute Infrastructure
10.1 Compute Target Abstraction
text

COMPUTE TARGET HIERARCHY

┌────────────────────────────────────────────────────────────────────┐
│                    ComputeTarget (Abstract)                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  LOCAL_SERIAL           : Single core, dev/testing only           │
│  LOCAL_MPI              : Multi-core via mpirun, workstation       │
│  LOCAL_GPU              : GPU-accelerated (Fluent GPU, future OF)  │
│                                                                    │
│  HPC_SLURM              : SLURM cluster (university / national HPC)│
│  HPC_PBS                : PBS/Torque cluster                       │
│  HPC_SGE                : Sun Grid Engine                          │
│                                                                    │
│  CLOUD_AWS_BATCH        : AWS Batch + ParallelCluster              │
│  CLOUD_AZURE_BATCH      : Azure Batch + CycleCloud                 │
│  CLOUD_GCP_BATCH        : Google Cloud Batch                       │
│                                                                    │
│  SIMSCALE_CLOUD         : SimScale-managed cloud (REST API)        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
10.2 Auto-Scaling Logic
text

CASE SIZE ESTIMATION → COMPUTE TARGET SELECTION

Input: expected_cell_count, fidelity_level, deadline

SMALL  (< 1M cells,  L1/L2)  → LOCAL_MPI   (8–16 cores, workstation)
MEDIUM (1–10M cells, L2/L3)  → LOCAL_MPI or HPC_SLURM (32–128 cores)
LARGE  (10–100M cells, L3)   → HPC_SLURM or CLOUD (128–1024 cores)
HUGE   (> 100M cells, L4/L5) → HPC_SLURM or CLOUD (1024+ cores)

DEADLINE OVERRIDE:
  If deadline_hours < estimated_runtime_local:
    → Auto-scale to HPC/cloud with more cores
    → Notify user of estimated cloud cost

COST ESTIMATES (auto-computed):
  ├── Local: Free (electricity only)
  ├── AWS c6i.32xlarge (128 vCPU): ~$5.44/hr
  ├── AWS hpc6a.48xlarge (96 vCPU): ~$2.88/hr (AMD optimized)
  └── Azure HBv3 (120 vCPU): ~$3.60/hr
10.3 HPC Job Script Generator
Bash

#!/bin/bash
# Auto-generated by AeroForge AI — SLURM Job Generator
# Case: scramjet_inlet_mach55_iter3
# Solver: rhoCentralFoam | Cores: 128 | Est. runtime: 4h

#SBATCH --job-name=aeroforge_scramjet_inlet_mach55_iter3
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=32
#SBATCH --cpus-per-task=1
#SBATCH --time=06:00:00              # 50% safety margin over estimate
#SBATCH --partition=compute
#SBATCH --output=aeroforge_%j.log
#SBATCH --error=aeroforge_%j.err
#SBATCH --mail-type=FAIL,END
#SBATCH --mail-user=${AEROFORGE_USER_EMAIL}

# Load OpenFOAM module
module load OpenFOAM/v2312

# Source OpenFOAM environment
source $FOAM_ETC/bashrc

# Run decomposition
decomposePar -case /scratch/$USER/cases/scramjet_inlet_mach55_iter3

# Run solver in parallel
mpirun -np 128 rhoCentralFoam \
  -case /scratch/$USER/cases/scramjet_inlet_mach55_iter3 \
  -parallel \
  | tee /scratch/$USER/logs/scramjet_inlet_mach55_iter3.log

# Reconstruct parallel case
reconstructPar -case /scratch/$USER/cases/scramjet_inlet_mach55_iter3 -latestTime

# Notify AeroForge callback endpoint
curl -X POST ${AEROFORGE_CALLBACK_URL} \
  -H "Authorization: Bearer ${AEROFORGE_JOB_TOKEN}" \
  -d '{"job_id": "${SLURM_JOB_ID}", "status": "completed", "case": "scramjet_inlet_mach55_iter3"}'
Section 11: CFD Memory & Simulation History
11.1 Simulation Database
Every simulation is persisted in a structured database for learning, comparison, and reuse:

Python

# Simulation Record Schema

SimulationRecord = {
    # Identity
    "sim_id": "uuid",
    "session_id": "uuid",
    "iteration": 3,
    "parent_sim_id": "prev_iteration_uuid",

    # Geometry provenance
    "cep_package_id": "uuid",
    "geometry_type": "scramjet_inlet",
    "key_parameters": {
        "mach_design": 5.5,
        "ramp1_angle_deg": 9.2,
        "ramp2_angle_deg": 15.4,
        "contraction_ratio": 5.8
    },

    # CFD setup
    "solver": "rhoCentralFoam",
    "turbulence_model": "kOmegaSST",
    "mesh_type": "gmsh_unstructured",
    "cell_count": 2_847_000,
    "fidelity_level": "L2",

    # Convergence
    "converged": true,
    "final_residuals": {"U": 8.4e-6, "p": 2.1e-6},
    "iterations_run": 2847,
    "wall_clock_seconds": 8400,
    "n_cores": 32,

    # Results
    "quantities": {
        "total_pressure_recovery": 0.847,
        "mass_capture_ratio": 0.982,
        "distortion_dc60": 0.043,
        "additive_drag_coefficient": 0.0089
    },

    # Targets
    "target_met": false,
    "unmet_targets": [{"metric": "total_pressure_recovery", "gap": -0.003}],

    # Files
    "mesh_path": "/simulations/sim_uuid/mesh.msh",
    "results_path": "/simulations/sim_uuid/results/",
    "report_path": "/simulations/sim_uuid/report.md",

    # Metadata
    "llm_provider": "local/ollama",
    "model": "qwen2.5-coder:32b",
    "aeroforge_version": "2.0.1",
    "timestamp": "2026-05-06T14:23:00Z"
}
11.2 CFD Skill Learning
Similar to Phase 1's skill system, the CFD system learns from successful simulation configurations:

YAML

# Auto-learned CFD skill
# Created from: session_3142, iteration_5 (first converged high-fidelity run)

cfd_skill:
  id: "scramjet_inlet_mach5to6_rans"
  name: "Hypersonic Scramjet Inlet RANS Simulation"
  version: "1.0.0"
  category: "propulsion/inlet/hypersonic"

  applicable_to:
    geometry_types: ["scramjet_inlet", "mixed_compression_inlet"]
    mach_range: [4.5, 7.0]
    flow_regime: "hypersonic"

  proven_configuration:
    solver: "rhoCentralFoam"
    turbulence_model: "kOmegaSST"
    div_scheme_U: "Gauss Minmod"
    wall_treatment: "low-Re"
    target_yplus: 1.0
    CFL_startup: 0.5
    CFL_main: 3.0
    n_startup_iterations: 500
    n_main_iterations: 3000

  mesh_settings:
    mesher: "gmsh"
    strategy: "unstructured_with_BL"
    target_cell_count_M: 2.5
    BL_first_layer_m: 2.0e-6
    BL_growth_ratio: 1.2
    BL_n_layers: 25
    shock_refinement: true
    cowl_lip_refinement: true

  expected_performance:
    convergence_rate: 0.94
    avg_wall_clock_hours: 2.8
    avg_core_count: 32

  notes: >
    Works well for 2-ramp and 3-ramp configurations.
    Increase CFL carefully at Mach > 6 — prone to instability
    at throat due to high Mach gradients. Use checkpoint strategy.
Section 12: Phase 2 Roadmap & Milestones
12.1 Development Phases
text

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.0 — FOUNDATION (Months 1-3 after Phase 1.0)           │
│                                                                 │
│  Goals:                                                         │
│  ├── CEP ingestor + geometry preparation pipeline               │
│  ├── Gmsh adapter (2D + 3D unstructured)                        │
│  ├── blockMesh adapter (structured)                             │
│  ├── OpenFOAM adapter (simpleFoam + rhoCentralFoam)             │
│  ├── Basic post-processing (integral quantities)                │
│  ├── CLI: aeroforge simulate "..."                              │
│  └── Single-iteration (no design loop yet)                     │
│                                                                 │
│  Success Metric:                                                │
│  CEP from Phase 1 → OpenFOAM case → Converged results          │
│  For: NACA 2412 at Re=3M, CL/CD within 5% of XFOIL            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.1 — PHYSICS DEPTH (Months 3-6)                        │
│                                                                 │
│  Goals:                                                         │
│  ├── Physics Configuration Engine (full turbulence matrix)      │
│  ├── Compressible flow solver configs (rhoCentralFoam)          │
│  ├── y⁺ estimator + boundary layer meshing                     │
│  ├── Mesh quality validation (all 8 metrics)                    │
│  ├── Simulation monitoring agent + adaptive control             │
│  ├── ParaView automation driver                                 │
│  └── Results validation against analytical estimates           │
│                                                                 │
│  Success Metric:                                                │
│  Scramjet inlet Mach 3 → CFD → pt recovery within 3%           │
│  of Rankine-Hugoniot prediction. Unattended convergence.       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.2 — DESIGN LOOP (Months 6-9)                          │
│                                                                 │
│  Goals:                                                         │
│  ├── Design Loop Controller (full autonomous loop)              │
│  ├── Phase 1 ↔ Phase 2 autonomous coupling                     │
│  ├── Multi-fidelity ladder (L0 → L1 → L2 → L3)                │
│  ├── Pareto front tracking                                      │
│  ├── HPC support (SLURM + auto job script generation)          │
│  ├── SU2 adapter (adjoint-ready)                               │
│  └── Simulation history database                               │
│                                                                 │
│  Success Metric:                                                │
│  "Maximize pt recovery of scramjet inlet at Mach 5.5"         │
│  → 5-iteration autonomous loop → optimal ramp angles          │
│  → 5% improvement from initial design, no human intervention  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2.3 — PRODUCTION HARDENING (Months 9-12)                │
│                                                                 │
│  Goals:                                                         │
│  ├── Commercial solver adapters (Fluent, STAR-CCM+)            │
│  ├── Cloud compute support (AWS Batch, Azure Batch)            │
│  ├── Full web UI for simulation monitoring                      │
│  ├── Reacting flow support (scramjet combustor)                │
│  ├── CFD skill auto-learning at scale                          │
│  ├── ITAR compliance for simulation data                       │
│  └── Performance: < 5 min from CEP to first results (L1)      │
│                                                                 │
│  Success Metric:                                                │
│  10 aerospace engineers using daily. Full L0→L3 pipeline       │
│  for scramjet inlet in < 8 hours, unattended.                  │
└─────────────────────────────────────────────────────────────────┘
12.2 Phase 2 Folder Structure
text

aeroforge/
└── aeroforge/
    └── cfd/
        ├── agents/
        │   ├── cfd_orchestration_agent.py
        │   ├── geometry_preparation_agent.py
        │   ├── meshing_agent.py
        │   ├── physics_configuration_agent.py
        │   ├── solver_execution_agent.py
        │   ├── monitoring_agent.py
        │   ├── post_processing_agent.py
        │   └── design_loop_agent.py
        │
        ├── meshing/
        │   ├── base.py                     # MeshToolAdapter abstract
        │   ├── gmsh_adapter.py
        │   ├── blockmesh_adapter.py
        │   ├── snappyhex_adapter.py
        │   ├── netgen_adapter.py
        │   ├── yplus_estimator.py
        │   ├── mesh_quality_validator.py
        │   └── refinement_zones.py
        │
        ├── physics/
        │   ├── solver_selector.py
        │   ├── turbulence_advisor.py
        │   ├── scheme_configurator.py
        │   ├── bc_generator.py
        │   ├── ic_engine.py
        │   ├── convergence_strategy.py
        │   └── thermophysical/
        │       ├── ideal_gas.py
        │       ├── real_gas.py
        │       └── reacting_mixture.py
        │
        ├── solvers/
        │   ├── base.py                     # SolverAdapter abstract
        │   ├── openfoam_adapter.py
        │   ├── su2_adapter.py
        │   ├── fluent_adapter.py           # Phase 2.3
        │   └── starccm_adapter.py          # Phase 2.3
        │
        ├── monitoring/
        │   ├── residual_tracker.py
        │   ├── convergence_detector.py
        │   ├── divergence_handler.py
        │   └── adaptive_scheme_controller.py
        │
        ├── post_processing/
        │   ├── field_extractor.py
        │   ├── aerospace_quantities.py
        │   ├── paraview_driver.py
        │   ├── results_validator.py
        │   └── report_builder.py
        │
        ├── design_loop/
        │   ├── design_loop_controller.py
        │   ├── target_checker.py
        │   ├── design_modifier.py
        │   ├── pareto_tracker.py
        │   └── iteration_history.py
        │
        ├── compute/
        │   ├── compute_target.py
        │   ├── local_executor.py
        │   ├── slurm_executor.py
        │   ├── aws_batch_executor.py
        │   └── azure_batch_executor.py
        │
        ├── memory/
        │   ├── simulation_database.py
        │   ├── cfd_skill_registry.py
        │   └── skill_learner.py
        │
        └── templates/
            ├── openfoam/
            │   ├── controlDict/
            │   ├── fvSchemes/
            │   ├── fvSolution/
            │   ├── thermophysicalProperties/
            │   └── turbulenceProperties/
            ├── su2/
            │   └── base_configs/
            └── slurm/
                └── job_templates/
12.3 Phase 1 ↔ Phase 2 Integration Summary
text

┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 1 ↔ PHASE 2 INTEGRATION CONTRACT                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  COMMUNICATION: Exclusively via CEP (CAD Exchange Protocol)        │
│                                                                     │
│  PHASE 1 OUTPUTS → PHASE 2 INPUTS:                                 │
│  ├── Geometry files (STEP/IGES/BREP)                                │
│  ├── CEP manifest (JSON)                                            │
│  ├── CFD hints (solver, BC values, mesh hints)                     │
│  ├── Design intent (flow regime, performance targets)               │
│  └── Confidence + validation report                                │
│                                                                     │
│  PHASE 2 OUTPUTS → PHASE 1 INPUTS (design loop feedback):          │
│  ├── Design modification requests (structured JSON)                │
│  │   e.g., {"param": "ramp2_angle_deg", "delta": +1.0}            │
│  ├── Performance gap analysis                                       │
│  │   e.g., {"metric": "pt_recovery", "gap": -0.003}               │
│  └── Constraint violations found in CFD                            │
│       e.g., {"issue": "flow_separation_at_throat",                 │
│              "location": "task_3_geometry"}                        │
│                                                                     │
│  INDEPENDENCE GUARANTEE:                                            │
│  ├── Phase 2 has ZERO import dependencies on Phase 1 code          │
│  ├── Phase 1 has ZERO import dependencies on Phase 2 code          │
│  ├── Both can be installed independently (pip install aeroforge-cad)│
│  └── CEP format is the only shared contract                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
End of Part 2 — CFD Automation System




✈️ AeroForge AI — Complete Project Design Document
An AI-Native Aerospace Design & Simulation Platform
Natural Language → CAD → CFD → Validated Aerospace Design
text

Document Version  : 1.0.0
Status            : Active Design
Classification    : Engineering Specification
Domain            : Aerospace / Propulsion / Aerodynamics
Architecture      : Multi-Agent, Tool-Agnostic, BYOK + Local LLM
Last Updated      : May 2026
Parts             : 3 (Part 3 of 3 — Integration, Platform & Future)
