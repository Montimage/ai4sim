import mongoose, { Schema, Document } from 'mongoose';
import { IPermission } from './User';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: IPermission[];
  isSystem: boolean;
  priority: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  permissions: [{
    resource: { type: String, required: true },
    actions: [{ type: String, required: true }],
    conditions: {
      own: { type: Boolean, default: false },
      shared: { type: Boolean, default: false },
      department: [{ type: String }]
    }
  }],
  isSystem: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 50,
    min: 1,
    max: 100
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour les performances
RoleSchema.index({ name: 1 });
RoleSchema.index({ isSystem: 1 });
RoleSchema.index({ priority: -1 });

// Empêcher la suppression des rôles système
RoleSchema.pre('deleteOne', function(next: any) {
  const role = this as any;
  if (role.isSystem) {
    return next(new Error('Cannot delete system roles'));
  }
  next();
});

RoleSchema.pre('findOneAndDelete', function(next: any) {
  const role = this as any;
  if (role.isSystem) {
    return next(new Error('Cannot delete system roles'));
  }
  next();
});

export const Role = mongoose.model<IRole>('Role', RoleSchema); 