import mongoose, { Schema, Document } from 'mongoose';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ICampaign extends Document {
  name: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  status: CampaignStatus;
  scheduledFor?: Date;
  scenarioIds: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  executionProgress?: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
}

const CampaignSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { 
    type: String, 
    enum: Object.values(CampaignStatus),
    default: CampaignStatus.DRAFT
  },
  scheduledFor: { type: Date },
  scenarioIds: [{ type: Schema.Types.ObjectId, ref: 'Scenario' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date },
  executionProgress: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    running: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Méthode pour mettre à jour l'état d'avancement de la campagne
CampaignSchema.methods.updateExecutionProgress = async function() {
  // Cette méthode sera implémentée plus tard
};

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
