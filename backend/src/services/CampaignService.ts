import { Campaign, ICampaign, CampaignStatus } from '../models/Campaign';
import { ScenarioService } from './ScenarioService';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';

export class CampaignService {
  private static instance: CampaignService;
  private _scenarioService: ScenarioService | null = null;

  private constructor() {
    // Avoid initializing ScenarioService in the constructor to prevent circular dependencies
  }

  // Lazy-load the ScenarioService when needed
  private get scenarioService(): ScenarioService {
    if (!this._scenarioService) {
      this._scenarioService = ScenarioService.getInstance();
    }
    return this._scenarioService;
  }

  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  /**
   * Crée une nouvelle campagne
   */
  async createCampaign(data: {
    name: string;
    description?: string;
    projectId: string;
    userId: string;
    scenarioIds?: string[];
    scheduledFor?: Date;
  }): Promise<ICampaign> {
    try {
      // Convertir les IDs de scénarios en ObjectId
      const scenarioObjectIds = data.scenarioIds 
        ? data.scenarioIds.map(id => new mongoose.Types.ObjectId(id))
        : [];

      // 1. Créer la campagne dans la collection Campaign
      const campaign = new Campaign({
        name: data.name,
        description: data.description,
        project: new mongoose.Types.ObjectId(data.projectId),
        status: CampaignStatus.DRAFT,
        scenarioIds: scenarioObjectIds, // Utiliser les ObjectIds convertis
        createdBy: new mongoose.Types.ObjectId(data.userId),
        scheduledFor: data.scheduledFor,
        executionProgress: {
          total: scenarioObjectIds.length,
          completed: 0,
          failed: 0,
          running: 0,
          pending: scenarioObjectIds.length
        }
      });

      // Sauvegarder la campagne
      await campaign.save();
      
      // 2. Ajouter la campagne au tableau campaigns du projet
      const { Project } = require('../models/Project');
      
      // Préparation des données de scénario pour le format du projet
      const scenarios = scenarioObjectIds.map(id => ({
        _id: id,
        status: 'pending'
      }));
      
      // Mise à jour du projet pour inclure la campagne
      const updatedProject = await Project.findByIdAndUpdate(
        data.projectId,
        {
          $push: {
            campaigns: {
              _id: campaign._id,
              name: data.name,
              description: data.description || '',
              scenarios: scenarios,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        },
        { new: true }
      );
      
      if (!updatedProject) {
        // Si le projet n'est pas trouvé, supprimer la campagne
        await Campaign.findByIdAndDelete(campaign._id);
        throw new AppError('Projet non trouvé lors de l\'ajout de la campagne', 404);
      }
      
      logger.info(`Campagne créée: ${campaign._id} pour le projet ${data.projectId} avec ${scenarioObjectIds.length} scénarios`);

      return campaign;
    } catch (error) {
      logger.error('Erreur lors de la création de la campagne:', error);
      throw new AppError('Échec de la création de la campagne', 500);
    }
  }

  /**
   * Récupère toutes les campagnes d'un projet
   */
  async getCampaignsByProject(projectId: string): Promise<ICampaign[]> {
    try {
      return await Campaign.find({ project: new mongoose.Types.ObjectId(projectId) });
    } catch (error) {
      logger.error(`Erreur lors de la récupération des campagnes pour le projet ${projectId}:`, error);
      throw new AppError('Échec de la récupération des campagnes', 500);
    }
  }

  /**
   * Récupère une campagne par son ID
   */
  async getCampaignById(campaignId: string, projectId?: string): Promise<ICampaign> {
    try {
      // Validate the campaignId format
      if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
        logger.error(`ID de campagne invalide: ${campaignId}`);
        throw new AppError('ID de campagne invalide', 400);
      }
      
      logger.info(`Recherche de la campagne avec l'ID: ${campaignId}${projectId ? `, projet: ${projectId}` : ''}`);
      
      const query: any = { _id: campaignId };
      
      // Add project filter if provided
      if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
        query.project = projectId;
      }
      
      let campaign = await Campaign.findOne(query)
        .populate('scenarioIds');
      
      // Si la campagne n'existe pas dans la collection Campaign mais qu'un projectId est fourni,
      // vérifions si elle existe dans le document projet (pour synchronisation)
      if (!campaign && projectId) {
        logger.info(`Campagne ${campaignId} non trouvée dans la collection Campaign, vérification dans le projet...`);
        
        const { Project } = require('../models/Project');
        const project = await Project.findOne({
          _id: projectId,
          'campaigns._id': campaignId
        });
        
        if (project) {
          const projectCampaign = project.campaigns.find((c: any) => c._id.toString() === campaignId);
          if (projectCampaign) {
            logger.info(`Campagne trouvée dans le projet, synchronisation avec la collection Campaign...`);
            
            // Récupérer le projet pour obtenir le createdBy
            const { Project } = require('../models/Project');
            const fullProject = await Project.findById(projectId);
            
            // Créer la campagne dans la collection Campaign pour synchroniser
            campaign = new Campaign({
              _id: campaignId,
              name: projectCampaign.name,
              description: projectCampaign.description || '',
              project: projectId,
              scenarioIds: projectCampaign.scenarios?.map((s: any) => s._id) || [],
              status: 'draft', // Utiliser une valeur valide de l'enum CampaignStatus
              createdBy: fullProject?.owner || fullProject?.userId, // Utiliser le propriétaire du projet
              createdAt: projectCampaign.createdAt || new Date(),
              updatedAt: projectCampaign.updatedAt || new Date(),
              executionProgress: {
                total: projectCampaign.scenarios?.length || 0,
                completed: 0,
                failed: 0,
                running: 0,
                pending: projectCampaign.scenarios?.length || 0
              }
            });
            
            await campaign.save();
            logger.info(`Campagne ${campaignId} synchronisée avec succès`);
          }
        }
      }
      
      if (!campaign) {
        logger.warn(`Campagne ${campaignId} not found in project ${projectId}`);
        throw new AppError('Campagne non trouvée', 404);
      }
      
      // Additional check: if projectId is provided, make sure the campaign belongs to that project
      if (projectId && campaign.project.toString() !== projectId) {
        logger.warn(`Campaign ${campaignId} does not belong to project ${projectId}`);
        throw new AppError('Campagne n\'appartient pas au projet spécifié', 404);
      }
      
      logger.info(`Campagne trouvée: ${campaign.name} (${campaign._id})`);
      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error(`Erreur lors de la récupération de la campagne ${campaignId}: ${errorMessage}`, error);
      
      // Check if it's a Mongoose CastError (invalid ObjectId)
      if (error instanceof mongoose.Error.CastError) {
        throw new AppError('Format d\'ID de campagne invalide', 400);
      }
      
      throw new AppError('Échec de la récupération de la campagne', 500);
    }
  }

