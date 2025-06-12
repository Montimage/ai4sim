import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';

export interface PermissionContext {
  ownerId?: string;
  sharedWith?: Array<{ userId: string; role: string }>;
  department?: string;
  projectId?: string;
  campaignId?: string;
  scenarioId?: string;
}

export interface PermissionRequest extends AuthRequest {
  permissionContext?: PermissionContext;
}

/**
 * Middleware pour vérifier les permissions sur une ressource et action spécifiques
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: PermissionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin a tous les droits
      if (user.role === 'super_admin') {
        return next();
      }

      // Construire le contexte de permission
      const context = await buildPermissionContext(req);
      
      // Vérifier la permission
      const hasPermission = user.hasPermission(resource, action, context);
      
      if (!hasPermission) {
        logger.warn(`Permission denied for user ${user.username}: ${action} on ${resource}`, {
          userId: user._id,
          resource,
          action,
          context
        });
        
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: { resource, action }
        });
      }

      // Ajouter le contexte à la requête pour utilisation ultérieure
      req.permissionContext = context;
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({ 
        message: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware pour vérifier plusieurs permissions (OR logic)
 */
export const requireAnyPermission = (permissions: Array<{ resource: string; action: string }>) => {
  return async (req: PermissionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin a tous les droits
      if (user.role === 'super_admin') {
        return next();
      }

      const context = await buildPermissionContext(req);
      
      // Vérifier si l'utilisateur a au moins une des permissions
      const hasAnyPermission = permissions.some(({ resource, action }) => 
        user.hasPermission(resource, action, context)
      );
      
      if (!hasAnyPermission) {
        logger.warn(`Permission denied for user ${user.username}: none of required permissions`, {
          userId: user._id,
          permissions,
          context
        });
        
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: permissions
        });
      }

      req.permissionContext = context;
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({ 
        message: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware pour vérifier toutes les permissions (AND logic)
 */
export const requireAllPermissions = (permissions: Array<{ resource: string; action: string }>) => {
  return async (req: PermissionRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const user = req.user as IUser;
      
      if (!user) {
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin a tous les droits
      if (user.role === 'super_admin') {
        return next();
      }

      const context = await buildPermissionContext(req);
      
      // Vérifier si l'utilisateur a toutes les permissions
      const hasAllPermissions = permissions.every(({ resource, action }) => 
        user.hasPermission(resource, action, context)
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(({ resource, action }) => 
          !user.hasPermission(resource, action, context)
        );
        
        logger.warn(`Permission denied for user ${user.username}: missing permissions`, {
          userId: user._id,
          missingPermissions,
          context
        });
        
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          missing: missingPermissions
        });
      }

      req.permissionContext = context;
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({ 
        message: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware pour vérifier les rôles
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    const user = req.user as IUser;
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(user.role)) {
      logger.warn(`Role access denied for user ${user.username}: required ${roles.join(' or ')}, has ${user.role}`, {
        userId: user._id,
        requiredRoles: roles,
        userRole: user.role
      });
      
      return res.status(403).json({ 
        message: 'Insufficient role',
        code: 'ROLE_DENIED',
        required: roles,
        current: user.role
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est propriétaire de la ressource
 */
export const requireOwnership = (ownerField: string = 'owner') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    const user = req.user as IUser;
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Super admin bypass
    if (user.role === 'super_admin') {
      return next();
    }

    const resourceOwnerId = req.body[ownerField] || req.params[ownerField] || req.query[ownerField];
    
    if (!resourceOwnerId || resourceOwnerId.toString() !== user._id.toString()) {
      logger.warn(`Ownership denied for user ${user.username}`, {
        userId: user._id,
        resourceOwnerId,
        ownerField
      });
      
      return res.status(403).json({ 
        message: 'Resource access denied - ownership required',
        code: 'OWNERSHIP_REQUIRED'
      });
    }

    next();
  };
};

/**
 * Construire le contexte de permission basé sur la requête
 */
async function buildPermissionContext(req: PermissionRequest): Promise<PermissionContext> {
  const context: PermissionContext = {};
  
  // Extraire les IDs des paramètres de route
  if (req.params.projectId) {
    context.projectId = req.params.projectId;
    
    // Charger les informations du projet pour le contexte
    try {
      const { Project } = await import('../models/Project');
      const project = await Project.findById(req.params.projectId);
      if (project) {
        context.ownerId = project.owner.toString();
        context.sharedWith = project.sharedWith.map(share => ({
          userId: share.userId.toString(),
          role: share.role
        }));
      }
    } catch (error) {
      logger.error('Error loading project context:', error);
    }
  }
  
  if (req.params.campaignId) {
    context.campaignId = req.params.campaignId;
  }
  
  if (req.params.scenarioId) {
    context.scenarioId = req.params.scenarioId;
  }
  
  // Extraire du body si présent
  if (req.body.owner || req.body.ownerId) {
    context.ownerId = req.body.owner || req.body.ownerId;
  }
  
  if (req.body.sharedWith) {
    context.sharedWith = req.body.sharedWith;
  }
  
  return context;
}

/**
 * Utilitaire pour vérifier les permissions dans le code
 */
export const checkPermission = async (
  user: IUser, 
  resource: string, 
  action: string, 
  context?: PermissionContext
): Promise<boolean> => {
  if (user.role === 'super_admin') {
    return true;
  }
  
  return user.hasPermission(resource, action, context);
};

/**
 * Middleware pour logger les accès aux ressources
 */
export const logResourceAccess = (resource: string) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const user = req.user as IUser;
    
    if (user) {
      logger.info(`Resource access: ${req.method} ${req.path}`, {
        userId: user._id,
        username: user.username,
        resource,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    next();
  };
}; 