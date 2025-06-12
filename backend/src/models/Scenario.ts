import mongoose, { Schema, Document } from 'mongoose';

// Structure de cible pour un scénario
export interface ITarget {
  host: string;
  name: string;
}

// Structure d'attaque pour un scénario
export enum AttackStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

export interface IAttack {
  _id: mongoose.Types.ObjectId;
  tool: string;
  parameters: Record<string, any>;
  status: AttackStatus;
  processId?: string;
  startTime?: Date;
  endTime?: Date;
  logs?: string[];
  results?: any;
}

// Interface du scénario
export interface IScenario extends Document {
  name: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  campaign?: mongoose.Types.ObjectId;
  targets: ITarget[];
  attacks: IAttack[];
  sequence: boolean; // Si true, les attaques sont exécutées séquentiellement
  status: AttackStatus;
  createdBy: mongoose.Types.ObjectId;
  startTime?: Date;
  endTime?: Date;
  executionTime?: number; // Durée d'exécution en secondes
  createdAt: Date;
  updatedAt: Date;
  startExecution(): Promise<void>;
  pauseExecution(): Promise<void>;
  resumeExecution(): Promise<void>;
  stopExecution(): Promise<void>;
}

// Schéma pour la cible
const TargetSchema = new Schema({
  host: { type: String, required: true },
  name: { type: String, required: true }
});

// Schéma pour l'attaque
const AttackSchema = new Schema({
  tool: { type: String, required: true },
  parameters: { type: Schema.Types.Mixed, default: {} },
  status: { 
    type: String, 
    enum: Object.values(AttackStatus),
    default: AttackStatus.PENDING 
  },
  processId: { type: String },
  startTime: { type: Date },
  endTime: { type: Date },
  logs: [{ type: String }],
  results: { type: Schema.Types.Mixed }
});

// Schéma principal du scénario
const ScenarioSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  targets: [TargetSchema],
  attacks: [AttackSchema],
  sequence: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: Object.values(AttackStatus),
    default: AttackStatus.PENDING 
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  executionTime: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Méthodes pour contrôler l'exécution des scénarios
ScenarioSchema.methods.startExecution = async function() {
  // Cette méthode sera implémentée dans le service d'attaque
};

ScenarioSchema.methods.pauseExecution = async function() {
  // Cette méthode sera implémentée dans le service d'attaque
};

ScenarioSchema.methods.resumeExecution = async function() {
  // Cette méthode sera implémentée dans le service d'attaque
};

ScenarioSchema.methods.stopExecution = async function() {
  // Cette méthode sera implémentée dans le service d'attaque
};

export const Scenario = mongoose.model<IScenario>('Scenario', ScenarioSchema);
