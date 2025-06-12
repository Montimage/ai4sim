import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { config } from "./config/config";
import { logger } from "./utils/logger";
import { AuthController } from "./controllers/AuthController";
import { authMiddleware } from "./middleware/auth";
import si from 'systeminformation';
import { ConfigController } from "./controllers/ConfigController";
import { ProjectController } from "./controllers/ProjectController";
import { SystemController } from "./controllers/SystemController";
import http from 'http';
import campaignRoutes from './routes/campaigns';
import userRoutes from './routes/users';
import { WebSocketManager } from './websocket/WebSocketManager';
import { Scenario, AttackStatus } from './models/Scenario';
import { ProcessManager } from './services/ProcessManager';

// Désactiver l'avertissement de dépréciation pour punycode
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  console.warn(warning.name, warning.message);
});

const app = express();
const server = http.createServer(app);

// Initialize WebSocket Manager first
let wsManagerPromise = WebSocketManager.initialize(server);

// Export the WebSocket Manager instance
export const getWsManager = () => WebSocketManager.getInstance();

// More permissive CORS configuration for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(helmet());
app.use(express.json());

// MongoDB connection with retry
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(config.mongodb.uri, {
        ...config.mongodb.options,
        serverSelectionTimeoutMS: 5000
      });
      logger.info('Connected to MongoDB');
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) {
        logger.error('Failed to connect to MongoDB. Is the service running?');
        throw err;
      }
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Route for performance metrics - No authentication needed for metrics
app.get('/api/metrics', async (_req, res) => {
  try {
    // Retrieve system metrics
    const [cpu, mem, load] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.currentLoad()
    ]);

    // Calculate memory usage in GB
    const totalMemGB = Math.round(mem.total / (1024 * 1024 * 1024));
    const usedMemGB = Math.round((mem.total - mem.available) / (1024 * 1024 * 1024));
    const memoryPercentage = ((mem.total - mem.available) / mem.total) * 100;

    const metrics = {
      cpu: Number(load.currentLoad.toFixed(1)),
      memory: Number(memoryPercentage.toFixed(1)),
      latency: 0,
      details: {
        memoryTotal: totalMemGB,
        memoryUsed: usedMemGB,
        cpuCores: cpu.cores,
        loadAverage: load.avgLoad.toFixed(2)
      }
    };

    // Calculate latency
    const start = process.hrtime();
    await new Promise(resolve => setTimeout(resolve, 1));
    const [seconds, nanoseconds] = process.hrtime(start);
    metrics.latency = Math.round(seconds * 1000 + nanoseconds / 1000000);

    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      cpu: 0,
      memory: 0,
      latency: 0,
      details: {
        memoryTotal: 0,
        memoryUsed: 0,
        cpuCores: 0,
        loadAverage: '0.00'
      }
    });
  }
});

// Health check endpoint - no authentication needed
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// HEAD method for lightweight health checks (used by WebSocket reconnection)
app.head('/api/health', (_req, res) => {
  res.status(200).end();
});

// Port check endpoint - no authentication needed for tool monitoring
app.get('/api/check-port/:port', async (req, res) => {
  try {
    const port = parseInt(req.params.port, 10);
    
    if (isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({ 
        error: 'Invalid port number',
        isInUse: false 
      });
    }

    // Use systeminformation to check if port is in use
    const networkConnections = await si.networkConnections();
    const isInUse = networkConnections.some(conn => 
      conn.localPort === port.toString() && 
      (conn.state === 'LISTEN' || conn.state === 'ESTABLISHED')
    );

    return res.json({ 
      port,
      isInUse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking port:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      isInUse: false 
    });
  }
});