  /**
   * Récupère les scénarios associés à une campagne
   */
  async getScenariosByCampaign(campaignId: string): Promise<any[]> {
    try {
      console.log('🚨 CampaignService.getScenariosByCampaign() APPELÉE avec campaignId:', campaignId);
      logger.info('🚨 CampaignService.getScenariosByCampaign() APPELÉE avec campaignId:', campaignId);
      
      // Validate the campaignId format
      if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
        logger.error(`ID de campagne invalide pour la récupération des scénarios: ${campaignId}`);
        throw new AppError('ID de campagne invalide', 400);
      }
      
      logger.info(`Récupération des scénarios pour la campagne: ${campaignId}`);
      
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        logger.warn(`Campagne non trouvée pour l'ID: ${campaignId}`);
        throw new AppError('Campagne non trouvée', 404);
      }

      if (!campaign.scenarioIds || campaign.scenarioIds.length === 0) {
        logger.info(`Aucun scénario trouvé pour la campagne ${campaignId} - scenarioIds: ${JSON.stringify(campaign.scenarioIds)}`);
        return [];
      }

      logger.info(`🔍 Recherche des scénarios avec les IDs:`, campaign.scenarioIds.map(id => id.toString()));

      try {
        // Récupérer les scénarios à partir du service de scénarios
        const scenarios = await mongoose.model('Scenario').find({
          _id: { $in: campaign.scenarioIds }
        });
        
        logger.info(`${scenarios.length} scénarios récupérés pour la campagne ${campaignId}`);
        logger.info(`📋 IDs des scénarios trouvés en base:`, scenarios.map(s => s._id.toString()));
        
        if (scenarios.length !== campaign.scenarioIds.length) {
          logger.warn(`⚠️ Désynchronisation : ${scenarios.length} trouvés vs ${campaign.scenarioIds.length} attendus`);
          logger.warn(`IDs attendus:`, campaign.scenarioIds.map(id => id.toString()));
          logger.warn(`IDs trouvés:`, scenarios.map(s => s._id.toString()));
        }
        
        return scenarios;
      } catch (error) {
        logger.error(`Erreur lors de la requête des scénarios pour la campagne ${campaignId}:`, error);
        // Retourner un tableau vide plutôt que de jeter une erreur
        return [];
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error(`Erreur lors de la récupération des scénarios pour la campagne ${campaignId}: ${errorMessage}`, error);
      
      // Check if it's a Mongoose CastError (invalid ObjectId)
      if (error instanceof mongoose.Error.CastError) {
        throw new AppError('Format d\'ID de campagne invalide', 400);
      }
      
      throw new AppError('Échec de la récupération des scénarios de la campagne', 500);
    }
  }

  /**
   * Met à jour une campagne
   */
  async updateCampaign(campaignId: string, updates: Partial<ICampaign>): Promise<ICampaign> {
    try {
      // Vérifier si la campagne est en cours d'exécution
      const existingCampaign = await Campaign.findById(campaignId);
      if (!existingCampaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (existingCampaign.status === CampaignStatus.RUNNING) {
        throw new AppError('Impossible de modifier une campagne en cours d\'exécution', 400);
      }

      const campaign = await Campaign.findByIdAndUpdate(
        campaignId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      // Si les scénarios ont été modifiés, mettre à jour le suivi de progression
      if (updates.scenarioIds) {
        campaign.executionProgress = {
          total: updates.scenarioIds.length,
          completed: 0,
          failed: 0,
          running: 0,
          pending: updates.scenarioIds.length
        };
        await campaign.save();
      }

      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de la mise à jour de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de la mise à jour de la campagne', 500);
    }
  }

  /**
   * Supprime une campagne
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      // Vérifier si la campagne est en cours d'exécution
      if (campaign.status === CampaignStatus.RUNNING) {
        // Arrêter tous les scénarios en cours
        await this.stopCampaignExecution(campaignId);
      }

      await Campaign.findByIdAndDelete(campaignId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de la suppression de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de la suppression de la campagne', 500);
    }
  }

  /**
   * Ajoute des scénarios à une campagne
   */
  async addScenariosToCampaign(campaignId: string, scenarioIds: string[]): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status === CampaignStatus.RUNNING) {
        throw new AppError('Impossible de modifier une campagne en cours d\'exécution', 400);
      }

      // Filtrer les scénarios déjà présents
      const existingIds = campaign.scenarioIds.map(id => id.toString());
      const newScenarioIds = scenarioIds
        .filter(id => !existingIds.includes(id))
        .map(id => new mongoose.Types.ObjectId(id));

      // Ajouter les nouveaux scénarios
      campaign.scenarioIds = [...campaign.scenarioIds, ...newScenarioIds];
      // Correction : Initialiser executionProgress si nécessaire
      if (!campaign.executionProgress) {
        campaign.executionProgress = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
      }
      // Mettre à jour le suivi de progression
      campaign.executionProgress.total = campaign.scenarioIds.length;
      campaign.executionProgress.pending = campaign.scenarioIds.length;

      await campaign.save();
      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de l'ajout de scénarios à la campagne ${campaignId}:`, error);
      throw new AppError('Échec de l\'ajout de scénarios', 500);
    }
  }

  /**
   * Retire des scénarios d'une campagne
   */
  async removeScenariosFromCampaign(campaignId: string, scenarioIds: string[]): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status === CampaignStatus.RUNNING) {
        throw new AppError('Impossible de modifier une campagne en cours d\'exécution', 400);
      }

      // Filtrer les scénarios à supprimer
      campaign.scenarioIds = campaign.scenarioIds.filter(
        id => !scenarioIds.includes(id.toString())
      );
      // Correction : Initialiser executionProgress si nécessaire
      if (!campaign.executionProgress) {
        campaign.executionProgress = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
      }
      // Mettre à jour le suivi de progression
      campaign.executionProgress.total = campaign.scenarioIds.length;
      campaign.executionProgress.pending = campaign.scenarioIds.length;
      campaign.executionProgress.completed = 0;
      campaign.executionProgress.failed = 0;
      campaign.executionProgress.running = 0;

      await campaign.save();
      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de la suppression de scénarios de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de la suppression de scénarios', 500);
    }
  }

  /**
   * Planifie l'exécution d'une campagne
   */
  async scheduleCampaign(campaignId: string, scheduledDate: Date): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status === CampaignStatus.RUNNING) {
        throw new AppError('Impossible de planifier une campagne en cours d\'exécution', 400);
      }

      // Vérifier si la date est dans le futur
      if (scheduledDate <= new Date()) {
        throw new AppError('La date de planification doit être dans le futur', 400);
      }

      campaign.scheduledFor = scheduledDate;
      campaign.status = CampaignStatus.SCHEDULED;
      await campaign.save();

      // Planifier l'exécution
      this.scheduleExecution(campaign);

      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de la planification de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de la planification de la campagne', 500);
    }
  }

  /**
   * Démarre l'exécution d'une campagne
   */
  async startCampaignExecution(campaignId: string): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status === CampaignStatus.RUNNING) {
        throw new AppError('La campagne est déjà en cours d\'exécution', 400);
      }

      if (campaign.scenarioIds.length === 0) {
        throw new AppError('La campagne ne contient aucun scénario', 400);
      }

      // Mettre à jour le statut de la campagne
      campaign.status = CampaignStatus.RUNNING;
      campaign.executionProgress = {
        total: campaign.scenarioIds.length,
        completed: 0,
        failed: 0,
        running: 0,
        pending: campaign.scenarioIds.length
      };
      await campaign.save();

      // Exécuter les scénarios
      this.executeScenarios(campaign).catch(error => {
        logger.error(`Erreur lors de l'exécution de la campagne ${campaignId}:`, error);
      });

      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors du démarrage de la campagne ${campaignId}:`, error);
      throw new AppError('Échec du démarrage de la campagne', 500);
    }
  }

  /**
   * Arrête l'exécution d'une campagne
   */
  async stopCampaignExecution(campaignId: string): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status !== CampaignStatus.RUNNING && campaign.status !== CampaignStatus.PAUSED) {
        throw new AppError('La campagne n\'est pas en cours d\'exécution', 400);
      }

      // Arrêter tous les scénarios en cours
      const runningScenarioIds = campaign.scenarioIds;
      for (const scenarioId of runningScenarioIds) {
        try {
          await this.scenarioService.stopScenarioExecution(scenarioId.toString());
        } catch (error) {
          logger.error(`Erreur lors de l'arrêt du scénario ${scenarioId}:`, error);
        }
      }

      // Mettre à jour le statut de la campagne
      campaign.status = CampaignStatus.FAILED;
      await campaign.save();

      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de l'arrêt de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de l\'arrêt de la campagne', 500);
    }
  }

  /**
   * Met en pause l'exécution d'une campagne
   */
  async pauseCampaignExecution(campaignId: string): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status !== CampaignStatus.RUNNING) {
        throw new AppError('La campagne n\'est pas en cours d\'exécution', 400);
      }

      // Mettre à jour le statut de la campagne
      campaign.status = CampaignStatus.PAUSED;
      await campaign.save();

      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de la mise en pause de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de la mise en pause de la campagne', 500);
    }
  }

  /**
   * Reprend l'exécution d'une campagne en pause
   */
  async resumeCampaignExecution(campaignId: string): Promise<ICampaign> {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new AppError('Campagne non trouvée', 404);
      }

      if (campaign.status !== CampaignStatus.PAUSED) {
        throw new AppError('La campagne n\'est pas en pause', 400);
      }

      // Mettre à jour le statut de la campagne
      campaign.status = CampaignStatus.RUNNING;
      await campaign.save();
      // Correction : Initialiser executionProgress si nécessaire
      if (!campaign.executionProgress) {
        campaign.executionProgress = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
      }
      // Reprendre l'exécution des scénarios
      this.executeScenarios(campaign, campaign.executionProgress.completed).catch(error => {
        logger.error(`Erreur lors de la reprise de la campagne ${campaignId}:`, error);
      });

      return campaign;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Erreur lors de la reprise de la campagne ${campaignId}:`, error);
      throw new AppError('Échec de la reprise de la campagne', 500);
    }
  }

  /**
   * Méthodes privées pour l'exécution des campagnes
   */
  private scheduleExecution(campaign: ICampaign): void {
    if (!campaign.scheduledFor) return;
    
    const now = new Date();
    const delay = campaign.scheduledFor.getTime() - now.getTime();
    
    if (delay <= 0) {
      // Exécuter immédiatement si la date est dépassée
      this.startCampaignExecution(campaign._id.toString()).catch(error => {
        logger.error(`Erreur lors du démarrage de la campagne planifiée ${campaign._id}:`, error);
      });
      return;
    }
    
    // Planifier l'exécution
    setTimeout(() => {
      this.startCampaignExecution(campaign._id.toString()).catch(error => {
        logger.error(`Erreur lors du démarrage de la campagne planifiée ${campaign._id}:`, error);
      });
    }, delay);
    
    logger.info(`Campagne ${campaign._id} planifiée pour ${campaign.scheduledFor}`);
  }

  private async executeScenarios(campaign: ICampaign, startIndex: number = 0): Promise<void> {
    // Si la campagne a été mise à jour entre-temps, récupérer la dernière version
    const updatedCampaign = await Campaign.findById(campaign._id);
    if (!updatedCampaign || updatedCampaign.status !== CampaignStatus.RUNNING) {
      return;
    }

    // Exécuter chaque scénario séquentiellement
    for (let i = startIndex; i < updatedCampaign.scenarioIds.length; i++) {
      // Vérifier si la campagne est toujours en cours
      const currentCampaign = await Campaign.findById(campaign._id);
      if (!currentCampaign) return;
      // Correction : Initialiser executionProgress si nécessaire
      if (!currentCampaign.executionProgress) {
        currentCampaign.executionProgress = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
      }
      if (currentCampaign.status === CampaignStatus.PAUSED) {
        logger.info(`Campagne ${campaign._id} mise en pause après le scénario ${i-1}`);
        return;
      }
      if (currentCampaign.status !== CampaignStatus.RUNNING) {
        logger.info(`Campagne ${campaign._id} n'est plus en cours d'exécution, arrêt de la séquence`);
        return;
      }
      const scenarioId = currentCampaign.scenarioIds[i].toString();
      // Mettre à jour le suivi de progression
      currentCampaign.executionProgress.running++;
      currentCampaign.executionProgress.pending--;
      await currentCampaign.save();
      try {
        // Exécuter le scénario
        await this.scenarioService.startScenarioExecution(scenarioId);
        // Attendre que le scénario soit terminé
        await this.waitForScenarioCompletion(scenarioId);
        // Vérifier le statut final du scénario
        const scenario = await this.scenarioService.getScenarioById(scenarioId);
        // Mettre à jour le suivi de progression
        const latestCampaign = await Campaign.findById(campaign._id);
        if (latestCampaign) {
          // Correction : Initialiser executionProgress si nécessaire
          if (!latestCampaign.executionProgress) {
            latestCampaign.executionProgress = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
          }
          latestCampaign.executionProgress.running--;
          if (scenario.status === 'completed') {
            latestCampaign.executionProgress.completed++;
          } else {
            latestCampaign.executionProgress.failed++;
          }
          await latestCampaign.save();
        }
      } catch (error) {
        logger.error(`Erreur lors de l'exécution du scénario ${scenarioId}:`, error);
        // Mettre à jour le suivi de progression en cas d'erreur
        const latestCampaign = await Campaign.findById(campaign._id);
        if (latestCampaign) {
          // Correction : Initialiser executionProgress si nécessaire
          if (!latestCampaign.executionProgress) {
            latestCampaign.executionProgress = { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
          }
          latestCampaign.executionProgress.running--;
          latestCampaign.executionProgress.failed++;
          await latestCampaign.save();
        }
      }
    }

    // Tous les scénarios sont terminés
    const finalCampaign = await Campaign.findById(campaign._id);
    if (finalCampaign && finalCampaign.status === CampaignStatus.RUNNING) {
      finalCampaign.status = CampaignStatus.COMPLETED;
      finalCampaign.completedAt = new Date();
      await finalCampaign.save();
      
      logger.info(`Campagne ${campaign._id} terminée avec succès`);
    }
  }

  private async waitForScenarioCompletion(scenarioId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const scenario = await this.scenarioService.getScenarioById(scenarioId);
          
          if (scenario.status === 'completed' || scenario.status === 'failed') {
            clearInterval(checkInterval);
            resolve();
          }
          // Sinon, continuer à vérifier
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 5000); // Vérifier toutes les 5 secondes
    });
  }
}
