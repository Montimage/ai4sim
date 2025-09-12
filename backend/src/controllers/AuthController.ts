import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const result = await AuthService.login(username, password);
      return res.json(result);
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(401).json({ message: error instanceof Error ? error.message : 'Authentication failed' });
    }
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { username, password, firstName, lastName, role = 'user' } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Validation du mot de passe
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Validation du nom d'utilisateur
      if (username.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters long' });
      }

      // Validation du rôle
      const validSystemRoles = ['user', 'admin', 'super_admin']; // Seulement les rôles système
      if (!validSystemRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid system role specified' });
      }

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur existe déjà' });
      }

      const user = new User({
        username,
        password,
        firstName: firstName || '',
        lastName: lastName || '',
        role,
        isActive: true,
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
            browser: true,
            security: true
          }
        }
      });

      await user.save();
      
      // Retourner un message de succès sans se connecter automatiquement
      return res.status(201).json({ 
        message: 'User created successfully',
        user: {
          _id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Register error:', error);
      return res.status(400).json({ message: error instanceof Error ? error.message : 'Registration failed' });
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?._id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long' });
      }

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        const errorMessage = 'Current password is incorrect';
        logger.info(`Sending error message: ${errorMessage}`);
        return res.status(400).json({ message: errorMessage });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user ${user.username}`);
      return res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      return res.status(500).json({ message: 'Failed to change password' });
    }
  }
}
