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
Parts             : 3 (Part 1 of 3 — CAD Automation System)
Document Structure
text

┌─────────────────────────────────────────────────────────────────┐
│  PART 1 — CAD Automation System (THIS DOCUMENT)                 │
│  ├── Project Vision & Philosophy                                │
│  ├── System Architecture (Full Stack)                           │
│  ├── LLM Provider Abstraction Layer (BYOK + Local)              │
│  ├── CAD Agent Core                                             │
│  ├── CAD Tool Integration Layer (FreeCAD, CATIA, NX, etc.)      │
│  ├── Aerospace Geometry Engine                                  │
│  ├── Domain Knowledge System (Graph RAG)                        │
│  ├── Validation & Constraint Engine                             │
│  ├── Memory, Skills & Learning Loop                             │
│  ├── Security, IP Protection & Compliance                       │
│  └── Phase 1 Roadmap & Milestones                               │
├─────────────────────────────────────────────────────────────────┤
│  PART 2 — CFD Automation System                                 │
│  ├── CFD Agent Architecture                                     │
│  ├── Solver Integration Layer (OpenFOAM, Fluent, SU2, etc.)     │
│  ├── Meshing Pipeline                                           │
│  ├── Physics Configuration Engine                               │
│  ├── Post-Processing & Results Agent                            │
│  ├── CAD→CFD Handoff Protocol                                   │
│  └── Phase 2 Roadmap                                            │
├─────────────────────────────────────────────────────────────────┤
│  PART 3 — Integration, Platform & Future Architecture           │
│  ├── CAD↔CFD Seamless Integration Layer                         │
│  ├── Optimization Loop (Multi-Objective)                        │
│  ├── HPC & Cloud Deployment                                     │
│  ├── Web Platform & API                                         │
│  ├── Compliance (FAA/EASA/ITAR/EAR)                             │
│  ├── Enterprise Features                                        │
│  └── Long-Term Roadmap (v2.0, v3.0)                             │
└─────────────────────────────────────────────────────────────────┘
PART 1 — CAD Automation System
Section 1: Project Vision & Philosophy
1.1 The Problem
Aerospace design — specifically propulsion system geometry and aerodynamic surface design — is one of the most knowledge-intensive and tooling-dependent engineering disciplines. Today:

A scramjet inlet geometry study requires a senior aerodynamicist spending 3–5 days in CATIA or SOLIDWORKS
Design changes require manual re-parameterization and re-meshing
Domain knowledge lives in engineers' heads, AIAA papers, and proprietary databases
CAD tools are powerful but have steep learning curves and zero natural language interfaces
There is no unified agent that understands aerospace geometry, design rules, manufacturing constraints, and physics simultaneously
The result: design iteration is slow, expensive, and expert-gated. A junior engineer cannot generate a valid turbofan nacelle geometry from first principles without months of tooling experience.

1.2 The Vision
AeroForge AI is a multi-agent AI platform that translates natural language aerospace design intent into validated CAD geometry — with full traceability, physics awareness, and seamless handoff to CFD simulation.

text

Engineer says:
"Design a mixed-compression scramjet inlet for Mach 5.5 cruise,
 total pressure recovery > 0.85, mass flow rate 12 kg/s,
 optimize for minimum cowl drag, titanium alloy manufacturing"

AeroForge AI:
→ Decomposes requirements
→ Applies oblique shock theory to compute ramp angles
→ Generates 3D parametric geometry in FreeCAD
→ Validates against aerospace design constraints
→ Exports to STEP/IGES/STL
→ Produces design report with full traceability
→ (Phase 2) Hands off to CFD for validation
1.3 Design Philosophy
1.3.1 Tool Agnosticism
The system is built around clean abstraction interfaces, not specific tools. FreeCAD today, CATIA tomorrow. OpenFOAM today, Ansys Fluent tomorrow. No vendor lock-in at any layer.

1.3.2 BYOK + Local First
No aerospace IP should be forced through third-party APIs. The system defaults to local LLMs (Ollama, llama.cpp) and offers cloud APIs (BYOK) as an option, never a requirement.

1.3.3 Physics-Aware, Not Physics-Dependent
The AI doesn't simulate physics — it encodes physics constraints from aerospace literature, design standards, and validated datasets into a knowledge graph that governs what geometry can and cannot be generated.

1.3.4 Human-in-the-Loop by Default
Aerospace design is safety-critical. AeroForge AI is a design acceleration tool, not a design replacement tool. Every generated geometry is presented to the engineer with full provenance, constraint annotations, and confidence scores before export.

1.3.5 Progressive Autonomy
Autonomy levels are user-configurable:

text

LEVEL 0 — COPILOT      : AI suggests, engineer does everything
LEVEL 1 — ASSISTED     : AI generates, engineer reviews each step
LEVEL 2 — SUPERVISED   : AI runs full pipeline, engineer reviews output
LEVEL 3 — AUTONOMOUS   : AI runs full loop, flags only anomalies
LEVEL 4 — FULL AUTO    : AI runs end-to-end with logging only (future)
1.3.6 Modular Independence
Phase 1 (CAD) and Phase 2 (CFD) are independently deployable, independently testable, and communicate only through a well-defined CAD Exchange Protocol (CEP). The CAD system has no dependency on any CFD tool.

1.4 Aerospace Domain Scope
In Scope — Phase 1:
text

PROPULSION GEOMETRIES
├── Intake Systems
│   ├── Subsonic inlets (pitot, bifurcated, chin)
│   ├── Supersonic inlets (2D ramp, axisymmetric spike, mixed-compression)
│   ├── Hypersonic inlets (scramjet, dual-mode)
│   └── S-duct diffusers
├── Combustion Systems
│   ├── Annular combustor liners
│   ├── Fuel injector arrays (strut, wall, cavity)
│   └── Flameholder geometries
├── Nozzle Systems
│   ├── Convergent-divergent (bell, conical, plug)
│   ├── Aerospike nozzles
│   ├── Thrust vectoring nozzles
│   └── Ejector nozzles
└── Turbomachinery (Conceptual)
    ├── Compressor/turbine blade profiles (2D)
    ├── Axial stage geometries
    └── Centrifugal compressor housings

AERODYNAMIC SURFACES
├── Airfoil families (NACA, NACA 6-series, supercritical, laminar)
├── Wing planforms (delta, swept, blended)
├── Control surfaces (elevons, canards, fins)
├── Fuselage cross-sections
├── Nose cones (ogive, von Karman, spherically blunted)
└── Fairings and nacelles

STRUCTURAL GEOMETRY (Basic)
├── Rib/spar structures
├── Bulkhead profiles
└── Thermal protection system tiles
Out of Scope — Phase 1:
Full aircraft assembly
Structural FEA geometry
Electrical system routing
Hydraulic systems
Section 2: System Architecture
2.1 Top-Level Architecture
text

╔═══════════════════════════════════════════════════════════════════╗
║                     AEROFORGE AI — PHASE 1                        ║
║                     CAD AUTOMATION SYSTEM                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │                    INPUT LAYER                              │ ║
║  │  CLI · Web UI · API · IDE Plugin · Notebook Integration     │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                    ║
║  ┌──────────────────────────▼──────────────────────────────────┐ ║
║  │                ORCHESTRATION AGENT                          │ ║
║  │  Request Decomposer · Task Planner · Context Manager        │ ║
║  │  Autonomy Level Controller · Session Manager                │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                    ║
║         ┌───────────────────┼────────────────────┐              ║
║         │                   │                    │              ║
║  ┌──────▼──────┐   ┌────────▼───────┐   ┌───────▼──────┐      ║
║  │  LLM        │   │  AEROSPACE     │   │  MEMORY &    │      ║
║  │  PROVIDER   │   │  KNOWLEDGE     │   │  SKILL       │      ║
║  │  LAYER      │   │  GRAPH         │   │  SYSTEM      │      ║
║  └──────┬──────┘   └────────┬───────┘   └───────┬──────┘      ║
║         │                   │                    │              ║
║  ┌──────▼───────────────────▼────────────────────▼──────────┐  ║
║  │                    CAD AGENT CORE                         │  ║
║  │  Intent Parser · Geometry Planner · Code Generator        │  ║
║  │  Sandbox Executor · Error Corrector · Constraint Checker  │  ║
║  └──────────────────────────┬──────────────────────────────┘   ║
║                             │                                    ║
║  ┌──────────────────────────▼──────────────────────────────────┐ ║
║  │              CAD TOOL INTEGRATION LAYER                     │ ║
║  │  ┌───────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │ ║
║  │  │ FreeCAD   │ │ Fusion  │ │ OpenSCAD │ │ CATIA/NX     │  │ ║
║  │  │ Adapter   │ │ 360 API │ │ Adapter  │ │ Adapter      │  │ ║
║  │  └───────────┘ └─────────┘ └──────────┘ └──────────────┘  │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                    ║
║  ┌──────────────────────────▼──────────────────────────────────┐ ║
║  │                  VALIDATION ENGINE                          │ ║
║  │  Geometry Checker · Physics Constraint Validator            │ ║
║  │  Manufacturing Feasibility · Confidence Scorer              │ ║
║  └──────────────────────────┬──────────────────────────────────┘ ║
║                             │                                    ║
║  ┌──────────────────────────▼──────────────────────────────────┐ ║
║  │              CAD EXCHANGE PROTOCOL (CEP)                    │ ║
║  │         STEP · IGES · STL · Brep · GeoJSON · Custom        │ ║
║  │         ← Phase 1 Boundary / Phase 2 Entry Point →         │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════╝
2.2 Agent Hierarchy
text

ORCHESTRATION AGENT (OA)
│
├── INTENT AGENT (IA)
│   └── Parses natural language → structured design intent
│
├── PHYSICS CONSTRAINT AGENT (PCA)
│   └── Applies aerospace design rules before geometry generation
│
├── GEOMETRY PLANNING AGENT (GPA)
│   └── Decomposes design intent into geometric sub-tasks
│
├── CAD CODE GENERATION AGENT (CCGA)
│   └── Generates Python/API scripts for target CAD tool
│
├── EXECUTION AGENT (EA)
│   └── Runs generated scripts in sandboxed environment
│       └── SUB-AGENT: ERROR CORRECTION AGENT (ECA)
│           └── Self-corrects failed scripts up to N attempts
│
├── VALIDATION AGENT (VA)
│   └── Validates geometry topology, constraints, physics
│
└── REPORT AGENT (RA)
    └── Generates design report, provenance, confidence score
2.3 Data Flow
text

USER PROMPT
    │
    ▼
[Intent Agent]
    Structured Design Intent (JSON)
    {
      "geometry_type": "scramjet_inlet",
      "mach_number": 5.5,
      "pressure_recovery": 0.85,
      "mass_flow_rate": 12,
      "material": "titanium",
      "constraints": ["min_cowl_drag", "thermal_limit_450K"]
    }
    │
    ▼
[Physics Constraint Agent]
    Physics-Augmented Intent (JSON)
    {
      ...structured_intent,
      "ramp_angle_range": [8.5, 12.0],
      "throat_area": 0.034,
      "shock_system": "2-shock_external_1-internal",
      "boundary_layer_bleed": true,
      "contraction_ratio": 5.8
    }
    │
    ▼
[Geometry Planning Agent]
    Geometry Task Plan (YAML)
    tasks:
      - id: task_1
        type: create_external_ramp
        params: {angle: 9.2, length: 0.45}
      - id: task_2
        depends_on: task_1
        type: create_cowl_lip
        params: {sweep: 35, thickness_ratio: 0.04}
      - id: task_3
        depends_on: [task_1, task_2]
        type: create_throat_section
        params: {area: 0.034, length: 0.12}
    │
    ▼
[CAD Code Generation Agent]
    FreeCAD Python Script
    (sandboxed execution)
    │
    ▼
[Execution Agent + Error Correction]
    Executed, validated geometry
    Retry on failure (max 3 attempts)
    │
    ▼
[Validation Agent]
    Validation Report
    {
      "geometry_valid": true,
      "watertight": true,
      "physics_constraints_met": true,
      "confidence_score": 0.91,
      "warnings": ["thin_wall_section_at_cowl_lip"],
      "recommendations": ["increase_cowl_thickness_by_0.5mm"]
    }
    │
    ▼
[Report Agent]
    ├── CAD file (STEP/IGES)
    ├── Design report (Markdown/PDF)
    ├── Parameter log (JSON)
    └── Handoff package (CEP format for Phase 2)
Section 3: LLM Provider Abstraction Layer (BYOK + Local)
3.1 Architecture
The LLM layer is a fully abstracted provider interface. The CAD agent core never speaks directly to any LLM API. All calls go through the LLMGateway, which handles routing, fallback, retries, cost tracking, and security.

text

┌─────────────────────────────────────────────────────────────────┐
│                      LLM GATEWAY                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    REQUEST ROUTER                        │  │
│  │  ├── Task type classifier (code gen / reasoning / RAG)  │  │
│  │  ├── Cost optimizer (route simple tasks to local)       │  │
│  │  ├── Latency optimizer (hot path for interactive use)   │  │
│  │  └── Privacy enforcer (IP-sensitive → local only)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│         ┌───────────────────┼──────────────────────┐           │
│         │                   │                      │           │
│  ┌──────▼──────┐   ┌────────▼────────┐   ┌────────▼────────┐  │
│  │  CLOUD      │   │    OLLAMA       │   │   LLAMA.CPP     │  │
│  │  PROVIDER   │   │    ADAPTER      │   │   ADAPTER       │  │
│  │  ADAPTER    │   │                 │   │                 │  │
│  ├─────────────┤   ├─────────────────┤   ├─────────────────┤  │
│  │ • Anthropic │   │ • llama3.3:70b  │   │ • deepseek-coder│  │
│  │ • OpenAI    │   │ • qwen2.5-coder │   │ • mistral-7b    │  │
│  │ • Gemini    │   │ • deepseek-r1   │   │ • custom .gguf  │  │
│  │ • Mistral   │   │ • codestral     │   │ • CPU/GPU modes │  │
│  │ • OpenRouter│   │ • phi-4         │   │                 │  │
│  │ • Custom    │   │ • local embed   │   │                 │  │
│  └─────────────┘   └─────────────────┘   └─────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   SHARED SERVICES                        │  │
│  │  ├── Token counter + cost tracker                        │  │
│  │  ├── Context window manager                              │  │
│  │  ├── Prompt template registry                            │  │
│  │  ├── Response validator (structured output enforcement)  │  │
│  │  └── Audit logger (all LLM calls logged, no exceptions)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
3.2 BYOK (Bring Your Own Key) System
Configuration Schema:
YAML

# ~/.aeroforge/llm_config.yaml

providers:
  anthropic:
    api_key: "${ANTHROPIC_API_KEY}"          # env var, never hardcoded
    models:
      reasoning: "claude-opus-4-5"
      coding: "claude-sonnet-4-5"
      fast: "claude-haiku-4-5"
    enabled: true
    privacy_mode: false                       # cloud allowed

  openai:
    api_key: "${OPENAI_API_KEY}"
    models:
      reasoning: "o3"
      coding: "gpt-4.5"
      fast: "gpt-4o-mini"
    enabled: true
    privacy_mode: false

  ollama:
    endpoint: "http://localhost:11434"
    models:
      reasoning: "deepseek-r1:70b"
      coding: "qwen2.5-coder:32b"
      fast: "qwen2.5-coder:7b"
      embedding: "nomic-embed-text"
    enabled: true
    privacy_mode: true                        # always local
    gpu_layers: -1                            # use all GPU layers

  llama_cpp:
    binary_path: "/usr/local/bin/llama-server"
    model_path: "/models/deepseek-coder-33b.gguf"
    context_size: 32768
    threads: 16
    gpu_layers: 40
    enabled: false                            # enable when needed
    privacy_mode: true

routing:
  default_provider: "ollama"
  code_generation: "ollama/qwen2.5-coder:32b"
  complex_reasoning: "anthropic/claude-opus-4-5"
  fast_interaction: "ollama/qwen2.5-coder:7b"
  embedding: "ollama/nomic-embed-text"
  
  # Override: if IP protection flag is set, ALWAYS use local
  ip_sensitive_override: "ollama"

fallback_chain:
  - "ollama/qwen2.5-coder:32b"
  - "anthropic/claude-sonnet-4-5"
  - "openai/gpt-4.5"
3.3 Model Selection Matrix for Aerospace CAD
Different tasks within the CAD pipeline have different LLM requirements:

text

┌─────────────────────────────┬───────────────────┬─────────────────────┐
│ TASK                        │ REQUIRED CAPABILITY│ RECOMMENDED MODEL   │
├─────────────────────────────┼───────────────────┼─────────────────────┤
│ Intent parsing              │ Language           │ Any 7B+             │
│ Physics constraint lookup   │ Reasoning + RAG    │ 70B+ or Claude      │
│ Geometry planning           │ Spatial reasoning  │ DeepSeek-R1 70B     │
│ FreeCAD Python generation   │ Code generation    │ Qwen2.5-Coder 32B   │
│ Error correction            │ Code + reasoning   │ Qwen2.5-Coder 32B   │
│ Constraint validation       │ Reasoning          │ DeepSeek-R1 or Opus │
│ Report generation           │ Language           │ Any 13B+            │
│ Embedding / RAG retrieval   │ Embedding          │ nomic-embed-text    │
│ Complex multi-body geometry │ Strong reasoning   │ Claude Opus / o3    │
└─────────────────────────────┴───────────────────┴─────────────────────┘
3.4 Local LLM Setup
Ollama Integration:
Bash

# AeroForge local LLM bootstrap script

# Install recommended models
ollama pull qwen2.5-coder:32b          # primary code generation
ollama pull deepseek-r1:70b            # physics reasoning
ollama pull qwen2.5-coder:7b           # fast interactive completions
ollama pull nomic-embed-text           # embeddings for knowledge graph

# Verify
ollama list

# AeroForge auto-detects Ollama at startup
aeroforge doctor --check-llm
# Output:
# ✅ Ollama running at localhost:11434
# ✅ qwen2.5-coder:32b available (32B params, 19GB VRAM)
# ✅ deepseek-r1:70b available (70B params, 40GB VRAM)
# ⚠️  GPU memory: 24GB available, 70B model may be slow
# ℹ️  Recommendation: Use Q4_K_M quantization for 70B on 24GB GPU
llama.cpp Integration:
Bash

# For CPU-only or mixed environments
aeroforge llm add-backend llama-cpp \
  --model /models/qwen2.5-coder-32b-Q4_K_M.gguf \
  --context 32768 \
  --threads 16 \
  --gpu-layers 20                      # partial GPU offload

# Server mode for persistent process
aeroforge llm start-server \
  --backend llama-cpp \
  --port 8080 \
  --daemon
Section 4: CAD Agent Core
4.1 Overview
The CAD Agent Core is the central processing engine of Phase 1. It receives structured design intent from the Orchestration Agent and executes a full pipeline:

text

