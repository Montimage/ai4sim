import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScenarioService, CampaignService } from '../services/projectManagementService';
import { Campaign, Scenario } from '../types/projectManagement';
import { CampaignStatus } from '../../../backend/src/models/Campaign';

interface ScenarioCreateData {
  name: string;
  description?: string;
  campaignId?: string;
  targets: Array<{
    host: string;
    name: string;
  }>;
  attacks: Array<{
    tool: string;
    parameters: Record<string, unknown>;
  }>;
  sequence?: boolean;
}

interface CampaignCreateData {
  name: string;
  description?: string;
  scenarioIds?: string[];
  scheduledFor?: string;
}

interface ProjectManagementState {
  // État
  scenarios: Record<string, Scenario[]>; // Les scénarios indexés par ID de projet
  currentScenario: Scenario | null;
  campaigns: Record<string, Campaign[]>; // Les campagnes indexées par ID de projet 
  currentCampaign: Campaign | null;
  isLoadingScenarios: boolean;
  isLoadingCampaigns: boolean;
  errorScenarios: string | null;
  errorCampaigns: string | null;
  
  // Actions pour les scénarios
  loadScenariosByProject: (projectId: string, campaignId?: string) => Promise<void>;
  loadScenarioById: (scenarioId: string, projectId: string, campaignId: string) => Promise<Scenario>;
  createScenario: (projectId: string, scenarioData: ScenarioCreateData) => Promise<Scenario>;
  updateScenario: (scenarioId: string, scenarioData: Partial<Scenario>, projectId: string, campaignId: string) => Promise<void>;
  deleteScenario: (projectId: string, scenarioId: string, campaignId: string) => Promise<void>;
  startScenario: (scenarioId: string, projectId: string, campaignId: string) => Promise<void>;
  stopScenario: (scenarioId: string, projectId: string, campaignId: string) => Promise<void>;
  pauseScenario: (scenarioId: string, projectId: string, campaignId: string) => Promise<void>;
  resumeScenario: (scenarioId: string, projectId: string, campaignId: string) => Promise<void>;
  clearScenariosError: () => void;
  
