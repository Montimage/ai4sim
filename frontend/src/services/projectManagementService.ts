import { api } from './api';
import { Campaign, Scenario } from '../types/projectManagement';

// Classe de service pour les scénarios
export class ScenarioService {
  private static instance: ScenarioService;

  private constructor() {}

  public static getInstance(): ScenarioService {
    if (!ScenarioService.instance) {
      ScenarioService.instance = new ScenarioService();
    }
    return ScenarioService.instance;
  }

  // Récupère tous les scénarios d'un projet ou d'une campagne avec meilleure gestion des erreurs
  async getScenariosByProject(projectId: string, campaignId?: string): Promise<Scenario[]> {
    try {
      const url = campaignId 
        ? `/api/projects/${projectId}/campaigns/${campaignId}/scenarios`
        : `/api/projects/${projectId}/scenarios`;
        
      console.log(`📊 ScenarioService: Récupération des scénarios pour projet=${projectId}${campaignId ? ` et campagne=${campaignId}` : ''}`);
      const response = await api.get(url);
      console.log('📊 ScenarioService: Scénarios reçus:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching scenarios: projectId=${projectId}${campaignId ? `, campaignId=${campaignId}` : ''}`, error);
      
      // Return empty array instead of throwing when no scenarios found (404)
      if (error.response && error.response.status === 404) {
        console.warn('Aucun scénario trouvé, retour d\'une liste vide');
        return [];
      }
      
      // For other errors, throw with detailed message
      let errorMessage = 'Erreur inconnue';
      if (error.response) {
        errorMessage = error.response.data?.message || `Erreur ${error.response.status}`;
      } else {
        errorMessage = error.message || 'Erreur réseau ou serveur inaccessible';
      }
      
      throw new Error(`Impossible de récupérer les scénarios: ${errorMessage}`);
    }
  }

  // Récupère un scénario par son ID
  async getScenarioById(projectId: string, campaignId: string, scenarioId: string): Promise<Scenario> {
    const url = `/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}`;
    const response = await api.get(url);
    return response.data;
  }

  // Récupère les scénarios d'une campagne
  async getScenariosByCampaign(projectId: string, campaignId: string): Promise<Scenario[]> {
    try {
      console.log(`📊 ScenarioService: Récupération des scénarios pour projet=${projectId} et campagne=${campaignId}`);
      const response = await api.get(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios`);
      console.log(`✅ ScenarioService: ${response.data.length} scénarios reçus`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching scenarios for campaign: projectId=${projectId}, campaignId=${campaignId}`, error);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
        
        // Return empty array on 404 to prevent UI crashes
        if (error.response.status === 404) {
          console.warn('Campaign not found, returning empty scenario list');
          return [];
        }
      }
      throw error;
    }
  }

  // Crée un scénario dans une campagne
  async createScenario(projectId: string, campaignId: string, scenarioData: Partial<Scenario>): Promise<Scenario> {
    try {
      if (!projectId || !campaignId) {
        throw new Error('Les identifiants du projet et de la campagne sont requis');
      }
      
      console.log(`📊 ScenarioService: Création d'un scénario dans le projet=${projectId}, campagne=${campaignId}`, scenarioData);
      
      // Vérifications des données obligatoires
      if (!scenarioData.name) {
        throw new Error('Le nom du scénario est obligatoire');
      }
      
      // Les cibles et attaques peuvent être configurées après la création du scénario
      
      const response = await api.post(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios`, scenarioData);
      console.log('✅ ScenarioService: Scénario créé avec succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ ScenarioService: Erreur lors de la création du scénario:', error);
      
      // Traitement des erreurs API
      if (error.response) {
        const { status, data } = error.response;
        console.error(`Status: ${status}, Data:`, data);
        
        const errorMessage = data?.message || `Erreur serveur (${status})`;
        throw new Error(`Échec de la création du scénario: ${errorMessage}`);
      }
      
      // Pour les erreurs déjà formatées ou autres erreurs
      throw error.message ? error : new Error('Erreur lors de la création du scénario');
    }
  }

  // Met à jour un scénario
  async updateScenario(projectId: string, campaignId: string, scenarioId: string, scenarioData: Partial<Scenario>): Promise<Scenario> {
    try {
      console.log(`📊 ScenarioService: Mise à jour du scénario ${scenarioId} dans le projet=${projectId}, campagne=${campaignId}`, scenarioData);
      const response = await api.put(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}`, scenarioData);
      console.log('✅ ScenarioService: Scénario mis à jour avec succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ ScenarioService: Erreur lors de la mise à jour du scénario:', error);
      
      // Traitement des erreurs API
      if (error.response) {
        const { status, data } = error.response;
        console.error(`Status: ${status}, Data:`, data);
        
        let errorMessage = data?.message || `Erreur serveur (${status})`;
        
        switch (status) {
          case 400:
            errorMessage = `Données invalides: ${data?.message || 'Vérifiez les paramètres du scénario'}`;
            break;
          case 403:
            errorMessage = `Accès refusé: ${data?.message || 'Vous n\'avez pas les permissions pour modifier ce scénario'}`;
            break;
          case 404:
            errorMessage = `Scénario non trouvé: ${data?.message || 'Le scénario n\'existe plus'}`;
            break;
          case 409:
            errorMessage = `Conflit: ${data?.message || 'Le scénario est en cours d\'exécution'}`;
            break;
        }
        
        throw new Error(`Échec de la mise à jour du scénario: ${errorMessage}`);
      }
      
      // Pour les erreurs déjà formatées ou autres erreurs
      throw error.message ? error : new Error('Erreur lors de la mise à jour du scénario');
    }
  }