Structured Intent
       │
       ▼
  ┌─────────────────────────────────────────────────────┐
  │                  CAD AGENT CORE                     │
  │                                                     │
  │  1. CONTEXT LOADER                                  │
  │     └── Loads relevant aerospace templates,         │
  │         past designs, physics constraints           │
  │                                                     │
  │  2. GEOMETRY PLANNER                                │
  │     └── Decomposes design into ordered task DAG     │
  │                                                     │
  │  3. CODE GENERATOR                                  │
  │     └── Produces CAD scripts per task               │
  │                                                     │
  │  4. SANDBOX EXECUTOR                                │
  │     └── Runs scripts in isolated environment        │
  │                                                     │
  │  5. ERROR CORRECTION LOOP                           │
  │     └── Self-corrects failures (max 3 attempts)     │
  │                                                     │
  │  6. TOPOLOGY VALIDATOR                              │
  │     └── Checks watertightness, manifold integrity   │
  │                                                     │
  │  7. CONSTRAINT CHECKER                              │
  │     └── Validates against physics/design rules      │
  │                                                     │
  │  8. OUTPUT PACKAGER                                 │
  │     └── Bundles CAD files + metadata + CEP manifest │
  └─────────────────────────────────────────────────────┘
       │
       ▼
  CAD Exchange Package
4.2 Agent Loop Implementation
Python

# Conceptual implementation
# /aeroforge/agents/cad_agent_core.py

class CADAgentCore:
    """
    Core CAD generation agent.
    Orchestrates full pipeline from structured intent to validated geometry.
    """

    def __init__(
        self,
        llm_gateway: LLMGateway,
        knowledge_graph: AerospaceKnowledgeGraph,
        cad_adapter: CadToolAdapter,
        sandbox: CadSandbox,
        validator: GeometryValidator,
        config: AeroForgeConfig
    ):
        self.llm = llm_gateway
        self.knowledge = knowledge_graph
        self.cad = cad_adapter
        self.sandbox = sandbox
        self.validator = validator
        self.config = config
        self.memory = AgentMemory()

    async def run(self, intent: StructuredDesignIntent) -> CadOutputPackage:
        """
        Main agent loop. Runs full CAD generation pipeline.
        """
        session = self.memory.new_session(intent)

        try:
            # Step 1: Load relevant context from knowledge graph
            context = await self._load_context(intent, session)

            # Step 2: Augment intent with physics constraints
            augmented_intent = await self._apply_physics_constraints(
                intent, context, session
            )

            # Step 3: Build geometry task DAG
            task_dag = await self._plan_geometry(augmented_intent, context, session)

            # Step 4: Execute task DAG
            geometry_results = await self._execute_task_dag(task_dag, session)

            # Step 5: Validate geometry
            validation = await self.validator.validate(
                geometry_results,
                augmented_intent
            )

            # Step 6: Handle validation failures
            if not validation.passed:
                geometry_results = await self._handle_validation_failure(
                    geometry_results,
                    validation,
                    augmented_intent,
                    session
                )

            # Step 7: Package output
            output = await self._package_output(
                geometry_results,
                augmented_intent,
                validation,
                session
            )

            # Step 8: Update memory with successful design
            await self.memory.record_success(session, output)

            return output

        except CadGenerationError as e:
            await self.memory.record_failure(session, e)
            raise

    async def _execute_task_dag(
        self,
        task_dag: GeometryTaskDAG,
        session: AgentSession
    ) -> GeometryResults:
        """
        Executes geometry tasks in dependency order.
        Each task gets its own error correction loop.
        """
        results = GeometryResults()

        for task_layer in task_dag.topological_sort():
            # Tasks in same layer can run in parallel
            layer_results = await asyncio.gather(*[
                self._execute_single_task(task, results, session)
                for task in task_layer
            ])
            results.extend(layer_results)

        return results

    async def _execute_single_task(
        self,
        task: GeometryTask,
        prior_results: GeometryResults,
        session: AgentSession
    ) -> TaskResult:
        """
        Executes a single geometry task with error correction loop.
        """
        attempts = 0
        max_attempts = self.config.max_correction_attempts  # default: 3
        last_error = None

        while attempts < max_attempts:
            attempts += 1

            # Generate CAD code for this task
            code = await self._generate_cad_code(task, prior_results, last_error)

            # Execute in sandbox
            result = await self.sandbox.execute(code)

            if result.success:
                session.log_task_success(task, attempts, code)
                return TaskResult(task=task, code=code, geometry=result.geometry)

            # Capture error for next attempt
            last_error = result.error
            session.log_task_attempt(task, attempts, code, last_error)

            if attempts < max_attempts:
                await self._notify_correction_attempt(task, attempts, last_error)

        # All attempts failed
        raise CadTaskExecutionError(
            task=task,
            attempts=max_attempts,
            last_error=last_error
        )
4.3 Intent Parser
The Intent Parser transforms free-form natural language into a machine-processable StructuredDesignIntent object.

Python

# Schema: StructuredDesignIntent
{
    # Core identification
    "design_id": "uuid",
    "timestamp": "ISO8601",
    "raw_input": "original user text",

    # Geometry classification
    "geometry_type": "scramjet_inlet | nozzle | airfoil | ...",
    "geometry_family": "propulsion | aerodynamic_surface | structural",
    "dimensionality": "2D | 3D | 2.5D",
    "symmetry": "none | planar | axisymmetric | periodic",

    # Flight regime
    "mach_range": {"min": 0.0, "max": 6.0, "design_point": 5.5},
    "altitude_m": 25000,
    "reynolds_number": 1.2e7,
    "flow_regime": "subsonic | transonic | supersonic | hypersonic",

    # Performance requirements
    "performance_targets": [
        {"metric": "total_pressure_recovery", "value": 0.85, "operator": "gte"},
        {"metric": "mass_flow_rate_kg_s", "value": 12.0, "operator": "eq"},
        {"metric": "cowl_drag_coefficient", "value": null, "operator": "minimize"}
    ],

    # Material and manufacturing
    "material": "titanium_6al4v",
    "manufacturing_process": "cnc_machining | additive | casting",
    "tolerance_class": "fine | medium | coarse",
    "thermal_limit_K": 450,

    # Spatial constraints
    "envelope": {
        "max_length_m": 1.2,
        "max_width_m": 0.35,
        "max_height_m": 0.28
    },

    # Ambiguities (for user clarification)
    "ambiguities": [
        {"field": "cowl_sweep", "question": "What cowl sweep angle do you prefer?"}
    ],

    # Confidence
    "intent_confidence": 0.92
}
4.4 Geometry Task DAG
The Geometry Planning Agent builds a Directed Acyclic Graph (DAG) of geometric sub-tasks that ensures correct build order for complex assemblies:

text

Example: Scramjet Inlet Task DAG

  [TASK 1]              [TASK 2]
  external_ramp         flow_path_profile
  (independent)         (independent)
       │                      │
       └──────────┬───────────┘
                  │
             [TASK 3]
             cowl_geometry
             (depends on 1, 2)
                  │
         ┌────────┴─────────┐
         │                  │
    [TASK 4]           [TASK 5]
    throat_section     bleed_slots
    (depends on 3)     (depends on 3)
         │                  │
         └────────┬──────────┘
                  │
             [TASK 6]
             assembly_and_boolean_ops
             (depends on 4, 5)
                  │
             [TASK 7]
             final_cleanup_and_export
             (depends on 6)
Each node in the DAG carries:

YAML

task:
  id: "task_3"
  name: "cowl_geometry"
  type: "freecad_script"          # or: "openscad", "gmsh_geo", "api_call"
  depends_on: ["task_1", "task_2"]
  inputs:
    from_task_1: "ramp_face_ref"
    from_task_2: "duct_profile_ref"
    params:
      sweep_angle_deg: 35
      cowl_thickness_m: 0.004
      leading_edge_radius_m: 0.0008
  outputs:
    - type: "shape"
      name: "cowl_solid"
      format: "brep"
  validation:
    checks:
      - "watertight"
      - "min_thickness > 0.002"
      - "no_self_intersections"
  timeout_s: 120
  retry_on_failure: true
  max_retries: 3
Section 5: CAD Tool Integration Layer
5.1 Adapter Architecture
The CAD Integration Layer implements the Adapter Pattern, providing a uniform interface to all supported CAD tools. Adding a new CAD tool requires only implementing the CadToolAdapter abstract class.

text

┌─────────────────────────────────────────────────────────────┐
│                   CAD AGENT CORE                            │
│              (calls CadToolAdapter interface)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ uniform interface
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 CadToolAdapter (Abstract)                    │
│                                                             │
│  + create_document() → DocumentRef                          │
│  + execute_script(script: str) → ExecutionResult            │
│  + get_geometry(ref: str) → GeometryObject                  │
│  + export(ref, format, path) → ExportResult                 │
│  + validate_geometry(ref) → ValidationResult                │
│  + get_parameters() → Dict[str, Any]                        │
│  + set_parameters(params: Dict) → None                      │
│  + capture_screenshot() → Image                             │
│  + get_error_context() → ErrorContext                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼───────────────────────┐
         │                │                       │
┌────────▼───────┐ ┌──────▼──────────┐ ┌─────────▼──────────┐
│  FreeCAD       │ │  OpenSCAD        │ │  CadQuery/Build123d│
│  Adapter       │ │  Adapter         │ │  Adapter           │
└────────────────┘ └─────────────────┘ └────────────────────┘
         │                │                       │
┌────────▼───────┐ ┌──────▼──────────┐ ┌─────────▼──────────┐
│  Fusion 360    │ │  Onshape        │ │  CATIA / NX        │
│  Adapter       │ │  REST API        │ │  COM/API Adapter   │
│  (REST API)    │ │  Adapter         │ │                    │
└────────────────┘ └─────────────────┘ └────────────────────┘
5.2 FreeCAD Adapter (Primary Adapter — Phase 1)
FreeCAD is the default open-source CAD backend for Phase 1. It is scriptable via Python, supports the full STEP/IGES/STL pipeline, and has a rich Part Design API suitable for parametric aerospace geometry.

FreeCAD Execution Modes:
text

MODE 1: HEADLESS (default, automated)
  ├── FreeCAD runs without GUI
  ├── Python scripts executed via freecadcmd
  ├── Output: STEP/IGES/STL files
  └── Best for: CI/CD, batch processing, server deployment

MODE 2: GUI-ATTACHED (interactive review)
  ├── FreeCAD runs with GUI
  ├── Scripts auto-executed, engineer reviews in 3D viewport
  ├── Real-time visual feedback
  └── Best for: interactive design sessions

MODE 3: SERVER MODE (persistent process)
  ├── FreeCAD runs as persistent background server
  ├── Communicates via local socket
  ├── Faster than subprocess spawning
  └── Best for: rapid iteration workflows
FreeCAD Adapter Implementation:
Python

# /aeroforge/adapters/freecad_adapter.py

class FreeCadAdapter(CadToolAdapter):
    """
    Primary CAD adapter for FreeCAD.
    Supports headless, GUI-attached, and server modes.
    """

    # Supported FreeCAD modules
    MODULES = {
        "Part": "Geometric primitives, boolean ops, STEP/IGES import/export",
        "PartDesign": "Parametric feature-based modeling",
        "Sketcher": "2D constraint-based sketching",
        "Mesh": "STL mesh operations",
        "FEM": "Finite element preprocessing (future)",
        "Draft": "2D drafting tools",
        "Path": "CNC toolpath generation (future)"
    }

    async def execute_script(self, script: str) -> ExecutionResult:
        """
        Execute FreeCAD Python script in sandboxed subprocess.
        Captures stdout, stderr, and output geometry.
        """
        # Wrap script with safety harness
        wrapped = self._wrap_with_safety_harness(script)

        # Execute in subprocess with timeout
        result = await asyncio.create_subprocess_exec(
            "freecadcmd", "-c", wrapped,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=self._build_safe_env()
        )

        stdout, stderr = await asyncio.wait_for(
            result.communicate(),
            timeout=self.config.execution_timeout_s
        )

        return ExecutionResult(
            success=result.returncode == 0,
            stdout=stdout.decode(),
            stderr=stderr.decode(),
            geometry=self._extract_geometry_artifacts(),
            error=self._parse_error(stderr) if result.returncode != 0 else None
        )
Core FreeCAD Script Templates (Aerospace):
Python

# Template Library: /aeroforge/templates/freecad/

TEMPLATE_NACA_AIRFOIL = """
import FreeCAD, Part, math

def naca4_points(m, p, t, chord=1.0, n_points=100):
    '''Generate NACA 4-digit airfoil coordinates'''
    points_upper, points_lower = [], []
    for i in range(n_points + 1):
        x = (1 - math.cos(math.pi * i / n_points)) / 2
        yt = (t/0.2) * (0.2969*x**0.5 - 0.1260*x
                         - 0.3516*x**2 + 0.2843*x**3
                         - 0.1015*x**4)
        if x < p:
            yc = (m/p**2) * (2*p*x - x**2)
            dyc = (2*m/p**2) * (p - x)
        else:
            yc = (m/(1-p)**2) * ((1-2*p) + 2*p*x - x**2)
            dyc = (2*m/(1-p)**2) * (p - x)
        theta = math.atan(dyc)
        points_upper.append(FreeCAD.Vector(
            chord*(x - yt*math.sin(theta)),
            chord*(yc + yt*math.cos(theta)), 0))
        points_lower.append(FreeCAD.Vector(
            chord*(x + yt*math.sin(theta)),
            chord*(yc - yt*math.cos(theta)), 0))
    return points_upper, points_lower + [points_lower[0]]

doc = FreeCAD.newDocument("{doc_name}")
upper, lower = naca4_points({m}, {p}, {t}, chord={chord})
wire_upper = Part.makePolygon(upper)
wire_lower = Part.makePolygon(lower[::-1])
airfoil_wire = Part.Wire([wire_upper, wire_lower])
airfoil_face = Part.Face(airfoil_wire)
airfoil_solid = airfoil_face.extrude(FreeCAD.Vector(0, 0, {span}))
Part.export([airfoil_solid], "{output_path}.step")
doc.saveAs("{output_path}.FCStd")
print("EXPORT_SUCCESS: {output_path}.step")
"""
5.3 OpenSCAD Adapter
OpenSCAD is a code-first parametric modeler — no GUI, pure scripting. Ideal for LLM-driven generation since the entire geometry is described in code.

text

Advantages for AI-driven generation:
  ✅ Pure text/code (no GUI interaction needed)
  ✅ Deterministic: same input → same output
  ✅ Fast execution
  ✅ Strong for mechanical/angular geometries

Limitations:
  ❌ Poor support for organic/freeform curves
  ❌ No STEP export (STL only natively)
  ❌ Limited parametric constraint system
  ❌ Not used in professional aerospace workflows
  
Best for: Rapid concept generation, nozzle geometry, mechanical brackets
5.4 CadQuery / Build123d Adapter
CadQuery is a Python-first, Pythonic API for CAD that wraps OpenCASCADE — the same kernel used by FreeCAD.

text

Advantages:
  ✅ Pure Python (no FreeCAD installation needed)
  ✅ Excellent for parametric work
  ✅ STEP/IGES/STL export natively
  ✅ Easy to test (unit-testable Python)
  ✅ Fluent chaining API perfect for LLM generation
  
Example (LLM can generate this directly):
  result = (
      cq.Workplane("XY")
      .circle(inlet_radius)
      .extrude(duct_length)
      .faces(">Z")
      .workplane()
      .circle(throat_radius)
      .cutBlind(bleed_depth)
  )
5.5 Commercial CAD Adapters (Phase 1.5+)
text

┌─────────────────────────────────────────────────────────────────┐
│                  COMMERCIAL CAD ADAPTERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FUSION 360                                                     │
│  ├── API type: REST API + Python add-in                         │
│  ├── Authentication: OAuth2 / BYOK                              │
│  ├── Key capabilities: Parametric modeling, generative design   │
│  └── Integration path: Fusion 360 API → aeroforge adapter       │
│                                                                 │
│  ONSHAPE                                                        │
│  ├── API type: REST API (FeatureScript)                         │
│  ├── Authentication: API keys (BYOK)                            │
│  ├── Key capabilities: Cloud-native, version control built-in   │
│  └── Integration path: Onshape REST API → aeroforge adapter     │
│                                                                 │
│  CATIA V5/V6 / 3DEXPERIENCE                                     │
│  ├── API type: COM automation (V5) / EKL/3DX APIs (V6)          │
│  ├── Authentication: License server + user credentials          │
│  ├── Key capabilities: Industry standard, GD&T, DMU             │
│  └── Integration path: Windows COM → subprocess adapter         │
│                                                                 │
│  SIEMENS NX                                                     │
│  ├── API type: NX Open (Python/C++)                             │
│  ├── Authentication: License server                             │
│  ├── Key capabilities: Advanced surfacing, associativity        │
│  └── Integration path: NX Open Python → aeroforge adapter       │
│                                                                 │
│  SOLIDWORKS                                                     │
│  ├── API type: COM automation (VBA/Python via win32com)         │
│  ├── Authentication: License server                             │
│  ├── Key capabilities: Widespread use, simulation integration   │
│  └── Integration path: COM bridge → aeroforge adapter           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
Section 6: Aerospace Geometry Engine
6.1 Overview
The Aerospace Geometry Engine (AGE) is the domain-specific knowledge layer that sits between the LLM and the CAD adapter. It:

Encodes analytical geometry — oblique shock equations, nozzle contour theory, airfoil parametrizations
Provides parameterized templates — known-good baseline geometries for each component type
Enforces physical realizability — checks that generated geometry is physically meaningful before attempting CAD generation
text

LLM-Generated Intent
        │
        ▼
┌───────────────────────────────────────────────────────┐
│              AEROSPACE GEOMETRY ENGINE                │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │          ANALYTICAL GEOMETRY LIBRARY            │ │
│  │  ├── Oblique shock relations (θ-β-M)            │ │
│  │  ├── Prandtl-Meyer expansion                    │ │
│  │  ├── Nozzle contour (MOC, Rao, conical)         │ │
│  │  ├── NACA airfoil families                      │ │
│  │  ├── Von Karman ogive series                    │ │
│  │  └── Busemann inlet theory                      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │          PARAMETRIC TEMPLATE LIBRARY            │ │
│  │  ├── 47 aerospace component templates           │ │
│  │  ├── Each with validated parameter ranges       │ │
│  │  ├── Material-specific constraints              │ │
│  │  └── Manufacturing feasibility checks           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │          GEOMETRY SYNTHESIS ENGINE              │ │
│  │  ├── Parametric sweep and optimization          │ │
│  │  ├── Multi-component assembly logic             │ │
│  │  ├── Continuity enforcement (G0, G1, G2)        │ │
│  │  └── Symmetric/periodic patterning              │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
        │
        ▼
Physics-Validated Geometric Parameters → CAD Adapter
6.2 Analytical Geometry Library
Oblique Shock Relations (Critical for Scramjet Design):
Python

# /aeroforge/physics/oblique_shock.py

class ObliqueShockRelations:
    """
    Analytical oblique shock relations for supersonic/hypersonic inlet design.
    Implements θ-β-M relations for shock angle computation.
    All inputs/outputs in SI units unless specified.
    """

    @staticmethod
    def shock_angle_from_deflection(
        mach: float,
        deflection_deg: float,
        weak_shock: bool = True
    ) -> float:
        """
        Compute shock wave angle β given Mach number M and
        flow deflection angle θ (the θ-β-M relation).

        Returns: shock angle β in degrees
        Raises: PhysicsConstraintError if no solution exists
        """
        ...

    @staticmethod
    def total_pressure_recovery(
        mach: float,
        shock_angles: List[float]
    ) -> float:
        """
        Compute total pressure recovery through a system of
        oblique shocks followed by a terminal normal shock.

        Used to validate inlet efficiency at design point.
        """
        ...

    @staticmethod
    def optimal_ramp_angles_for_recovery(
        mach: float,
        n_ramps: int,
        target_recovery: float
    ) -> List[float]:
        """
        Compute optimal ramp deflection angles for maximum
        total pressure recovery given Mach and number of ramps.
        Implements equal-strength shock policy (Oswatitsch criterion).
        """
        ...
