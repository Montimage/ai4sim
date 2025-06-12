import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ScenarioService } from '../services/ScenarioService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { Project } from '../models/Project';
import { Campaign } from '../models/Campaign';
import { isValidObjectId } from 'mongoose';

export class ScenarioController {
  private scenarioService: ScenarioService;

  constructor() {
    this.scenarioService = ScenarioService.getInstance();
  }

  /**
   * Récupère tous les scénarios d'une campagne
   */
  async getScenariosByCampaign(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId } = req.params;
      logger.info(`📊 Récupération des scénarios - Project: ${projectId}, Campaign: ${campaignId}`);

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId)) {
        logger.warn(`IDs invalides - Project: ${projectId}, Campaign: ${campaignId}`);
        throw new AppError('ID de projet ou de campagne invalide', 400);
      }

      // 1. Vérifier l'accès au projet et la présence de la campagne dans le projet
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ],
        'campaigns._id': campaignId  // Vérifie que la campagne est dans le tableau campaigns du projet
      });

      if (!project) {
        logger.warn(`Projet non trouvé ou accès refusé - Project: ${projectId}, User: ${req.user._id}`);
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      // 2. Vérifier que la campagne existe dans la collection Campaign
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        logger.warn(`Campagne non trouvée dans la collection - Campaign: ${campaignId}`);
        throw new AppError('Campagne non trouvée', 404);
      }

      // 3. Récupérer les scénarios
      logger.info(`🔍 Récupération des scénarios pour la campagne ${campaignId}...`);
      const scenarios = await this.scenarioService.getScenariosByCampaign(campaignId);
      logger.info(`✅ ${scenarios.length} scénarios récupérés pour la campagne ${campaignId}`);
      logger.info(`📋 IDs des scénarios récupérés:`, scenarios.map(s => s._id));
      res.json(scenarios);

    } catch (err) {
      logger.error('❌ Erreur lors de la récupération des scénarios:', err);
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        res.status(500).json({ message: 'Erreur interne lors de la récupération des scénarios' });
      }
    }
  }

  /**
   * Crée un nouveau scénario dans une campagne
   */
  async createScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId } = req.params;
      const { name, description, targets, attacks, sequence } = req.body;
      logger.info(`📝 Création d'un scénario - Project: ${projectId}, Campaign: ${campaignId}`);

      if (!isValidObjectId(projectId)) {
        throw new AppError('ID de projet invalide', 400);
      }
      
      if (campaignId && !isValidObjectId(campaignId)) {
        throw new AppError('ID de campagne invalide', 400);
      }

      // 1. Vérifier l'accès au projet et la présence de la campagne dans le projet
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ],
        ...(campaignId ? { 'campaigns._id': campaignId } : {})
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      // 2. Si une campagne est spécifiée, vérifier qu'elle existe dans la collection Campaign
      if (campaignId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
          throw new AppError('Campagne non trouvée', 404);
        }
      }

      // 3. Créer le scénario
      const scenario = await this.scenarioService.createScenario({
        name,
        description,
        projectId,
        campaignId,
        userId: req.user._id,
        targets: targets || [],
        attacks: attacks || [],
        sequence: sequence || false
      });

      // 4. Si le scénario est créé dans une campagne, mettre à jour les deux collections
      if (campaignId) {
        // Mettre à jour le projet
        await Project.updateOne(
          { 
            _id: projectId, 
            'campaigns._id': campaignId 
          },
          {
            $push: {
              'campaigns.$.scenarios': {
                _id: scenario._id,
                name: scenario.name,
                status: scenario.status
              }
            }
          }
        );

        // Mettre à jour la campagne
        await Campaign.updateOne(
          { _id: campaignId },
          {
            $push: { scenarioIds: scenario._id },
            $inc: { 
              'executionProgress.total': 1,
              'executionProgress.pending': 1
            }
          }
        );

        logger.info(`✅ Scénario ${scenario._id} ajouté à la campagne ${campaignId}`);
      }

      res.status(201).json(scenario);
    } catch (err) {
      logger.error('❌ Erreur lors de la création du scénario:', err);
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        res.status(500).json({ message: 'Erreur interne lors de la création du scénario' });
      }
    }
  }

  /**
   * Récupère un scénario spécifique
   */
  async getScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérifier l'accès au projet
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      // Vérifier que le scénario appartient au bon projet et à la bonne campagne
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      res.json(scenario);

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors de la récupération du scénario:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du scénario' });
      }
    }
  }

  /**
   * Met à jour un scénario
   */
  async updateScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;
      const updates = req.body;

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérifier l'accès au projet avec droits d'édition
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      // Vérifier que le scénario appartient au bon projet et à la bonne campagne
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      const updatedScenario = await this.scenarioService.updateScenario(scenarioId, updates);
      res.json(updatedScenario);

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors de la mise à jour du scénario:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du scénario' });
      }
    }
  }

  /**
   * Supprime un scénario
   */
  async deleteScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérifier l'accès au projet avec droits d'édition
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      // Vérifier que le scénario appartient au bon projet et à la bonne campagne
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      await this.scenarioService.deleteScenario(scenarioId);
      res.status(204).send();

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors de la suppression du scénario:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du scénario' });
      }
    }
  }

  /**
   * Démarre l'exécution d'un scénario
   */
  async startScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;
      logger.info(`🚀 ScenarioController.startScenario - Project: ${projectId}, Campaign: ${campaignId}, Scenario: ${scenarioId}`);

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérifier l'accès au projet avec droits d'exécution
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      // Vérifier que le scénario appartient au bon projet et à la bonne campagne
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      const updatedScenario = await this.scenarioService.startScenarioExecution(scenarioId);
      res.json(updatedScenario);

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors du démarrage du scénario:', error);
        res.status(500).json({ message: 'Erreur lors du démarrage du scénario' });
      }
    }
  }

  /**
   * Arrête l'exécution d'un scénario
   */
  async stopScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérification similaire à startScenario
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      const updatedScenario = await this.scenarioService.stopScenarioExecution(scenarioId);
      res.json(updatedScenario);

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors de l\'arrêt du scénario:', error);
        res.status(500).json({ message: 'Erreur lors de l\'arrêt du scénario' });
      }
    }
  }

  /**
   * Met en pause l'exécution d'un scénario
   */
  async pauseScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérification similaire à startScenario
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      const updatedScenario = await this.scenarioService.pauseScenarioExecution(scenarioId);
      res.json(updatedScenario);

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors de la mise en pause du scénario:', error);
        res.status(500).json({ message: 'Erreur lors de la mise en pause du scénario' });
      }
    }
  }

  /**
   * Reprend l'exécution d'un scénario en pause
   */
  async resumeScenario(req: AuthRequest, res: Response) {
    try {
      const { projectId, campaignId, scenarioId } = req.params;

      if (!isValidObjectId(projectId) || !isValidObjectId(campaignId) || !isValidObjectId(scenarioId)) {
        throw new AppError('ID invalide', 400);
      }

      // Vérification similaire à startScenario
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenario = await this.scenarioService.getScenarioById(scenarioId);
      
      if (scenario.project.toString() !== projectId || scenario.campaign?.toString() !== campaignId) {
        throw new AppError('Scénario non trouvé', 404);
      }

      const updatedScenario = await this.scenarioService.resumeScenarioExecution(scenarioId);
      res.json(updatedScenario);

    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        logger.error('Erreur lors de la reprise du scénario:', error);
        res.status(500).json({ message: 'Erreur lors de la reprise du scénario' });
      }
    }
  }

  /**
   * Récupère tous les scénarios d'un projet
   */
  async getScenariosByProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;

      if (!isValidObjectId(projectId)) {
        throw new AppError('ID de projet invalide', 400);
      }

      // Vérifier l'accès au projet
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });

      if (!project) {
        throw new AppError('Projet non trouvé ou accès refusé', 403);
      }

      const scenarios = await this.scenarioService.getScenariosByProject(projectId);
      res.json(scenarios);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la récupération des scénarios:', error);
      throw new AppError('Erreur lors de la récupération des scénarios', 500);
    }
  }
}
