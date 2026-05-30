# AeroForge AI — Part 1: CAD Automation System

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