Method of Characteristics (Nozzle Design):
Python

# /aeroforge/physics/method_of_characteristics.py

class NozzleContourMOC:
    """
    Method of Characteristics for minimum-length and
    Rao optimum nozzle contour generation.

    Generates nozzle wall coordinates for:
    - Minimum-length nozzles (uniform exit flow)
    - Rao thrust-optimized nozzles
    - Conical approximations
    - Bell nozzle profiles (80% Rao equivalent)
    """

    def generate_contour(
        self,
        throat_radius_m: float,
        exit_mach: float,
        nozzle_type: Literal["min_length", "rao", "conical", "bell"],
        expansion_ratio: Optional[float] = None,
        n_characteristics: int = 100
    ) -> NozzleContour:
        """
        Returns wall coordinates as a list of (r, x) points
        suitable for FreeCAD BSpline generation.
        """
        ...
6.3 Parametric Template Library
The template library provides 47 pre-validated aerospace component templates. Each template:

YAML

# Template: supersonic_2ramp_inlet
# /aeroforge/templates/geometry/supersonic_2ramp_inlet.yaml

template:
  id: "supersonic_2ramp_inlet"
  version: "1.2.0"
  name: "2D Two-Ramp External Compression Inlet"
  category: "propulsion/intake"
  validated_against:
    - "NASA TN D-4112"
    - "AIAA 1990-0474"

  parameters:
    mach_design:
      type: float
      range: [1.5, 4.0]
      description: "Design Mach number"
    ramp1_angle_deg:
      type: float
      range: [5.0, 15.0]
      computed_from: "oblique_shock.optimal_ramp_angles(mach_design, n_ramps=2)"
      overridable: true
    ramp2_angle_deg:
      type: float
      range: [10.0, 25.0]
      computed_from: "oblique_shock.optimal_ramp_angles(mach_design, n_ramps=2)"
      overridable: true
    contraction_ratio:
      type: float
      range: [3.0, 10.0]
      description: "Duct area ratio from cowl lip to throat"
    cowl_lip_bluntness_m:
      type: float
      range: [0.001, 0.010]
      description: "Cowl leading edge radius (bluntness)"
    bleed_slot_height_fraction:
      type: float
      range: [0.02, 0.08]
      description: "Bleed slot height as fraction of duct height at bleed location"
      default: 0.04
    total_length_m:
      type: float
      range: [0.2, 3.0]

  derived_quantities:
    throat_height_m:
      formula: "cowl_height / contraction_ratio"
    mass_capture_ratio:
      formula: "oblique_shock.mass_capture(mach_design, ramp1_angle_deg, ramp2_angle_deg)"
    total_pressure_recovery:
      formula: "oblique_shock.total_pressure_recovery(mach_design, [ramp1_angle_deg, ramp2_angle_deg])"

  constraints:
    - "ramp2_angle_deg > ramp1_angle_deg"
    - "total_pressure_recovery >= 0.80"
    - "contraction_ratio <= 10.0"
    - "mach_design <= 4.0"
    - "cowl_lip_bluntness_m <= 0.005 * total_length_m"

  manufacturing_constraints:
    min_wall_thickness_m: 0.003
    min_radius_m: 0.001
    max_aspect_ratio: 20.0

  output_geometry:
    components:
      - "ramp_body"
      - "cowl_assembly"
      - "throat_duct"
      - "bleed_plenum"
      - "sidewall_panels"
    assembly_type: "boolean_union"
    export_formats: ["STEP", "IGES", "STL", "BREP"]
Section 7: Domain Knowledge System
7.1 Aerospace Knowledge Graph
AeroForge uses a hybrid knowledge system combining vector embeddings (for semantic search) with a structured knowledge graph (for relational reasoning). This is the "brain" that makes the system aerospace-aware rather than just LLM-smart.

text

┌─────────────────────────────────────────────────────────────────┐
│              AEROSPACE KNOWLEDGE GRAPH                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   KNOWLEDGE SOURCES                       │ │
│  │  ├── NASA Technical Reports (NTRs)                        │ │
│  │  ├── AIAA papers (propulsion, aerodynamics focus)         │ │
│  │  ├── MIL-SPEC / MIL-HDBK standards                       │ │
│  │  ├── ARP (Aerospace Recommended Practice) documents       │ │
│  │  ├── Anderson's "Modern Compressible Flow"                │ │
│  │  ├── Mattingly "Elements of Gas Turbine Propulsion"       │ │
│  │  ├── Past successful designs (internal, anonymized)       │ │
│  │  └── CFD validation data (UniFoil 500k+ samples)          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                             │                                   │
│                             ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   DUAL-MODE STORAGE                       │ │
│  │                                                           │ │
│  │  VECTOR DATABASE (Semantic Search)                        │ │
│  │  ├── Engine: ChromaDB (local) / Qdrant (production)       │ │
│  │  ├── Embeddings: nomic-embed-text (local via Ollama)      │ │
│  │  ├── Chunks: 512 tokens, 64-token overlap                 │ │
│  │  └── Query: "How to handle shock-BL interaction in inlets"│ │
│  │                                                           │ │
│  │  KNOWLEDGE GRAPH (Relational Reasoning)                   │ │
│  │  ├── Engine: Neo4j (production) / NetworkX (dev)          │ │
│  │  ├── Entities: Components, Materials, Phenomena, Params   │ │
│  │  ├── Relations: AFFECTS, REQUIRES, CONSTRAINS, VALIDATES  │ │
│  │  └── Query: "What affects total pressure recovery?"       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
7.2 Knowledge Graph Schema
text

NODE TYPES:
├── Component          (e.g., scramjet_inlet, convergent_nozzle)
├── PhysicsParameter   (e.g., total_pressure_recovery, Mach_number)
├── Material           (e.g., Inconel_718, Ti_6Al4V, C/SiC)
├── ManufacturingProcess (e.g., EDM, additive_Ti, investment_casting)
├── DesignRule         (e.g., "bleed_required_above_Mach_2")
├── FlowPhenomenon     (e.g., shock_BL_interaction, flow_separation)
├── Constraint         (e.g., thermal_limit, stress_limit)
├── Standard           (e.g., MIL-E-5007, ARP755)
└── ValidationSource   (e.g., NASA_TN_D4112, wind_tunnel_test_XYZ)

RELATION TYPES:
├── AFFECTS            (e.g., ramp_angle AFFECTS pressure_recovery)
├── REQUIRES           (e.g., Mach>2 REQUIRES boundary_layer_bleed)
├── CONSTRAINS         (e.g., Ti_6Al4V CONSTRAINS max_temp_450K)
├── VALIDATED_BY       (e.g., inlet_design VALIDATED_BY NASA_TN)
├── IS_SUBCOMPONENT_OF (e.g., cowl_lip IS_SUBCOMPONENT_OF inlet)
├── MANUFACTURED_BY    (e.g., thin_wall MANUFACTURED_BY EDM)
├── INCOMPATIBLE_WITH  (e.g., sharp_LE INCOMPATIBLE_WITH additive_Ti)
└── SUPERSEDES         (e.g., Oswatitsch_criterion SUPERSEDES equal_pressure)
7.3 RAG Query Pipeline for Design Assistance
text

USER: "Design a scramjet inlet for Mach 6"
           │
           ▼
[Query Analyzer]
  ├── Extract entities: {scramjet_inlet, Mach_6}
  ├── Identify gaps: pressure_recovery?, mass_flow?, cooling?
  └── Generate retrieval queries:
       ├── "scramjet inlet design Mach 6 guidelines"
       ├── "hypersonic inlet pressure recovery Mach 6"
       ├── "scramjet inlet thermal loads leading edge"
       └── "boundary layer bleed hypersonic inlet"
           │
           ▼
[Parallel Retrieval]
  ├── Vector DB: top-10 semantic matches per query
  └── Knowledge Graph: 
       ├── MATCH (c:Component {name:'scramjet_inlet'})
       ├── -[:REQUIRES]→ (d:DesignRule)
       ├── -[:AFFECTS]→ (p:PhysicsParameter)
       └── WHERE c.mach_range INCLUDES 6.0
           │
           ▼
[Context Fusion]
  Merges vector results + graph traversal into:
  ├── Relevant design rules
  ├── Parameter constraints  
  ├── Similar past designs
  └── Validation references
           │
           ▼
[LLM-Augmented Design]
  Physics-informed design intent with full provenance
Section 8: Validation & Constraint Engine
8.1 Validation Pipeline
Every generated geometry passes through a multi-stage validation pipeline before being returned to the user:

text

GENERATED GEOMETRY
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  STAGE 1: TOPOLOGY VALIDATION                             │
│  ├── Watertight solid check (no open faces)               │
│  ├── Manifold check (no non-manifold edges/vertices)      │
│  ├── Self-intersection check                              │
│  ├── Minimum volume check (no degenerate solids)          │
│  └── Surface normal orientation                           │
├───────────────────────────────────────────────────────────┤
│  STAGE 2: GEOMETRIC CONSTRAINT VALIDATION                 │
│  ├── Dimensional bounds (fits within envelope)            │
│  ├── Minimum wall thickness                               │
│  ├── Minimum feature size (manufacturing limit)           │
│  ├── Maximum aspect ratio                                 │
│  └── Symmetry check (if required)                        │
├───────────────────────────────────────────────────────────┤
│  STAGE 3: PHYSICS CONSTRAINT VALIDATION                   │
│  ├── Flow path continuity (no abrupt area changes)        │
│  ├── Shock angle validity (detached shock check)          │
│  ├── Thermal limits (material vs. expected heat load)     │
│  ├── Structural limits (thin walls vs. pressure load)     │
│  └── Mass flow compatibility                              │
├───────────────────────────────────────────────────────────┤
│  STAGE 4: MANUFACTURING FEASIBILITY                       │
│  ├── Undercut detection (CNC accessibility)               │
│  ├── Minimum radius check (tool radius constraints)       │
│  ├── Draft angle check (casting/molding)                  │
│  └── Tolerance stack-up analysis                         │
├───────────────────────────────────────────────────────────┤
│  STAGE 5: CONFIDENCE SCORING                              │
│  ├── Template conformance score (0.0 - 1.0)              │
│  ├── Physics constraint pass rate                         │
│  ├── Manufacturing feasibility score                      │
│  └── Overall design confidence score                     │
└───────────────────────────────────────────────────────────┘
        │
        ▼
VALIDATION REPORT + ANNOTATED GEOMETRY
8.2 Confidence Scoring
Python

class ConfidenceScorer:
    """
    Computes a multi-factor confidence score for generated geometry.
    Scores are in [0.0, 1.0].
    Final score determines user notification level.
    """

    SCORE_THRESHOLDS = {
        0.90: "HIGH_CONFIDENCE",      # Auto-approve for export
        0.75: "MEDIUM_CONFIDENCE",    # Present with minor warnings
        0.60: "LOW_CONFIDENCE",       # Present with prominent warnings
        0.00: "UNACCEPTABLE"          # Block export, require revision
    }

    def compute(self, geometry: GeometryObject, intent: AugmentedIntent) -> ConfidenceScore:
        scores = {
            "topology":          self._score_topology(geometry),
            "physics":           self._score_physics_constraints(geometry, intent),
            "manufacturing":     self._score_manufacturing(geometry, intent),
            "template_conform":  self._score_template_conformance(geometry, intent),
            "parameter_bounds":  self._score_parameter_bounds(geometry, intent),
        }

        weights = {
            "topology": 0.30,
            "physics": 0.30,
            "manufacturing": 0.20,
            "template_conform": 0.10,
            "parameter_bounds": 0.10,
        }

        final_score = sum(scores[k] * weights[k] for k in scores)

        return ConfidenceScore(
            overall=final_score,
            breakdown=scores,
            level=self._classify(final_score),
            blocking_issues=[i for i in self._get_issues(scores) if i.is_blocking],
            warnings=[i for i in self._get_issues(scores) if not i.is_blocking]
        )
Section 9: Memory, Skills & Learning Loop
9.1 Agent Memory Architecture
text

┌────────────────────────────────────────────────────────────────┐
│                    MEMORY SYSTEM                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  IN-SESSION MEMORY (context window)                           │
│  ├── Current design state                                     │
│  ├── Task DAG execution trace                                 │
│  ├── Correction attempts and outcomes                         │
│  └── User clarification history                               │
│                                                               │
│  EPISODIC MEMORY (SQLite, persistent)                         │
│  ├── Past design sessions with outcomes                       │
│  ├── Successful CAD scripts per component type                │
│  ├── Error patterns and their fixes                           │
│  └── User preferences and customizations                     │
│                                                               │
│  SEMANTIC MEMORY (Knowledge Graph + Vector DB)               │
│  ├── Aerospace domain knowledge (as described in Section 7)  │
│  ├── Design rules and constraints                             │
│  └── Validated geometry reference library                    │
│                                                               │
│  SKILL MEMORY (Skill Registry)                               │
│  ├── Reusable CAD operation sequences                        │
│  ├── Physics computation functions                            │
│  ├── Validated sub-assembly generators                       │
│  └── Custom user-defined skills                              │
└────────────────────────────────────────────────────────────────┘
9.2 Skill System
The Skill System enables the agent to learn from successful designs and build a library of reusable operations. A Skill is a self-contained, validated, reusable unit of CAD generation capability.

Skill Structure:
YAML

# /aeroforge/skills/propulsion/converging_diverging_nozzle.yaml

skill:
  id: "cd_nozzle_rao"
  name: "Rao Optimum C-D Nozzle Generator"
  version: "2.1.0"
  category: "propulsion/nozzle"
  created_from: "session_2847"          # auto-learned from successful session
  validated: true
  validation_source: "NASA TP-1992"

  description: >
    Generates a thrust-optimized convergent-divergent nozzle contour
    using Rao's method via Method of Characteristics. Produces BSpline
    wall geometry suitable for direct CFD meshing.

  inputs:
    throat_radius_m:
      type: float
      range: [0.01, 2.0]
      required: true
    exit_mach:
      type: float
      range: [1.5, 6.0]
      required: true
    area_ratio:
      type: float
      computed: "exit_mach → area_ratio via isentropic relations"
      overridable: true
    chamber_pressure_kpa:
      type: float
      default: 1000.0
    half_angle_convergent_deg:
      type: float
      default: 30.0
      range: [20.0, 45.0]

  outputs:
    - name: "nozzle_solid"
      format: "STEP"
    - name: "nozzle_2d_profile"
      format: "DXF"
    - name: "wall_coordinates"
      format: "CSV"

  tags: ["nozzle", "supersonic", "rao", "moc", "thrust"]
  success_rate: 0.96                    # from episodic memory
  avg_execution_time_s: 18
Skill Auto-Learning:
text

SUCCESSFUL DESIGN SESSION
         │
         ▼
[Session Analyzer]
  ├── Was this session fully successful?
  ├── Was a novel approach used?
  ├── Is this generalizable beyond this session?
  └── Confidence score > 0.85?
         │ Yes
         ▼
[Skill Extractor]
  ├── Extract reusable code pattern
  ├── Identify parameters vs. hard-coded values
  ├── Generate parameter schema
  └── Write skill YAML
         │
         ▼
[Skill Validator]
  ├── Test skill with 5 parameter variations
  ├── Validate all outputs
  └── Compute success rate
         │
         ▼
[Skill Registry]
  └── Skill added to library for future sessions
9.3 Design Memory (Session Compaction)
For long design sessions, context windows fill up. AeroForge implements a design-aware compaction strategy:

text

COMPACTION TRIGGER: Context > 80% of window size

COMPACTION STRATEGY:
  PRESERVE (never compress):
    ├── Final validated geometry references
    ├── Active constraints and requirements
    ├── User-stated preferences
    └── Current design parameters

  COMPRESS (summarize):
    ├── Intermediate task execution traces
    ├── Correction attempt details (keep count + final fix)
    └── Redundant retrieval results

  ARCHIVE (move to episodic memory):
    ├── Completed sub-task details
    ├── Discarded design alternatives
    └── Full error logs (keep summary only)

OUTPUT: Compact design state JSON + archived episode
Section 10: Security, IP Protection & Compliance
10.1 Threat Model
Aerospace CAD data is among the most sensitive engineering IP. The threat model covers:

text

┌─────────────────────────────────────────────────────────────────┐
│                      THREAT VECTORS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EXTERNAL THREATS                                               │
│  ├── Unauthorized access to design files                        │
│  ├── Interception of LLM API calls (cloud providers)           │
│  ├── Prompt injection in user inputs                           │
│  └── Supply chain attacks (skill packages)                     │
│                                                                 │
│  INTERNAL THREATS                                               │
│  ├── Accidental IP exfiltration via cloud LLM APIs             │
│  ├── Overly permissive sandbox execution                       │
│  ├── Knowledge graph poisoning                                  │
│  └── Excessive agent autonomy (unwanted file system access)    │
│                                                                 │
│  COMPLIANCE THREATS                                             │
│  ├── ITAR/EAR violations (export-controlled technology)        │
│  ├── FAA/EASA design standard violations                       │
│  └── Institutional IP leakage                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
10.2 Security Architecture
text

DEFENSE LAYERS:

LAYER 1: LLM PRIVACY ENFORCEMENT
  ├── IP-sensitive designs → local LLM ONLY (enforced at gateway)
  ├── No design geometry sent to cloud without explicit user consent
  ├── Project-level privacy flags
  └── Audit log of every LLM call (provider, tokens, timestamp)

LAYER 2: SANDBOX ISOLATION
  ├── CAD code executes in isolated subprocess
  ├── Network access: BLOCKED
  ├── File system: READ/WRITE limited to designated output directory
  ├── Resource limits: CPU time, memory, disk
  └── No access to user home directory or system files

LAYER 3: INPUT SANITIZATION
  ├── Prompt injection detection (aerospace-specific patterns)
  ├── Parameter bounds enforcement (prevents extreme values)
  ├── Schema validation on all structured inputs
  └── Rate limiting on automated design loops

LAYER 4: OUTPUT PROTECTION
  ├── All exports encrypted at rest (AES-256)
  ├── Export audit trail
  ├── Optional watermarking of exported geometry
  └── Access control on design sessions

LAYER 5: ITAR/EAR COMPLIANCE
  ├── Component classification against USML/CCL
  ├── User/org jurisdiction verification
  ├── Automated flagging of ITAR-controlled geometry types
  └── Legal hold capability for regulated designs
10.3 Audit System
Python

# Every significant action is logged to immutable audit trail

