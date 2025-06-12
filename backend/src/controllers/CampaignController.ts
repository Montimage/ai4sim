import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CampaignService } from '../services/CampaignService';
import { logger } from '../utils/logger';
import { Project } from '../models/Project';
import { isValidObjectId } from 'mongoose';
import { AppError } from '../utils/AppError';

export class CampaignController {
  private campaignService: CampaignService;

  constructor() {
    this.campaignService = CampaignService.getInstance();
  }

  /**
   * Crée une nouvelle campagne
   */
  async createCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const { name, description, scenarioIds, scheduledFor } = req.body;

      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'ID de projet invalide' });
      }

      // Vérifier si l'utilisateur a accès au projet
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou projet introuvable' });
      }

      // Valider les entrées
      if (!name) {
        return res.status(400).json({ message: 'Le nom de la campagne est requis' });
      }

      const campaign = await this.campaignService.createCampaign({
        name,
        description,
        projectId,
        userId: req.user._id,
        scenarioIds,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
      });

      return res.status(201).json(campaign);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Erreur lors de la création de la campagne:', errorMessage);
      return res.status(500).json({ message: 'Erreur lors de la création de la campagne' });
    }
  }

  /**
   * Récupère toutes les campagnes d'un projet
   */
  async getCampaigns(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;

      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'ID de projet invalide' });
      }

      // Vérifier si l'utilisateur a accès au projet
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou projet introuvable' });
      }

      const campaigns = await this.campaignService.getCampaignsByProject(projectId);
      return res.json(campaigns);
    } catch (error) {
      logger.error('Erreur lors de la récupération des campagnes:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des campagnes' });
    }
  }

  /**
   * Récupère une campagne par son ID
   */
  async getCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId, campaignId } = req.params;
      
      logger.info(`Accessing campaign: campaignId=${campaignId}, projectId=${projectId}`);
      
      if (!isValidObjectId(campaignId)) {
        logger.warn(`Invalid campaign ID: ${campaignId}`);
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      if (!isValidObjectId(projectId)) {
        logger.warn(`Invalid project ID: ${projectId}`);
        return res.status(400).json({ message: 'ID de projet invalide' });
      }

      // Vérifier si le projet existe et que l'utilisateur y a accès
      const userProject = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });

      if (!userProject) {
        logger.warn(`Access denied to project ${projectId} for user ${req.user._id}`);
        return res.status(403).json({ message: 'Accès refusé ou projet introuvable' });
      }

      const campaign = await this.campaignService.getCampaignById(campaignId, projectId);
      
      if (!campaign) {
        logger.warn(`Campaign ${campaignId} not found in project ${projectId}`);
        return res.status(404).json({ message: 'Campagne non trouvée dans ce projet' });
      }

      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const campaignProject = await Project.findOne({
        _id: campaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });

      if (!campaignProject) {
        return res.status(403).json({ message: 'Accès refusé au projet associé' });
      }

      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de la récupération de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération de la campagne' });
    }
  }

  /**
   * Met à jour une campagne
   */
  async updateCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId, campaignId } = req.params;
      const updates = req.body;

      if (!isValidObjectId(campaignId)) {
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      if (!existingCampaign) {
        logger.warn(`Campaign not found: ${campaignId}`);
        return res.status(404).json({ message: 'Campagne non trouvée' });
      }
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      // Si scheduledFor est fourni dans les mises à jour, le convertir en Date
      if (updates.scheduledFor) {
        updates.scheduledFor = new Date(updates.scheduledFor);
      }

      // Now also validating the projectId matches the campaign's project
      const campaignForProject = await this.campaignService.getCampaignById(campaignId, projectId);
      if (!campaignForProject) {
        return res.status(404).json({ message: 'Campagne non trouvée pour ce projet' });
      }
      
      const campaign = await this.campaignService.updateCampaign(campaignId, updates);
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour de la campagne' });
    }
  }

  /**
   * Supprime une campagne
   */
  async deleteCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId, campaignId } = req.params;

      if (!isValidObjectId(campaignId)) {
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      // Récupérer la campagne pour vérifier l'accès et le projet
      const existingCampaign = await this.campaignService.getCampaignById(campaignId, projectId);
      
      if (!existingCampaign) {
        logger.warn(`Campaign not found: ${campaignId}`);
        return res.status(404).json({ message: 'Campagne non trouvée' });
      }
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      await this.campaignService.deleteCampaign(campaignId);
      return res.status(204).end();
    } catch (error) {
      logger.error('Erreur lors de la suppression de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de la campagne' });
    }
  }

  /**
   * Ajoute des scénarios à une campagne
   */
  async addScenariosToCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId, campaignId } = req.params;
      const { scenarioIds } = req.body;

      logger.info(`Adding scenarios to campaign: projectId=${projectId}, campaignId=${campaignId}`);
      
      if (!isValidObjectId(campaignId) || !scenarioIds || !Array.isArray(scenarioIds)) {
        logger.warn(`Invalid parameters: campaignId=${campaignId}, scenarioIds=${JSON.stringify(scenarioIds)}`);
        return res.status(400).json({ message: 'ID de campagne invalide ou liste de scénarios invalide' });
      }

      // Vérifier si le projet existe et que l'utilisateur y a accès
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        logger.warn(`Access denied to project ${projectId} for user ${req.user._id}`);
        return res.status(403).json({ message: 'Accès refusé ou projet introuvable' });
      }

      // Récupérer la campagne pour vérifier l'accès et qu'elle appartient au projet
      const existingCampaign = await this.campaignService.getCampaignById(campaignId, projectId);
      
      if (!existingCampaign) {
        logger.warn(`Campaign not found: campaignId=${campaignId}, projectId=${projectId}`);
        return res.status(404).json({ message: 'Campagne non trouvée pour ce projet' });
      }
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      if (existingCampaign.project.toString() !== projectId) {
        logger.warn(`Campaign ${campaignId} does not belong to project ${projectId}`);
        return res.status(404).json({ message: 'Campagne n\'appartient pas au projet spécifié' });
      }

      const campaign = await this.campaignService.addScenariosToCampaign(campaignId, scenarioIds);
      logger.info(`Successfully added ${scenarioIds.length} scenarios to campaign ${campaignId}`);
      return res.json(campaign);
    } catch (error) {
      if (error instanceof AppError) {
        // Pass through specific AppErrors with their status codes
        return res.status(error.statusCode || 500).json({ message: error.message });
      }
      
      logger.error('Erreur lors de l\'ajout de scénarios à la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout de scénarios à la campagne' });
    }
  }

  /**
   * Retire des scénarios d'une campagne
   */
  async removeScenariosFromCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const { scenarioIds } = req.body;

      if (!isValidObjectId(campaignId) || !scenarioIds || !Array.isArray(scenarioIds)) {
        return res.status(400).json({ message: 'ID de campagne invalide ou scenarioIds manquants' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      const campaign = await this.campaignService.removeScenariosFromCampaign(campaignId, scenarioIds);
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de la suppression de scénarios de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la suppression de scénarios de la campagne' });
    }
  }

  /**
   * Planifie l'exécution d'une campagne
   */
  async scheduleCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;
      const { scheduledFor } = req.body;

      if (!isValidObjectId(campaignId) || !scheduledFor) {
        return res.status(400).json({ message: 'ID de campagne invalide ou date planifiée manquante' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      const campaign = await this.campaignService.scheduleCampaign(campaignId, new Date(scheduledFor));
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de la planification de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la planification de la campagne' });
    }
  }

  /**
   * Démarre l'exécution d'une campagne
   */
  async startCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!isValidObjectId(campaignId)) {
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      const campaign = await this.campaignService.startCampaignExecution(campaignId);
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors du démarrage de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors du démarrage de la campagne' });
    }
  }

  /**
   * Arrête l'exécution d'une campagne
   */
  async stopCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!isValidObjectId(campaignId)) {
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      const campaign = await this.campaignService.stopCampaignExecution(campaignId);
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de l\'arrêt de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de l\'arrêt de la campagne' });
    }
  }

  /**
   * Met en pause l'exécution d'une campagne
   */
  async pauseCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!isValidObjectId(campaignId)) {
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      const campaign = await this.campaignService.pauseCampaignExecution(campaignId);
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de la mise en pause de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la mise en pause de la campagne' });
    }
  }

  /**
   * Reprend l'exécution d'une campagne en pause
   */
  async resumeCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { campaignId } = req.params;

      if (!isValidObjectId(campaignId)) {
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }

      // Récupérer la campagne pour vérifier l'accès
      const existingCampaign = await this.campaignService.getCampaignById(campaignId);
      
      // Vérifier si l'utilisateur a accès au projet associé à la campagne
      const project = await Project.findOne({
        _id: existingCampaign.project,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id, role: { $in: ['editor', 'owner'] } } } }
        ]
      });

      if (!project) {
        return res.status(403).json({ message: 'Accès refusé ou droits insuffisants' });
      }

      const campaign = await this.campaignService.resumeCampaignExecution(campaignId);
      return res.json(campaign);
    } catch (error) {
      logger.error('Erreur lors de la reprise de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la reprise de la campagne' });
    }
  }

  /**
   * Récupère les scénarios associés à une campagne
   */
  async getScenariosByCampaign(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId, campaignId } = req.params;
      
      logger.info(`Getting scenarios for project=${projectId}, campaign=${campaignId}`);

      if (!isValidObjectId(campaignId)) {
        logger.warn(`Invalid campaign ID: ${campaignId}`);
        return res.status(400).json({ message: 'ID de campagne invalide' });
      }
      
      if (!isValidObjectId(projectId)) {
        logger.warn(`Invalid project ID: ${projectId}`);
        return res.status(400).json({ message: 'ID de projet invalide' });
      }

      // Vérifier si le projet existe et que l'utilisateur y a accès
      const project = await Project.findOne({
        _id: projectId,
        $or: [
          { owner: req.user._id },
          { 'sharedWith': { $elemMatch: { userId: req.user._id } } }
        ]
      });

      if (!project) {
        logger.warn(`Access denied to project ${projectId} for user ${req.user._id}`);
        return res.status(403).json({ message: 'Accès refusé ou projet introuvable' });
      }

      // Récupérer la campagne pour vérifier l'accès, et confirmer qu'elle appartient au projet
      const campaign = await this.campaignService.getCampaignById(campaignId, projectId);
      
      if (!campaign) {
        logger.warn(`Campaign ${campaignId} not found in project ${projectId}`);
        return res.status(404).json({ message: 'Campagne non trouvée dans ce projet' });
      }
      
      const scenarios = await this.campaignService.getScenariosByCampaign(campaignId);
      logger.info(`Successfully fetched ${scenarios.length} scenarios for campaign ${campaignId}`);
      return res.json(scenarios);
    } catch (error) {
      if (error instanceof AppError) {
        // Pass through specific AppErrors with their status codes
        return res.status(error.statusCode || 500).json({ message: error.message });
      }
      
      logger.error('Erreur lors de la récupération des scénarios de la campagne:', error);
      return res.status(500).json({ message: 'Erreur lors de la récupération des scénarios de la campagne' });
    }
  }
}
