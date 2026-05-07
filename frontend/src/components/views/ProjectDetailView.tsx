import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProjectStore } from '../../store/projectStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useThemeStore } from '../../store/themeStore';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';
import { StatusBadge } from '../shared/UI/StatusBadge';
import CreateCampaignModal from '../features/Campaigns/CreateCampaignModal';
import { 
  FolderIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  XMarkIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { Campaign, ProjectSettings, ProjectUser, SystemRole } from '../../types/project';

export const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const theme = useThemeStore(state => state.theme);
  const { currentProject, fetchProjects, deleteProject, selectProject, addCampaign } = useProjectStore();
  const { addNotification } = useNotificationStore();
  
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectSettings | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<SystemRole>('user');
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [userValidation, setUserValidation] = useState<{
    isValid: boolean | null;
    message: string;
    isChecking: boolean;
  }>({ isValid: null, message: '', isChecking: false });

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        return;
      }

      try {
        setLoading(true);
        await selectProject(projectId);
      } catch (error) {
        console.error('❌ Error loading project:', error);
        addNotification({
          title: 'Error',
          message: 'Failed to load project',
          type: 'error',
          category: 'system'
        });
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, selectProject, navigate, addNotification]);

  // Validation en temps réel du nom d'utilisateur avec debounce
  useEffect(() => {
    const validateUsername = async () => {
      if (!newUsername.trim()) {
        setUserValidation({ isValid: null, message: '', isChecking: false });
        return;
      }

      if (!selectedProject) return;

      setUserValidation(prev => ({ ...prev, isChecking: true }));

      try {
        // Vérifier si l'utilisateur n'est pas déjà dans le projet
        const userAlreadyExists = selectedProject.users.some(user => 
          user.username.toLowerCase() === newUsername.trim().toLowerCase()
        );
        
        if (userAlreadyExists) {
          setUserValidation({
            isValid: false,
            message: 'User is already in this project',
            isChecking: false
          });
          return;
        }

        // Vérifier si l'utilisateur essaie de s'ajouter lui-même
        const currentUsername = localStorage.getItem('username');
        if (currentUsername && newUsername.trim().toLowerCase() === currentUsername.toLowerCase()) {
          setUserValidation({
            isValid: false,
            message: 'You cannot add yourself to the project',
            isChecking: false
          });
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/users/check/${encodeURIComponent(newUsername.trim())}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to check user');

        const data = await response.json();
        
        setUserValidation({
          isValid: data.exists,
          message: data.exists ? `User "${data.user.username}" found` : 'User not found',
          isChecking: false
        });
      } catch (error) {
        setUserValidation({
          isValid: false,
          message: 'Error checking user',
          isChecking: false
        });
      }
    };

    const timeoutId = setTimeout(validateUsername, 500); // Debounce de 500ms
    return () => clearTimeout(timeoutId);
  }, [newUsername, selectedProject]);

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    
    try {
      await deleteProject(currentProject._id);
      addNotification({
        title: 'Project Deleted',
        message: `Project "${currentProject.name}" has been deleted`,
        type: 'success',
        category: 'project'
      });
      navigate('/projects');
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to delete project',
        type: 'error',
        category: 'system'
      });
    }
  };

  const handleCreateCampaign = () => {
    setShowCreateCampaignModal(true);
  };

  const handleCreateCampaignSubmit = async (campaignData: { name: string; description: string }) => {
    if (!currentProject) return;
    
    try {
      await addCampaign(campaignData);
      addNotification({
        type: 'success',
        title: 'Campaign Created',
        message: `Campaign "${campaignData.name}" has been created successfully.`,
        category: 'campaign'
      });
      // Le store met automatiquement à jour le currentProject après la création
      // Pas besoin d'appeler fetchProjects() car addCampaign met déjà à jour le state
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error; // Le modal gérera l'erreur
    }
  };

  const handleOpenSettings = async () => {
    if (!currentProject) return;
    
    // Transform project data to include users with roles
    // Handle case where owner might be just an ID string
    const currentUsername = localStorage.getItem('username') || 'Current User';
    
    let ownerUsername = currentUsername;
    let ownerId = typeof currentProject.owner === 'string' ? currentProject.owner : currentProject.owner._id;
    
    // Si le propriétaire est un objet avec username, l'utiliser
    if (typeof currentProject.owner === 'object' && currentProject.owner.username) {
      ownerUsername = currentProject.owner.username;
    } else {
      // Si c'est juste un ID, récupérer les informations de l'utilisateur
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch(`/api/users/info/${ownerId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const ownerData = await response.json();
            ownerUsername = ownerData.username || ownerUsername;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch owner information:', error);
        // Garder le nom d'utilisateur par défaut en cas d'erreur
      }
    }
    
    const ownerUser: ProjectUser = {
      _id: ownerId,
      username: ownerUsername,
      role: 'admin' // Le propriétaire a le rôle admin par défaut
    };
    
    const projectSettings: ProjectSettings = {
      _id: currentProject._id,
      name: currentProject.name,
      description: currentProject.description || '',
      users: [
        ownerUser,
        ...(currentProject.sharedWith || []).map((user: any) => ({
          _id: user.userId || user._id, // Utiliser userId en priorité
          username: user.username || 'User',
          role: (user.role || 'user') as SystemRole
        }))
      ]
    };
    
    setSelectedProject(projectSettings);
    setShowSettingsModal(true);
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !selectedProject || isCheckingUser || userValidation.isValid !== true) return;
    
    const currentUserId = localStorage.getItem('userId');
    const currentUsername = localStorage.getItem('username');
    
    // Vérification des permissions - SIMPLIFIÉE ET CORRIGÉE
    let isCurrentUserOwner = false;
    
    // Vérifier si l'utilisateur actuel est le propriétaire du projet
    if (currentProject?.owner) {
      const projectOwnerId = typeof currentProject.owner === 'string' ? currentProject.owner : currentProject.owner._id;
      isCurrentUserOwner = projectOwnerId === currentUserId;
    }
    
    // Vérifier aussi dans la liste des utilisateurs si il a le rôle admin
    if (!isCurrentUserOwner && selectedProject.users) {
      const currentUserInProject = selectedProject.users.find(u => u._id === currentUserId);
      isCurrentUserOwner = currentUserInProject?.role === 'admin' || currentUserInProject?.role === 'super_admin';
    }
    
    // Vérifier par username si les IDs ne matchent pas
    if (!isCurrentUserOwner && currentProject?.owner && typeof currentProject.owner === 'object') {
      isCurrentUserOwner = currentProject.owner.username === currentUsername;
    }
    
    if (!isCurrentUserOwner) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only the project owner can add users',
        category: 'system'
      });
      return;
    }
    
    setIsCheckingUser(true);
    
    try {
      // Récupérer les informations de l'utilisateur validé
      const token = localStorage.getItem('token');
      if (!token) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'No authentication token found',
          category: 'system'
        });
        return;
      }
      
      const response = await fetch(`/api/users/check/${encodeURIComponent(newUsername.trim())}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check user');
      }
      
      const data = await response.json();
      
      if (!data.exists) {
        addNotification({
          type: 'error',
          title: 'User Not Found',
          message: `User "${newUsername}" does not exist`,
          category: 'system'
        });
        return;
      }
      
      // Vérifier si l'utilisateur est déjà dans le projet
      const userAlreadyExists = selectedProject.users.some(u => u._id === data.user._id);
      if (userAlreadyExists) {
        addNotification({
          type: 'error',
          title: 'User Already Exists',
          message: `User "${data.user.username}" is already in this project`,
          category: 'system'
        });
        return;
      }
      
      const newUser: ProjectUser = {
        _id: data.user._id,
        username: data.user.username,
        role: newUserRole
      };
      
      setSelectedProject({
        ...selectedProject,
        users: [...selectedProject.users, newUser]
      });
      
      setNewUsername('');
      setNewUserRole('user');
      setUserValidation({ isValid: null, message: '', isChecking: false });
      
      addNotification({
        type: 'success',
        title: 'User Added',
        message: `User "${data.user.username}" has been added to the project`,
        category: 'project'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add user to project',
        category: 'system'
      });
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedProject) return;
    
    const currentUserId = localStorage.getItem('userId');
    
    // Vérifier les permissions de l'utilisateur actuel
    const currentUserInProject = selectedProject.users?.find(u => u._id === currentUserId);
    const isProjectOwner = (typeof currentProject?.owner === 'string' && currentProject.owner === currentUserId) || 
                          (typeof currentProject?.owner === 'object' && currentProject?.owner?._id === currentUserId);
    const isCurrentUserOwner = isProjectOwner || currentUserInProject?.role === 'admin' || currentUserInProject?.role === 'super_admin';
    
    // Seul le owner peut supprimer des utilisateurs
    if (!isCurrentUserOwner) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only the project owner can remove users',
        category: 'system'
      });
      return;
    }
    
    // Empêcher de supprimer l'admin principal
    const userToRemove = selectedProject.users.find(u => u._id === userId);
    if (userToRemove?.role === 'admin' && isProjectOwner) {
      addNotification({
        type: 'error',
        title: 'Invalid Operation',
        message: 'Cannot remove the project owner',
        category: 'system'
      });
      return;
    }
    
    setSelectedProject({
      ...selectedProject,
      users: selectedProject.users.filter(user => user._id !== userId)
    });
  };

  const handleChangeUserRole = (userId: string, newRole: SystemRole) => {
    if (!selectedProject) return;
    
    const currentUserId = localStorage.getItem('userId');
    
    // Vérifier les permissions de l'utilisateur actuel
    const currentUserInProject = selectedProject.users?.find(u => u._id === currentUserId);
    const isProjectOwner = (typeof currentProject?.owner === 'string' && currentProject.owner === currentUserId) || 
                          (typeof currentProject?.owner === 'object' && currentProject?.owner?._id === currentUserId);
    const isCurrentUserOwner = isProjectOwner || currentUserInProject?.role === 'admin' || currentUserInProject?.role === 'super_admin';
    
    // Seul le owner peut modifier les rôles
    if (!isCurrentUserOwner) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only the project owner can modify user roles',
        category: 'system'
      });
      return;
    }
    
    // Empêcher de changer le rôle de l'admin principal
    if (userId === currentUserId && newRole !== 'admin' && isProjectOwner) {
      addNotification({
        type: 'error',
        title: 'Invalid Operation',
        message: 'You cannot change your own role as the owner',
        category: 'system'
      });
      return;
    }
    
    // Mettre à jour l'état local
    setSelectedProject({
      ...selectedProject,
      users: selectedProject.users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      )
    });
  };

  const handleSaveSettings = async () => {
    if (!selectedProject) return;
    
    try {
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('No authentication token found');
      }

      const requestBody = {
        name: selectedProject.name,
        description: selectedProject.description,
        users: selectedProject.users
      };

      // Sauvegarder les informations du projet ET les utilisateurs
      const response = await fetch(`/api/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error('Failed to update project');
      }

      await response.json();
      
      addNotification({
        type: 'success',
        title: 'Project Settings Updated',
        message: `Project settings and user permissions have been updated successfully.`,
        category: 'project'
      });
      
      // Recharger les projets pour afficher les modifications
      await fetchProjects();
      setShowSettingsModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('❌ Error updating project settings:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update project settings',
        category: 'system'
      });
    }
  };

  const getRoleColor = (role: SystemRole) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'project_manager': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'security_analyst': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'user': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleViewCampaign = (campaign: Campaign) => {
    if (currentProject) {
      navigate(`/projects/${currentProject._id}/campaigns/${campaign._id}`);
    }
  };

  const getStatusColor = (status?: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'paused':
        return 'warning';
      case 'archived':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getCampaignStatus = (): string => {
    // Puisque Campaign du type n'a pas de status, on peut en déduire un basé sur d'autres propriétés
    // ou utiliser une valeur par défaut
    return 'active'; // Valeur par défaut
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!currentProject) return;
    
    try {
      const response = await fetch(`/api/projects/${currentProject._id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newOwnerId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to transfer ownership');
      }
      
      await response.json();
      // Refresh the project data
      window.location.reload();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Failed to transfer ownership');
    }
  };

  if (loading) {
    return (
      <div className="container-padding">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
            Loading project details...
          </p>
        </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="container-padding">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className={`w-16 h-16 mx-auto mb-4 ${
            theme === 'light' ? 'text-slate-400' : 'text-gray-400'
          }`} />
          <h3 className={`text-lg font-medium mb-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            Project Not Found
          </h3>
          <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
            The requested project could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-padding space-y-6 max-h-full overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
          <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
              onClick={() => navigate('/projects')}
            className="p-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <FolderIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className={`text-3xl font-bold ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                {currentProject.name}
                </h1>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
                {currentProject.description}
              </p>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="flex items-center space-x-3">
          <StatusBadge status={getStatusColor(currentProject.status)}>
            {currentProject.status || 'active'}
          </StatusBadge>
          
          <Button
            variant="secondary"
            onClick={handleOpenSettings}
          >
            <Cog6ToothIcon className="w-4 h-4 mr-2" />
            Settings
          </Button>
          
          <Button
            variant="error"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* Project Overview */}
      <Card className="space-y-6">
        <div>
          <h2 className={`text-xl font-semibold mb-4 ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            Project Information
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
                      <div>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                Created
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <CalendarIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>
                  {new Date(currentProject.createdAt).toLocaleDateString()}
                </span>
              </div>
                    </div>

                    <div>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={getStatusColor(currentProject.status)}>
                  {currentProject.status || 'active'}
                </StatusBadge>
                      </div>
                    </div>

                    <div>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                Campaigns
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <DocumentTextIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>
                  {currentProject.campaigns?.length || 0}
                </span>
              </div>
                    </div>

                    <div>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                Total Scenarios
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <PlayIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>
                  {currentProject.campaigns?.reduce((total, campaign) => 
                    total + (campaign.scenarios?.length || 0), 0) || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {currentProject.description && (
          <div>
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              Description
            </h3>
            <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
              {currentProject.description}
            </p>
            </div>
          )}
      </Card>

      {/* Campaigns */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-semibold ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            Campaigns ({currentProject.campaigns?.length || 0})
          </h2>
          <Button
            variant="primary"
            onClick={handleCreateCampaign}
            icon={<PlusIcon className="w-4 h-4" />}
          >
            New Campaign
          </Button>
        </div>

        {!currentProject.campaigns || currentProject.campaigns.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'light' ? 'text-slate-400' : 'text-gray-400'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              No campaigns yet
            </h3>
            <p className={`mb-6 ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
              Create your first campaign to start organizing your security tests.
            </p>
            <Button
              variant="primary"
              onClick={handleCreateCampaign}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentProject.campaigns.map((campaign) => (
              <motion.div
                key={campaign._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                  theme === 'light' 
                    ? 'bg-white border-slate-200 hover:border-slate-300' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${
                        theme === 'light' ? 'text-slate-900' : 'text-white'
                      }`}>
                    {campaign.name}
                  </h3>
                      <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="success" size="sm">
                    {getCampaignStatus()}
                  </StatusBadge>
                </div>
                
                <p className={`text-sm mb-4 line-clamp-2 ${
                  theme === 'light' ? 'text-slate-600' : 'text-white/70'
                }`}>
                  {campaign.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                    {campaign.scenarios?.length || 0} scenarios
                  </span>
                </div>
                
                  <Button
                  variant="primary"
                    size="sm"
                  fullWidth
                  onClick={() => handleViewCampaign(campaign)}
                  icon={<EyeIcon className="w-4 h-4" />}
                >
                  View Campaign
                  </Button>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-lg p-6 ${
            theme === 'light' ? 'bg-white' : 'bg-slate-800'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              <h3 className={`text-lg font-semibold ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                Delete Project
              </h3>
              </div>
            <p className={`mb-6 ${theme === 'light' ? 'text-slate-600' : 'text-gray-300'}`}>
              Are you sure you want to delete "{currentProject.name}"? This action cannot be undone and will delete all associated campaigns and scenarios.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="error"
                onClick={handleDeleteProject}
                fullWidth
              >
                Delete Project
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </div>
          </div>
        )}

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={showCreateCampaignModal}
        onClose={() => setShowCreateCampaignModal(false)}
        onSubmit={handleCreateCampaignSubmit}
      />

      {/* Project Settings Modal */}
      {showSettingsModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Project Settings: {selectedProject.name}
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Project Info */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Project Information</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      type="text"
                      value={selectedProject.name}
                      onChange={(e) => setSelectedProject({ ...selectedProject, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={selectedProject.description}
                      onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">User Access Management</h4>
                
                {/* Add User */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add User</h5>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm ${
                          userValidation.isValid === false 
                            ? 'border-red-300 dark:border-red-600' 
                            : userValidation.isValid === true 
                            ? 'border-green-300 dark:border-green-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {newUsername.trim() && (
                        <div className="mt-1 flex items-center space-x-1">
                          {userValidation.isChecking ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                              <span className="text-xs text-gray-500">Checking...</span>
                            </>
                          ) : (
                            <>
                              {userValidation.isValid === true && (
                                <span className="text-xs text-green-600 dark:text-green-400">✓ {userValidation.message}</span>
                              )}
                              {userValidation.isValid === false && (
                                <span className="text-xs text-red-600 dark:text-red-400">✗ {userValidation.message}</span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as SystemRole)}
                      className="border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                    >
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                      <option value="security_analyst">Security Analyst</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button
                      onClick={handleAddUser}
                      disabled={isCheckingUser || !newUsername.trim() || userValidation.isValid !== true}
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white transition ease-in-out duration-150 ${
                        isCheckingUser || !newUsername.trim() || userValidation.isValid !== true
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700'
                      }`}
                    >
                      {isCheckingUser ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <UserPlusIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                  {selectedProject.users.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.role !== 'super_admin' && user.role !== 'admin' && (
                          <>
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeUserRole(user._id, e.target.value as SystemRole)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="user">User</option>
                              <option value="viewer">Viewer</option>
                              <option value="security_analyst">Security Analyst</option>
                              <option value="project_manager">Project Manager</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveUser(user._id)}
                              className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {user.role === 'super_admin' && user.username === localStorage.getItem('username') && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to step down as super admin? You will become a user and cannot undo this action.')) {
                                // Find another super admin to transfer to, or promote someone
                                const otherSuperAdmins = selectedProject.users.filter(u => u.role === 'super_admin' && u._id !== user._id);
                                if (otherSuperAdmins.length > 0) {
                                  handleTransferOwnership(otherSuperAdmins[0]._id);
                                } else {
                                  alert('You cannot step down as the only super admin. Please promote someone else to super admin first.');
                                }
                              }
                            }}
                            className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
                          >
                            Step Down
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Role Descriptions */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h6 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Role Permissions:</h6>
                  <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <li><strong>Super Admin:</strong> Full control, can delete project</li>
                    <li><strong>Admin:</strong> Can create and edit campaigns/scenarios</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100 transition ease-in-out duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailView;