AuditEvent = {
    "event_id": "uuid",
    "timestamp": "ISO8601",
    "session_id": "uuid",
    "user_id": "hashed",
    "event_type": "llm_call | cad_execution | file_export | validation",
    "provider": "ollama | anthropic | openai | llama_cpp",
    "model": "model_name",
    "tokens_used": 1247,
    "cost_usd": 0.0018,
    "privacy_level": "local | cloud",
    "geometry_type": "scramjet_inlet",
    "ip_sensitive": true,
    "output_path": "/designs/session_xyz/inlet_v3.step",
    "confidence_score": 0.91,
    "compliance_flags": []
}
Section 11: Phase 1 Roadmap & Milestones
11.1 Development Phases
text

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1.0 — FOUNDATION (Months 1-3)                           │
│                                                                 │
│  Goals:                                                         │
│  ├── Working CAD agent loop (FreeCAD + CadQuery)                │
│  ├── BYOK + Ollama + llama.cpp integration                      │
│  ├── 10 core aerospace templates (airfoils, nozzles, ducts)     │
│  ├── Sandbox execution with error correction                    │
│  └── CLI interface                                              │
│                                                                 │
│  Deliverables:                                                  │
│  ├── aeroforge-core Python package                              │
│  ├── aeroforge CLI (`aeroforge design "..."`)                  │
│  ├── FreeCAD + CadQuery adapters                                │
│  ├── LLM gateway with BYOK + Ollama support                    │
│  └── 10 validated aerospace templates                           │
│                                                                 │
│  Success Metric:                                                │
│  "Design a NACA 2412 airfoil at 2m chord, 5m span"            │
│   → STEP file in < 60 seconds, 95% success rate               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1.1 — DOMAIN DEPTH (Months 3-6)                        │
│                                                                 │
│  Goals:                                                         │
│  ├── Physics constraint engine (oblique shock, MOC, etc.)      │
│  ├── Aerospace knowledge graph (10,000+ nodes)                 │
│  ├── 47 aerospace component templates                           │
│  ├── Validation engine (all 5 stages)                          │
│  ├── Skill system + auto-learning                               │
│  └── Confidence scoring                                         │
│                                                                 │
│  Deliverables:                                                  │
│  ├── Physics computation library                                │
│  ├── Knowledge graph (Neo4j + ChromaDB)                        │
│  ├── Full template library v1.0                                │
│  ├── Validation + confidence scoring pipeline                   │
│  └── Design report generator                                   │
│                                                                 │
│  Success Metric:                                                │
│  "Design a 2-ramp supersonic inlet for Mach 2.5"              │
│   → STEP file + design report in < 3 min, 90% success rate    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1.2 — PROPULSION FOCUS (Months 6-9)                     │
│                                                                 │
│  Goals:                                                         │
│  ├── Scramjet inlet family (Mach 4-8)                          │
│  ├── Nozzle design (C-D, Rao, aerospike, plug)                 │
│  ├── Combustor geometry generation                              │
│  ├── Turbomachinery blade profiles (2D)                        │
│  ├── Multi-component assembly                                   │
│  └── CATIA/NX adapter (Phase 1.5 preview)                      │
│                                                                 │
│  Success Metric:                                                │
│  "Design a complete scramjet flow path for Mach 6"            │
│   → Full multi-component STEP assembly in < 10 min            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1.3 — PRODUCTION HARDENING (Months 9-12)                │
│                                                                 │
│  Goals:                                                         │
│  ├── Web UI (React + Three.js 3D preview)                      │
│  ├── REST API for enterprise integration                        │
│  ├── Commercial CAD adapters (Fusion 360, Onshape)             │
│  ├── ITAR/EAR compliance module                                │
│  ├── Team collaboration features                                │
│  ├── CEP (CAD Exchange Protocol) finalized for Phase 2 handoff │
│  └── Performance: < 30s for standard geometries                │
│                                                                 │
│  Success Metric:                                                │
│  10 aerospace engineers using daily for production work        │
└─────────────────────────────────────────────────────────────────┘
11.2 Engineering Standards
Code Standards:
text

Language       : Python 3.11+ (core), TypeScript (web UI)
Style          : PEP 8, Black formatter, isort
Type hints     : Required on all public interfaces
Docstrings     : Google style, all public methods
Testing        : pytest, minimum 80% coverage on core modules
CI/CD          : GitHub Actions
Package mgmt   : uv (fast) / pip (fallback)
CAD Standards:
text

Primary format : STEP AP214 (ISO 10303-214)
Secondary      : IGES 5.3
Mesh export    : STL (binary), OBJ
Precision      : 0.001mm default, 0.0001mm available
Coordinate     : Right-hand rule, SI units (meters)
Naming         : component_name_v{major}_{minor}.step
AI/LLM Standards:
text

Structured output   : Always JSON schema validated
Prompt versioning   : All prompts version-controlled
Temperature         : 0.1 for code generation, 0.3 for reasoning
Max retries         : 3 (code gen), 5 (validation)
Timeout             : 30s (fast models), 120s (reasoning models)
Context management  : Compaction at 80% window utilization
11.3 Folder Structure
text

aeroforge/
├── aeroforge/
│   ├── agents/
│   │   ├── orchestration_agent.py
│   │   ├── intent_agent.py
│   │   ├── physics_constraint_agent.py
│   │   ├── geometry_planning_agent.py
│   │   ├── cad_code_generation_agent.py
│   │   ├── execution_agent.py
│   │   ├── error_correction_agent.py
│   │   ├── validation_agent.py
│   │   └── report_agent.py
│   ├── adapters/
│   │   ├── base.py                     # CadToolAdapter abstract class
│   │   ├── freecad_adapter.py
│   │   ├── cadquery_adapter.py
│   │   ├── openscad_adapter.py
│   │   ├── fusion360_adapter.py        # Phase 1.3
│   │   └── onshape_adapter.py          # Phase 1.3
│   ├── llm/
│   │   ├── gateway.py                  # LLMGateway
│   │   ├── providers/
│   │   │   ├── anthropic_provider.py
│   │   │   ├── openai_provider.py
│   │   │   ├── ollama_provider.py
│   │   │   └── llama_cpp_provider.py
│   │   ├── router.py
│   │   └── prompt_registry.py
│   ├── physics/
│   │   ├── oblique_shock.py
│   │   ├── method_of_characteristics.py
│   │   ├── isentropic_relations.py
│   │   ├── prandtl_meyer.py
│   │   ├── boundary_layer.py
│   │   └── nozzle_design.py
│   ├── knowledge/
│   │   ├── graph.py                    # AerospaceKnowledgeGraph
│   │   ├── vector_store.py
│   │   ├── rag_pipeline.py
│   │   └── ingestion/
│   │       ├── pdf_ingester.py
│   │       ├── nasa_ntr_ingester.py
│   │       └── aiaa_paper_ingester.py
│   ├── templates/
│   │   ├── geometry/                   # 47 YAML templates
│   │   └── freecad/                    # Python script templates
│   ├── validation/
│   │   ├── topology_validator.py
│   │   ├── physics_validator.py
│   │   ├── manufacturing_validator.py
│   │   └── confidence_scorer.py
│   ├── memory/
│   │   ├── session_memory.py
│   │   ├── episodic_memory.py
│   │   ├── skill_registry.py
│   │   └── compaction.py
│   ├── security/
│   │   ├── sandbox.py
│   │   ├── audit_logger.py
│   │   ├── ip_classifier.py
│   │   └── itar_checker.py
│   ├── exchange/
│   │   └── cep.py                      # CAD Exchange Protocol (→ Phase 2)
│   ├── cli/
│   │   └── main.py
│   └── config.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── aerospace_benchmarks/
├── skills/                             # Community + built-in skills
│   └── propulsion/
│       ├── cd_nozzle_rao.yaml
│       ├── scramjet_inlet_2ramp.yaml
│       └── ...
├── knowledge_base/                     # Pre-ingested domain knowledge
├── docs/
│   ├── PART1_CAD_AUTOMATION.md         # This document
│   ├── PART2_CFD_AUTOMATION.md
│   └── PART3_INTEGRATION_PLATFORM.md
├── pyproject.toml
├── README.md
└── .aeroforge/                         # User config (local)
    ├── llm_config.yaml
    ├── user_preferences.yaml
    └── audit.log
11.4 CAD Exchange Protocol (CEP) — Phase 1/2 Interface
The CEP is the clean boundary between Phase 1 (CAD) and Phase 2 (CFD). It is a structured package format that carries everything needed to begin CFD preparation without any knowledge of how the geometry was generated.

YAML

# CEP Manifest: cep_manifest.json (included in every CAD output package)

{
  "cep_version": "1.0",
  "aeroforge_version": "1.2.0",
  "package_id": "uuid",
  "created_at": "ISO8601",

  "geometry": {
    "primary_file": "inlet_v1.step",
    "formats_available": ["STEP", "IGES", "STL", "BREP"],
    "bounding_box_m": {"x": 1.2, "y": 0.35, "z": 0.28},
    "volume_m3": 0.0234,
    "surface_area_m2": 1.87,
    "topology": {
      "watertight": true,
      "n_faces": 847,
      "n_edges": 1243,
      "n_vertices": 623
    }
  },

  "design_intent": {
    "component_type": "scramjet_inlet",
    "mach_design_point": 5.5,
    "flow_regime": "hypersonic",
    "inlet_type": "mixed_compression",
    "symmetry": "planar"
  },

  "cfd_hints": {
    "recommended_solver": "rhoCentralFoam",
    "flow_type": "compressible_supersonic",
    "turbulence_model": "k_omega_SST",
    "wall_treatment": "low_Re_wall_functions",
    "fluid": "air_ideal_gas",
    "boundary_conditions": {
      "inlet": {"type": "supersonic_inlet", "mach": 5.5, "p_kpa": 1.2, "T_K": 220},
      "outlet": {"type": "supersonic_outlet"},
      "walls": {"type": "no_slip_adiabatic"}
    },
    "mesh_hints": {
      "target_y_plus": 1.0,
      "boundary_layer_thickness_estimate_m": 0.008,
      "shock_refinement_required": true,
      "estimated_cell_count": "2M-5M"
    }
  },

  "validation": {
    "confidence_score": 0.91,
    "all_stages_passed": true,
    "warnings": ["thin_wall_at_cowl_lip"],
    "design_report": "design_report.md"
  },

  "provenance": {
    "template_used": "scramjet_inlet_mixed_compression",
    "physics_computations": ["oblique_shock", "busemann_inlet_theory"],
    "llm_provider": "local/ollama",
    "model": "qwen2.5-coder:32b",
    "session_id": "session_2847"
  }
}
End of Part 1 — CAD Automation System



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
Parts             : 3 (Part 2 of 3 — CFD Automation System)
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
PART 3 — Integration, Platform & Future Architecture
Section 1: CAD↔CFD Seamless Integration Layer
1.1 Integration Philosophy
While Phase 1 (CAD) and Phase 2 (CFD) are architecturally independent and communicate via CEP, Phase 3 integration adds intelligent orchestration, optimization loops, and seamless user experience. The user should never need to manually transfer files or configure the Phase 1→Phase 2 handoff.

text

USER PERSPECTIVE (Full Integration):

"Design and validate a scramjet inlet for Mach 5.5 with
 total pressure recovery > 0.85"

Behind the scenes:
  ↓
[Integration Layer]
  ├─→ Phase 1: Generate geometry
  ├─→ Phase 2: Run CFD
  ├─→ Check: pt_recovery = 0.82 (below target)
  ├─→ Phase 1: Modify ramp angles
  ├─→ Phase 2: Re-run CFD
  ├─→ Check: pt_recovery = 0.86 (meets target) ✓
  └─→ Return: Optimized design + full provenance

User receives: CAD file + CFD results + design report
Total time: 45 minutes (3 design iterations)
Zero manual intervention required
1.2 Integration Architecture
text

┌─────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION ORCHESTRATOR                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              UNIFIED SESSION MANAGER                         │  │
│  │  Single session tracks full CAD→CFD→Optimization lifecycle   │  │
│  │  State machine: INIT → CAD → CEP_HANDOFF → CFD → EVAL       │  │
│  │                       ↑                              ↓         │  │
│  │                       └──────── ITERATE ←────────────┘         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CEP PIPELINE MANAGER                            │  │
│  │  Automated CEP package assembly, validation, versioning      │  │
│  │  Incremental CEP updates (geometry changed, re-use mesh cfg) │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              FEEDBACK TRANSLATOR                             │  │
│  │  CFD results → Actionable CAD modifications                  │  │
│  │  "Flow separation at throat" → "Increase throat area 8%"     │  │
│  │  "Shock impingement on cowl" → "Adjust cowl sweep +3°"       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              FIDELITY CONTROLLER                             │  │
│  │  Manages L0→L1→L2→L3 progression automatically              │  │
│  │  L0 (analytical) → filter 80% of design space               │  │
│  │  L1 (2D RANS) → filter to top 10 candidates                 │  │
│  │  L2 (3D coarse) → filter to top 3                           │  │
│  │  L3 (3D fine) → final validation                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CONVERGENCE ACCELERATOR                         │  │
│  │  Warm starts: Map previous converged CFD onto new geometry  │  │
│  │  Surrogate models: ML-based fast estimates between full runs │  │
│  │  Adaptive sampling: Focus compute on promising regions      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PROVENANCE TRACKER                              │  │
│  │  Full audit trail: Every design decision, every CFD run      │  │
│  │  Reproducibility: Re-run exact same pipeline months later    │  │
│  │  Compliance-ready: Export for FAA/EASA design documentation │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
1.3 Unified Session State Machine
Python

# /aeroforge/integration/session_manager.py

class IntegratedDesignSession:
    """
    Manages full lifecycle of an aerospace design problem
    from natural language intent to validated, optimized design.
    """

    class State(Enum):
        INITIALIZED = "initialized"
        PARSING_INTENT = "parsing_intent"
        GENERATING_CAD = "generating_cad"
        VALIDATING_CAD = "validating_cad"
        PREPARING_CFD = "preparing_cfd"
        MESHING = "meshing"
        RUNNING_CFD = "running_cfd"
        POST_PROCESSING = "post_processing"
        EVALUATING = "evaluating"
        MODIFYING = "modifying"
        CONVERGED = "converged"
        FAILED = "failed"

    async def run(self, user_intent: str, config: SessionConfig) -> DesignResult:
        """
        Full integrated pipeline.
        """
        self.state = State.INITIALIZED
        session = Session(intent=user_intent, config=config)

        try:
            # Phase 1: CAD Generation
            self.state = State.GENERATING_CAD
            cad_result = await self.cad_orchestrator.run(
                intent=await self._parse_intent(user_intent),
                session=session
            )

            # Iteration loop
            iteration = 0
            while iteration < config.max_iterations:
                iteration += 1
                
                # Phase 2: CFD Simulation
                self.state = State.PREPARING_CFD
                cfd_result = await self.cfd_orchestrator.run(
                    cep_package=cad_result.cep_package,
                    fidelity=self._select_fidelity(iteration, session),
                    session=session
                )

                # Evaluation
                self.state = State.EVALUATING
                evaluation = await self._evaluate_results(
                    cfd_result,
                    session.targets,
                    session
                )

                if evaluation.converged:
                    self.state = State.CONVERGED
                    return await self._package_final_result(
                        cad_result,
                        cfd_result,
                        evaluation,
                        session
                    )

                # Modification planning
                self.state = State.MODIFYING
                modification = await self._plan_modification(
                    evaluation,
                    session.history
                )

                # Re-trigger CAD with modifications
                cad_result = await self.cad_orchestrator.modify(
                    previous_result=cad_result,
                    modification=modification,
                    session=session
                )

            # Max iterations reached
            return await self._return_best_result(session)

        except Exception as e:
            self.state = State.FAILED
            await self._handle_failure(e, session)
            raise
1.4 Incremental CEP Updates
When only small geometry changes occur (e.g., ramp angle +1°), regenerating the entire mesh is wasteful. The CEP pipeline tracks what changed and enables incremental updates:

Python

# Incremental CEP strategy

CEP_UPDATE_STRATEGY = {

    "geometry_minor_param_change": {
        # Example: ramp angle 9° → 10°, cowl unchanged
        "trigger": "parameter change < 10%, topology unchanged",
        "action": "REUSE_MESH_WITH_DEFORMATION",
        "method": "mapFields from previous mesh + mesh morphing",
        "time_saved": "~80% (skip meshing, warm-start CFD)"
    },

    "geometry_moderate_change": {
        # Example: ramp angle 9° → 15°, possible topology change
        "trigger": "parameter change 10-30%",
        "action": "REMESH_WITH_SAME_STRATEGY",
        "method": "Re-run mesher, map IC from previous solution",
        "time_saved": "~50% (warm-start CFD only)"
    },

    "geometry_major_change": {
        # Example: 2-ramp → 3-ramp inlet (topology change)
        "trigger": "parameter change > 30% OR topology changed",
        "action": "FULL_REMESH_COLD_START",
        "method": "Full pipeline from scratch",
        "time_saved": "0% (but logged for learning)"
    },

    "cfd_config_only_change": {
        # Example: Increase Mach from 5.0 → 5.5, same geometry
        "trigger": "geometry unchanged, BC/IC values changed",
        "action": "REUSE_MESH_AND_CASE_STRUCTURE",
        "method": "Update BC files only, map previous solution",
        "time_saved": "~90% (skip CAD + meshing)"
    }
}
1.5 Feedback Translator
The Feedback Translator is a specialized LLM-driven agent that reads CFD diagnostics and translates them into actionable CAD modifications:

Python

# /aeroforge/integration/feedback_translator.py

class FeedbackTranslator:
    """
    Translates CFD physics observations into CAD design modifications.
    Uses aerospace domain knowledge graph + LLM reasoning.
    """

    TRANSLATION_RULES = {

        "flow_separation_detected": {
            "cfd_signature": "reversed flow region, separation bubble",
            "locations": ["inlet_throat", "diffuser", "duct_expansion"],
            "root_causes": [
                "adverse_pressure_gradient_too_steep",
                "boundary_layer_too_thick",
                "area_ratio_too_aggressive"
            ],
            "cad_actions": [
                {"param": "throat_area", "direction": "increase", "magnitude": "5-10%"},
                {"param": "diffuser_angle", "direction": "decrease", "magnitude": "2-4°"},
                {"add_feature": "boundary_layer_bleed", "location": "upstream_of_separation"}
            ]
        },

        "shock_induced_separation": {
            "cfd_signature": "lambda shock foot, reversed flow downstream",
            "locations": ["ramp_corners", "cowl_lip", "strut_junctions"],
            "cad_actions": [
                {"param": "leading_edge_bluntness", "direction": "increase"},
                {"add_feature": "boundary_layer_bleed", "location": "shock_impingement_zone"},
                {"param": "surface_curvature", "direction": "smoothen"}
            ]
        },

        "total_pressure_loss_excessive": {
            "cfd_signature": "pt_recovery < target by > 3%",
            "root_causes": [
                "shock_system_not_optimal",
                "viscous_losses_in_duct",
                "flow_spillage"
            ],
            "cad_actions": [
                {"param": "ramp_angles", "action": "recompute_oswatitsch_optimal"},
                {"param": "duct_length", "direction": "decrease", "reason": "reduce_viscous_loss"},
                {"param": "cowl_position", "action": "optimize_for_capture"}
            ]
        },

        "mass_capture_ratio_low": {
            "cfd_signature": "spillage at inlet cowl, ṁ_actual << ṁ_ideal",
            "cad_actions": [
                {"param": "cowl_height", "direction": "increase"},
                {"param": "inlet_capture_area", "direction": "increase"},
                {"param": "cowl_leading_edge_position", "action": "move_upstream"}
            ]
        },

        "thermal_limit_exceeded": {
            "cfd_signature": "T_wall > material limit",
            "locations": ["nose_cone", "cowl_leading_edge", "combustor_liner"],
            "cad_actions": [
                {"param": "leading_edge_radius", "direction": "increase"},
                {"add_feature": "active_cooling_channels"},
                {"material": "switch_to_higher_temp_alloy"}
            ]
        },

        "drag_coefficient_high": {
            "cfd_signature": "Cd > target, excessive wetted area or pressure drag",
            "cad_actions": [
                {"param": "cowl_thickness", "direction": "decrease"},
                {"param": "cowl_boat_tail_angle", "direction": "optimize"},
                {"surface": "apply_pressure_recovery_fairing"}
            ]
        }
    }

    async def translate(
        self,
        cfd_diagnostics: CFDDiagnostics,
        session: IntegratedDesignSession
    ) -> List[CADModification]:
        """
        Takes CFD diagnostics and returns structured CAD modifications.
        """
        modifications = []

        # Pattern matching against known issues
        for issue in cfd_diagnostics.detected_issues:
            if issue.pattern in self.TRANSLATION_RULES:
                rule = self.TRANSLATION_RULES[issue.pattern]
                
                # Apply rule-based actions
                for action in rule["cad_actions"]:
                    modifications.append(CADModification(**action))

        # LLM-augmented reasoning for complex/novel issues
        if cfd_diagnostics.has_novel_issues:
            llm_mods = await self._llm_assisted_translation(
                cfd_diagnostics,
                session
            )
            modifications.extend(llm_mods)

        # Validate modifications against design constraints
        validated = await self._validate_modifications(
            modifications,
            session.design_constraints
        )

        return validated
