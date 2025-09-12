import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Interface corrigée pour les requêtes authentifiées
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export class ExecutionController {
  // Get all executions for the authenticated user
  async getAllExecutions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Utiliser directement le modèle Execution au lieu du service
      const { Execution } = await import('../models/Execution');
      const executions = await Execution.find({ userId })
        .sort({ startTime: -1 })
        .lean();

      logger.info(`Retrieved ${executions.length} executions for user ${userId}`);
      return res.json(executions);
    } catch (error) {
      logger.error('Error retrieving executions:', error);
      return res.status(500).json({ error: 'Failed to retrieve executions' });
    }
  }

  // Get executions for a specific scenario
  async getExecutionsForScenario(req: AuthenticatedRequest, res: Response) {
    try {
      const { scenarioId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const executions = await Execution.find({ 
        scenarioId, 
        userId 
      })
        .sort({ startTime: -1 })
        .lean();

      logger.info(`Retrieved ${executions.length} executions for scenario ${scenarioId}`);
      return res.json(executions);
    } catch (error) {
      logger.error('Error retrieving scenario executions:', error);
      return res.status(500).json({ error: 'Failed to retrieve scenario executions' });
    }
  }

  // Get a specific execution by ID
  async getExecution(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOne({ 
        id: executionId, 
        userId 
      }).lean();

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      return res.json(execution);
    } catch (error) {
      logger.error('Error retrieving execution:', error);
      return res.status(500).json({ error: 'Failed to retrieve execution' });
    }
  }

  // Create a new execution
  async createExecution(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const executionData = {
        ...req.body,
        userId,
        startTime: new Date()
      };

      const execution = new Execution(executionData);
      await execution.save();

      logger.info(`Created new execution ${execution.id} for user ${userId}`);
      return res.status(201).json(execution);
    } catch (error) {
      logger.error('Error creating execution:', error);
      return res.status(500).json({ error: 'Failed to create execution' });
    }
  }

  // Update an execution
  async updateExecution(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOneAndUpdate(
        { id: executionId, userId },
        { ...req.body, updatedAt: new Date() },
        { new: true }
      );

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      logger.info(`Updated execution ${executionId}`);
      return res.json(execution);
    } catch (error) {
      logger.error('Error updating execution:', error);
      return res.status(500).json({ error: 'Failed to update execution' });
    }
  }

  // Delete an execution
  async deleteExecution(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOneAndDelete({ 
        id: executionId, 
        userId 
      });

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      logger.info(`Deleted execution ${executionId}`);
      return res.json({ message: 'Execution deleted successfully' });
    } catch (error) {
      logger.error('Error deleting execution:', error);
      return res.status(500).json({ error: 'Failed to delete execution' });
    }
  }

  // Add output line to execution
  async addOutputLine(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId } = req.params;
      const userId = req.user?.id;
      const outputLine = {
        ...req.body,
        timestamp: new Date()
      };
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOneAndUpdate(
        { id: executionId, userId },
        { 
          $push: { output: outputLine },
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      return res.json(execution);
    } catch (error) {
      logger.error('Error adding output line:', error);
      return res.status(500).json({ error: 'Failed to add output line' });
    }
  }

  // Add output line to specific attack
  async addAttackOutputLine(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId, attackId } = req.params;
      const userId = req.user?.id;
      const outputLine = {
        ...req.body,
        timestamp: new Date()
      };
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOneAndUpdate(
        { 
          id: executionId, 
          userId,
          'attacks.id': attackId 
        },
        { 
          $push: { 'attacks.$.output': outputLine },
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!execution) {
        return res.status(404).json({ error: 'Execution or attack not found' });
      }

      return res.json(execution);
    } catch (error) {
      logger.error('Error adding attack output line:', error);
      return res.status(500).json({ error: 'Failed to add attack output line' });
    }
  }

  // Update attack status
  async updateAttackStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId, attackId } = req.params;
      const { status, endTime } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const updateData: any = {
        'attacks.$.status': status,
        updatedAt: new Date()
      };

      if (endTime) {
        updateData['attacks.$.endTime'] = new Date(endTime);
      }

      const execution = await Execution.findOneAndUpdate(
        { 
          id: executionId, 
          userId,
          'attacks.id': attackId 
        },
        updateData,
        { new: true }
      );

      if (!execution) {
        return res.status(404).json({ error: 'Execution or attack not found' });
      }

      return res.json(execution);
    } catch (error) {
      logger.error('Error updating attack status:', error);
      return res.status(500).json({ error: 'Failed to update attack status' });
    }
  }

  // Clear attack output
  async clearAttackOutput(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId, attackId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOneAndUpdate(
        { 
          id: executionId, 
          userId,
          'attacks.id': attackId 
        },
        { 
          $set: { 'attacks.$.output': [] },
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!execution) {
        return res.status(404).json({ error: 'Execution or attack not found' });
      }

      return res.json({ message: 'Attack output cleared successfully' });
    } catch (error) {
      logger.error('Error clearing attack output:', error);
      return res.status(500).json({ error: 'Failed to clear attack output' });
    }
  }

  // Clear all attack outputs
  async clearAllAttackOutputs(req: AuthenticatedRequest, res: Response) {
    try {
      const { executionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { Execution } = await import('../models/Execution');
      const execution = await Execution.findOneAndUpdate(
        { id: executionId, userId },
        { 
          $set: { 'attacks.$[].output': [] },
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      return res.json({ message: 'All attack outputs cleared successfully' });
    } catch (error) {
      logger.error('Error clearing all attack outputs:', error);
      return res.status(500).json({ error: 'Failed to clear all attack outputs' });
    }
  }

  // Get execution statistics
  async getExecutionStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' });
      }

      const { Execution } = await import('../models/Execution');
      const stats = await Execution.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusCounts = stats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      // Calculate additional statistics
      const totalExecutions = Object.values(statusCounts).reduce((sum: any, stat: any) => sum + stat, 0) as number;
      const successRate = totalExecutions > 0 ? 
        ((statusCounts.completed || 0) / totalExecutions * 100).toFixed(1) : 0;

      return res.json({
        statusCounts,
        totalExecutions,
        successRate: `${successRate}%`,
        maxExecutionTime: 30 * 60 * 1000 // 30 minutes in milliseconds
      });

    } catch (error: any) {
      logger.error('Error getting execution stats:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  }

  // Clean up stale executions that have been running for too long
  async cleanupStaleExecutions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' });
      }

      const maxExecutionTime = 30 * 60 * 1000; // 30 minutes
      const cutoffTime = new Date(Date.now() - maxExecutionTime);

      // Find executions that are still running but started more than 30 minutes ago
      const { Execution } = await import('../models/Execution');
      const staleExecutions = await Execution.find({
        userId,
        status: 'running',
        startTime: { $lt: cutoffTime }
      });

      let cleanedCount = 0;
      for (const execution of staleExecutions) {
        // Mark execution as failed
        await Execution.findByIdAndUpdate(execution._id, {
          status: 'failed',
          endTime: new Date(),
          'attacks.$[elem].status': 'failed',
          'attacks.$[elem].endTime': new Date()
        }, {
          arrayFilters: [{ 'elem.status': { $in: ['running', 'pending'] } }]
        });

        cleanedCount++;
      }

      logger.info(`Cleaned up ${cleanedCount} stale executions for user ${userId}`);

      return res.json({
        message: `${cleanedCount} exécutions obsolètes nettoyées`,
        cleanedCount
      });

    } catch (error: any) {
      logger.error('Error cleaning up stale executions:', error);
      return res.status(500).json({ error: 'Erreur lors du nettoyage des exécutions obsolètes' });
    }
  }
} 