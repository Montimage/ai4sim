import { create } from 'zustand';
import { Project, Campaign, Scenario } from '../types/project';
import * as projectService from '../services/projectService';
import { TOOLS } from '../constants/tools';
import { createStorage } from '../services/storage';

const storage = createStorage();
const SELECTED_PROJECT_KEY = 'selectedProjectId';

interface ApiError {
  response?: {
    status: number;
    data?: any;
  };
  message?: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastFetchTime: number; // Timestamp de la dernière récupération
  cacheDuration: number; // Durée de validité du cache en ms
  fetchInProgress: boolean; // Indicateur de requête en cours
  projectSelectionInProgress: Record<string, boolean>; // Pour suivre les sélections de projet en cours
  
  // Actions
  init: () => Promise<void>;
  loadSavedProject: () => Promise<Project | null>; // Nouvelle méthode
  setSelectedProject: (project: Project | null) => Promise<void>;
  fetchProjects: () => Promise<Project[]>; // Mise à jour du type de retour
  fetchProject: (projectId: string) => Promise<Project>;
  selectProject: (projectId: string) => Promise<Project>;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  shareProject: (projectId: string, username: string, role: 'viewer' | 'editor') => Promise<Project>;
  removeUserFromProject: (projectId: string, userId: string) => Promise<Project>;
  addCampaign: (campaign: Partial<Campaign>) => Promise<Project>;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => Promise<Project>;
  selectCampaign: (campaignId: string) => Campaign | undefined;
  addScenario: (campaignId: string, scenario: Partial<Scenario>) => Promise<Scenario>;
  updateScenario: (campaignId: string, scenarioId: string, updates: Partial<Scenario>) => Promise<Project | undefined>;
  clearSelectedProject: () => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  lastFetchTime: 0,
  cacheDuration: 30000, // 30 secondes en millisecondes
  fetchInProgress: false,
  projectSelectionInProgress: {},

  init: async () => {
    if (get().isInitialized) return;

    try {
      // Ne chargeons plus automatiquement tous les projets ici
      // Nous allons juste marquer le store comme initialisé
      // Les projets seront chargés uniquement quand on en aura besoin (dans ProjectsList)
      
      // Marquer comme initialisé avant tout pour éviter les appels multiples
      set({ isInitialized: true });
      
      // NOTE: Nous ne chargeons plus automatiquement le projet sauvegardé lors de l'initialisation
      // Cette opération sera effectuée uniquement sur les pages qui nécessitent un projet actif
      // et pas sur la page de sélection de projets
    } catch (err) {
      const error = err as Error;
      console.error('Échec de l\'initialisation du store des projets:', error);
      set({
        isInitialized: true,
        error: error.message || 'Échec de l\'initialisation'
      });
    }
  },

  setSelectedProject: async (project: Project | null) => {
    try {
      set({ currentProject: project });
      
      if (project) {
        await storage.setItem(SELECTED_PROJECT_KEY, project._id);
      } else {
        await storage.removeItem(SELECTED_PROJECT_KEY);
      }
    } catch (error) {
      console.error('Échec de la persistance de la sélection du projet:', error);
    }
  },

  fetchProjects: async () => {
    const state = get();
    const currentTime = Date.now();
    
    // 1. Vérifier si une requête est déjà en cours
    if (state.fetchInProgress) {
      // Attendre que la requête en cours soit terminée
      // On retourne les projets actuels, la mise à jour sera visible après
      return state.projects;
    }

    // 2. Vérifier si les projets sont déjà en cache et si le cache est encore valide
    if (
      state.projects.length > 0 &&
      currentTime - state.lastFetchTime < state.cacheDuration
    ) {
      return state.projects;
    }

    try {
      // Activer le verrou pour éviter les appels simultanés
      set({ fetchInProgress: true, isLoading: true, error: null });

      const projects = await projectService.getProjects();
      
      // Mettre à jour le cache
      set({ 
        projects, 
        isLoading: false,
        lastFetchTime: currentTime,
        fetchInProgress: false // Désactiver le verrou
      });
      
      return projects;
    } catch (error) {
      console.error('❌ ProjectStore: Erreur lors de la récupération des projets:', error);
      set({
        error: error instanceof Error ? error.message : 'Échec de la récupération des projets',
        isLoading: false,
        fetchInProgress: false // Important: désactiver le verrou même en cas d'erreur
      });
      throw error;
    }
  },

