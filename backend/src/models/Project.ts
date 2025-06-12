import mongoose, { Schema, Document } from 'mongoose';

// Interface principale du projet
export interface IProject extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  sharedWith: Array<{
    userId: mongoose.Types.ObjectId;
    username: string;
    role: 'owner' | 'editor' | 'viewer';
  }>;
  campaigns?: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    scenarios: Array<any>;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Schéma principal du projet
const ProjectSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true }
  }],
  campaigns: [{
    _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), required: true },
    name: { type: String, required: true },
    description: { type: String },
    scenarios: [{ type: Schema.Types.Mixed }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Middleware pre-save pour mettre à jour les dates automatiquement
ProjectSchema.pre('save', function(next) {
  const project = this as IProject;
  const now = new Date();
  
  // Solution correcte: vérifier si le tableau de campagnes a été modifié
  // sans utiliser isModified sur les sous-documents individuels
  const modifiedPaths = project.modifiedPaths();
  if (modifiedPaths.some(path => path === 'campaigns' || path.startsWith('campaigns.'))) {
    // Mise à jour des dates pour toutes les campagnes
    if (project.campaigns && project.campaigns.length > 0) {
      project.campaigns.forEach(campaign => {
        campaign.updatedAt = now;
      });
    }
  }
  
  next();
});

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
