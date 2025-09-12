import mongoose, { Document, Schema } from 'mongoose';

// Types pour les étapes d'exécution
export type AgentType = 'PlanningAgent' | 'ScanningAgent' | 'MAIPAgent' | 'CalderaAgent' | 'ShenninaPentestAgent' | 'ReportAgent' | 'FixingAgent';

export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'SKIPPED' | 'FAILED' | 'WAITING_APPROVAL';

export type SessionStatus = 'ANALYZING' | 'PLANNING' | 'ATTACKING' | 'REPORTING' | 'DONE' | 'FAILED' | 'WAITING_USER_APPROVAL';

export type SessionMode = 'auto' | 'semi-auto';

// Interface pour les ports découverts
export interface DiscoveredPort {
  port: number;
  service: string;
  version?: string;
  state: 'open' | 'closed' | 'filtered';
  protocol: 'tcp' | 'udp';
}

// Interface pour les données découvertes
export interface DiscoveredData {
  os?: string;
  osVersion?: string;
  hostname?: string;
  ports: DiscoveredPort[];
  vulnerabilities?: Array<{
    cve?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    service: string;
    port: number;
  }>;
  webTechnologies?: Array<{
    name: string;
    version?: string;
    categories: string[];
  }>;
  scanTimestamp: Date;
}

// Interface pour les étapes d'exécution
export interface ExecutionStep {
  step: number;
  agent: AgentType;
  description: string;
  status: StepStatus;
  parameters: Record<string, any>;
  results?: Record<string, any>;
  logs: string[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
  requiresApproval?: boolean;
  approvedAt?: Date;
  approvedBy?: string;
}

// Interface pour les vulnérabilités dans le rapport
export interface VulnerabilityFinding {
  id: string;
  vulnerability: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cvss?: number;
  cve?: string;
  service: string;
  port: number;
  description: string;
  impact: string;
  evidence: string[];
  fix: string;
  references?: string[];
}

// Interface pour le rapport final
export interface FinalReport {
  executiveSummary: string;
  attackNarrative: string;
  methodologyUsed: string[];
  findings: VulnerabilityFinding[];
  statistiques: {
    totalPortsScanned: number;
    openPorts: number;
    vulnerabilitiesFound: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
  };
  remediationPlan: Array<{
    priority: number;
    vulnerability: string;
    fix: string;
    estimatedEffort: string;
    businessImpact: string;
  }>;
  appendices?: {
    rawScanResults?: string;
    toolOutputs?: Record<string, string>;
    screenshots?: string[];
  };
}

// Interface principale pour les sessions d'agents
export interface IAgentSession extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  userId: string;
  status: SessionStatus;
  mode: SessionMode;
  initialPrompt: string;
  targetIp: string;
  targetDescription?: string;
  discoveredData?: DiscoveredData;
  executionPlan: ExecutionStep[];
  currentStep: number;
  finalReport?: FinalReport;
  agentConfigurations: Record<AgentType, {
    modelProvider: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
  }>;
  metadata: {
    totalExecutionTime?: number;
    startedAt: Date;
    finishedAt?: Date;
    lastActivity: Date;
    planningTime?: number;
    attackingTime?: number;
    reportingTime?: number;
  };
  createdAt: Date;
  updatedAt: Date;

  // Méthodes d'instance
  getNextPendingStep(): ExecutionStep | null;
  updateStepStatus(stepIndex: number, status: StepStatus, results?: any, errorMessage?: string): void;
  addLog(stepIndex: number, logMessage: string): void;
}

// Schéma pour les ports découverts
const DiscoveredPortSchema = new Schema({
  port: { type: Number, required: true },
  service: { type: String, required: true },
  version: { type: String },
  state: { type: String, enum: ['open', 'closed', 'filtered'], required: true },
  protocol: { type: String, enum: ['tcp', 'udp'], required: true }
});

// Schéma pour les données découvertes
const DiscoveredDataSchema = new Schema({
  os: { type: String },
  osVersion: { type: String },
  hostname: { type: String },
  ports: [DiscoveredPortSchema],
  vulnerabilities: [{
    cve: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    description: { type: String, required: true },
    service: { type: String, required: true },
    port: { type: Number, required: true }
  }],
  webTechnologies: [{
    name: { type: String, required: true },
    version: { type: String },
    categories: [{ type: String }]
  }],
  scanTimestamp: { type: Date, required: true }
});

// Schéma pour les étapes d'exécution
const ExecutionStepSchema = new Schema({
  step: { type: Number, required: true },
  agent: { 
    type: String, 
    enum: ['PlanningAgent', 'ScanningAgent', 'MAIPAgent', 'CalderaAgent', 'ShenninaPentestAgent', 'ReportAgent', 'FixingAgent'],
    required: true 
  },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'RUNNING', 'DONE', 'SKIPPED', 'FAILED', 'WAITING_APPROVAL'],
    default: 'PENDING'
  },
  parameters: { type: Schema.Types.Mixed, default: {} },
  results: { type: Schema.Types.Mixed },
  logs: [{ type: String }],
  startTime: { type: Date },
  endTime: { type: Date },
  error: { type: String },
  requiresApproval: { type: Boolean, default: false },
  approvedAt: { type: Date },
  approvedBy: { type: String }
});

