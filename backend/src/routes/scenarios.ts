import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ScenarioController } from '../controllers/ScenarioController';

const router = Router();
const scenarioController = new ScenarioController();

// ===== ROUTES PRINCIPALES DES SCÉNARIOS =====

// Récupérer tous les scénarios d'une campagne
router.get('/projects/:projectId/campaigns/:campaignId/scenarios', 
  authMiddleware, 
  scenarioController.getScenariosByCampaign.bind(scenarioController)
);

// Créer un nouveau scénario dans une campagne
router.post('/projects/:projectId/campaigns/:campaignId/scenarios', 
  authMiddleware, 
  scenarioController.createScenario.bind(scenarioController)
);

// Récupérer un scénario spécifique
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', 
  authMiddleware, 
  scenarioController.getScenario.bind(scenarioController)
);

// Mettre à jour un scénario
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', 
  authMiddleware, 
  scenarioController.updateScenario.bind(scenarioController)
);

// Supprimer un scénario
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', 
  authMiddleware, 
  scenarioController.deleteScenario.bind(scenarioController)
);

// ===== ROUTES POUR LES TARGETS =====

// Récupérer les targets d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets', 
  authMiddleware, 
  scenarioController.getScenarioTargets.bind(scenarioController)
);

// Ajouter une target à un scénario
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets', 
  authMiddleware, 
  scenarioController.addScenarioTarget.bind(scenarioController)
);

// Mettre à jour une target
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets/:targetId', 
  authMiddleware, 
  scenarioController.updateScenarioTarget.bind(scenarioController)
);

// Supprimer une target
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets/:targetId', 
  authMiddleware, 
  scenarioController.deleteScenarioTarget.bind(scenarioController)
);

// ===== ROUTES POUR LES ATTACKS =====

// Récupérer les attacks d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks', 
  authMiddleware, 
  scenarioController.getScenarioAttacks.bind(scenarioController)
);

// Ajouter une attack à un scénario
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks', 
  authMiddleware, 
  scenarioController.addScenarioAttack.bind(scenarioController)
);

// Mettre à jour une attack
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks/:attackId', 
  authMiddleware, 
  scenarioController.updateScenarioAttack.bind(scenarioController)
);

// Supprimer une attack
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks/:attackId', 
  authMiddleware, 
  scenarioController.deleteScenarioAttack.bind(scenarioController)
);

// ===== ROUTES POUR L'EXECUTION HISTORY =====

// Récupérer l'historique d'exécution d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history', 
  authMiddleware, 
  scenarioController.getScenarioHistory.bind(scenarioController)
);

// Récupérer une exécution spécifique
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history/:executionId', 
  authMiddleware, 
  scenarioController.getScenarioExecution.bind(scenarioController)
);

// Supprimer une exécution de l'historique
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history/:executionId', 
  authMiddleware, 
  scenarioController.deleteScenarioExecution.bind(scenarioController)
);

// Vider l'historique d'exécution
router.delete('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history', 
  authMiddleware, 
  scenarioController.clearScenarioHistory.bind(scenarioController)
);

// ===== ROUTES POUR LES SETTINGS =====

// Récupérer les paramètres d'un scénario
router.get('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings', 
  authMiddleware, 
  scenarioController.getScenarioSettings.bind(scenarioController)
);

// Mettre à jour les paramètres d'un scénario
router.put('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings', 
  authMiddleware, 
  scenarioController.updateScenarioSettings.bind(scenarioController)
);

// ===== ROUTES DE CONTRÔLE D'EXÉCUTION =====

// Démarrer un scénario
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/start', 
  authMiddleware, 
  scenarioController.startScenario.bind(scenarioController)
);

// Arrêter un scénario
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/stop', 
  authMiddleware, 
  scenarioController.stopScenario.bind(scenarioController)
);

// Mettre en pause un scénario
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/pause', 
  authMiddleware, 
  scenarioController.pauseScenario.bind(scenarioController)
);

// Reprendre un scénario
router.post('/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/resume', 
  authMiddleware, 
  scenarioController.resumeScenario.bind(scenarioController)
);

// ===== ROUTES POUR LES SCÉNARIOS AU NIVEAU PROJET =====

// Récupérer tous les scénarios d'un projet (toutes campagnes confondues)
router.get('/projects/:projectId/scenarios', 
  authMiddleware, 
  scenarioController.getScenariosByProject.bind(scenarioController)
);

// Créer un scénario directement dans un projet (sans campagne)
router.post('/projects/:projectId/scenarios', 
  authMiddleware, 
  scenarioController.createScenario.bind(scenarioController)
);

export default router; 