  // Supprime un scénario
  async deleteScenario(projectId: string, campaignId: string, scenarioId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}`);
  }

  // Démarre l'exécution d'un scénario
  async startScenario(projectId: string, campaignId: string, scenarioId: string): Promise<Scenario> {
    const response = await api.post(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}/start`);
    return response.data;
  }

  // Arrête l'exécution d'un scénario
  async stopScenario(projectId: string, campaignId: string, scenarioId: string): Promise<Scenario> {
    const response = await api.post(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}/stop`);
    return response.data;
  }

  // Met en pause l'exécution d'un scénario
  async pauseScenario(projectId: string, campaignId: string, scenarioId: string): Promise<Scenario> {
    const response = await api.post(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}/pause`);
    return response.data;
  }

  // Reprend l'exécution d'un scénario
  async resumeScenario(projectId: string, campaignId: string, scenarioId: string): Promise<Scenario> {
    const response = await api.post(`/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}/resume`);
    return response.data;
  }
}

// Classe de service pour les campagnes
export class CampaignService {
  private static instance: CampaignService;

  private constructor() {}

  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  // Récupère toutes les campagnes d'un projet
  async getCampaignsByProject(projectId: string): Promise<Campaign[]> {
    const response = await api.get(`/api/projects/${projectId}/campaigns`);
    return response.data;
  }

  // Récupère une campagne par son ID avec gestion d'erreurs améliorée
  async getCampaignById(projectId: string, campaignId: string): Promise<Campaign> {
    try {
      if (!projectId || !campaignId) {
        console.error('❌ Invalid parameters for getCampaignById:', { projectId, campaignId });
        throw new Error('Les identifiants projet et campagne sont requis');
      }
      
      console.log(`📊 CampaignService: Fetching campaign with ID ${campaignId} for project ${projectId}`);
      const response = await api.get(`/api/projects/${projectId}/campaigns/${campaignId}`);
      console.log(`✅ CampaignService: Successfully retrieved campaign ${campaignId}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching campaign: projectId=${projectId}, campaignId=${campaignId}`, error);
      
      // Add more descriptive error message based on status code
      let errorMessage = 'Erreur inconnue';
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message || '';
        
        switch (status) {
          case 404:
            errorMessage = `Campagne non trouvée: ${serverMessage || campaignId}`;
            break;
          case 403:
            errorMessage = `Accès refusé: ${serverMessage || 'Vous n\'avez pas les permissions requises'}`;
            break;
          case 400:
            errorMessage = `Requête invalide: ${serverMessage || 'Paramètres incorrects'}`;
            break;
          case 500:
            errorMessage = `Erreur serveur: ${serverMessage || 'Un problème est survenu côté serveur'}`;
            break;
          default:
            errorMessage = serverMessage || error.message || 'Erreur lors de la récupération de la campagne';
        }
        
        console.error(`Status: ${status}, Data:`, error.response.data);
      } else {
        errorMessage = error.message || 'Erreur réseau ou serveur inaccessible';
      }
      
      throw new Error(`Impossible de récupérer la campagne: ${errorMessage}`);
    }
  }

  // Crée une nouvelle campagne
  async createCampaign(projectId: string, campaignData: Partial<Campaign>): Promise<Campaign> {
    const response = await api.post(`/api/projects/${projectId}/campaigns`, campaignData);
    return response.data;
  }

  // Met à jour une campagne
  async updateCampaign(projectId: string, campaignId: string, campaignData: Partial<Campaign>): Promise<Campaign> {
    const response = await api.put(`/api/projects/${projectId}/campaigns/${campaignId}`, campaignData);
    return response.data;
  }

  // Supprime une campagne
  async deleteCampaign(projectId: string, campaignId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}/campaigns/${campaignId}`);
  }
}