  fetchProject: async (projectId: string) => {
    set({ isLoading: true, error: null });

    try {
      const project = await projectService.getProject(projectId);

      set(state => {
        const updatedProjects = [...state.projects];
        const index = updatedProjects.findIndex(p => p._id === projectId);
        
        if (index !== -1) {
          updatedProjects[index] = project;
        } else {
          updatedProjects.push(project);
        }
        
        return {
          currentProject: project,
          projects: updatedProjects,
          isLoading: false
        };
      });
      
      return project;
    } catch (err) {
      const error = err as ApiError;
      console.error('❌ ProjectStore: Échec de la récupération du projet:', error);
      
      const errorMessage = error.response?.status === 404 
        ? 'Projet introuvable ou vous n\'avez pas accès à ce projet'
        : error.message || 'Échec de la récupération du projet';
      
      set({ error: errorMessage, isLoading: false });
      
      if (error.response?.status === 404) {
        await storage.removeItem(SELECTED_PROJECT_KEY);
        set({ currentProject: null });
      }
      
      throw error;
    }
  },

  selectProject: async (projectId: string) => {
    const state = get();
    
    // Vérifier si le projet est déjà chargé et si c'est le bon
    if (state.currentProject && state.currentProject._id === projectId) {
      return state.currentProject;
    }

    // Vérifier si une sélection pour ce projet est déjà en cours
    if (state.projectSelectionInProgress[projectId]) {
      
      // Créer une promesse qui se résoudra quand le projet sera chargé
      return new Promise<Project>((resolve, reject) => {
        // Vérifier toutes les 100ms si le projet a été chargé
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (currentState.currentProject && currentState.currentProject._id === projectId) {
            clearInterval(checkInterval);
            resolve(currentState.currentProject);
          } else if (!currentState.projectSelectionInProgress[projectId]) {
            // La sélection est terminée mais le projet n'est pas chargé (erreur)
            clearInterval(checkInterval);
            reject(new Error('Échec de la sélection du projet'));
          }
        }, 100);
        
        // Timeout de sécurité après 10 secondes
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout lors de la sélection du projet'));
        }, 10000);
      });
    }
    
    try {
      // Marquer cette sélection comme en cours
      set(state => ({
        ...state,
        isLoading: true,
        error: null,
        projectSelectionInProgress: {
          ...state.projectSelectionInProgress,
          [projectId]: true
        }
      }));
      
      // Récupération directe depuis le serveur, sans vérifier le cache
      const project = await projectService.getProject(projectId);
      
      if (!project) {
        throw new Error('Projet introuvable');
      }
      
      // Mise à jour du store avec les données fraîches
      set(state => {
        // Créer une nouvelle liste de projets avec le projet mis à jour
        const updatedProjects = [...state.projects];
        const index = updatedProjects.findIndex(p => p._id === projectId);
        
        if (index !== -1) {
          updatedProjects[index] = project;
        } else {
          updatedProjects.push(project);
        }
        
        // Créer un nouvel objet de suivi des sélections en cours
        const updatedSelectionInProgress = { ...state.projectSelectionInProgress };
        // Supprimer ce projet des sélections en cours
        delete updatedSelectionInProgress[projectId];
        
        return {
          currentProject: project,
          projects: updatedProjects,
          isLoading: false,
          error: null,
          projectSelectionInProgress: updatedSelectionInProgress
        };
      });
      
      // Sauvegarder l'ID du projet sélectionné
      await storage.setItem(SELECTED_PROJECT_KEY, projectId);

      return project;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du projet:', error);
      
      // Important: Marquer cette sélection comme terminée même en cas d'erreur
      set(state => {
        const updatedSelectionInProgress = { ...state.projectSelectionInProgress };
        delete updatedSelectionInProgress[projectId];
        
        return {
          isLoading: false, 
          error: 'Impossible de charger le projet. Vérifiez votre connexion ou vos permissions.',
          projectSelectionInProgress: updatedSelectionInProgress
        };
      });
      
      throw error;
    }
  },

  createProject: async (project: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const newProject = await projectService.createProject(project.name || '', project.description || '');
      
      // Ajouter le nouveau projet à la liste et le définir comme projet courant
      set(state => ({
        projects: [...state.projects, newProject],
        currentProject: newProject,
        isLoading: false,
        error: null
      }));
      
      // Sauvegarder l'ID du nouveau projet
      await storage.setItem(SELECTED_PROJECT_KEY, newProject._id);
      
      return newProject;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Échec de la création du projet',
        isLoading: false
      });
      throw error;
    }
  },

  // Reste des méthodes inchangées
  updateProject: async (projectId: string, updates: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await projectService.updateProject(projectId, updates);
      set(state => {
        const updatedProjects = [...state.projects];
        const index = updatedProjects.findIndex(p => p._id === projectId);
        
        if (index !== -1) {
          updatedProjects[index] = updatedProject;
        }
        
        return {
          projects: updatedProjects,
          currentProject: state.currentProject?._id === projectId ? updatedProject : state.currentProject,
          isLoading: false
        };
      });
      return updatedProject;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
        isLoading: false
      });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      await projectService.deleteProject(projectId);
      set(state => ({
        projects: state.projects.filter(p => p._id !== projectId),
        currentProject: state.currentProject?._id === projectId ? null : state.currentProject,
        isLoading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false
      });
      throw error;
    }
  },

  shareProject: async (projectId: string, username: string, role: 'viewer' | 'editor') => {
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await projectService.shareProject(projectId, username, role);
      set(state => {
        const updatedProjects = state.projects.map((p: Project) => 
          p._id === projectId ? updatedProject : p
        );
        return {
          projects: updatedProjects,
          currentProject: state.currentProject?._id === projectId ? updatedProject : state.currentProject,
          isLoading: false
        };
      });
      return updatedProject;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to share project';
      set({ error: errorMessage, isLoading: false });
      
      // Redirection en cas d'erreur d'authentification
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
      throw error;
    }
  },

  removeUserFromProject: async (projectId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await projectService.removeUserFromProject(projectId, userId);
      set(state => {
        const updatedProjects = state.projects.map((p: Project) => 
          p._id === projectId ? updatedProject : p
        );
        return {
          projects: updatedProjects,
          currentProject: state.currentProject?._id === projectId ? updatedProject : state.currentProject,
          isLoading: false
        };
      });
      return updatedProject;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove user from project',
        isLoading: false
      });
      throw error;
    }
  },

  addCampaign: async (campaign: Partial<Campaign>) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error('No project selected');
    
    set({ isLoading: true, error: null });
    try {
      const defaultScenarios = TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        targets: [],
        attacks: [{
          tool: tool.id,
          parameters: {},
          timestamp: new Date(),
          status: 'pending' as const
        }]
      }));
      
      const campaignWithScenarios = {
        ...campaign,
        name: campaign.name || `Campaign ${new Date().toLocaleString()}`,
        description: campaign.description || 'No description provided',
        scenarios: defaultScenarios,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let updatedProject = await projectService.addCampaignToProject(
        currentProject._id,
        campaignWithScenarios
      );

      // Le serveur peut retourner un projet sans la nouvelle campagne (bug backend)
      // Dans ce cas, récupérons manuellement le projet à jour avec une requête supplémentaire
      if (!updatedProject.campaigns || updatedProject.campaigns.length === 0) {
        console.error('ProjectStore: campaign not returned by backend, fetching manually...');
        try {
          updatedProject = await projectService.getProject(currentProject._id);
        } catch (error) {
          set({ error: "Erreur lors de la récupération du projet après création de campagne.", isLoading: false });
          throw new Error("Erreur lors de la récupération du projet après création de campagne.");
        }
      }

      // Si toujours pas de campagne, afficher une erreur et ne rien ajouter localement
      const campaignAdded = updatedProject.campaigns?.some(c => 
        c.name === campaignWithScenarios.name && 
        c.description === campaignWithScenarios.description
      );
      if (!campaignAdded) {
        set({ error: "La campagne n'a pas pu être ajoutée (le backend ne la retourne pas).", isLoading: false });
        throw new Error("La campagne n'a pas pu être ajoutée (le backend ne la retourne pas). Veuillez réessayer ou contacter un administrateur.");
      }
      
      set(state => {
        const updatedProjects = state.projects.map((p: Project) =>
          p._id === currentProject._id ? updatedProject : p
        );

        return {
          projects: updatedProjects,
          currentProject: updatedProject,
          isLoading: false
        };
      });

      return updatedProject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add campaign';
      set({ error: errorMessage, isLoading: false });
      
      if (error instanceof Error && error.message === 'Authentication required') {
        window.location.href = '/login';
      }
      throw error;
    }
  },

  // Autres méthodes non modifiées
  updateCampaign: async (campaignId: string, updates: Partial<Campaign>) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error('No project selected');
    
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await projectService.updateCampaign(
        currentProject._id,
        campaignId,
        updates
      );
      
      set(state => {
        const updatedProjects = state.projects.map((p: Project) => 
          p._id === currentProject._id ? updatedProject : p
        );
        return {
          projects: updatedProjects,
          currentProject: updatedProject,
          isLoading: false
        };
      });
      return updatedProject;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update campaign';
      set({ error: errorMessage, isLoading: false });
      
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
      throw error;
    }
  },

  selectCampaign: (campaignId: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      set({ error: 'No project selected' });
      return undefined;
    }
    return currentProject.campaigns?.find((c: Campaign) => c._id === campaignId);
  },

  addScenario: async (campaignId: string, scenario: Partial<Scenario>) => {
    const { currentProject } = get();
    if (!currentProject) throw new Error('No project selected');
    if (!currentProject.campaigns) throw new Error('No campaigns in project');
    
    set({ isLoading: true, error: null });
    try {
      // Trouver la campagne
      const campaign = currentProject.campaigns.find(c => c._id === campaignId);
      if (!campaign) throw new Error('Campaign not found');
      
      // Créer un nouvel objet scénario avec les propriétés requises
      const newScenario: Scenario = {
        _id: undefined, // L'ID sera généré par le serveur
        name: scenario.name || 'New Scenario',
        description: scenario.description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        targets: scenario.targets || [],
        attacks: scenario.attacks || [],
      };
      
      // Utiliser l'API backend pour ajouter le scénario
      const updatedProject = await projectService.updateScenario(
        currentProject._id,
        campaignId,
        newScenario._id!, // Sera ignoré par le backend qui générera un nouvel ID
        newScenario
      );
      
      set(state => {
        const updatedProjects = state.projects.map((p: Project) => 
          p._id === currentProject._id ? updatedProject : p
        );
        return {
          projects: updatedProjects,
          currentProject: updatedProject,
          isLoading: false
        };
      });
      
      // Récupérer le scénario avec son ID généré par le serveur
      const addedScenario = updatedProject.campaigns
        ?.find(c => c._id === campaignId)
        ?.scenarios?.find(s => s.name === newScenario.name);
      
      return addedScenario || newScenario;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add scenario';
      set({ error: errorMessage, isLoading: false });
      
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
      throw error;
    }
  },

  updateScenario: async (campaignId: string, scenarioId: string, updates: Partial<Scenario>) => {
    const { currentProject } = get();
    if (!currentProject) return undefined;
    
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await projectService.updateScenario(
        currentProject._id,
        campaignId,
        scenarioId,
        updates
      );
      
      set(state => {
        if (updatedProject) {
          const updatedProjects = state.projects.map((p: Project) =>
            p._id === currentProject._id ? updatedProject : p
          );
          return {
            projects: updatedProjects,
            currentProject: updatedProject,
            isLoading: false
          };
        }
        return { isLoading: false };
      });
      return updatedProject;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update scenario',
        isLoading: false
      });
      throw error;
    }
  },

  clearSelectedProject: async () => {
    try {
      await storage.removeItem(SELECTED_PROJECT_KEY);
      set({ currentProject: null });
    } catch (error) {
      console.error('Failed to clear selected project:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  // Nouvelle méthode pour charger explicitement un projet sauvegardé
  // Cette méthode sera utilisée uniquement sur les pages qui nécessitent un projet actif
  loadSavedProject: async () => {
    if (get().currentProject) return get().currentProject;

    try {
      const savedProjectId = await storage.getItem(SELECTED_PROJECT_KEY);
      if (savedProjectId && typeof savedProjectId === 'string') {
        try {
          const project = await get().selectProject(savedProjectId);
          return project;
        } catch (err) {
          console.error('❌ Erreur lors du chargement du projet sauvegardé:', err);
          await storage.removeItem(SELECTED_PROJECT_KEY);
          return null;
        }
      }
      return null;
    } catch (err) {
      console.error('❌ Erreur lors de la lecture du projet sauvegardé:', err);
      return null;
    }
  },
}));