// Schéma pour les vulnérabilités
const VulnerabilityFindingSchema = new Schema({
  id: { type: String, required: true },
  vulnerability: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  cvss: { type: Number },
  cve: { type: String },
  service: { type: String, required: true },
  port: { type: Number, required: true },
  description: { type: String, required: true },
  impact: { type: String, required: true },
  evidence: [{ type: String }],
  fix: { type: String, required: true },
  references: [{ type: String }]
});

// Schéma pour le rapport final
const FinalReportSchema = new Schema({
  executiveSummary: { type: String, required: true },
  attackNarrative: { type: String, required: true },
  methodologyUsed: [{ type: String }],
  findings: [VulnerabilityFindingSchema],
  statistiques: {
    totalPortsScanned: { type: Number, default: 0 },
    openPorts: { type: Number, default: 0 },
    vulnerabilitiesFound: { type: Number, default: 0 },
    criticalFindings: { type: Number, default: 0 },
    highFindings: { type: Number, default: 0 },
    mediumFindings: { type: Number, default: 0 },
    lowFindings: { type: Number, default: 0 }
  },
  remediationPlan: [{
    priority: { type: Number, required: true },
    vulnerability: { type: String, required: true },
    fix: { type: String, required: true },
    estimatedEffort: { type: String, required: true },
    businessImpact: { type: String, required: true }
  }],
  appendices: {
    rawScanResults: { type: String },
    toolOutputs: { type: Schema.Types.Mixed },
    screenshots: [{ type: String }]
  }
});

// Schéma principal pour les sessions d'agents
const AgentSessionSchema = new Schema<IAgentSession>({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  userId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['ANALYZING', 'PLANNING', 'ATTACKING', 'REPORTING', 'DONE', 'FAILED', 'WAITING_USER_APPROVAL'],
    default: 'ANALYZING'
  },
  mode: { 
    type: String, 
    enum: ['auto', 'semi-auto'],
    required: true 
  },
  initialPrompt: { type: String, required: true },
  targetIp: { type: String, required: true },
  targetDescription: { type: String },
  discoveredData: DiscoveredDataSchema,
  executionPlan: [ExecutionStepSchema],
  currentStep: { type: Number, default: 0 },
  finalReport: FinalReportSchema,
  agentConfigurations: {
    type: Schema.Types.Mixed,
    default: {
      PlanningAgent: { modelProvider: 'google', modelName: 'gemini-2.0-flash', temperature: 0.7 },
      ScanningAgent: { modelProvider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
      MAIPAgent: { modelProvider: 'google', modelName: 'gemini-2.0-flash', temperature: 0.5 },
      CalderaAgent: { modelProvider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
      ShenninaPentestAgent: { modelProvider: 'google', modelName: 'gemini-2.0-flash', temperature: 0.5 },
      ReportAgent: { modelProvider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022', temperature: 0.8 },
      FixingAgent: { modelProvider: 'google', modelName: 'gemini-2.0-flash', temperature: 0.6 }
    }
  },
  metadata: {
    totalExecutionTime: { type: Number },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    lastActivity: { type: Date, default: Date.now },
    planningTime: { type: Number },
    attackingTime: { type: Number },
    reportingTime: { type: Number }
  }
}, {
  timestamps: true,
  collection: 'agent_sessions'
});

// Index pour les performances
AgentSessionSchema.index({ sessionId: 1 });
AgentSessionSchema.index({ userId: 1, createdAt: -1 });
AgentSessionSchema.index({ status: 1 });

// Méthodes d'instance pour la gestion des étapes
AgentSessionSchema.methods.getNextPendingStep = function(): ExecutionStep | null {
  return this.executionPlan.find((step: ExecutionStep) => step.status === 'PENDING') || null;
};

AgentSessionSchema.methods.updateStepStatus = function(
  stepIndex: number, 
  status: StepStatus, 
  results?: any, 
  errorMessage?: string
): void {
  if (stepIndex >= 0 && stepIndex < this.executionPlan.length) {
    this.executionPlan[stepIndex].status = status;
    if (results !== undefined) {
      this.executionPlan[stepIndex].results = results;
    }
    if (errorMessage) {
      this.executionPlan[stepIndex].errorMessage = errorMessage;
    }
    this.executionPlan[stepIndex].updatedAt = new Date();
  }
};

AgentSessionSchema.methods.addLog = function(stepIndex: number, logMessage: string): void {
  if (stepIndex >= 0 && stepIndex < this.executionPlan.length) {
    if (!this.executionPlan[stepIndex].logs) {
      this.executionPlan[stepIndex].logs = [];
    }
    this.executionPlan[stepIndex].logs.push(logMessage);
  }
};

export const AgentSession = mongoose.model<IAgentSession>('AgentSession', AgentSessionSchema); 