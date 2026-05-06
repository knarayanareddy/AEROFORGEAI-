// AeroForge AI — Type Definitions
// Natural Language → CAD → CFD → Validated Aerospace Design

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export type AutonomyLevelLabel =
  | 'COPILOT'
  | 'ASSISTED'
  | 'SUPERVISED'
  | 'AUTONOMOUS'
  | 'FULL AUTO';

export type LLMProvider =
  | 'ollama'
  | 'llama.cpp'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral';

export type CADTool = 'freecad' | 'catia' | 'nx' | 'solidworks' | 'opencascade';

export type CFDSolver = 'openfoam' | 'fluent' | 'su2' | 'star-ccm+' | 'cfd++';

export type MeshingEngine = 'snappyhexmesh' | 'gmsh' | 'pointwise' | 'ansa';

export type ExportFormat = 'STEP' | 'IGES' | 'STL' | 'BREP' | 'OBJ' | 'DXF';

export type ComponentType =
  | 'scramjet-inlet'
  | 'turbofan-nacelle'
  | 'cd-nozzle'
  | 'aerospike-nozzle'
  | 'combustor-liner'
  | 'compressor-blade'
  | 'naca-airfoil'
  | 'delta-wing'
  | 'ogive-nosecone'
  | 's-duct-diffuser';

export type ValidationStatus = 'pass' | 'warn' | 'fail' | 'pending';

export type AgentPhase =
  | 'intent-decomposition'
  | 'physics-computation'
  | 'geometry-generation'
  | 'constraint-validation'
  | 'export-preparation'
  | 'cfd-handoff'
  | 'mesh-generation'
  | 'solver-setup'
  | 'simulation-running'
  | 'post-processing';

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export interface DesignRequirement {
  id: string;
  parameter: string;
  value: number | string;
  unit: string;
  confidence: number;
}

export interface PhysicsConstraint {
  id: string;
  name: string;
  formula: string;
  status: ValidationStatus;
  computed: number | string;
  target: number | string;
  tolerance: number;
  unit: string;
}

export interface GeometryParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  locked: boolean;
}

export interface ValidationResult {
  id: string;
  check: string;
  status: ValidationStatus;
  computed: string;
  required: string;
  confidence: number;
  standard: string;
}

export interface AgentStep {
  id: string;
  phase: AgentPhase;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  duration?: number;
  output?: string;
}

export interface DesignSession {
  id: string;
  timestamp: string;
  componentType: ComponentType;
  naturalLanguagePrompt: string;
  autonomyLevel: AutonomyLevel;
  llmProvider: LLMProvider;
  cadTool: CADTool;
  requirements: DesignRequirement[];
  geometryParameters: GeometryParameter[];
  validationResults: ValidationResult[];
  agentSteps: AgentStep[];
  status: PipelineStatus;
  confidenceScore: number;
}

export interface CFDResult {
  machNumber: number;
  totalPressureRecovery: number;
  massFlowRate: number;
  dragCoefficient: number;
  liftCoefficient: number;
  stallAngle: number;
  iterationData: IterationPoint[];
}

export interface IterationPoint {
  iteration: number;
  residual: number;
  cl: number;
  cd: number;
  cm: number;
}

export interface KnowledgeGraphNode {
  id: string;
  type: 'component' | 'constraint' | 'material' | 'standard' | 'paper';
  label: string;
  properties: Record<string, string | number>;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  section: AppSection;
}

export type AppSection =
  | 'dashboard'
  | 'cad-agent'
  | 'cfd-agent'
  | 'geometry-engine'
  | 'knowledge-graph'
  | 'validation'
  | 'optimization'
  | 'export';
