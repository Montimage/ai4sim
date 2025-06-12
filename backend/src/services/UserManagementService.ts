import { User, IUser, IPermission, SYSTEM_ROLES } from '../models/User';
import { Role, IRole } from '../models/Role';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role: string;
  customRoles?: string[];
  permissions?: IPermission[];
  createdBy: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
  customRoles?: string[];
  permissions?: IPermission[];
  isActive?: boolean;
}

export interface UserSearchFilters {
  role?: string;
  department?: string;
  isActive?: boolean;
  search?: string; // Recherche dans username, email, firstName, lastName
}

export interface SecurityAuditLog {
  userId: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}

export class UserManagementService {
  
  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData: CreateUserData): Promise<IUser> {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // Valider le rôle
      if (!Object.keys(SYSTEM_ROLES).includes(userData.role)) {
        throw new Error('Invalid role specified');
      }

      // Créer l'utilisateur
      const user = new User({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        department: userData.department,
        role: userData.role,
        customRoles: userData.customRoles || [],
        permissions: userData.permissions || [],
        createdBy: userData.createdBy,
        isActive: true,
        isEmailVerified: false,
        securitySettings: {
          mfaEnabled: false,
          passwordLastChanged: new Date(),
          failedLoginAttempts: 0,
          passwordHistory: []
        },
        sessions: [],
        preferences: {
          theme: 'light',
          language: 'fr',
          timezone: 'Europe/Paris',
          notifications: {
            email: true,
            browser: true,
            security: true
          }
        }
      });

      await user.save();
      
      logger.info(`User created: ${user.username}`, {
        userId: user._id,
        createdBy: userData.createdBy,
        role: user.role
      });

      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId: string, updateData: UpdateUserData, updatedBy: string): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Vérifier les conflits d'username/email
      if (updateData.username || updateData.email) {
        const conflictQuery: any = { _id: { $ne: userId } };
        if (updateData.username) conflictQuery.username = updateData.username;
        if (updateData.email) conflictQuery.email = updateData.email;

        const existingUser = await User.findOne(conflictQuery);
        if (existingUser) {
          throw new Error('Username or email already exists');
        }
      }

      // Valider le rôle si fourni
      if (updateData.role && !Object.keys(SYSTEM_ROLES).includes(updateData.role)) {
        throw new Error('Invalid role specified');
      }

      // Appliquer les mises à jour
      Object.assign(user, updateData);
      await user.save();

      logger.info(`User updated: ${user.username}`, {
        userId: user._id,
        updatedBy,
        changes: Object.keys(updateData)
      });

      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Empêcher la suppression du dernier super admin
      if (user.role === 'super_admin') {
        const superAdminCount = await User.countDocuments({ 
          role: 'super_admin', 
          isActive: true,
          _id: { $ne: userId }
        });
        
        if (superAdminCount === 0) {
          throw new Error('Cannot delete the last super administrator');
        }
      }

      user.isActive = false;
      user.sessions = []; // Déconnecter toutes les sessions
      await user.save();

      logger.info(`User deleted: ${user.username}`, {
        userId: user._id,
        deletedBy
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Rechercher des utilisateurs avec filtres
   */
  async searchUsers(filters: UserSearchFilters, page: number = 1, limit: number = 20): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      // Appliquer les filtres
      if (filters.role) {
        query.role = filters.role;
      }

      if (filters.department) {
        query.department = filters.department;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.search) {
        query.$or = [
          { username: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const total = await User.countDocuments(query);
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      const users = await User.find(query)
        .select('-password -securitySettings.mfaSecret -securitySettings.passwordHistory')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        users,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Obtenir un utilisateur par ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      return await User.findById(userId)
        .select('-password -securitySettings.mfaSecret -securitySettings.passwordHistory')
        .populate('createdBy', 'username');
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Vérifier le mot de passe actuel
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Vérifier que le nouveau mot de passe n'est pas dans l'historique
      if (user.securitySettings.passwordHistory) {
        for (const oldPasswordHash of user.securitySettings.passwordHistory) {
          const isOldPassword = await bcrypt.compare(newPassword, oldPasswordHash);
          if (isOldPassword) {
            throw new Error('Cannot reuse a recent password');
          }
        }
      }

      // Mettre à jour le mot de passe
      user.password = newPassword;
      await user.save();

      // Déconnecter toutes les sessions sauf la session actuelle
      // (à implémenter selon votre système de sessions)

      logger.info(`Password changed for user: ${user.username}`, {
        userId: user._id
      });
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Réinitialiser le mot de passe d'un utilisateur
   */
  async resetPassword(userId: string, resetBy: string): Promise<string> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Générer un mot de passe temporaire
      const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
      
      user.password = tempPassword;
      user.sessions = []; // Déconnecter toutes les sessions
      await user.save();

      logger.info(`Password reset for user: ${user.username}`, {
        userId: user._id,
        resetBy
      });

      return tempPassword;
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Verrouiller/déverrouiller un utilisateur
   */
  async toggleUserLock(userId: string, lock: boolean, actionBy: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (lock) {
        user.securitySettings.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        user.sessions = []; // Déconnecter toutes les sessions
      } else {
        user.securitySettings.lockedUntil = undefined;
        user.securitySettings.failedLoginAttempts = 0;
      }

      await user.save();

      logger.info(`User ${lock ? 'locked' : 'unlocked'}: ${user.username}`, {
        userId: user._id,
        actionBy
      });
    } catch (error) {
      logger.error('Error toggling user lock:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des utilisateurs
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    locked: number;
    byRole: { [role: string]: number };
    byDepartment: { [department: string]: number };
    recentLogins: number;
  }> {
    try {
      const total = await User.countDocuments();
      const active = await User.countDocuments({ isActive: true });
      const locked = await User.countDocuments({ 
        'securitySettings.lockedUntil': { $gt: new Date() } 
      });

      // Statistiques par rôle
      const roleStats = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      const byRole: { [role: string]: number } = {};
      roleStats.forEach(stat => {
        byRole[stat._id] = stat.count;
      });

      // Statistiques par département
      const deptStats = await User.aggregate([
        { $match: { department: { $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]);
      const byDepartment: { [department: string]: number } = {};
      deptStats.forEach(stat => {
        byDepartment[stat._id] = stat.count;
      });

      // Connexions récentes (dernières 24h)
      const recentLogins = await User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return {
        total,
        active,
        locked,
        byRole,
        byDepartment,
        recentLogins
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Créer un rôle personnalisé
   */
  async createRole(roleData: {
    name: string;
    description: string;
    permissions: IPermission[];
    priority?: number;
    createdBy: string;
  }): Promise<IRole> {
    try {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (existingRole) {
        throw new Error('Role name already exists');
      }

      const role = new Role({
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
        isSystem: false,
        priority: roleData.priority || 50,
        createdBy: roleData.createdBy
      });

      await role.save();

      logger.info(`Custom role created: ${role.name}`, {
        roleId: role._id,
        createdBy: roleData.createdBy
      });

      return role;
    } catch (error) {
      logger.error('Error creating role:', error);
      throw error;
    }
  }

  /**
   * Obtenir tous les rôles (système + personnalisés)
   */
  async getAllRoles(): Promise<{
    systemRoles: typeof SYSTEM_ROLES;
    customRoles: IRole[];
  }> {
    try {
      const customRoles = await Role.find({ isSystem: false })
        .populate('createdBy', 'username')
        .sort({ priority: -1, name: 1 });

      return {
        systemRoles: SYSTEM_ROLES,
        customRoles
      };
    } catch (error) {
      logger.error('Error getting roles:', error);
      throw error;
    }
  }

  /**
   * Audit de sécurité - obtenir les logs d'activité
   */
  async getSecurityAuditLogs(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }, page: number = 1, limit: number = 50): Promise<{
    logs: SecurityAuditLog[];
    total: number;
  }> {
    // Cette méthode nécessiterait un modèle AuditLog séparé
    // Pour l'instant, on retourne les logs depuis les sessions utilisateur
    try {
      const query: any = {};
      
      if (filters.userId) {
        query._id = filters.userId;
      }

      const users = await User.find(query)
        .select('username sessions')
        .populate('sessions');

      // Transformer les sessions en logs d'audit
      const logs: SecurityAuditLog[] = [];
      users.forEach(user => {
        user.sessions.forEach(session => {
          logs.push({
            userId: user._id.toString(),
            action: 'login',
            resource: 'session',
            details: {
              sessionId: session.sessionId,
              username: user.username
            },
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            timestamp: session.createdAt,
            success: true
          });
        });
      });

      // Trier par date décroissante
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const total = logs.length;
      const startIndex = (page - 1) * limit;
      const paginatedLogs = logs.slice(startIndex, startIndex + limit);

      return {
        logs: paginatedLogs,
        total
      };
    } catch (error) {
      logger.error('Error getting security audit logs:', error);
      throw error;
    }
  }
}

export default new UserManagementService(); 