// Fonction pour nettoyer les scénarios en cours au redémarrage
const cleanupRunningScenarios = async (): Promise<void> => {
  try {
    logger.info('Nettoyage des scénarios en cours...');
    
    // Mettre à jour tous les scénarios avec le statut 'running' vers 'stopped'
    const result = await Scenario.updateMany(
      { status: AttackStatus.RUNNING },
      { 
        status: AttackStatus.STOPPED,
        endTime: new Date()
      }
    );
    
    // Mettre à jour toutes les attaques avec le statut 'running' vers 'stopped'
    const attackResult = await Scenario.updateMany(
      { 'attacks.status': AttackStatus.RUNNING },
      { 
        $set: { 
          'attacks.$[elem].status': AttackStatus.STOPPED,
          'attacks.$[elem].endTime': new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.status': AttackStatus.RUNNING }]
      }
    );
    
    if (result.modifiedCount > 0) {
      logger.info(`${result.modifiedCount} scénario(s) en cours marqué(s) comme stoppé(s)`);
    }
    
    if (attackResult.modifiedCount > 0) {
      logger.info(`${attackResult.modifiedCount} scénario(s) avec attaques en cours mis à jour`);
    }
    
    if (result.modifiedCount === 0 && attackResult.modifiedCount === 0) {
      logger.info('Aucun scénario ou attaque en cours trouvé');
    }
  } catch (error) {
    logger.error('Erreur lors du nettoyage des scénarios:', error);
  }
};

// Start server after MongoDB connection and WebSocket initialization
const startServer = async () => {
  try {
    await Promise.all([
      connectDB(),
      wsManagerPromise
    ]);
    
    // Nettoyer les scénarios en cours au démarrage
    await cleanupRunningScenarios();
    
    // Initialize controllers after WebSocket Manager is ready
    const authController = new AuthController();
    const configController = new ConfigController();
    const projectController = new ProjectController();
    const systemController = new SystemController();

    // Authentication routes
    app.post('/api/auth/login', authController.login);
    app.post('/api/auth/register', authController.register);
    app.put('/api/auth/change-password', authMiddleware, authController.changePassword);

    // User verification route (before auth middleware)
    app.get('/api/users/check/:username', authMiddleware, async (req, res) => {
      try {
        const { username } = req.params;
        const User = mongoose.model('User');
        const user = await User.findOne({ username }).select('_id username role');
        
        if (user) {
          res.json({ exists: true, user: { _id: user._id, username: user.username, role: user.role } });
        } else {
          res.json({ exists: false });
        }
      } catch (error) {
        logger.error('Error checking user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // User info by ID route (simple version for project owner lookup)
    app.get('/api/users/info/:userId', authMiddleware, async (req, res) => {
      try {
        const { userId } = req.params;
        const User = mongoose.model('User');
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ error: 'Invalid user ID format' });
        }
        
        const user = await User.findById(userId).select('_id username role');
        
        if (user) {
          return res.json({ _id: user._id, username: user.username, role: user.role });
        } else {
          return res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        logger.error('Error fetching user by ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });

    // User management routes
    app.use('/api/users', userRoutes);

    // Protected routes
    app.use('/api', authMiddleware);

    // Routes pour les configurations
    app.get('/api/configs', configController.getUserConfigs);
    app.post('/api/configs', configController.saveUserConfig);
    app.delete('/api/configs/:exportDate', configController.deleteUserConfig);

    app.post("/api/attacks", (_req, _res) => {
        // Route configuration if needed
    });

    // System routes
    app.get('/api/system/status', systemController.getSystemStatus);

    // Project routes
    app.get('/api/projects', (req, res) => projectController.getProjects(req, res));
    app.get('/api/projects/:projectId', (req, res) => projectController.getProject(req, res));
    app.post('/api/projects', (req, res) => projectController.createProject(req, res));
    app.put('/api/projects/:projectId', (req, res) => projectController.updateProject(req, res));
    app.delete('/api/projects/:projectId', (req, res) => projectController.deleteProject(req, res));
    app.post('/api/projects/:projectId/share', (req, res) => projectController.shareProject(req, res));
    app.delete('/api/projects/:projectId/users/:userId', (req, res) => projectController.removeUserFromProject(req, res));
    app.post('/api/projects/:projectId/campaigns', (req, res) => projectController.addCampaign(req, res));
    app.put('/api/projects/:projectId/campaigns/:campaignId', (req, res) => projectController.updateCampaign(req, res));

    // Project campaign/scenario routes
    app.get('/api/projects/:projectId/campaigns/:campaignId/scenarios', (_req, _res, next) => {
      logger.info(`Getting scenarios for project=${_req.params.projectId}, campaign=${_req.params.campaignId}`);
      next();
    }, projectController.getScenariosForCampaign);

    // Routes for campaigns - mount on the correct project-related path
    app.use('/api/projects/:projectId/campaigns', campaignRoutes);

    // Execution routes
    import('./routes/executions').then(({ default: executionRoutes }) => {
      app.use('/api/executions', executionRoutes);
    });

    // Import projectManagement routes for all other API paths
    import('./routes/projectManagement').then(({ default: projectManagementRoutes }) => {
      app.use('/api', projectManagementRoutes);
    });
    
    // Process status endpoints - for checking if processes are actually running
    app.get('/api/process-status/:processId', async (req, res) => {
      try {
        const { processId } = req.params;
        
        // Check if process is running using ProcessManager
        const processManager = ProcessManager.getInstance();
        const status = processManager.getProcessStatus(processId);
        const isRunning = status === 'running';
        
        return res.json({
          isRunning,
          processId,
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error checking process status:', error);
        return res.status(500).json({
          error: 'Failed to check process status',
          isRunning: false
        });
      }
    });

    app.post('/api/process-status/batch', async (req, res) => {
      try {
        const { processIds } = req.body;
        
        if (!Array.isArray(processIds)) {
          return res.status(400).json({ error: 'processIds must be an array' });
        }
        
        const processManager = ProcessManager.getInstance();
        const results: Record<string, { isRunning: boolean; lastActivity?: Date }> = {};
        
        processIds.forEach(processId => {
          const status = processManager.getProcessStatus(processId);
          results[processId] = {
            isRunning: status === 'running',
            lastActivity: new Date()
          };
        });
        
        return res.json(results);
      } catch (error) {
        logger.error('Error checking batch process status:', error);
        return res.status(500).json({
          error: 'Failed to check batch process status'
        });
      }
    });
    
    server.listen(config.server.port, () => {
      logger.info(`Server is running on port ${config.server.port}`);
      logger.info('WebSocket server initialized');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Error handling
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
});
