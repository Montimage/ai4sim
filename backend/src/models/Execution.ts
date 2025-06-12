import mongoose, { Document, Schema } from 'mongoose';

export interface OutputLine {
  content: string;
  type: 'info' | 'error' | 'warning' | 'success';
  timestamp: Date;
}

export interface AttackExecution {
  id: string;
  name: string;
  tool: string;
  status: 'completed' | 'failed' | 'stopped' | 'error' | 'running' | 'pending';
  startTime?: Date;
  endTime?: Date;
  parameters: Record<string, any>;
  output: OutputLine[];
}

export interface TargetInfo {
  id: string;
  name: string;
  host: string;
  port?: number;
  description?: string;
}

export interface IExecution extends Document {
  id: string;
  scenarioId: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  status: 'completed' | 'failed' | 'stopped' | 'error' | 'running';
  isSequential: boolean;
  output: OutputLine[];
  attacks: AttackExecution[];
  targets: TargetInfo[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutputLineSchema = new Schema({
  content: { type: String, required: true },
  type: { type: String, enum: ['info', 'error', 'warning', 'success'], required: true },
  timestamp: { type: Date, default: Date.now }
});

const AttackExecutionSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  tool: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['completed', 'failed', 'stopped', 'error', 'running', 'pending'], 
    default: 'pending' 
  },
  startTime: { type: Date },
  endTime: { type: Date },
  parameters: { type: Schema.Types.Mixed, default: {} },
  output: [OutputLineSchema]
});

const TargetInfoSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  host: { type: String, required: true },
  port: { type: Number },
  description: { type: String }
});

const ExecutionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  scenarioId: { type: String, required: true },
  scenarioName: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: { 
    type: String, 
    enum: ['completed', 'failed', 'stopped', 'error', 'running'], 
    default: 'running' 
  },
  isSequential: { type: Boolean, default: false },
  output: [OutputLineSchema],
  attacks: [AttackExecutionSchema],
  targets: [TargetInfoSchema],
  userId: { type: String, required: true }
}, {
  timestamps: true
});

// Index pour améliorer les performances
ExecutionSchema.index({ scenarioId: 1 });
ExecutionSchema.index({ userId: 1 });
ExecutionSchema.index({ startTime: -1 });
ExecutionSchema.index({ status: 1 });

export const Execution = mongoose.model<IExecution>('Execution', ExecutionSchema); 