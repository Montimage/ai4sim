import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  ArrowLeftIcon,
  PlusIcon,
  PlayIcon,
  TrashIcon,
  CalendarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  FolderIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useProjectStore } from '../../store/projectStore';
import { useProjectManagementStore } from '../../store/projectManagementStore';
import { Campaign, Scenario } from '../../types/projectManagement';
import CreateScenarioModal from '../features/Scenarios/CreateScenarioModal';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';
import { StatusBadge } from '../shared/UI/StatusBadge';

export const CampaignDetailView: React.FC = () => {
  const { projectId, campaignId } = useParams<{ projectId: string; campaignId: string }>();
  const navigate = useNavigate();
  
  const { currentProject, selectProject } = useProjectStore();
  const {
    scenarios: storeScenarios,
    campaigns: storeCampaigns,
    currentCampaign,
    loadScenariosByProject,
    loadCampaignById,
    deleteScenario,
    isLoadingScenarios,
    isLoadingCampaigns
  } = useProjectManagementStore();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateScenarioModalOpen, setIsCreateScenarioModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !campaignId) {
      console.error('Missing URL parameters:', { projectId, campaignId });
      navigate('/dashboard');
      return;
    }
  }, [projectId, campaignId, navigate]);

  const loadData = async () => {
    setIsLoadingData(true);
    setError(null);

    if (!projectId || !campaignId) {
      console.error('Missing URL parameters:', { projectId, campaignId });
      setError("Missing identifiers");
      setIsLoadingData(false);
      navigate('/dashboard');
      return;
    }

    try {
      console.log(`🔄 CampaignDetailView: Loading campaign - projectId=${projectId}, campaignId=${campaignId}`);
      
      await selectProject(projectId);
      console.log(`✅ CampaignDetailView: Project selected - projectId=${projectId}`);
      
      try {
        await loadCampaignById(projectId, campaignId);
        console.log('✅ CampaignDetailView: Campaign loaded');
      } catch (campaignError: any) {
        console.error('❌ CampaignDetailView: Error loading campaign:', campaignError);
        throw new Error('Error loading campaign');
      }
      
      try {
        await loadScenariosByProject(projectId, campaignId);
        console.log('✅ CampaignDetailView: Scenarios loaded');
      } catch (scenariosError) {
        console.error('❌ CampaignDetailView: Error loading scenarios:', scenariosError);
        throw new Error('Error loading scenarios');
      }
      
      setError(null);
    } catch (err) {
      console.error('❌ CampaignDetailView: Error during loading:', err);
      const errorMessage = err instanceof Error ? err.message : "Error loading data";
      setError(errorMessage);
      
      if (errorMessage === "Project not found or access denied") {
        navigate('/dashboard');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, campaignId]);

  useEffect(() => {
    if (currentCampaign && currentCampaign._id === campaignId) {
      setCampaign(currentCampaign);
    } else if (projectId && storeCampaigns[projectId]) {
      const foundCampaign = storeCampaigns[projectId].find((c: Campaign) => c._id === campaignId);
      if (foundCampaign) {
        setCampaign(foundCampaign);
      }
    }
  }, [currentCampaign, storeCampaigns, campaignId, projectId]);

  useEffect(() => {
    if (projectId && campaignId) {
      const key = `${projectId}-${campaignId}`;
      const campaignScenarios = storeScenarios[key];
      if (Array.isArray(campaignScenarios)) {
        setScenarios(campaignScenarios);
      }
    }
  }, [storeScenarios, projectId, campaignId]);

  const handleExecuteScenario = (scenarioId?: string) => {
    if (scenarioId && projectId && campaignId) {
    navigate(`/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}/execution`);
    }
  };

  const handleCreateScenario = () => {
    setIsCreateScenarioModalOpen(true);
  };

  const handleScenarioCreated = () => {
    loadData();
  };

  const handleDeleteScenario = async () => {
    if (!selectedScenarioId || !projectId) return;
    
    try {
      await deleteScenario(projectId, selectedScenarioId, campaignId!);
      toast.success('Scenario deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedScenarioId(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Failed to delete scenario');
    }
  };

  const handleViewScenario = (scenarioId?: string) => {
    if (scenarioId && projectId && campaignId) {
      navigate(`/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenarioId}`);
    }
  };

  const getStatusColor = (status?: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      case 'failed':
      case 'error':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (isLoadingData || isLoadingScenarios || isLoadingCampaigns) {
    return (
      <div className="container-padding">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading campaign details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign || !currentProject) {
    return (
      <div className="container-padding">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Campaign Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || "The campaign you're looking for doesn't exist or has been deleted."}
          </p>
          <Button onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
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
              onClick={() => navigate(`/projects/${projectId}`)}
            className="p-2"
            >
            <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          
              <div className="flex items-center space-x-3">
            <FolderIcon className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {campaign.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Campaign in {currentProject.name}
                  </p>
              </div>
            </div>
          </div>
        </motion.div>

      {/* Campaign Overview */}
      <Card className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Campaign Information
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
              <div className="flex items-center space-x-2 mt-1">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge status={getStatusColor(campaign.status)}>
                  {campaign.status || 'active'}
                </StatusBadge>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Scenarios</p>
              <div className="flex items-center space-x-2 mt-1">
                <BeakerIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {scenarios.length}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Targets</p>
              <div className="flex items-center space-x-2 mt-1">
                <UserIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {scenarios.reduce((total, scenario) => total + (scenario.targets?.length || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {campaign.description && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Description
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
                {campaign.description}
              </p>
          </div>
        )}
      </Card>

      {/* Scenarios */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Scenarios ({scenarios.length})
          </h2>
          
          <Button onClick={handleCreateScenario}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Scenario
          </Button>
          </div>

          {scenarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => {
              const handleExecuteClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                handleExecuteScenario(scenario._id);
              };

              const handleDeleteClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedScenarioId(scenario._id || null);
                setIsDeleteModalOpen(true);
              };

              return (
              <motion.div
                  key={scenario._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer"
                onClick={() => handleViewScenario(scenario._id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {scenario.name}
                  </h3>
                  <StatusBadge status={getStatusColor(scenario.status)}>
                    {scenario.status || 'pending'}
                  </StatusBadge>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {scenario.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <UserIcon className="w-3 h-3" />
                    <span>{scenario.targets?.length || 0} targets</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <BoltIcon className="w-3 h-3" />
                    <span>{scenario.attacks?.length || 0} attacks</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2" onClick={handleExecuteClick}>
                  <Button
                    size="sm"
                    variant="primary"
                  >
                    <PlayIcon className="w-3 h-3 mr-1" />
                    Execute
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mt-2" onClick={handleDeleteClick}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </Button>
                </div>
            </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BeakerIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Scenarios Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first scenario to start testing security vulnerabilities.
            </p>
            <Button onClick={handleCreateScenario}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create First Scenario
            </Button>
      </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Scenario
                  </h3>
              </div>
              
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this scenario? This action cannot be undone.
            </p>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="error"
                onClick={handleDeleteScenario}
              >
                Delete Scenario
              </Button>
                <Button
                  variant="secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedScenarioId(null);
                }}
                >
                  Cancel
                </Button>
              </div>
          </motion.div>
        </div>
      )}

      {/* Create Scenario Modal */}
      <CreateScenarioModal
        isOpen={isCreateScenarioModalOpen}
        onClose={() => setIsCreateScenarioModalOpen(false)}
        onSuccess={handleScenarioCreated}
        projectId={projectId!}
        campaignId={campaignId!}
      />
    </div>
  );
};

export default CampaignDetailView;
