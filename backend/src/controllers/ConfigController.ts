import { Response } from 'express';
import { UserConfig } from '../models/UserConfig';
import { AuthRequest } from '../middleware/auth';

export class ConfigController {
  async getUserConfigs(req: AuthRequest, res: Response) {
    try {
      const userConfig = await UserConfig.findOne({ userId: req.user._id });
      res.json(userConfig?.configs ?? []);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching configurations' });
    }
  }

  async saveUserConfig(req: AuthRequest, res: Response) {
    try {
      const { config } = req.body;
      await UserConfig.findOneAndUpdate(
        { userId: req.user._id },
        { 
          $push: { configs: config }
        },
        { upsert: true }
      );
      res.json({ message: 'Configuration saved' });
    } catch (error) {
      res.status(500).json({ message: 'Error saving configuration' });
    }
  }

  async deleteUserConfig(req: AuthRequest, res: Response) {
    try {
      const { exportDate } = req.params;
      await UserConfig.findOneAndUpdate(
        { userId: req.user._id },
        { 
          $pull: { configs: { exportDate } }
        }
      );
      res.json({ message: 'Configuration deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting configuration' });
    }
  }
}