1.6 Multi-Fidelity Progression
The Integration Layer automatically manages fidelity progression to maximize efficiency:

text

MULTI-FIDELITY STRATEGY:

EXPLORATION PHASE (design space reduction)
  ├─ L0: Analytical screening (100s of designs in seconds)
  │  └─ Filter: Keep designs within 20% of analytical target
  │
  ├─ L1: 2D RANS (top 20 designs, ~5 min each, parallel)
  │  └─ Filter: Keep designs within 10% of target
  │
  └─ L2: 3D RANS coarse (top 5 designs, ~1 hr each)
     └─ Filter: Keep top 2 designs

REFINEMENT PHASE (high-fidelity validation)
  └─ L3: 3D RANS fine (2 designs, ~8 hr each)
     └─ Select: Best design based on full metrics

DECISION LOGIC:
  If design change is < 5% from previous iteration:
    → Skip L0/L1, go directly to same fidelity level as previous
  
  If design change is > 20%:
    → Drop back to L0, work up fidelity ladder

  If iteration > 5 and no improvement:
    → Escalate to L3 for accurate comparison

COST SAVINGS:
  Without multi-fidelity: 10 iterations × 8 hr = 80 hours
  With multi-fidelity:    (10×L1 + 3×L2 + 1×L3) = ~15 hours
  Speedup: 5.3×
Section 2: Multi-Objective Optimization Engine
2.1 Optimization Architecture
text

┌─────────────────────────────────────────────────────────────────────┐
│              MULTI-OBJECTIVE OPTIMIZATION ENGINE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              OPTIMIZATION ALGORITHMS                         │  │
│  │  ├── Gradient-Free                                           │  │
│  │  │   ├── Genetic Algorithm (NSGA-II, NSGA-III)              │  │
│  │  │   ├── Particle Swarm Optimization (PSO)                  │  │
│  │  │   ├── Bayesian Optimization (BoTorch)                    │  │
│  │  │   └── CMA-ES (Covariance Matrix Adaptation)              │  │
│  │  │                                                           │  │
│  │  ├── Gradient-Based (requires adjoint CFD)                  │  │
│  │  │   ├── Steepest Descent                                   │  │
│  │  │   ├── Conjugate Gradient                                 │  │
│  │  │   └── Sequential Quadratic Programming (SQP)             │  │
│  │  │                                                           │  │
│  │  └── Hybrid                                                  │  │
│  │      └── GA for exploration + gradient for refinement       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              SURROGATE MODEL LAYER                           │  │
│  │  Reduces expensive CFD evaluations via ML surrogates         │  │
│  │  ├── Gaussian Process Regression (Kriging)                   │  │
│  │  ├── Neural Networks (trained on CFD database)               │  │
│  │  ├── Polynomial Response Surfaces                            │  │
│  │  └── Adaptive sampling (uncertainty-driven CFD selection)    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              DESIGN SPACE MAPPER                             │  │
│  │  ├── Parameter bounds enforcement                            │  │
│  │  ├── Constraint satisfaction (physics + manufacturing)       │  │
│  │  ├── Design of Experiments (DoE) for initial sampling        │  │
│  │  └── Latin Hypercube Sampling (LHS)                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PARETO FRONT MANAGER                            │  │
│  │  Tracks all non-dominated solutions across iterations        │  │
│  │  ├── Hypervolume indicator (convergence metric)              │  │
│  │  ├── Crowding distance for diversity maintenance            │  │
│  │  └── Interactive visualization (live 2D/3D Pareto plots)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
2.2 Example: Scramjet Inlet Multi-Objective Optimization
Python

# /aeroforge/optimization/multi_objective.py

class MultiObjectiveOptimizer:
    """
    Multi-objective design optimization for aerospace components.
    """

    async def optimize_scramjet_inlet(
        self,
        config: OptimizationConfig
    ) -> ParetoFront:
        """
        Example: Optimize scramjet inlet for:
        OBJECTIVE 1: Maximize total_pressure_recovery
        OBJECTIVE 2: Minimize cowl_drag_coefficient
        OBJECTIVE 3: Minimize inlet_length (weight/packaging)

        CONSTRAINTS:
        - mass_capture_ratio ≥ 0.95
        - max_wall_temperature ≤ material_limit
        - manufacturing feasibility score ≥ 0.8

        DESIGN VARIABLES:
        - ramp1_angle_deg: [6.0, 12.0]
        - ramp2_angle_deg: [10.0, 20.0]
        - cowl_position_m: [0.2, 0.6]
        - cowl_sweep_deg: [30.0, 50.0]
        - throat_height_m: [0.04, 0.12]
        - duct_length_m: [0.3, 0.9]
        """

        # Define problem
        problem = OptimizationProblem(
            name="scramjet_inlet_mach55",
            design_variables=[
                DesignVariable("ramp1_angle_deg", bounds=[6.0, 12.0]),
                DesignVariable("ramp2_angle_deg", bounds=[10.0, 20.0]),
                DesignVariable("cowl_position_m", bounds=[0.2, 0.6]),
                DesignVariable("cowl_sweep_deg", bounds=[30.0, 50.0]),
                DesignVariable("throat_height_m", bounds=[0.04, 0.12]),
                DesignVariable("duct_length_m", bounds=[0.3, 0.9]),
            ],
            objectives=[
                Objective("total_pressure_recovery", direction="maximize"),
                Objective("cowl_drag_coefficient", direction="minimize"),
                Objective("inlet_length_m", direction="minimize"),
            ],
            constraints=[
                Constraint("mass_capture_ratio", operator=">=", value=0.95),
                Constraint("max_wall_temperature_K", operator="<=", value=450),
                Constraint("manufacturing_feasibility", operator=">=", value=0.8),
            ]
        )

        # Select optimizer
        optimizer = NSGAIII(
            problem=problem,
            population_size=48,
            n_generations=20,
            crossover_prob=0.9,
            mutation_prob=0.1
        )

        # Build surrogate model (if enabled)
        if config.use_surrogate:
            surrogate = await self._train_initial_surrogate(problem)
            optimizer.set_surrogate(surrogate)

        # Run optimization loop
        generation = 0
        while generation < optimizer.n_generations:
            generation += 1

            # Generate candidate designs
            candidates = optimizer.generate_candidates()

            # Evaluate via integrated CAD→CFD pipeline
            results = await self._evaluate_candidates_parallel(
                candidates,
                problem,
                config
            )

            # Update optimizer with results
            optimizer.tell(results)

            # Update Pareto front
            pareto_front = optimizer.get_pareto_front()
            
            # Log progress
            await self._log_optimization_progress(
                generation,
                pareto_front,
                optimizer.hypervolume()
            )

            # Update surrogate model with new data
            if config.use_surrogate and generation % 5 == 0:
                await self._retrain_surrogate(surrogate, optimizer.all_evaluations)

        # Return final Pareto front
        return pareto_front
2.3 Surrogate Model Acceleration
For expensive CFD evaluations (L3 runs taking 8+ hours), surrogate models provide orders-of-magnitude speedup:

Python

SURROGATE MODEL STRATEGY:

INITIAL TRAINING:
  ├─ Generate 50-100 high-fidelity CFD samples via DoE (Latin Hypercube)
  ├─ Train Gaussian Process Regression model
  ├─ Validate: R² > 0.9 on hold-out set
  └─ Deploy for optimization loop

OPTIMIZATION LOOP WITH SURROGATES:
  ├─ Optimizer proposes 48 designs
  ├─ Evaluate all 48 via surrogate (< 1 second total)
  ├─ Select top 5 designs by predicted performance + uncertainty
  ├─ Evaluate top 5 via high-fidelity CFD (~8 hours, parallel)
  ├─ Update surrogate with 5 new high-fidelity samples
  └─ Repeat

SURROGATE ACCURACY MONITORING:
  ├─ Track prediction error on each CFD evaluation
  ├─ If error > 5% for 3 consecutive evals:
  │   └─ Retrain surrogate with all accumulated data
  ├─ If error > 10%:
  │   └─ Increase CFD sampling rate (select top 10 instead of 5)

COST COMPARISON (20 generations, 48 population):
  Without surrogate:
    960 CFD evals × 8 hr = 7,680 hours = 320 days (serial)
    With 48 cores parallel: 160 hours = 6.7 days

  With surrogate:
    100 initial DoE + (20 × 5 new samples) = 200 CFD evals
    200 × 8 hr = 1,600 hours = 66 hours (parallel)
    Speedup: 2.4× vs parallel, 116× vs serial
2.4 Adjoint-Based Optimization (SU2 Integration)
For gradient-based optimization, adjoint sensitivities provide exact gradients at the cost of ~2× the forward CFD solve:

Python

# /aeroforge/optimization/adjoint_optimizer.py

class AdjointOptimizer:
    """
    Gradient-based optimization using adjoint CFD sensitivities.
    Requires SU2 solver (native adjoint support).
    """

    async def optimize_with_adjoint(
        self,
        problem: OptimizationProblem
    ) -> OptimizationResult:
        """
        Gradient-based optimization leveraging SU2 continuous adjoint.

        Example: Airfoil drag minimization
        OBJECTIVE: Minimize Cd
        CONSTRAINT: Cl = 0.5 (lift constraint)
        DESIGN VARIABLES: 20 Hicks-Henne bump functions (shape)
        """

        # Initial design
        x = problem.initial_design_vector

        iteration = 0
        while iteration < problem.max_iterations:
            iteration += 1

            # Forward CFD solve
            cfd_result = await self.su2_adapter.run_forward(
                design_vector=x,
                problem=problem
            )

            # Check convergence
            if await self._check_convergence(cfd_result, iteration):
                return OptimizationResult(
                    final_design=x,
                    final_objective=cfd_result.objective_value,
                    iterations=iteration,
                    converged=True
                )

            # Adjoint solve (computes exact gradients ∂J/∂x)
            sensitivities = await self.su2_adapter.run_adjoint(
                cfd_result=cfd_result,
                problem=problem
            )

            # Gradient-based update (steepest descent / BFGS / SQP)
            x_new = await self._gradient_step(
                x,
                sensitivities,
                problem,
                iteration
            )

            x = x_new

        return OptimizationResult(
            final_design=x,
            final_objective=cfd_result.objective_value,
            iterations=iteration,
            converged=False
        )
Section 3: Web Platform & User Interface
3.1 Web Platform Architecture
text

┌─────────────────────────────────────────────────────────────────────┐
│                    AEROFORGE WEB PLATFORM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FRONTEND (React + TypeScript + Three.js)                          │
│  ├── Natural Language Design Interface                              │
│  ├── 3D Geometry Viewer (CAD preview, rotation, inspection)        │
│  ├── Live CFD Monitoring Dashboard (residuals, convergence)        │
│  ├── Interactive Pareto Front Explorer (multi-objective results)    │
│  ├── Design History & Comparison                                    │
│  ├── Parameter Tuning Interface (sliders, real-time preview)       │
│  └── Report Generator & Export                                      │
│                                                                     │
│  ──────────────────────────────────────────────────────────────────│
│                                                                     │
│  BACKEND (FastAPI + Python 3.11+)                                  │
│  ├── REST API (async endpoints for all operations)                 │
│  ├── WebSocket server (live simulation updates)                    │
│  ├── Session manager (user sessions, auth, state)                  │
│  ├── Job queue (Celery + Redis for async task management)          │
│  ├── File storage (S3-compatible for CAD/CFD artifacts)            │
│  └── PostgreSQL (session/user/job metadata)                        │
│                                                                     │
│  ──────────────────────────────────────────────────────────────────│
│                                                                     │
│  VISUALIZATION ENGINE                                               │
│  ├── ParaView Web (server-side rendering, WebGL streaming)         │
│  ├── VTK.js (client-side rendering for lightweight views)          │
│  ├── Plotly.js (residual plots, convergence curves)                │
│  └── Three.js (CAD geometry preview, STL rendering)                │
└─────────────────────────────────────────────────────────────────────┘
3.2 Natural Language Design Interface
text

┌─────────────────────────────────────────────────────────────────────┐
│  AeroForge AI — Design Interface                              [≡]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  What would you like to design?                              │  │
│  │                                                              │  │
│  │  [Design a supersonic inlet for Mach 3 cruise with          ]│  │
│  │  [total pressure recovery above 0.9 and minimize drag.      ]│  │
│  │  [Use titanium and make it manufacturable with 3-axis CNC.  ]│  │
│  │                                                        [Send] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ✓ Understood. I'll design a 2-ramp external compression    │  │
│  │    inlet for Mach 3.0 with the following targets:           │  │
│  │                                                              │  │
│  │    • Total pressure recovery: ≥ 0.90                         │  │
│  │    • Additive drag: minimize                                 │  │
│  │    • Material: Ti-6Al-4V (max temp 450K)                     │  │
│  │    • Manufacturing: 3-axis CNC compatible                    │  │
│  │                                                              │  │
│  │  Starting Phase 1 (CAD Generation)...              [View ⋮] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PIPELINE STATUS                                   Iter 1/10 │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%           │  │
│  │                                                              │  │
│  │  ✓ CAD generation complete (12s)                             │  │
│  │  ✓ Geometry validation passed (confidence: 0.91)             │  │
│  │  ⟳ Meshing in progress (Gmsh, target: 1.2M cells)  [Live]   │  │
│  │    └─ Boundary layer: 18 layers, y+ ≈ 1.2                   │  │
│  │  ⏳ CFD pending (estimated: 45 min)                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────┬────────────────────────┐  │
│  │  3D PREVIEW               [rotate] │  PARAMETERS             │  │
│  │                                     │                         │  │
│  │  [Three.js viewport showing inlet] │  Ramp 1 angle: 8.2°     │  │
│  │                                     │  Ramp 2 angle: 14.7°    │  │
│  │  [Wireframe / Solid / Both]        │  Cowl sweep: 38°        │  │
│  │                                     │  Throat area: 0.028 m²  │  │
│  │  [Download STEP] [Download IGES]  │  Contraction: 5.1       │  │
│  └─────────────────────────────────────┴────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
3.3 Live CFD Monitoring Dashboard
text

┌─────────────────────────────────────────────────────────────────────┐
│  CFD Simulation Monitor — Iteration 1                         [◫]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CONVERGENCE STATUS                            Running: 28min│  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 67% (1891 / 2847 iter)│  │
│  │                                                              │  │
│  │  Solver: rhoCentralFoam | Cores: 32 | CFL: 3.5              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  RESIDUALS (log scale)                      [linear / log]   │  │
│  │   1e+0 ┤                                                      │  │
│  │   1e-1 ┤╮                                                     │  │
│  │   1e-2 ┤ ╰╮                                                   │  │
│  │   1e-3 ┤   ╰─╮   ╭─U                                         │  │
│  │   1e-4 ┤     ╰──╯                                            │  │
│  │   1e-5 ┤         ╰─╮  ╭─p                                    │  │
│  │   1e-6 ┤           ╰──╯                                      │  │
│  │   1e-7 ┤                  ╭─k, omega                         │  │
│  │        └────────────────────────────────────────────────      │  │
│  │         0       500      1000     1500     2000              │  │
│  │                      Iterations                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LIVE METRICS                                 Last 100 iters │  │
│  │  • Total pressure recovery:  0.847  (target: ≥ 0.90) ⚠      │  │
│  │  • Mass capture ratio:       0.982  (target: ≥ 0.95) ✓      │  │
│  │  • Max wall temperature:     387 K  (limit:    450 K) ✓     │  │
│  │  • Mass flow rate:          11.94 kg/s (target: 12.0) ✓     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  AGENT STATUS                                                │  │
│  │  ✓ Monitoring Agent: Active, no issues detected              │  │
│  │  ✓ Convergence trend: Normal, residuals decreasing steadily  │  │
│  │  ⚠ Target watch: pt_recovery 3.4% below target              │  │
│  │    └─ Action: Will suggest ramp angle increase after run     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Pause] [Stop & Accept Current] [Stop & Revert]    [Full Report] │
└─────────────────────────────────────────────────────────────────────┘
3.4 Interactive Pareto Front Explorer
For multi-objective optimizations, the Pareto Front Explorer allows users to interactively explore trade-offs:

text

┌─────────────────────────────────────────────────────────────────────┐
│  Pareto Front Explorer — Scramjet Inlet Optimization          [◫]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  3D PARETO FRONT (45 non-dominated designs)    [rotate 3D]   │  │
│  │                                                              │  │
│  │          pt_recovery                                         │  │
│  │              ▲                                               │  │
│  │          0.90│    ●                                          │  │
│  │              │  ● ●●                                         │  │
│  │          0.88│ ●● ● ●                                        │  │
│  │              │●  ●●  ●                                       │  │
│  │          0.86│ ●  ● ●                                        │  │
│  │              │  ●  ●                                         │  │
│  │          0.84└─────────────────────▶ cowl_drag_coeff        │  │
│  │                 0.008  0.010  0.012                          │  │
│  │                     inlet_length_m (color scale)             │  │
│  │                                                              │  │
│  │  [Filter: Show only manufacturing_feasibility > 0.9] ✓      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SELECTED DESIGN: Design #23 (click point to select)        │  │
│  │                                                              │  │
│  │  Objectives:                      Design Variables:          │  │
│  │  • pt_recovery:     0.876         • ramp1_angle:    9.2°     │  │
│  │  • cowl_drag_coeff: 0.0091        • ramp2_angle:   15.1°     │  │
│  │  • inlet_length:    0.52 m        • cowl_position:  0.38 m   │  │
│  │                                   • cowl_sweep:    36.5°     │  │
│  │  Constraints:                     • throat_height:  0.067 m  │  │
│  │  • mass_capture:    0.972  ✓      • duct_length:    0.41 m  │  │
│  │  • max_temp:        412 K  ✓                                 │  │
│  │  • mfg_feasible:    0.94   ✓                                 │  │
│  │                                                              │  │
│  │  [View CAD] [View CFD Results] [Compare to Others] [Export] │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TRADE-OFF ANALYSIS                                          │  │
│  │                                                              │  │
│  │  To gain 1% pt_recovery (0.876 → 0.886):                    │  │
│  │    Cost: +12% cowl drag, +8 cm inlet length                 │  │
│  │    Designs available: 7 candidates on Pareto front          │  │
│  │                                                              │  │
│  │  [Explain Trade-offs with AI]                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Export All Designs CSV] [Download Pareto Front Plot] [New Run]  │
└─────────────────────────────────────────────────────────────────────┘
Section 4: REST API & SDK
4.1 REST API Architecture
Python

# FastAPI-based REST API
# /aeroforge/api/main.py

from fastapi import FastAPI, WebSocket, BackgroundTasks
from aeroforge import AeroForgeCore

