import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPermission {
  resource: string; // 'projects', 'campaigns', 'scenarios', 'executions', 'users', 'system'
  actions: string[]; // ['create', 'read', 'update', 'delete', 'execute', 'share', 'admin']
  conditions?: {
    own?: boolean; // Peut seulement agir sur ses propres ressources
    shared?: boolean; // Peut agir sur les ressources partagées avec lui
    department?: string[]; // Limité à certains départements
  };
}

export interface IRole {
  name: string;
  description: string;
  permissions: IPermission[];
  isSystem: boolean; // Rôle système non modifiable
  priority: number; // Priorité pour résolution de conflits
}

export interface IUserSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface ISecuritySettings {
  mfaEnabled: boolean;
  mfaSecret?: string;
  passwordLastChanged: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordHistory: string[]; // Hash des 5 derniers mots de passe
  securityQuestions?: Array<{
    question: string;
    answerHash: string;
  }>;
}

export interface IUser extends mongoose.Document {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role: 'super_admin' | 'admin' | 'project_manager' | 'security_analyst' | 'user' | 'viewer';
  customRoles: string[]; // Références vers des rôles personnalisés
  permissions: IPermission[]; // Permissions spécifiques à l'utilisateur
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  securitySettings: ISecuritySettings;
  sessions: IUserSession[];
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
    notifications: {
      browser: boolean;
      security: boolean;
    };
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(resource: string, action: string, context?: any): boolean;
  getEffectivePermissions(): IPermission[];
  addSession(sessionData: Partial<IUserSession>): void;
  removeSession(sessionId: string): void;
  incrementFailedLogin(): void;
  resetFailedLogin(): void;
  isLocked(): boolean;
}

