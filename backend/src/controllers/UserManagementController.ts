import { Response } from 'express';
import { PermissionRequest } from '../middleware/permissions';
import UserManagementService, { CreateUserData, UpdateUserData, UserSearchFilters } from '../services/UserManagementService';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';

export class UserManagementController {

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const currentUser = req.user as IUser;
      const userData: CreateUserData = {
        ...req.body,
        createdBy: currentUser._id
      };

      // Validation des données
      if (!userData.username || !userData.email || !userData.password) {
        return res.status(400).json({
          message: 'Username, email and password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validation du mot de passe
      if (userData.password.length < 8) {
        return res.status(400).json({
          message: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return res.status(400).json({
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
      }

      const user = await UserManagementService.createUser(userData);
      
      // Retourner l'utilisateur sans le mot de passe
      const { password, ...userResponse } = user.toObject();
      
      return res.status(201).json({
        message: 'User created successfully',
        user: userResponse
      });
    } catch (error) {
      logger.error('Error in createUser:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            message: error.message,
            code: 'USER_EXISTS'
          });
        }
        
        if (error.message.includes('Invalid role')) {
          return res.status(400).json({
            message: error.message,
            code: 'INVALID_ROLE'
          });
        }
      }
      
      return res.status(500).json({
        message: 'Failed to create user',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtenir la liste des utilisateurs avec filtres et pagination
   */
  async getUsers(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const filters: UserSearchFilters = {
        role: req.query.role as string,
        department: req.query.department as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string
      };

      const result = await UserManagementService.searchUsers(filters, page, limit);
      
      return res.json({
        message: 'Users retrieved successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error in getUsers:', error);
      return res.status(500).json({
        message: 'Failed to retrieve users',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtenir un utilisateur par ID
   */
  async getUserById(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      
      const user = await UserManagementService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      return res.json({
        message: 'User retrieved successfully',
        user
      });
    } catch (error) {
      logger.error('Error in getUserById:', error);
      return res.status(500).json({
        message: 'Failed to retrieve user',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const currentUser = req.user as IUser;
      const updateData: UpdateUserData = req.body;

      // Validation de l'email si fourni
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json({
            message: 'Invalid email format',
            code: 'INVALID_EMAIL'
          });
        }
      }

      const user = await UserManagementService.updateUser(userId, updateData, currentUser._id);
      
      return res.json({
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      logger.error('Error in updateUser:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            message: error.message,
            code: 'USER_NOT_FOUND'
          });
        }
        
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            message: error.message,
            code: 'USER_EXISTS'
          });
        }
        
        if (error.message.includes('Invalid role')) {
          return res.status(400).json({
            message: error.message,
            code: 'INVALID_ROLE'
          });
        }
      }
      
      return res.status(500).json({
        message: 'Failed to update user',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  async deleteUser(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const currentUser = req.user as IUser;

      // Empêcher l'auto-suppression
      if (userId === currentUser._id.toString()) {
        return res.status(400).json({
          message: 'Cannot delete your own account',
          code: 'SELF_DELETE_FORBIDDEN'
        });
      }

      await UserManagementService.deleteUser(userId, currentUser._id);
      
      return res.json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteUser:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            message: error.message,
            code: 'USER_NOT_FOUND'
          });
        }
        
        if (error.message.includes('last super administrator')) {
          return res.status(400).json({
            message: error.message,
            code: 'LAST_ADMIN_DELETE_FORBIDDEN'
          });
        }
      }
      
      return res.status(500).json({
        message: 'Failed to delete user',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;
      const currentUser = req.user as IUser;

      // Validation des données
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: 'Current password and new password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validation du nouveau mot de passe
      if (newPassword.length < 8) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      // Seul l'utilisateur lui-même ou un admin peut changer le mot de passe
      if (userId !== currentUser._id.toString() && !['super_admin', 'admin'].includes(currentUser.role)) {
        return res.status(403).json({
          message: 'Cannot change password for another user',
          code: 'PERMISSION_DENIED'
        });
      }

      await UserManagementService.changePassword(userId, currentPassword, newPassword);
      
      return res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Error in changePassword:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            message: error.message,
            code: 'USER_NOT_FOUND'
          });
        }
        
        if (error.message.includes('incorrect')) {
          return res.status(400).json({
            message: error.message,
            code: 'INVALID_PASSWORD'
          });
        }
        
        if (error.message.includes('reuse')) {
          return res.status(400).json({
            message: error.message,
            code: 'PASSWORD_REUSE'
          });
        }
      }
      
      return res.status(500).json({
        message: 'Failed to change password',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Réinitialiser le mot de passe d'un utilisateur
   */
  async resetPassword(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const currentUser = req.user as IUser;

      const tempPassword = await UserManagementService.resetPassword(userId, currentUser._id);
      
      return res.json({
        message: 'Password reset successfully',
        tempPassword
      });
    } catch (error) {
      logger.error('Error in resetPassword:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          message: error.message,
          code: 'USER_NOT_FOUND'
        });
      }
      
      return res.status(500).json({
        message: 'Failed to reset password',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Verrouiller/déverrouiller un utilisateur
   */
  async toggleUserLock(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { lock } = req.body;
      const currentUser = req.user as IUser;

      // Empêcher l'auto-verrouillage
      if (userId === currentUser._id.toString()) {
        return res.status(400).json({
          message: 'Cannot lock your own account',
          code: 'SELF_LOCK_FORBIDDEN'
        });
      }

      await UserManagementService.toggleUserLock(userId, lock, currentUser._id);
      
      return res.json({
        message: `User ${lock ? 'locked' : 'unlocked'} successfully`
      });
    } catch (error) {
      logger.error('Error in toggleUserLock:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          message: error.message,
          code: 'USER_NOT_FOUND'
        });
      }
      
      return res.status(500).json({
        message: 'Failed to toggle user lock',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtenir les statistiques des utilisateurs
   */
  async getUserStats(_req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const stats = await UserManagementService.getUserStats();
      
      return res.json({
        message: 'User statistics retrieved successfully',
        stats
      });
    } catch (error) {
      logger.error('Error in getUserStats:', error);
      return res.status(500).json({
        message: 'Failed to retrieve user statistics',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Créer un rôle personnalisé
   */
  async createRole(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const currentUser = req.user as IUser;
      const roleData = {
        ...req.body,
        createdBy: currentUser._id
      };

      // Validation des données
      if (!roleData.name || !roleData.description || !roleData.permissions) {
        return res.status(400).json({
          message: 'Name, description and permissions are required',
          code: 'VALIDATION_ERROR'
        });
      }

      const role = await UserManagementService.createRole(roleData);
      
      return res.status(201).json({
        message: 'Role created successfully',
        role
      });
    } catch (error) {
      logger.error('Error in createRole:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          message: error.message,
          code: 'ROLE_EXISTS'
        });
      }
      
      return res.status(500).json({
        message: 'Failed to create role',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtenir tous les rôles
   */
  async getRoles(_req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const roles = await UserManagementService.getAllRoles();
      
      return res.json({
        message: 'Roles retrieved successfully',
        ...roles
      });
    } catch (error) {
      logger.error('Error in getRoles:', error);
      return res.status(500).json({
        message: 'Failed to retrieve roles',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtenir les logs d'audit de sécurité
   */
  async getSecurityAuditLogs(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const filters = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const result = await UserManagementService.getSecurityAuditLogs(filters, page, limit);
      
      return res.json({
        message: 'Security audit logs retrieved successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error in getSecurityAuditLogs:', error);
      return res.status(500).json({
        message: 'Failed to retrieve security audit logs',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Obtenir le profil de l'utilisateur connecté
   */
  async getMyProfile(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const currentUser = req.user as IUser;
      
      const user = await UserManagementService.getUserById(currentUser._id);
      
      if (!user) {
        return res.status(404).json({
          message: 'User profile not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      return res.json({
        message: 'Profile retrieved successfully',
        user
      });
    } catch (error) {
      logger.error('Error in getMyProfile:', error);
      return res.status(500).json({
        message: 'Failed to retrieve profile',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Mettre à jour le profil de l'utilisateur connecté
   */
  async updateMyProfile(req: PermissionRequest, res: Response): Promise<Response> {
    try {
      const currentUser = req.user as IUser;
      const updateData: UpdateUserData = req.body;

      // Empêcher la modification du rôle et des permissions via cette route
      delete updateData.role;
      delete updateData.permissions;
      delete updateData.isActive;

      // Validation de l'email si fourni
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json({
            message: 'Invalid email format',
            code: 'INVALID_EMAIL'
          });
        }
      }

      const user = await UserManagementService.updateUser(currentUser._id, updateData, currentUser._id);
      
      return res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      logger.error('Error in updateMyProfile:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          message: error.message,
          code: 'USER_EXISTS'
        });
      }
      
      return res.status(500).json({
        message: 'Failed to update profile',
        code: 'INTERNAL_ERROR'
      });
    }
  }
} 