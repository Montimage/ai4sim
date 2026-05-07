import { Project, Campaign, Scenario } from '../types/project';
import { api } from './api';

// Fonctions de base pour les projets
export async function getProjects(): Promise<Project[]> {
  try {
    const response = await api.get('/api/projects');
    return response.data;
  } catch (error) {
    console.error('❌ projectService: Erreur lors de la récupération des projets:', error);
    throw error;
  }
}

export async function getProject(projectId: string): Promise<Project> {
  try {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('❌ projectService: Erreur lors de la récupération du projet:', error);
    // Rethrow pour que l'erreur soit gérée par le caller
    throw error;
  }
}

export async function createProject(name: string, description: string): Promise<Project> {
  const response = await api.post('/api/projects', { name, description });
  return response.data;
}

export async function updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
  const response = await api.put(`/api/projects/${projectId}`, projectData);
  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}`);
}

// Fonctions de gestion des permissions
export async function shareProject(
  projectId: string, 
  username: string, 
  role: 'viewer' | 'editor' | 'owner'
): Promise<Project> {
  const response = await api.post(`/api/projects/${projectId}/share`, { username, role });
  return response.data;
}

export async function transferOwnership(
  projectId: string,
  newOwnerId: string
): Promise<Project> {
  const response = await api.post(`/api/projects/${projectId}/transfer-ownership`, { newOwnerId });
  return response.data;
}

export async function promoteToOwner(
  projectId: string,
  userId: string
): Promise<Project> {
  const response = await api.post(`/api/projects/${projectId}/promote-owner`, { userId });
  return response.data;
}

export async function removeUserFromProject(
  projectId: string,
  userId: string
): Promise<Project> {
  const response = await api.delete(`/api/projects/${projectId}/users/${userId}`);
  return response.data;
}

// Fonctions de gestion des campagnes
export async function addCampaignToProject(
  projectId: string, 
  campaign: Partial<Campaign>
): Promise<Project> {
  try {
    // 1. Envoyer la requête de création de campagne
    const response = await api.post(`/api/projects/${projectId}/campaigns`, campaign);
    
    // 2. Vérifier si le projet retourné contient la campagne
    if (response.data && (!response.data.campaigns || response.data.campaigns.length === 0)) {
      // 3. Si non, faire une requête GET pour récupérer le projet à jour
      const updatedProjectResponse = await api.get(`/api/projects/${projectId}`);
      return updatedProjectResponse.data;
    }
    
    // Si tout est normal, retourner la réponse
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la campagne:', error);
    throw error;
  }
}

export async function updateCampaign(
  projectId: string, 
  campaignId: string, 
  updates: Partial<Campaign>
): Promise<Project> {
  const response = await api.put(
    `/api/projects/${projectId}/campaigns/${campaignId}`, 
    { projectId, campaignId, updates }
  );
  return response.data;
}

// Fonctions de gestion des scénarios
export async function updateScenario(
  projectId: string,
  campaignId: string,
  scenarioId: string,
  updates: Partial<Scenario>
): Promise<Project> {
  const response = await api.put(
    `/api/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}`,
    updates
  );
  return response.data;
}