// Définition des rôles système par défaut
export const SYSTEM_ROLES: { [key: string]: IRole } = {
  super_admin: {
    name: 'Super Administrator',
    description: 'Accès complet à toutes les fonctionnalités du système',
    isSystem: true,
    priority: 100,
    permissions: [
      {
        resource: '*',
        actions: ['*']
      }
    ]
  },
  admin: {
    name: 'Administrator',
    description: 'Gestion des utilisateurs et configuration système',
    isSystem: true,
    priority: 90,
    permissions: [
      {
        resource: 'users',
        actions: ['create', 'read', 'update', 'delete', 'admin']
      },
      {
        resource: 'projects',
        actions: ['create', 'read', 'update', 'delete', 'share', 'admin']
      },
      {
        resource: 'campaigns',
        actions: ['create', 'read', 'update', 'delete', 'execute', 'share']
      },
      {
        resource: 'scenarios',
        actions: ['create', 'read', 'update', 'delete', 'execute', 'share']
      },
      {
        resource: 'executions',
        actions: ['read', 'delete', 'admin']
      },
      {
        resource: 'system',
        actions: ['read', 'update', 'admin']
      }
    ]
  },
  project_manager: {
    name: 'Project Manager',
    description: 'Gestion complète des projets et équipes',
    isSystem: true,
    priority: 80,
    permissions: [
      {
        resource: 'projects',
        actions: ['create', 'read', 'update', 'delete', 'share'],
        conditions: { own: true, shared: true }
      },
      {
        resource: 'campaigns',
        actions: ['create', 'read', 'update', 'delete', 'execute', 'share'],
        conditions: { own: true, shared: true }
      },
      {
        resource: 'scenarios',
        actions: ['create', 'read', 'update', 'delete', 'execute', 'share'],
        conditions: { own: true, shared: true }
      },
      {
        resource: 'executions',
        actions: ['read', 'delete'],
        conditions: { own: true, shared: true }
      },
      {
        resource: 'users',
        actions: ['read'],
        conditions: { department: [] }
      }
    ]
  },
  security_analyst: {
    name: 'Security Analyst',
    description: 'Analyse de sécurité et exécution de tests',
    isSystem: true,
    priority: 70,
    permissions: [
      {
        resource: 'projects',
        actions: ['read'],
        conditions: { shared: true }
      },
      {
        resource: 'campaigns',
        actions: ['read', 'execute'],
        conditions: { shared: true }
      },
      {
        resource: 'scenarios',
        actions: ['create', 'read', 'update', 'execute'],
        conditions: { own: true, shared: true }
      },
      {
        resource: 'executions',
        actions: ['create', 'read'],
        conditions: { own: true, shared: true }
      }
    ]
  },
  user: {
    name: 'User',
    description: 'Utilisateur standard avec accès limité',
    isSystem: true,
    priority: 60,
    permissions: [
      {
        resource: 'projects',
        actions: ['read'],
        conditions: { own: true, shared: true }
      },
      {
        resource: 'campaigns',
        actions: ['read'],
        conditions: { shared: true }
      },
      {
        resource: 'scenarios',
        actions: ['read', 'execute'],
        conditions: { shared: true }
      },
      {
        resource: 'executions',
        actions: ['read'],
        conditions: { own: true, shared: true }
      }
    ]
  },
  viewer: {
    name: 'Viewer',
    description: 'Accès en lecture seule',
    isSystem: true,
    priority: 50,
    permissions: [
      {
        resource: 'projects',
        actions: ['read'],
        conditions: { shared: true }
      },
      {
        resource: 'campaigns',
        actions: ['read'],
        conditions: { shared: true }
      },
      {
        resource: 'scenarios',
        actions: ['read'],
        conditions: { shared: true }
      },
      {
        resource: 'executions',
        actions: ['read'],
        conditions: { shared: true }
      }
    ]
  }
};

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_-]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'project_manager', 'security_analyst', 'user', 'viewer'],
    default: 'user'
  },
  customRoles: [{
    type: String,
    ref: 'Role'
  }],
  permissions: [{
    resource: { type: String, required: true },
    actions: [{ type: String, required: true }],
    conditions: {
      own: { type: Boolean, default: false },
      shared: { type: Boolean, default: false },
      department: [{ type: String }]
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  securitySettings: {
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    passwordLastChanged: { type: Date, default: Date.now },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    passwordHistory: [{ type: String }],
    securityQuestions: [{
      question: { type: String },
      answerHash: { type: String }
    }]
  },
  sessions: [{
    sessionId: { type: String, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'fr' },
    timezone: { type: String, default: 'Europe/Paris' },
    notifications: {
      browser: { type: Boolean, default: true },
      security: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Index pour les performances
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'sessions.sessionId': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    // Initialiser securitySettings si undefined
    if (!this.securitySettings) {
      this.securitySettings = {
        mfaEnabled: false,
        passwordLastChanged: new Date(),
        failedLoginAttempts: 0,
        passwordHistory: [],
        securityQuestions: []
      };
    }
    
    // S'assurer que securitySettings existe maintenant avec assertion de type
    const securitySettings = this.securitySettings!;
    
    // Ajouter à l'historique des mots de passe
    if (securitySettings.passwordHistory) {
      securitySettings.passwordHistory.unshift(hashedPassword);
      // Garder seulement les 5 derniers
      securitySettings.passwordHistory = securitySettings.passwordHistory.slice(0, 5);
    } else {
      securitySettings.passwordHistory = [hashedPassword];
    }
    
    this.password = hashedPassword;
    securitySettings.passwordLastChanged = new Date();
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Méthodes d'instance
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function(resource: string, action: string, context?: any): boolean {
  const effectivePermissions = this.getEffectivePermissions();
  
  return effectivePermissions.some((permission: IPermission) => {
    // Vérifier la ressource
    if (permission.resource !== '*' && permission.resource !== resource) {
      return false;
    }
    
    // Vérifier l'action
    if (!permission.actions.includes('*') && !permission.actions.includes(action)) {
      return false;
    }
    
    // Vérifier les conditions si présentes
    if (permission.conditions && context) {
      if (permission.conditions.own && context.ownerId && context.ownerId.toString() !== this._id.toString()) {
        return false;
      }
      
      if (permission.conditions.shared && context.sharedWith && 
          !context.sharedWith.some((share: any) => share.userId.toString() === this._id.toString())) {
        return false;
      }
      
      if (permission.conditions.department && permission.conditions.department.length > 0 && 
          this.department && !permission.conditions.department.includes(this.department)) {
        return false;
      }
    }
    
    return true;
  });
};

userSchema.methods.getEffectivePermissions = function(): IPermission[] {
  const permissions: IPermission[] = [];
  
  // Permissions du rôle système
  const systemRole = SYSTEM_ROLES[this.role];
  if (systemRole) {
    permissions.push(...systemRole.permissions);
  }
  
  // Permissions personnalisées de l'utilisateur
  if (this.permissions) {
    permissions.push(...this.permissions);
  }
  
  return permissions;
};

userSchema.methods.addSession = function(sessionData: Partial<IUserSession>): void {
  const session: IUserSession = {
    sessionId: sessionData.sessionId || '',
    ipAddress: sessionData.ipAddress || '',
    userAgent: sessionData.userAgent || '',
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true
  };
  
  if (!this.sessions) {
    this.sessions = [];
  }
  
  this.sessions.push(session);
  
  // Limiter à 10 sessions actives maximum
  if (this.sessions.length > 10) {
    this.sessions = this.sessions.slice(-10);
  }
};

userSchema.methods.removeSession = function(sessionId: string): void {
  if (this.sessions) {
    this.sessions = this.sessions.filter((session: IUserSession) => session.sessionId !== sessionId);
  }
};

userSchema.methods.incrementFailedLogin = function(): void {
  if (!this.securitySettings) {
    this.securitySettings = {
      mfaEnabled: false,
      passwordLastChanged: new Date(),
      failedLoginAttempts: 0,
      passwordHistory: []
    };
  }
  
  this.securitySettings.failedLoginAttempts += 1;
  
  // Verrouiller après 5 tentatives échouées
  if (this.securitySettings.failedLoginAttempts >= 5) {
    this.securitySettings.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
};

userSchema.methods.resetFailedLogin = function(): void {
  if (this.securitySettings) {
    this.securitySettings.failedLoginAttempts = 0;
    this.securitySettings.lockedUntil = undefined;
  }
};

userSchema.methods.isLocked = function(): boolean {
  return !!(this.securitySettings?.lockedUntil && this.securitySettings.lockedUntil > new Date());
};

export const User = mongoose.model<IUser>('User', userSchema);