app = FastAPI(
    title="AeroForge AI API",
    version="2.0.0",
    description="AI-Native Aerospace Design & Simulation Platform"
)

# ============================================================================
# DESIGN ENDPOINTS
# ============================================================================

@app.post("/api/v1/design/create")
async def create_design(
    intent: str,
    config: Optional[DesignConfig] = None,
    background_tasks: BackgroundTasks = None
) -> DesignSessionResponse:
    """
    Create a new design from natural language intent.
    
    Example:
        POST /api/v1/design/create
        {
          "intent": "Design a scramjet inlet for Mach 5.5",
          "config": {
            "max_iterations": 10,
            "autonomy_level": "supervised",
            "target_metrics": {
              "total_pressure_recovery": {"value": 0.85, "operator": "gte"}
            }
          }
        }
    
    Returns:
        {
          "session_id": "uuid",
          "status": "initialized",
          "estimated_time_minutes": 45
        }
    """
    session = await aeroforge.create_design_session(intent, config)
    background_tasks.add_task(aeroforge.run_session, session)
    return session.to_response()

@app.get("/api/v1/design/{session_id}/status")
async def get_design_status(session_id: str) -> SessionStatus:
    """Real-time session status."""
    return await aeroforge.get_session_status(session_id)

@app.get("/api/v1/design/{session_id}/results")
async def get_design_results(session_id: str) -> DesignResults:
    """Retrieve final results (once converged)."""
    return await aeroforge.get_session_results(session_id)

@app.post("/api/v1/design/{session_id}/iterate")
async def manual_iterate(
    session_id: str,
    modification: DesignModification
) -> IterationResponse:
    """Manually trigger an iteration with specific modifications."""
    return await aeroforge.iterate_session(session_id, modification)

@app.post("/api/v1/design/{session_id}/stop")
async def stop_design(session_id: str) -> StopResponse:
    """Stop running design session."""
    return await aeroforge.stop_session(session_id)

# ============================================================================
# CFD ENDPOINTS
# ============================================================================

@app.post("/api/v1/cfd/submit")
async def submit_cfd(
    cep_package: UploadFile,
    config: CFDConfig
) -> CFDJobResponse:
    """Submit a CFD job from CEP package."""
    job = await aeroforge.cfd.submit_job(cep_package, config)
    return job.to_response()

@app.get("/api/v1/cfd/{job_id}/monitor")
async def monitor_cfd(job_id: str) -> CFDStatus:
    """Get current CFD job status + residuals."""
    return await aeroforge.cfd.get_job_status(job_id)