  // Actions pour les campagnes
  loadCampaignsByProject: (projectId: string) => Promise<void>;
  loadCampaignById: (projectId: string, campaignId: string) => Promise<void>;
  createCampaign: (projectId: string, campaignData: CampaignCreateData) => Promise<Campaign>;
  updateCampaign: (projectId: string, campaignId: string, campaignData: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (projectId: string, campaignId: string) => Promise<void>;
  addScenariosToCampaign: (projectId: string, campaignId: string, scenarioIds: string[]) => Promise<void>;
  removeScenariosFromCampaign: (projectId: string, campaignId: string, scenarioIds: string[]) => Promise<void>;
  scheduleCampaign: (projectId: string, campaignId: string, scheduledFor: string) => Promise<void>;
  startCampaign: (projectId: string, campaignId: string) => Promise<void>;
  stopCampaign: (projectId: string, campaignId: string) => Promise<void>;
  pauseCampaign: (projectId: string, campaignId: string) => Promise<void>;
  resumeCampaign: (projectId: string, campaignId: string) => Promise<void>;
  clearCampaignsError: () => void;
}

const scenarioService = ScenarioService.getInstance();
const campaignService = CampaignService.getInstance();

export const useProjectManagementStore = create<ProjectManagementState>()(
  persist(
    (set, _) => ({
      // État initial
      scenarios: {},
      currentScenario: null,
      campaigns: {},
      currentCampaign: null,
      isLoadingScenarios: false,
      isLoadingCampaigns: false,
      errorScenarios: null,
      errorCampaigns: null,

      // Actions pour les scénarios
      loadScenariosByProject: async (projectId: string, campaignId?: string) => {
        try {
          console.log('🔍 Store: Chargement des scénarios...', { projectId, campaignId });
          set({ isLoadingScenarios: true, errorScenarios: null });
          const scenarios = await scenarioService.getScenariosByProject(projectId, campaignId);
          const key = campaignId ? `${projectId}-${campaignId}` : projectId;
          console.log('✅ Store: Scénarios reçus:', { key, scenarios });
          set(state => ({
            scenarios: {
              ...state.scenarios,
              [key]: scenarios
            },
            isLoadingScenarios: false
          }));
          console.log('💾 Store: État mis à jour avec les scénarios');
        } catch (error) {
          console.error('❌ Store: Erreur lors du chargement des scénarios:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      loadScenarioById: async (scenarioId: string, projectId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!projectId || !campaignId) {
            throw new Error('Le contexte du projet et de la campagne est manquant');
          }
          const scenario = await scenarioService.getScenarioById(projectId, campaignId, scenarioId);
          if (!scenario) {
            throw new Error('Scénario non trouvé');
          }
          set({ currentScenario: scenario, isLoadingScenarios: false });
          return scenario;
        } catch (error) {
          console.error('Erreur lors du chargement du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
          throw error;
        }
      },

      createScenario: async (projectId: string, scenarioData: ScenarioCreateData) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!scenarioData.campaignId) {
            throw new Error('L\'ID de la campagne est requis pour créer un scénario');
          }
          const newScenario = await scenarioService.createScenario(projectId, scenarioData.campaignId, scenarioData);
          
          // Mettre à jour l'état avec la nouvelle liste de scénarios
          const scenarios = await scenarioService.getScenariosByCampaign(projectId, scenarioData.campaignId);
          const key = `${projectId}-${scenarioData.campaignId}`;
          
          set(state => ({
            scenarios: {
              ...state.scenarios,
              [key]: scenarios
            },
            isLoadingScenarios: false
          }));
          
          return newScenario;
        } catch (error) {
          console.error('❌ Store: Erreur lors de la création du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
          throw error;
        }
      },

      updateScenario: async (scenarioId: string, scenarioData: Partial<Scenario>, projectId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!projectId || !campaignId) {
            throw new Error('Le contexte du projet et de la campagne est manquant');
          }
          const updatedScenario = await scenarioService.updateScenario(projectId, campaignId, scenarioId, scenarioData);
          
          set(state => {
            // Mettre à jour currentScenario si nécessaire
            const newCurrentScenario = state.currentScenario?._id === scenarioId
              ? updatedScenario
              : state.currentScenario;
            
            // Mettre à jour le scénario dans la liste par projet
            const newScenarios = { ...state.scenarios };
            const key = `${projectId}-${campaignId}`;
            if (newScenarios[key]) {
              newScenarios[key] = newScenarios[key].map(s => 
                s._id === scenarioId ? updatedScenario : s
              );
            }

            return {
              currentScenario: newCurrentScenario,
              scenarios: newScenarios,
              isLoadingScenarios: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la mise à jour du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      deleteScenario: async (projectId: string, scenarioId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          await scenarioService.deleteScenario(projectId, campaignId, scenarioId);
          
          // Mettre à jour l'état local en supprimant le scénario
          const key = `${projectId}-${campaignId}`;
          set(state => ({
            scenarios: {
              ...state.scenarios,
              [key]: (state.scenarios[key] || []).filter(s => s._id !== scenarioId)
            },
            isLoadingScenarios: false
          }));
        } catch (error) {
          console.error('Erreur lors de la suppression du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
          throw error;
        }
      },

      startScenario: async (scenarioId: string, projectId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!projectId || !campaignId) {
            throw new Error('Le contexte du projet et de la campagne est manquant');
          }
          await scenarioService.startScenario(projectId, campaignId, scenarioId);

          // On met à jour le statut du scénario localement
          set(state => ({
            ...state,
            scenarios: {
              ...state.scenarios,
              [`${projectId}-${campaignId}`]: (state.scenarios[`${projectId}-${campaignId}`] || [])
                .map(s => s._id === scenarioId ? 
                  { ...s, status: 'running' as const } : s
                )
            },
            isLoadingScenarios: false
          }));
        } catch (error) {
          console.error('Erreur lors du démarrage du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Une erreur est survenue'
          });
          throw error;
        }
      },

      stopScenario: async (scenarioId: string, projectId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!projectId || !campaignId) {
            throw new Error('Le contexte du projet et de la campagne est manquant');
          }
          const updatedScenario = await scenarioService.stopScenario(projectId, campaignId, scenarioId);
          
          set(state => {
            // Mettre à jour currentScenario si nécessaire
            const newCurrentScenario = state.currentScenario?._id === scenarioId
              ? updatedScenario
              : state.currentScenario;
            
            // Mettre à jour le scénario dans la liste par projet
            const newScenarios = { ...state.scenarios };
            const key = `${projectId}-${campaignId}`;
            if (newScenarios[key]) {
              newScenarios[key] = newScenarios[key].map(s => 
                s._id === scenarioId ? updatedScenario : s
              );
            }

            return {
              currentScenario: newCurrentScenario,
              scenarios: newScenarios,
              isLoadingScenarios: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de l\'arrêt du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      pauseScenario: async (scenarioId: string, projectId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!projectId || !campaignId) {
            throw new Error('Le contexte du projet et de la campagne est manquant');
          }
          const updatedScenario = await scenarioService.pauseScenario(projectId, campaignId, scenarioId);
          
          set(state => {
            // Mettre à jour currentScenario si nécessaire
            const newCurrentScenario = state.currentScenario?._id === scenarioId
              ? updatedScenario
              : state.currentScenario;
            
            // Mettre à jour le scénario dans la liste par projet
            const newScenarios = { ...state.scenarios };
            const key = `${projectId}-${campaignId}`;
            if (newScenarios[key]) {
              newScenarios[key] = newScenarios[key].map(s => 
                s._id === scenarioId ? updatedScenario : s
              );
            }

            return {
              currentScenario: newCurrentScenario,
              scenarios: newScenarios,
              isLoadingScenarios: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la mise en pause du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      resumeScenario: async (scenarioId: string, projectId: string, campaignId: string) => {
        try {
          set({ isLoadingScenarios: true, errorScenarios: null });
          if (!projectId || !campaignId) {
            throw new Error('Le contexte du projet et de la campagne est manquant');
          }
          const updatedScenario = await scenarioService.resumeScenario(projectId, campaignId, scenarioId);
          
          set(state => {
            // Mettre à jour currentScenario si nécessaire
            const newCurrentScenario = state.currentScenario?._id === scenarioId
              ? updatedScenario
              : state.currentScenario;
            
            // Mettre à jour le scénario dans la liste par projet
            const newScenarios = { ...state.scenarios };
            const key = `${projectId}-${campaignId}`;
            if (newScenarios[key]) {
              newScenarios[key] = newScenarios[key].map(s => 
                s._id === scenarioId ? updatedScenario : s
              );
            }

            return {
              currentScenario: newCurrentScenario,
              scenarios: newScenarios,
              isLoadingScenarios: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la reprise du scénario:', error);
          set({
            isLoadingScenarios: false,
            errorScenarios: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      clearScenariosError: () => {
        set({ errorScenarios: null });
      },

      // Actions pour les campagnes
      loadCampaignsByProject: async (projectId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          const campaigns = await campaignService.getCampaignsByProject(projectId);
          set(state => ({
            campaigns: {
              ...state.campaigns,
              [projectId]: campaigns
            },
            isLoadingCampaigns: false
          }));
        } catch (error) {
          console.error('Erreur lors du chargement des campagnes:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      loadCampaignById: async (projectId: string, campaignId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          const campaign = await campaignService.getCampaignById(projectId, campaignId);
          
          // Mise à jour de la campagne courante
          set(state => {
            // Créer ou mettre à jour la liste des campagnes pour ce projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const campaignExists = projectCampaigns.some(c => c._id === campaignId);
            
            // Si la campagne n'existe pas déjà dans la liste, l'ajouter
            const updatedProjectCampaigns = campaignExists
              ? projectCampaigns.map(c => c._id === campaignId ? campaign : c)
              : [...projectCampaigns, campaign];
            
            console.log(`🔄 ProjectManagementStore: Campagne ${campaignId} ${campaignExists ? 'mise à jour' : 'ajoutée'} pour le projet ${projectId}`);
            
            return {
              currentCampaign: campaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors du chargement de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      createCampaign: async (projectId: string, campaignData: CampaignCreateData) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          const newCampaign = await campaignService.createCampaign(projectId, campaignData);
          set(state => {
            const projectCampaigns = state.campaigns[projectId] || [];
            return {
              campaigns: {
                ...state.campaigns,
                [projectId]: [...projectCampaigns, newCampaign]
              },
              isLoadingCampaigns: false
            };
          });
          return newCampaign;
        } catch (error) {
          console.error('Erreur lors de la création de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
          throw error;
        }
      },

      updateCampaign: async (projectId: string, campaignId: string, campaignData: Partial<Campaign>) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          const updatedCampaign = await campaignService.updateCampaign(projectId, campaignId, campaignData);
          
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? updatedCampaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? updatedCampaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la mise à jour de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      deleteCampaign: async (projectId: string, campaignId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          await campaignService.deleteCampaign(projectId, campaignId);
          
          set(state => {
            // Supprimer la campagne de la liste
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedCampaigns = projectCampaigns.filter(c => c._id !== campaignId);
            
            // Réinitialiser currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? null
              : state.currentCampaign;
            
            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la suppression de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      addScenariosToCampaign: async (projectId: string, campaignId: string, scenarioIds: string[]) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          // Using scenarioIds to avoid the unused parameter warning
          const campaign = await campaignService.updateCampaign(projectId, campaignId, { scenarioIds });
          
          // Mettre à jour localement la campagne 
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de l\'ajout de scénarios à la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      removeScenariosFromCampaign: async (projectId: string, campaignId: string, scenarioIds: string[]) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          // Fetching current scenarios and filtering out the ones to remove
          const campaign = await campaignService.getCampaignById(projectId, campaignId);
          const updatedScenarioIds = campaign.scenarioIds?.filter(
            (id: any) => !scenarioIds.includes(id.toString())
          );
          await campaignService.updateCampaign(projectId, campaignId, { scenarioIds: updatedScenarioIds });
          
          // Mettre à jour localement la campagne
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la suppression de scénarios de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      scheduleCampaign: async (projectId: string, campaignId: string, scheduledFor: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          const campaign = await campaignService.updateCampaign(projectId, campaignId, { scheduledFor });
          
          // Mettre à jour localement la campagne
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la planification de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      startCampaign: async (projectId: string, campaignId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          const campaign = await campaignService.updateCampaign(projectId, campaignId, { status: CampaignStatus.RUNNING });
          
          // Mettre à jour localement la campagne
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors du démarrage de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      stopCampaign: async (projectId: string, campaignId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          const campaign = await campaignService.updateCampaign(projectId, campaignId, { status: CampaignStatus.FAILED });
          
          // Mettre à jour localement la campagne
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de l\'arrêt de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      pauseCampaign: async (projectId: string, campaignId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          const campaign = await campaignService.updateCampaign(projectId, campaignId, { status: CampaignStatus.PAUSED });
          
          // Mettre à jour localement la campagne
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la mise en pause de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      resumeCampaign: async (projectId: string, campaignId: string) => {
        try {
          set({ isLoadingCampaigns: true, errorCampaigns: null });
          // Note: Supposons que cette méthode est implémentée côté serveur
          // Cette fonction devrait être créée dans le service
          const campaign = await campaignService.updateCampaign(projectId, campaignId, { status: CampaignStatus.RUNNING });
          
          // Mettre à jour localement la campagne
          set(state => {
            // Mettre à jour currentCampaign si nécessaire
            const newCurrentCampaign = state.currentCampaign?._id === campaignId
              ? campaign
              : state.currentCampaign;
            
            // Trouver et mettre à jour la campagne dans la liste par projet
            const projectCampaigns = state.campaigns[projectId] || [];
            const updatedProjectCampaigns = projectCampaigns.map(c => 
              c._id === campaignId ? campaign : c
            );

            return {
              currentCampaign: newCurrentCampaign,
              campaigns: {
                ...state.campaigns,
                [projectId]: updatedProjectCampaigns
              },
              isLoadingCampaigns: false
            };
          });
        } catch (error) {
          console.error('Erreur lors de la reprise de la campagne:', error);
          set({
            isLoadingCampaigns: false,
            errorCampaigns: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      },

      clearCampaignsError: () => {
        set({ errorCampaigns: null });
      }
    }),
    {
      name: 'project-management-storage',
      partialize: () => ({
        // Ne stocker que l'état minimal nécessaire dans le stockage persistant
        scenarios: {},
        campaigns: {},
        currentScenario: null,
        currentCampaign: null
      })
    }
  )
);
