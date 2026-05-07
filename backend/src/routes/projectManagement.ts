import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ScenarioController } from '../controllers/ScenarioController';
import { CampaignController } from '../controllers/CampaignController';
import { logger } from '../utils/logger';

const router = Router();
const scenarioController = new ScenarioController();
const campaignController = new CampaignController();

// Routes pour les scénarios au niveau du projet
router.get('/projects/:projectId/scenarios', authMiddleware, scenarioController.getScenariosByProject.bind(scenarioController));
router.post('/projects/:projectId/scenarios', authMiddleware, scenarioController.createScenario.bind(scenarioController));

// Routes pour les campagnes
router.post('/projects/:projectId/campaigns', authMiddleware, campaignController.createCampaign.bind(campaignController));
router.get('/projects/:projectId/campaigns', authMiddleware, campaignController.getCampaigns.bind(campaignController));
router.get('/projects/:projectId/campaigns/:campaignId', authMiddleware, campaignController.getCampaign.bind(campaignController));
router.get('/campaigns/:campaignId', authMiddleware, campaignController.getCampaign.bind(campaignController));
router.put('/campaigns/:campaignId', authMiddleware, campaignController.updateCampaign.bind(campaignController));
router.delete('/campaigns/:campaignId', authMiddleware, campaignController.deleteCampaign.bind(campaignController));

// Routes pour les scénarios dans le contexte des campagnes
router.get('/projects/:projectId/campaigns/:campaignId/scenarios', authMiddleware, scenarioController.getScenariosByCampaign.bind(scenarioController));
router.post('/projects/:projectId/campaigns/:campaignId/scenarios', authMiddleware, scenarioController.createScenario.bind(scenarioController));
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', authMiddleware, scenarioController.getScenario.bind(scenarioController));
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', authMiddleware, scenarioController.updateScenario.bind(scenarioController));
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', authMiddleware, scenarioController.deleteScenario.bind(scenarioController));

// ===== NOUVELLES ROUTES SPÉCIALISÉES POUR LES COMPOSANTS DE SCÉNARIOS =====

// Routes pour les TARGETS d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets', authMiddleware, scenarioController.getScenarioTargets.bind(scenarioController));
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets', authMiddleware, scenarioController.addScenarioTarget.bind(scenarioController));
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets/:targetId', authMiddleware, scenarioController.updateScenarioTarget.bind(scenarioController));
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets/:targetId', authMiddleware, scenarioController.deleteScenarioTarget.bind(scenarioController));

// Routes pour les ATTACKS d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks', authMiddleware, scenarioController.getScenarioAttacks.bind(scenarioController));
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks', authMiddleware, scenarioController.addScenarioAttack.bind(scenarioController));
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks/:attackId', authMiddleware, scenarioController.updateScenarioAttack.bind(scenarioController));
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks/:attackId', authMiddleware, scenarioController.deleteScenarioAttack.bind(scenarioController));

// Routes pour l'EXECUTION HISTORY d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history', authMiddleware, scenarioController.getScenarioHistory.bind(scenarioController));
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history/:executionId', authMiddleware, scenarioController.getScenarioExecution.bind(scenarioController));
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history/:executionId', authMiddleware, scenarioController.deleteScenarioExecution.bind(scenarioController));
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history', authMiddleware, scenarioController.clearScenarioHistory.bind(scenarioController));

// Routes pour les SETTINGS d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings', authMiddleware, scenarioController.getScenarioSettings.bind(scenarioController));
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings', authMiddleware, scenarioController.updateScenarioSettings.bind(scenarioController));

// Routes pour le contrôle d'exécution des scénarios
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/start', (req, _, next) => {
  logger.info(`🚀 Route START reçue - Project: ${req.params.projectId}, Campaign: ${req.params.campaignId}, Scenario: ${req.params.scenarioId}`);
  next();
}, authMiddleware, scenarioController.startScenario.bind(scenarioController));
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/stop', authMiddleware, scenarioController.stopScenario.bind(scenarioController));
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/pause', authMiddleware, scenarioController.pauseScenario.bind(scenarioController));
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/resume', authMiddleware, scenarioController.resumeScenario.bind(scenarioController));

// Routes pour le contrôle d'exécution des campagnes
router.post('/campaigns/:campaignId/schedule', authMiddleware, campaignController.scheduleCampaign.bind(campaignController));
router.post('/campaigns/:campaignId/start', authMiddleware, campaignController.startCampaign.bind(campaignController));
router.post('/campaigns/:campaignId/stop', authMiddleware, campaignController.stopCampaign.bind(campaignController));
router.post('/campaigns/:campaignId/pause', authMiddleware, campaignController.pauseCampaign.bind(campaignController));
router.post('/campaigns/:campaignId/resume', authMiddleware, campaignController.resumeCampaign.bind(campaignController));

// Routes pour la gestion des scénarios dans les campagnes (opérations en masse)
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/batch', authMiddleware, campaignController.addScenariosToCampaign.bind(campaignController));
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/batch', authMiddleware, campaignController.removeScenariosFromCampaign.bind(campaignController));

export default router;