@app.websocket("/api/v1/cfd/{job_id}/stream")
async def stream_cfd(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for live residual streaming."""
    await websocket.accept()
    async for update in aeroforge.cfd.stream_updates(job_id):
        await websocket.send_json(update)

# ============================================================================
# OPTIMIZATION ENDPOINTS
# ============================================================================

@app.post("/api/v1/optimize/multi-objective")
async def optimize_multi_objective(
    problem: OptimizationProblem
) -> OptimizationJobResponse:
    """Start multi-objective optimization."""
    job = await aeroforge.optimizer.start_optimization(problem)
    return job.to_response()

@app.get("/api/v1/optimize/{job_id}/pareto-front")
async def get_pareto_front(job_id: str) -> ParetoFrontResponse:
    """Get current Pareto front."""
    return await aeroforge.optimizer.get_pareto_front(job_id)

# ============================================================================
# KNOWLEDGE GRAPH ENDPOINTS
# ============================================================================

@app.get("/api/v1/knowledge/search")
async def search_knowledge(
    query: str,
    top_k: int = 10
) -> KnowledgeSearchResults:
    """Search aerospace knowledge graph."""
    return await aeroforge.knowledge.search(query, top_k)

@app.post("/api/v1/knowledge/add-document")
async def add_document(
    document: UploadFile,
    metadata: DocumentMetadata
) -> IngestResponse:
    """Add document to knowledge graph."""
    return await aeroforge.knowledge.ingest_document(document, metadata)
4.2 Python SDK
Python

# aeroforge-sdk — Python client library

from aeroforge import AeroForgeClient

# Initialize client
client = AeroForgeClient(
    api_key="your_api_key",
    endpoint="https://api.aeroforge.ai/v1",
    # Or local deployment:
    # endpoint="http://localhost:8000/v1"
)

# =============================================================================
# EXAMPLE 1: Simple design request
# =============================================================================

session = client.design.create(
    intent="Design a NACA 2412 airfoil with 2m chord and 5m span",
    max_iterations=5,
    autonomy_level="supervised"
)

print(f"Session ID: {session.id}")
print(f"Estimated time: {session.estimated_time_minutes} min")

# Wait for completion (blocking)
result = session.wait_for_completion(poll_interval=10)

print(f"Design converged in {result.iterations} iterations")
print(f"Final CL: {result.metrics['lift_coefficient']}")
print(f"Final CD: {result.metrics['drag_coefficient']}")

# Download CAD file
session.download_cad("airfoil.step")

# =============================================================================
# EXAMPLE 2: Streaming progress
# =============================================================================

session = client.design.create(
    intent="Optimize scramjet inlet for Mach 5.5, pt_recovery > 0.85"
)

# Stream progress updates
for update in session.stream_progress():
    if update.phase == "cad_generation":
        print(f"CAD: {update.message}")
    elif update.phase == "cfd_simulation":
        print(f"CFD iteration {update.iteration}: residuals = {update.residuals}")
    elif update.phase == "converged":
        print(f"Converged! pt_recovery = {update.metrics['total_pressure_recovery']}")
        break

# =============================================================================
# EXAMPLE 3: Multi-objective optimization
# =============================================================================

opt_job = client.optimize.multi_objective(
    design_type="scramjet_inlet",
    objectives=[
        {"metric": "total_pressure_recovery", "direction": "maximize"},
        {"metric": "cowl_drag_coefficient", "direction": "minimize"},
    ],
    design_variables={
        "ramp1_angle_deg": (6.0, 12.0),
        "ramp2_angle_deg": (10.0, 20.0),
        "cowl_sweep_deg": (30.0, 50.0),
    },
    constraints=[
        {"metric": "mass_capture_ratio", "operator": ">=", "value": 0.95}
    ],
    algorithm="NSGA-III",
    population_size=48,
    n_generations=20
)

# Wait for Pareto front
pareto = opt_job.wait_for_pareto_front()

print(f"Found {len(pareto.designs)} non-dominated designs")

# Explore trade-offs
for design in pareto.designs[:5]:
    print(f"Design {design.id}:")
    print(f"  pt_recovery = {design.objectives['total_pressure_recovery']}")
    print(f"  cowl_drag = {design.objectives['cowl_drag_coefficient']}")

# Select a design
best = pareto.select_by_preference(
    weights={"total_pressure_recovery": 0.7, "cowl_drag_coefficient": 0.3}
)

best.download_cad("optimal_inlet.step")
best.download_cfd_results("optimal_inlet_cfd.vtk")

# =============================================================================
# EXAMPLE 4: Direct CFD submission (CEP package)
# =============================================================================

cfd_job = client.cfd.submit(
    cep_package="inlet_v3.cep.zip",
    solver="rhoCentralFoam",
    fidelity="L3",
    n_cores=64,
    compute_target="slurm"
)

# Stream residuals via WebSocket
for residual_update in cfd_job.stream_residuals():
    print(f"Iter {residual_update.iteration}: U={residual_update.U}, p={residual_update.p}")

result = cfd_job.get_results()
print(f"pt_recovery = {result.quantities['total_pressure_recovery']}")
Section 5: HPC & Cloud Deployment Architecture
5.1 Deployment Modes
text

┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MODE 1: LOCAL WORKSTATION                                          │
│  ├── Target: Individual engineers, prototyping                      │
│  ├── Requirements: Linux/macOS, 32GB RAM, NVIDIA GPU (optional)     │
│  ├── Install: pip install aeroforge-full                            │
│  ├── Components: All-in-one (CAD + CFD + LLM via Ollama)            │
│  └── Capacity: Small to medium cases (< 5M cells)                   │
│                                                                     │
│  MODE 2: DEPARTMENTAL SERVER                                        │
│  ├── Target: Small teams (5-15 engineers)                           │
│  ├── Requirements: Linux server, 128GB RAM, 32+ cores               │
│  ├── Architecture: Docker Compose stack                             │
│  ├── Components: Web UI + API + PostgreSQL + Redis + Workers       │
│  └── Capacity: Medium cases, shared queue (10M cells, 5 concurrent) │
│                                                                     │
│  MODE 3: ON-PREMISE HPC CLUSTER                                     │
│  ├── Target: Large organizations, classified work (ITAR)            │
│  ├── Requirements: SLURM/PBS cluster, shared filesystem            │
│  ├── Architecture: K8s for web tier, SLURM for compute             │
│  ├── Components: Distributed (web nodes + compute nodes)            │
│  └── Capacity: Large-scale (100M+ cells, 1000s cores, 100s jobs)   │
│                                                                     │
│  MODE 4: HYBRID CLOUD                                               │
│  ├── Target: Burst compute for peak demand                          │
│  ├── Requirements: AWS/Azure/GCP account                            │
│  ├── Architecture: On-prem control plane + cloud compute           │
│  ├── Components: Web/DB on-prem, CFD jobs on cloud HPC             │
│  └── Capacity: Elastic (scale to 10,000s cores on demand)          │
│                                                                     │
│  MODE 5: FULLY CLOUD-NATIVE (SaaS)                                  │
│  ├── Target: Organizations without HPC infrastructure               │
│  ├── Deployment: Managed AeroForge Cloud (https://aeroforge.ai)    │
│  ├── Architecture: Multi-tenant K8s + serverless compute            │
│  └── Capacity: Unlimited (managed auto-scaling)                     │
└─────────────────────────────────────────────────────────────────────┘
5.2 Containerization & Orchestration
YAML

# docker-compose.yml — Departmental Server Deployment

version: '3.8'

services:
  # ===========================================================================
  # WEB UI + API
  # ===========================================================================
  aeroforge-web:
    image: aeroforge/web:2.0.0
    ports:
      - "80:80"
      - "443:443"
    environment:
      - API_ENDPOINT=http://aeroforge-api:8000
      - WS_ENDPOINT=ws://aeroforge-api:8000/ws
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - aeroforge-api

  aeroforge-api:
    image: aeroforge/api:2.0.0
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://aeroforge:${DB_PASSWORD}@postgres:5432/aeroforge
      - REDIS_URL=redis://redis:6379/0
      - LLM_PROVIDER=ollama
      - OLLAMA_ENDPOINT=http://ollama:11434
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - S3_SECRET_KEY=${MINIO_SECRET_KEY}
    volumes:
      - ./config/aeroforge.yaml:/app/config.yaml
      - ./knowledge:/app/knowledge
    depends_on:
      - postgres
      - redis
      - ollama
      - minio

  # ===========================================================================
  # TASK QUEUE
  # ===========================================================================
  celery-worker:
    image: aeroforge/worker:2.0.0
    command: celery -A aeroforge.tasks worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=postgresql://aeroforge:${DB_PASSWORD}@postgres:5432/aeroforge
      - REDIS_URL=redis://redis:6379/0
      - COMPUTE_MODE=local
      - N_CORES=32
    volumes:
      - /scratch/aeroforge:/scratch
      - ./freecad:/opt/freecad
      - ./openfoam:/opt/openfoam
    depends_on:
      - redis
      - postgres

  celery-beat:
    image: aeroforge/worker:2.0.0
    command: celery -A aeroforge.tasks beat --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

  # ===========================================================================
  # DEPENDENCIES
  # ===========================================================================
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=aeroforge
      - POSTGRES_USER=aeroforge
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    volumes:
      - minio-data:/data

  # ===========================================================================
  # MONITORING (Optional)
  # ===========================================================================
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana-dashboards:/etc/grafana/provisioning/dashboards

volumes:
  postgres-data:
  redis-data:
  ollama-models:
  minio-data:
  prometheus-data:
  grafana-data:
5.3 Kubernetes Deployment (Production HPC)
YAML

# k8s/aeroforge-deployment.yaml — Enterprise HPC Deployment

apiVersion: v1
kind: Namespace
metadata:
  name: aeroforge

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: aeroforge-api
  namespace: aeroforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aeroforge-api
  template:
    metadata:
      labels:
        app: aeroforge-api
    spec:
      containers:
      - name: api
        image: aeroforge/api:2.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aeroforge-secrets
              key: database-url
        - name: REDIS_URL
          value: redis://aeroforge-redis:6379/0
        - name: COMPUTE_MODE
          value: slurm
        - name: SLURM_PARTITION
          value: compute
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"

---

apiVersion: v1
kind: Service
metadata:
  name: aeroforge-api
  namespace: aeroforge
spec:
  selector:
    app: aeroforge-api
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: LoadBalancer

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: aeroforge-worker
  namespace: aeroforge
spec:
  replicas: 10
  selector:
    matchLabels:
      app: aeroforge-worker
  template:
    metadata:
      labels:
        app: aeroforge-worker
    spec:
      containers:
      - name: worker
        image: aeroforge/worker:2.0.0
        command: ["celery", "-A", "aeroforge.tasks", "worker", "--concurrency=1"]
        env:
        - name: REDIS_URL
          value: redis://aeroforge-redis:6379/0
        - name: COMPUTE_MODE
          value: slurm
        volumeMounts:
        - name: scratch
          mountPath: /scratch
        - name: slurm-config
          mountPath: /etc/slurm
      volumes:
      - name: scratch
        persistentVolumeClaim:
          claimName: aeroforge-scratch-pvc
      - name: slurm-config
        configMap:
          name: slurm-config
5.4 Cloud Deployment (AWS Example)
YAML

# AWS Architecture for AeroForge

REGION: us-east-1

COMPUTE TIER:
  ├── AWS Batch
  │   ├── Compute Environment: aeroforge-cfd-compute
  │   ├── Instance Types: c6i.32xlarge (128 vCPU), hpc6a.48xlarge (96 vCPU)
  │   ├── Max vCPUs: 10,000 (auto-scaling)
  │   ├── Spot instances: Enabled (70% cost savings)
  │   └── Container: aeroforge/cfd-solver:2.0.0 (ECR)
  │
  └── ParallelCluster (Alternative)
      ├── Head node: c6i.2xlarge
      ├── Compute nodes: c6i.32xlarge × N (dynamic)
      ├── Scheduler: SLURM
      └── Storage: FSx for Lustre (scratch, high IOPS)

WEB TIER:
  ├── ECS Fargate (serverless containers)
  │   ├── aeroforge-api: 3 tasks (auto-scale to 20)
  │   ├── aeroforge-web: 2 tasks
  │   └── Load Balancer: ALB with HTTPS (ACM certificate)
  │
  └── Lambda Functions (serverless)
      ├── CEP validator
      ├── Result post-processor
      └── Notification handler

DATA TIER:
  ├── RDS PostgreSQL (Multi-AZ, 16 vCPU, 64GB RAM)
  ├── ElastiCache Redis (cache.r6g.xlarge)
  ├── S3 Buckets:
  │   ├── aeroforge-cad-artifacts (versioned)
  │   ├── aeroforge-cfd-results (lifecycle: 90 days)
  │   └── aeroforge-knowledge-base (static)
  └── EFS (shared filesystem for workers)

MONITORING:
  ├── CloudWatch Logs (all services)
  ├── CloudWatch Metrics (custom + default)
  ├── X-Ray (distributed tracing)
  └── SNS (alerts)

SECURITY:
  ├── VPC: Private subnets for compute, public for web
  ├── Security Groups: Strict ingress rules
  ├── IAM Roles: Least-privilege per service
  ├── KMS: Encryption at rest for S3, RDS, EFS
  └── Secrets Manager: API keys, DB credentials

ESTIMATED MONTHLY COST (moderate usage):
  ├── Compute (Batch): $800 (100 hrs/month × $8/hr, spot pricing)
  ├── Web Tier (ECS): $200
  ├── RDS: $300
  ├── Storage (S3 + EFS): $150
  ├── Data transfer: $100
  └── Total: ~$1,550/month + pay-per-use compute
Section 6: Compliance & Certification Framework
6.1 Regulatory Landscape
text

┌─────────────────────────────────────────────────────────────────────┐
│              AEROSPACE COMPLIANCE DOMAINS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  EXPORT CONTROL (U.S.)                                              │
│  ├── ITAR (International Traffic in Arms Regulations)               │
│  │   ├── Governed by: U.S. State Department                         │
│  │   ├── Covers: Military aircraft, propulsion systems, missiles    │
│  │   ├── Restriction: Export of technical data to foreign nationals │
│  │   └── AeroForge Impact: Design data for military propulsion      │
│  │                                                                  │
│  ├── EAR (Export Administration Regulations)                        │
│  │   ├── Governed by: U.S. Commerce Department                      │
│  │   ├── Covers: Dual-use technologies (commercial + military use)  │
│  │   ├── ECCN Classification: Required for export                   │
│  │   └── AeroForge Impact: Software classification (5D002?)         │
│                                                                     │
│  AIRWORTHINESS CERTIFICATION                                        │
│  ├── FAA (U.S. Federal Aviation Administration)                     │
│  │   ├── Part 23: Normal category aircraft                          │
│  │   ├── Part 25: Transport category aircraft                       │
│  │   ├── Part 33: Aircraft engines                                  │
│  │   └── Requirement: Design substantiation + traceability          │
│  │                                                                  │
│  ├── EASA (European Union Aviation Safety Agency)                   │
│  │   ├── CS-23, CS-25, CS-E (equivalents to FAA)                   │
│  │   └── Mutual recognition with FAA (bilateral agreements)         │
│                                                                     │
│  SOFTWARE CERTIFICATION                                             │
│  ├── DO-178C (Software for Airborne Systems)                        │
│  │   ├── Level A: Catastrophic failure → most stringent            │
│  │   ├── Level D: Minor failure → least stringent                  │
│  │   └── AeroForge Classification: Level C or D (design tool, not   │
│  │       flight-critical software)                                  │
│  │                                                                  │
│  └── DO-330 (Tool Qualification)                                    │
│      ├── Question: Is AeroForge a "development tool"?               │
│      ├── If tool output directly used in certification: YES         │
│      └── Mitigation: Human review + independent verification        │
│                                                                     │
│  DATA RESIDENCY & PRIVACY                                           │
│  ├── GDPR (EU): Personal data protection                            │
│  ├── CCPA (California): Consumer privacy                            │
│  └── Government cloud requirements (FedRAMP, IL5, etc.)             │
└─────────────────────────────────────────────────────────────────────┘
6.2 ITAR/EAR Compliance Module
Python

# /aeroforge/compliance/export_control.py

class ExportControlClassifier:
    """
    Automatically classifies designs under ITAR/EAR regulations.
    Flags designs requiring export control review.
    """

    # USML (U.S. Munitions List) Category VIII: Aircraft and Related Articles
    ITAR_TRIGGERS = {
        "propulsion_system": {
            "supersonic_combustion": True,  # Scramjets → ITAR controlled
            "military_turbofan": True,
            "rocket_propulsion": True,
            "hypersonic_vehicle": True,
        },
        "flight_regime": {
            "mach_threshold": 3.0,  # Mach > 3 typically controlled
            "altitude_threshold_m": 30000,
        },
        "application": {
            "military": True,
            "missile": True,
            "space_launch": True,  # May be ITAR or EAR depending on specifics
        },
        "technology": {
            "stealth": True,
            "active_cooling": True,  # Advanced thermal management
            "variable_geometry": True,  # Variable cycle engines
        }
    }

    def classify_design(
        self,
        design_metadata: DesignMetadata
    ) -> ExportControlClassification:
        """
        Classifies design under ITAR/EAR.
        """
        triggers = []

        # Check geometry type
        if design_metadata.geometry_type == "scramjet_inlet":
            triggers.append("Scramjet technology (USML Category VIII)")

        # Check Mach number
        if design_metadata.mach_design_point >= self.ITAR_TRIGGERS["flight_regime"]["mach_threshold"]:
            triggers.append(f"Mach {design_metadata.mach_design_point} ≥ 3.0 (controlled)")

        # Check application
        if design_metadata.application in ["military", "missile"]:
            triggers.append(f"Application: {design_metadata.application}")

        # Determine classification
        if triggers:
            classification = "ITAR"
            restriction = "Export of technical data prohibited without State Dept license"
        else:
            classification = "EAR"
            restriction = "Dual-use technology, may require export license"

        return ExportControlClassification(
            classification=classification,
            triggers=triggers,
            restriction=restriction,
            requires_legal_review=len(triggers) > 0,
            storage_restrictions={
                "cloud": "Prohibited" if classification == "ITAR" else "Allowed with encryption",
                "foreign_nationals": "Access prohibited" if classification == "ITAR" else "Conditional",
                "data_residency": "U.S. only" if classification == "ITAR" else "No restriction"
            }
        )
6.3 Design Traceability for Certification
To support FAA/EASA certification, AeroForge maintains full provenance:

Python

# /aeroforge/compliance/traceability.py

class DesignProvenanceReport:
    """
    Generates FAA/EASA-compatible design substantiation report.
    """

    async def generate(
        self,
        session: IntegratedDesignSession
    ) -> CertificationReport:
        """
        Generates full traceability report for regulatory submission.
        """
        report = CertificationReport()

        # =====================================================================
        # SECTION 1: Design Requirements
        # =====================================================================
        report.add_section("Requirements", {
            "original_intent": session.original_user_intent,
            "interpreted_requirements": session.parsed_intent,
            "performance_targets": session.targets,
            "constraints": session.constraints,
            "applicable_standards": self._identify_standards(session)
        })

        # =====================================================================
        # SECTION 2: Design Methodology
        # =====================================================================
        report.add_section("Methodology", {
            "cad_tool": session.cad_tool_used,
            "cad_version": session.cad_tool_version,
            "cfd_solver": session.cfd_solver_used,
            "cfd_version": session.cfd_solver_version,
            "turbulence_model": session.turbulence_model,
            "numerical_schemes": session.numerical_schemes,
            "mesh_quality_metrics": session.mesh_quality_report,
            "convergence_criteria": session.convergence_criteria,
        })

        # =====================================================================
        # SECTION 3: Design Iterations
        # =====================================================================
        for iteration in session.iterations:
            report.add_iteration({
                "iteration_number": iteration.number,
                "cad_parameters": iteration.cad_parameters,
                "geometry_confidence": iteration.cad_confidence_score,
                "mesh_cell_count": iteration.mesh_statistics.cell_count,
                "mesh_quality": iteration.mesh_quality_report,
                "cfd_converged": iteration.cfd_converged,
                "cfd_residuals_final": iteration.cfd_residuals_final,
                "performance_results": iteration.cfd_results,
                "targets_met": iteration.targets_met,
                "modification_rationale": iteration.modification_rationale if iteration.number > 1 else None
            })

        # =====================================================================
        # SECTION 4: Final Design Substantiation
        # =====================================================================
        report.add_section("Final Design", {
            "geometry_files": session.final_cad_files,
            "design_parameters": session.final_design_parameters,
            "performance_summary": session.final_performance_summary,
            "compliance_matrix": self._generate_compliance_matrix(session),
            "validation_against_requirements": self._validate_against_requirements(session),
            "uncertainty_quantification": session.uncertainty_analysis if session.config.uncertainty_analysis else None
        })

        # =====================================================================
        # SECTION 5: Verification & Validation
        # =====================================================================
        report.add_section("V&V", {
            "mesh_independence_study": session.mesh_independence_results if session.config.mesh_independence else None,
            "analytical_cross_checks": session.analytical_validation,
            "comparison_to_reference_data": session.reference_comparison if session.config.reference_data else None,
            "confidence_assessment": session.final_confidence_score
        })

        # =====================================================================
        # SECTION 6: Assumptions & Limitations
        # =====================================================================
        report.add_section("Assumptions", {
            "geometry_assumptions": session.geometry_assumptions,
            "flow_assumptions": session.flow_assumptions,
            "material_assumptions": session.material_assumptions,
            "boundary_condition_justifications": session.bc_justifications,
            "known_limitations": session.limitations
        })

        # =====================================================================
        # SECTION 7: AI/LLM Disclosure
        # =====================================================================
        report.add_section("AI Usage Disclosure", {
            "ai_tools_used": ["LLM-assisted CAD generation", "LLM-assisted CFD configuration"],
            "llm_provider": session.llm_provider,
            "llm_model": session.llm_model,
            "human_oversight": "All AI-generated outputs reviewed by validation agents + (optional) human engineer",
            "ai_decision_log": session.ai_decision_log,
            "non_determinism_note": "LLM outputs may vary; full provenance logged for reproducibility"
        })

        # =====================================================================
        # SECTION 8: Sign-off
        # =====================================================================
        report.add_section("Approval", {
            "generated_by": "AeroForge AI v2.0.0",
            "reviewed_by": session.human_reviewer if session.human_review_required else "Automated validation only",
            "timestamp": session.completion_timestamp,
            "digital_signature": self._generate_signature(report)
        })

        return report
6.4 DO-178C Tool Qualification Considerations
If AeroForge output is used directly in FAA certification without independent verification, it may require DO-330 tool qualification:

text

DO-330 TOOL QUALIFICATION QUESTION TREE:

Q1: Is AeroForge's output used to eliminate, reduce, or automate a 
    verification process required by DO-178C?

    → YES (if CFD results used as sole validation)
      → Tool Qualification Required
      → Tool Qualification Level (TQL): TQL-3 or TQL-4
      → Mitigation: Independent verification via wind tunnel or reference solver

    → NO (if CFD used as "supporting analysis" only, not sole validation)
      → Tool Qualification Not Required
      → Recommended: Extensive V&V documentation
AeroForge Compliance Strategy:

YAML

compliance_strategy:
  positioning: "Design exploration and supporting analysis tool"
  
  certification_workflow:
    aeroforge_role: "Pre-certification design optimization"
    certification_validation: "Independent verification required"
    independent_methods:
      - wind_tunnel_testing
      - flight_testing
      - independent_cfd_with_certified_tool
      - analytical_methods
  
  do_330_avoidance:
    method: "Position as supporting tool, not verification tool"
    documentation: "Full provenance + V&V, but labeled as 'requires independent validation'"
    
  user_guidance:
    faa_part_25_note: |
      "AeroForge results are computational predictions suitable for design
       exploration. For FAA Part 25 certification, designs must be validated
       through independent means (wind tunnel, flight test, or certified CFD tool)."
Section 7: Enterprise Features
7.1 Multi-Tenancy & Access Control
Python

# /aeroforge/enterprise/multi_tenancy.py

class TenantIsolation:
    """
    Enterprise multi-tenancy with strict data isolation.
    """

    ISOLATION_LEVELS = {
        "SHARED_INFRASTRUCTURE": {
            "database": "Shared PostgreSQL, tenant_id column",
            "storage": "Shared S3 bucket, prefixed by tenant_id",
            "compute": "Shared HPC queue",
            "suitable_for": "Standard enterprise customers"
        },
        "DEDICATED_COMPUTE": {
            "database": "Shared PostgreSQL",
            "storage": "Shared S3",
            "compute": "Dedicated SLURM partition",
            "suitable_for": "High-security customers, ITAR"
        },
        "FULLY_ISOLATED": {
            "database": "Dedicated PostgreSQL instance",
            "storage": "Dedicated S3 bucket with separate KMS key",
            "compute": "Dedicated HPC cluster or VPC",
            "suitable_for": "Defense contractors, classified programs"
        }
    }

class RoleBasedAccessControl:
    """
    Fine-grained RBAC for enterprise deployments.
    """

    ROLES = {
        "VIEWER": {
            "permissions": ["read_designs", "view_results", "download_reports"],
            "cannot": ["create_designs", "modify_settings", "access_knowledge_graph"]
        },
        "ENGINEER": {
            "permissions": ["create_designs", "run_simulations", "view_results", 
                          "download_cad", "access_knowledge_graph"],
            "cannot": ["modify_templates", "manage_users", "access_billing"]
        },
        "LEAD_ENGINEER": {
            "permissions": ["all_engineer_permissions", "approve_designs", 
                          "modify_templates", "view_team_designs"],
            "cannot": ["manage_users", "access_billing", "change_compliance_settings"]
        },
        "ADMIN": {
            "permissions": ["full_access"],
            "includes": ["user_management", "billing", "compliance_settings", 
                        "knowledge_graph_management"]
        }
    }
7.2 Design Collaboration Features
text

┌─────────────────────────────────────────────────────────────────────┐
│              COLLABORATION FEATURES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DESIGN SHARING                                                     │
│  ├── Share designs within organization                              │
│  ├── External sharing with access control (view-only, download, etc)│
│  ├── Design comparison viewer (side-by-side CAD + CFD)             │
│  └── Commenting & annotation on designs                             │
│                                                                     │
│  VERSION CONTROL                                                    │
│  ├── Git-like branching for design variants                         │
│  ├── Merge designs (combine features from multiple iterations)      │
│  ├── Rollback to previous iterations                                │
│  └── Diff viewer (geometry + parameter changes)                    │
│                                                                     │
│  DESIGN LIBRARIES                                                   │
│  ├── Organization-wide design library                               │
│  ├── Tag and categorize designs                                     │
│  ├── Search by performance metrics, geometry type, etc.             │
│  └── Design reuse: Start from previous successful design           │
│                                                                     │
│  APPROVAL WORKFLOWS                                                 │
│  ├── Design review requests                                         │
│  ├── Multi-stage approval (engineer → lead → chief engineer)        │
│  ├── Compliance checklist enforcement                               │
│  └── Design freeze for production release                          │
│                                                                     │
│  REAL-TIME COLLABORATION (Future)                                   │
│  ├── Google Docs-style live editing of design parameters           │
│  ├── Live cursor tracking in 3D viewer                              │
│  ├── Voice/video chat integration                                   │
│  └── Collaborative optimization (multiple engineers defining objs)  │
└─────────────────────────────────────────────────────────────────────┘
7.3 Custom Knowledge Base
Enterprises can augment AeroForge's knowledge graph with proprietary data:

Python

# /aeroforge/enterprise/custom_knowledge.py

class CustomKnowledgeBase:
    """
    Organization-specific knowledge base for proprietary design rules,
    past projects, and institutional knowledge.
    """

    async def ingest_proprietary_documents(
        self,
        documents: List[Document],
        classification: SecurityClassification
    ) -> IngestionReport:
        """
        Ingest proprietary documents into isolated knowledge graph partition.
        """
        # Create tenant-specific graph partition
        tenant_graph = await self.create_tenant_partition(
            tenant_id=documents[0].tenant_id
        )

        # Process documents
        for doc in documents:
            # Extract entities and relationships
            entities = await self.entity_extractor.extract(doc)
            relationships = await self.relationship_extractor.extract(doc, entities)

            # Add to tenant graph (isolated from other tenants)
            await tenant_graph.add_entities(entities)
            await tenant_graph.add_relationships(relationships)

            # Vector embeddings for semantic search
            chunks = await self.chunk_document(doc)
            embeddings = await self.embed_chunks(chunks)
            await self.vector_store.add(embeddings, tenant_id=doc.tenant_id)

        return IngestionReport(
            documents_processed=len(documents),
            entities_extracted=sum(len(e) for e in entities),
            tenant_graph_size=await tenant_graph.get_size()
        )

    SUPPORTED_DOCUMENT_TYPES = [
        "internal_design_reports",
        "proprietary_test_data",
        "lessons_learned",
        "design_standards",
        "manufacturing_guidelines",
        "vendor_specifications",
        "historical_project_data"
    ]
7.4 Integration with Enterprise Systems
text

┌─────────────────────────────────────────────────────────────────────┐
│              ENTERPRISE INTEGRATIONS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PLM (Product Lifecycle Management)                                 │
│  ├── Siemens Teamcenter                                             │
│  ├── Dassault ENOVIA                                                │
│  ├── PTC Windchill                                                  │
│  └── Integration: Push final designs to PLM with full provenance    │
│                                                                     │
│  SSO (Single Sign-On)                                               │
│  ├── SAML 2.0 (Okta, Azure AD, OneLogin)                            │
│  ├── OAuth 2.0 / OIDC                                               │
│  └── LDAP / Active Directory                                        │
│                                                                     │
│  CAD VAULTS                                                         │
│  ├── Autodesk Vault                                                 │
│  ├── SOLIDWORKS PDM                                                 │
│  └── Integration: Auto-sync generated CAD files to vault            │
│                                                                     │
│  HPC JOB SCHEDULERS                                                 │
│  ├── SLURM, PBS, SGE (direct integration)                           │
│  ├── AWS Batch, Azure Batch, GCP Batch                              │
│  └── Integration: Submit CFD jobs, monitor, retrieve results        │
│                                                                     │
│  NOTIFICATION SYSTEMS                                               │
│  ├── Slack, Microsoft Teams                                         │
│  ├── Email (SMTP)                                                   │
│  ├── PagerDuty (for failures)                                       │
│  └── Integration: Real-time job status, completion notifications    │
│                                                                     │
│  DATA WAREHOUSES                                                    │
│  ├── Snowflake, BigQuery, Redshift                                  │
│  └── Integration: Export simulation metadata for analytics          │
└─────────────────────────────────────────────────────────────────────┘
Section 8: Observability & Operations
8.1 Monitoring & Alerting
Python

# /aeroforge/observability/monitoring.py

METRICS_COLLECTED = {

    # Application metrics
    "design_sessions": {
        "total_sessions": "counter",
        "active_sessions": "gauge",
        "session_duration_seconds": "histogram",
        "session_success_rate": "gauge",
        "iterations_per_session": "histogram"
    },

    "cad_generation": {
        "cad_jobs_total": "counter",
        "cad_job_duration_seconds": "histogram",
        "cad_job_success_rate": "gauge",
        "geometry_confidence_scores": "histogram",
        "cad_tool_errors": "counter"
    },

    "cfd_simulation": {
        "cfd_jobs_total": "counter",
        "cfd_job_duration_seconds": "histogram",
        "cfd_convergence_rate": "gauge",
        "cfd_divergence_count": "counter",
        "mesh_cell_count": "histogram",
        "compute_core_hours": "counter"
    },

    "llm_usage": {
        "llm_requests_total": "counter",
        "llm_tokens_used": "counter",
        "llm_latency_seconds": "histogram",
        "llm_cost_usd": "counter",
        "llm_provider_distribution": "gauge"
    },

    # Infrastructure metrics
    "api": {
        "http_requests_total": "counter",
        "http_request_duration_seconds": "histogram",
        "http_errors_total": "counter",
        "active_websocket_connections": "gauge"
    },

    "database": {
        "db_connections_active": "gauge",
        "db_query_duration_seconds": "histogram",
        "db_size_bytes": "gauge"
    },

    "storage": {
        "s3_objects_total": "gauge",
        "s3_storage_bytes": "gauge",
        "s3_upload_errors": "counter"
    },

    "compute": {
        "slurm_jobs_pending": "gauge",
        "slurm_jobs_running": "gauge",
        "slurm_jobs_failed": "counter",
        "compute_utilization_percent": "gauge"
    }
}

ALERTS = {
    "cfd_divergence_rate_high": {
        "condition": "cfd_divergence_count / cfd_jobs_total > 0.15",
        "severity": "warning",
        "action": "Investigate mesh quality or physics config"
    },

    "llm_cost_spike": {
        "condition": "rate(llm_cost_usd[1h]) > 100",
        "severity": "warning",
        "action": "Check for runaway LLM calls or inefficient prompts"
    },

    "compute_queue_backed_up": {
        "condition": "slurm_jobs_pending > 50",
        "severity": "info",
        "action": "Consider scaling compute resources"
    },

    "api_error_rate_high": {
        "condition": "rate(http_errors_total[5m]) > 10",
        "severity": "critical",
        "action": "Page on-call engineer"
    }
}
8.2 Logging Strategy
YAML

logging_architecture:
  structured_logging: true
  format: json
  
  log_levels:
    production: INFO
    staging: DEBUG
    development: DEBUG

  log_categories:
    - application:
        - agent_decisions
        - design_iterations
        - cfd_convergence
        - validation_results
    
    - audit:
        - user_actions
        - design_approvals
        - export_control_checks
        - compliance_events
    
    - performance:
        - request_latency
        - cfd_runtime
        - llm_latency
    
    - errors:
        - exceptions
        - cad_generation_failures
        - cfd_divergence
        - mesh_quality_failures

  retention:
    application_logs: 30_days
    audit_logs: 7_years  # Regulatory requirement
    performance_logs: 90_days
    error_logs: 1_year

  destinations:
    - local_files: /var/log/aeroforge/
    - elasticsearch: https://logs.aeroforge.internal
    - cloudwatch: (if AWS deployment)
    - splunk: (if enterprise SIEM)
8.3 Cost Tracking & Attribution
Python

# /aeroforge/observability/cost_tracking.py

class CostTracker:
    """
    Tracks and attributes compute + LLM costs per session, user, and tenant.
    """

    async def track_session_cost(
        self,
        session: IntegratedDesignSession
    ) -> SessionCostReport:
        """
        Computes total cost for a design session.
        """
        costs = {
            "llm": await self._compute_llm_cost(session),
            "cad": await self._compute_cad_cost(session),
            "cfd": await self._compute_cfd_cost(session),
            "storage": await self._compute_storage_cost(session),
            "network": await self._compute_network_cost(session)
        }

        return SessionCostReport(
            session_id=session.id,
            total_cost_usd=sum(costs.values()),
            breakdown=costs,
            cost_per_iteration=sum(costs.values()) / session.iterations,
            user_id=session.user_id,
            tenant_id=session.tenant_id,
            timestamp=datetime.utcnow()
        )

    async def _compute_cfd_cost(self, session) -> float:
        """
        CFD compute cost calculation.
        """
        total_core_hours = sum(
            iteration.cfd_runtime_seconds * iteration.n_cores / 3600
            for iteration in session.iterations
        )

        if session.compute_target == "local":
            # Internal cost (amortized hardware)
            cost_per_core_hour = 0.02  # Internal accounting rate
        elif session.compute_target == "aws_batch":
            # AWS spot pricing (c6i.32xlarge ≈ $4/hr, 128 cores)
            cost_per_core_hour = 4.0 / 128
        elif session.compute_target == "slurm":
            # On-prem HPC (amortized)
            cost_per_core_hour = 0.01

        return total_core_hours * cost_per_core_hour

    async def generate_tenant_cost_report(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> TenantCostReport:
        """
        Monthly cost report for enterprise billing.
        """
        sessions = await self.get_sessions(tenant_id, start_date, end_date)
        
        total_cost = sum(
            await self.track_session_cost(s)
            for s in sessions
        )

        return TenantCostReport(
            tenant_id=tenant_id,
            period_start=start_date,
            period_end=end_date,
            total_sessions=len(sessions),
            total_cost_usd=total_cost,
            breakdown_by_user=await self._breakdown_by_user(sessions),
            breakdown_by_component=await self._breakdown_by_component(sessions),
            recommendations=await self._cost_optimization_recommendations(tenant_id)
        )
Section 9: Long-Term Roadmap
9.1 Version Timeline
text

┌─────────────────────────────────────────────────────────────────────┐
│                    AEROFORGE ROADMAP                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  v1.0 — FOUNDATION (2026 Q2-Q4)                                     │
│  ✓ Phase 1: CAD automation (FreeCAD, CadQuery)                     │
│  ✓ Phase 2: CFD automation (OpenFOAM)                              │
│  ✓ Phase 3: Integration layer                                      │
│  ✓ CLI interface                                                    │
│  ✓ Local LLM support (Ollama)                                      │
│  ✓ Basic web UI                                                     │
│                                                                     │
│  v1.5 — PRODUCTION READY (2027 Q1-Q2)                               │
│  ├── Commercial CAD support (CATIA, NX, Fusion 360)                │
│  ├── Commercial CFD support (Ansys Fluent, STAR-CCM+)              │
│  ├── HPC integration (SLURM, PBS)                                   │
│  ├── Multi-objective optimization (NSGA-III)                        │
│  ├── Enterprise features (RBAC, multi-tenancy)                      │
│  └── ITAR/EAR compliance module                                     │
│                                                                     │
│  v2.0 — DIGITAL TWIN (2027 Q3-Q4)                                   │
│  ├── Real-time digital twin integration                             │
│  ├── Live sensor data → CFD model updating                          │
│  ├── Predictive maintenance (propulsion systems)                    │
│  ├── Anomaly detection (flight test data)                           │
│  ├── Continuous learning from flight/test data                      │
│  └── Fleet-wide optimization                                        │
│                                                                     │
│  v2.5 — AUTONOMOUS DESIGN (2028 Q1-Q2)                              │
│  ├── Full autonomous design loops (Level 3 autonomy)                │
│  ├── Multi-disciplinary optimization (MDO)                          │
│  │   └── Coupled aero-structural-thermal optimization               │
│  ├── Generative design (ML-driven geometry generation)              │
│  ├── Design space exploration (1000s designs overnight)             │
│  └── Uncertainty quantification (robust design)                     │
│                                                                     │
│  v3.0 — COGNITIVE ENGINEERING (2028 Q3+)                            │
│  ├── Agentic design reasoning (deep technical explanations)         │
│  ├── Failure mode prediction (pre-design FMEA)                      │
│  ├── Design innovation suggestions (beyond human intuition)         │
│  ├── Natural language design conversations (Socratic method)        │
│  ├── Integration with AR/VR (immersive design review)               │
│  └── Autonomous certification package generation                    │
└─────────────────────────────────────────────────────────────────────┘
9.2 v2.0 Feature Deep-Dive: Digital Twin Integration
text

┌─────────────────────────────────────────────────────────────────────┐
│              DIGITAL TWIN ARCHITECTURE (v2.0)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHYSICAL ASSET (e.g., Aircraft Engine)                             │
│  ├── Embedded sensors                                               │
│  │   ├── Pressure sensors (inlet, compressor, combustor, turbine)  │
│  │   ├── Temperature sensors (EGT, turbine inlet temp)             │
│  │   ├── Vibration sensors (bearing health)                        │
│  │   ├── Fuel flow meters                                          │
│  │   └── Acoustic sensors (combustion instability detection)       │
│  │                                                                  │
│  └── Telemetry stream → Edge gateway → Cloud/On-prem ingestion     │
│                                                                     │
│  ──────────────────────────────────────────────────────────────────│
│                                                                     │
│  DIGITAL TWIN ENGINE                                                │
│  ├── Real-time data ingestion (Kafka, MQTT)                         │
│  ├── State estimation (Kalman filter, particle filter)              │
│  ├── Physics-based model (reduced-order CFD + FEA)                  │
│  ├── ML surrogate (trained on high-fidelity AeroForge runs)         │
│  ├── Model updating (online parameter calibration)                  │
│  │   └── Bayesian inference to update uncertain params              │
│  │                                                                  │
│  ├── Predictive analytics                                           │
│  │   ├── Remaining useful life (RUL) prediction                     │
│  │   ├── Fault prediction (bearing failure, blade crack, etc.)      │
│  │   ├── Performance degradation tracking                           │
│  │   └── Optimal maintenance scheduling                             │
│  │                                                                  │
│  └── Anomaly detection                                              │
│      ├── Deviation from nominal CFD predictions                     │
│      ├── Sensor drift detection                                     │
│      └── Alert generation (predictive maintenance)                  │
│                                                                     │
│  ──────────────────────────────────────────────────────────────────│
│                                                                     │
│  AEROFORGE INTEGRATION                                              │
│  ├── Automatic re-calibration of CFD models                         │
│  │   └── If twin predicts 5% pressure loss vs design:              │
│  │       → Trigger AeroForge to explore geometry degradation        │
│  │       → Update inlet geometry with erosion/fouling model         │
│  │       → Re-run CFD to match observed performance                 │
│  │                                                                  │
│  ├── Design optimization from fleet data                            │
│  │   └── Aggregate data from 100 engines in fleet:                 │
│  │       → Identify common failure modes                            │
│  │       → Trigger AeroForge to design improved version             │
│  │       → Validate via digital twin before physical implementation │
│  │                                                                  │
│  └── Continuous learning loop                                       │
│      └── Flight test data → Update knowledge graph →                │
│          Improve future design predictions                          │
└─────────────────────────────────────────────────────────────────────┘

USE CASES:

1. Predictive Maintenance
   Aircraft operator receives alert: "Engine #2 inlet pressure recovery
   degrading. Predict 3% loss in 50 flight hours. Schedule inspection."
   
2. Performance Optimization
   Digital twin detects sub-optimal cruise efficiency across fleet.
   Trigger AeroForge to design inlet lip modification.
   Validate on 1 test aircraft, then roll out to fleet.

3. Failure Investigation
   Engine experiences unexpected stall. Digital twin CFD model updated
   with actual flight data. AeroForge runs sensitivity analysis to
   identify root cause (e.g., ice accretion on inlet ramp).

4. Design Validation
   New inlet design from AeroForge v1.0 → Test on digital twin
   with 1,000 simulated flight profiles before physical prototype.
9.3 v3.0 Feature Deep-Dive: Cognitive Engineering
text

COGNITIVE ENGINEERING VISION:

Instead of: "The user asks for a design, the AI generates it"

Evolution to: "The AI collaborates with the engineer as a peer,
               challenges assumptions, suggests alternatives,
               explains trade-offs in deep technical detail"

EXAMPLE INTERACTION:

USER:
  "I need a scramjet inlet for Mach 6 with high pressure recovery."

AEROFORGE v3.0 (Cognitive Mode):
  "Understood. Before we proceed, I have a few considerations:
  
   1. Mach 6 flight at typical altitudes (25-30km) means:
      - Stagnation temperature: ~1,800 K
      - Leading edge thermal loads: ~2 MW/m²
      
      Have you considered:
      - Material: Inconel 718 has a 980K limit. You'll need active cooling
        or a more exotic material like C/SiC or ultra-high-temp ceramics.
      - Thermal protection: Ablative? Radiative cooling? Heat pipes?
   
   2. "High pressure recovery" is inherently in tension with:
      - Low cowl drag (more compression stages = more wetted area)
      - Short inlet length (viscous losses scale with length)
      - Manufacturing complexity (curved compression surfaces are harder)
   
      What is your priority ranking?
      a) Maximize pt recovery (accept higher drag/weight)
      b) Balance pt recovery and drag (Pareto optimal)
      c) Minimize system weight (accept lower pt recovery)
   
   3. I see from your project history that you've designed Mach 3-4
      inlets before, but this is your first hypersonic design.
      
      Key differences at Mach 6:
      - Real gas effects become non-negligible (O₂ dissociation starts)
      - Boundary layer transition is highly uncertain (laminar or turbulent?)
      - Shock-BL interaction is stronger (separation more likely)
      
      Recommendation: Start with a 3-shock system (2 external + 1 internal)
      for a good starting point. We can optimize from there.
   
   Shall I proceed with Option B (balanced) and a 3-shock baseline?"

USER:
  "Yes, proceed. But why 3 shocks instead of 2 or 4?"

AEROFORGE:
  "Excellent question. Here's the reasoning:
  
   2-shock system:
   - Simpler, lighter, shorter
   - BUT: At Mach 6, to achieve pt_recovery > 0.8, each shock would
     need to be very strong (high turning angles)
   - Strong oblique shocks → high entropy rise → low efficiency
   - Also: Strong shocks → thick boundary layers → separation risk
   
   4-shock system:
   - Maximum efficiency (Oswatitsch optimal shock distribution)
   - Can achieve pt_recovery > 0.9 at Mach 6
   - BUT: Longer inlet (more viscous loss), heavier cowl, more complex
   - Diminishing returns: 3→4 shocks gives ~1-2% pt improvement
     but ~15% weight penalty
   
   3-shock system (recommended):
   - Sweet spot: pt_recovery ≈ 0.85-0.88 (acceptable for most apps)
   - Moderate length and weight
   - Robust: Less sensitive to off-design conditions
   - Proven: Many Mach 5-7 designs use 3-shock (SR-71, X-43A, X-51A)
   
   I can generate all three options in parallel and show you the
   trade-offs if you'd like a quantitative comparison?"

[This level of technical reasoning, contextual awareness, and
 Socratic dialogue is the v3.0 vision]
Section 10: Deployment & Installation
10.1 Installation Modes
Bash

# ============================================================================
# INSTALLATION MODE 1: Single-User Local (pip)
# ============================================================================

# Install AeroForge + dependencies
pip install aeroforge[full]  # Includes FreeCAD, OpenFOAM Python wrappers

# Install Ollama for local LLM
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull qwen2.5-coder:32b
ollama pull deepseek-r1:70b

# Configure
aeroforge init
# Walks through interactive setup:
# - LLM provider selection (local/cloud/hybrid)
# - CAD tool preferences
# - CFD solver setup
# - Storage locations

# Run first design
aeroforge design "Create a NACA 2412 airfoil, 2m chord, 5m span"

# ============================================================================
# INSTALLATION MODE 2: Departmental Server (Docker Compose)
# ============================================================================

# Clone repository
git clone https://github.com/aeroforge/aeroforge-enterprise.git
cd aeroforge-enterprise

# Configure
cp .env.example .env
# Edit .env: Set passwords, API keys, etc.

# Deploy stack
docker-compose up -d

# Access web UI
open http://localhost

# ============================================================================
# INSTALLATION MODE 3: Enterprise HPC (Kubernetes + Helm)
# ============================================================================

# Add Helm repo
helm repo add aeroforge https://charts.aeroforge.ai
helm repo update

# Install with custom values
helm install aeroforge aeroforge/aeroforge \
  --namespace aeroforge \
  --create-namespace \
  --values values-production.yaml

# values-production.yaml contents:
# replicas:
#   api: 3
#   workers: 10
# compute:
#   mode: slurm
#   slurm_partition: compute
# storage:
#   type: nfs
#   server: nfs.internal
#   path: /aeroforge
# database:
#   type: postgresql
#   host: postgres.internal
#   size: 500Gi
# llm:
#   provider: ollama
#   models:
#     - qwen2.5-coder:32b
#     - deepseek-r1:70b

# ============================================================================
# INSTALLATION MODE 4: Cloud (AWS / Azure / GCP)
# ============================================================================

# AWS deployment via Terraform
git clone https://github.com/aeroforge/terraform-aws-aeroforge.git
cd terraform-aws-aeroforge

# Configure
cp terraform.tfvars.example terraform.tfvars
# Edit: Set AWS region, instance types, etc.

# Deploy
terraform init
terraform plan
terraform apply

# Output will include:
# - ALB DNS name (web UI endpoint)
# - RDS endpoint
# - S3 bucket names
# - Batch compute environment ARN
10.2 System Requirements
text

┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM REQUIREMENTS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LOCAL WORKSTATION (Minimum)                                        │
│  ├── OS: Linux (Ubuntu 22.04+), macOS 12+                          │
│  ├── CPU: 8 cores (16 threads)                                     │
│  ├── RAM: 32 GB                                                     │
│  ├── GPU: Optional (NVIDIA with 8GB+ VRAM for local LLM)           │
│  ├── Disk: 100 GB SSD (for software + models)                      │
│  └── Network: 10 Mbps+ (for cloud LLM APIs)                        │
│                                                                     │
│  LOCAL WORKSTATION (Recommended)                                    │
│  ├── CPU: 16+ cores (AMD Ryzen 9 / Intel i9 / Apple M2 Pro)        │
│  ├── RAM: 64 GB                                                     │
│  ├── GPU: NVIDIA RTX 4090 (24GB) or A5000 (24GB)                   │
│  ├── Disk: 500 GB NVMe SSD                                         │
│  └── Scratch: 1 TB for CFD output                                  │
│                                                                     │
│  DEPARTMENTAL SERVER (10-20 users)                                  │
│  ├── CPU: 32-64 cores (AMD EPYC / Intel Xeon)                      │
│  ├── RAM: 128-256 GB                                                │
│  ├── GPU: NVIDIA A100 (40GB) × 2 (for LLM)                         │
│  ├── Disk: 2 TB NVMe SSD (OS + database)                           │
│  ├── Scratch: 10 TB (shared NFS/Lustre for CFD)                    │
│  └── Network: 10 GbE                                                │
│                                                                     │
│  HPC CLUSTER (100+ users, production)                               │
│  ├── Head nodes: 2× (HA), 32 cores, 128 GB RAM each                │
│  ├── Compute nodes: 50-500×, 64-128 cores each, 256-512 GB RAM     │
│  ├── GPU nodes: 10-50×, 4-8× NVIDIA A100 per node                  │
│  ├── Storage: Lustre or GPFS, 100 TB - 1 PB                        │
│  ├── Network: InfiniBand HDR (200 Gbps) or RoCE v2                 │
│  └── Scheduler: SLURM, PBS Pro, or LSF                             │
└─────────────────────────────────────────────────────────────────────┘
10.3 Software Dependencies
YAML

core_dependencies:
  python: ">=3.11"
  nodejs: ">=20" # For web UI
  
cad_tools:
  freecad: "0.21+"  # Open source, primary
  cadquery: "2.4+"  # Python CAD library
  openscad: "2021+" # Optional, for parametric
  gmsh: "4.11+"     # Meshing
  
cfd_solvers:
  openfoam: "v2312+" # Primary open-source solver
  su2: "7.5+"        # Adjoint-based optimization
  # Commercial (optional):
  # - Ansys Fluent 2024+
  # - STAR-CCM+ 2024+

llm_backends:
  ollama: "0.3+"          # Local LLM runtime
  llama_cpp: "latest"     # Alternative local runtime
  # Cloud APIs (optional):
  # - Anthropic Claude API
  # - OpenAI API
  # - Google Gemini API

databases:
  postgresql: "15+"
  redis: "7+"
  neo4j: "5+" # For knowledge graph

python_packages:
  - fastapi[all]
  - celery[redis]
  - sqlalchemy
  - pydantic
  - numpy
  - scipy
  - pandas
  - plotly
  - vtk
  - asyncio
  - aiohttp
  - langchain
  - langchain-anthropic
  - langchain-openai
  - chromadb  # Vector database
  - networkx  # Graph algorithms
  - scikit-learn
  - torch  # For ML surrogates
  - botorch  # Bayesian optimization
  - pymoo  # Multi-objective optimization (NSGA-II/III)

system_packages:
  ubuntu:
    - build-essential
    - cmake
    - libopenmpi-dev
    - libboost-all-dev
    - python3-dev
    - libgl1-mesa-dev  # For ParaView/VTK
  
  macos:
    - gcc
    - cmake
    - open-mpi
    - boost
10.4 Quick Start Guide
Bash

# ============================================================================
# QUICKSTART: 5 Minutes to First Design
# ============================================================================

# Step 1: Install (assuming Ubuntu/Debian)
curl -fsSL https://install.aeroforge.ai | bash
# This installs: AeroForge + FreeCAD + OpenFOAM + Ollama + models

# Step 2: Initialize
aeroforge init
# Choose:
# - LLM: local (Ollama with qwen2.5-coder:7b for fast startup)
# - CAD: FreeCAD (default)
# - CFD: OpenFOAM (default)
# - Storage: ~/.aeroforge (default)

# Step 3: Run first design
aeroforge design "Design a NACA 0012 airfoil at 1 meter chord"

# Output (after ~2 minutes):
# ✓ Intent parsed (2s)
# ✓ CAD generated (18s)
# ✓ Geometry validated (confidence: 0.96)
# ✓ Exported to: ~/.aeroforge/sessions/session_abc123/airfoil.step
# 
# Next steps:
#   • View CAD: aeroforge view session_abc123
#   • Run CFD: aeroforge simulate session_abc123 --mach 0.3 --reynolds 1e6
#   • Export: aeroforge export session_abc123 --format step

# Step 4: Run full design + CFD loop
aeroforge design \
  "Design a scramjet inlet for Mach 3, optimize for pressure recovery > 0.9" \
  --max-iterations 5 \
  --run-cfd

# This will:
# 1. Generate initial inlet geometry
# 2. Mesh + run CFD
# 3. Check if pt_recovery > 0.9
# 4. If not: modify geometry and repeat (up to 5 iterations)
# 5. Return optimized design

# Step 5: Explore web UI
aeroforge serve
# Open browser: http://localhost:8080
# Full graphical interface with 3D viewer, live monitoring, etc.

# ============================================================================
# NEXT STEPS
# ============================================================================

# Explore examples
aeroforge examples list
aeroforge examples run scramjet_inlet_mach5

# Read documentation
aeroforge docs

# Join community
# - GitHub: https://github.com/aeroforge/aeroforge
# - Discord: https://discord.gg/aeroforge
# - Docs: https://docs.aeroforge.ai
End of Part 3 — Integration, Platform & Future Architecture

text

┌─────────────────────────────────────────────────────────────────────┐
│                  COMPLETE PROJECT DOCUMENTATION                     │
├─────────────────────────────────────────────────────────────────────┤
│  Part 1: CAD Automation System              ✅ COMPLETE             │
│  Part 2: CFD Automation System              ✅ COMPLETE             │
│  Part 3: Integration, Platform & Future     ✅ COMPLETE             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TOTAL DOCUMENT LENGTH: ~45,000 words                               │
│  TOTAL SECTIONS: 30                                                 │
│  ARCHITECTURE DIAGRAMS: 25+                                         │
│  CODE EXAMPLES: 50+                                                 │
│                                                                     │
│  STATUS: READY FOR IMPLEMENTATION                                   │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                        AEROFORGE AI v1.0
        "From Natural Language to Flight-Ready Aerospace Design"
═══════════════════════════════════════════════════════════════════════

This completes the full AeroForge AI design document. You now have:

✅ Complete architectural blueprint for Phase 1 (CAD automation)
✅ Complete architectural blueprint for Phase 2 (CFD automation)
✅ Complete architectural blueprint for Phase 3 (Integration + Platform)
✅ Roadmap through v3.0 (Cognitive Engineering)
✅ Deployment guides for all scales (local → enterprise HPC → cloud)
✅ Compliance framework (ITAR/EAR, FAA/EASA, DO-178C)
✅ Enterprise features (multi-tenancy, RBAC, integrations)
✅ Observability & operations strategy
✅ Installation & quick-start guides



