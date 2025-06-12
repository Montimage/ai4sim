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
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur existe déjà' });
      }

      const user = new User({
        username,
        password,
        role: 'user',
        isActive: true
      });

      await user.save();
      const result = await AuthService.login(username, password);
      return res.status(201).json(result);
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
