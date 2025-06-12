// filepath: /home/hamdouni-mohamed/MMT/Dashboard/17.04/frontend/src/components/views/CampaignScenarioList.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  DocumentTextIcon,
  ServerIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useProjectStore } from '../../store/projectStore';
import { useProjectManagementStore } from '../../store/projectManagementStore';
import { Scenario } from '../../types/projectManagement';
import CreateScenarioModal from '../features/Scenarios/CreateScenarioModal';

// Status badge component
const StatusBadge: React.FC<{ status?: string }> = ({ status = 'pending' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'stopped':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'running':
        return 'Running';
      case 'error':
        return 'Error';
      case 'stopped':
        return 'Stopped';
      case 'loading':
        return 'Loading';
      default:
        return 'Pending';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {getStatusText()}
    </span>
  );
};

const CampaignScenarioList: React.FC = () => {
  const { projectId, campaignId } = useParams<{ projectId: string; campaignId: string }>();
  const navigate = useNavigate();
  const { currentProject, selectProject, isLoading: projectLoading } = useProjectStore();
  const { 
    scenarios: storeScenarios,
    loadScenariosByProject,
    isLoadingScenarios
  } = useProjectManagementStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const initData = async () => {
      if (projectId) {
        try {
          await selectProject(projectId);
          if (campaignId) {
            await loadScenariosByProject(projectId, campaignId);
          }
        } catch (error) {
          console.error('Error loading:', error);
          toast.error('Error loading data');
        }
      }
    };
    
    initData();
  }, [projectId, campaignId, selectProject, loadScenariosByProject]);

  // Filter scenarios for current campaign
  const campaignScenarios: Scenario[] = projectId && campaignId && storeScenarios[`${projectId}-${campaignId}`] || [];

  if (isLoadingScenarios) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
                {currentProject?.name}
                {projectLoading && (
                  <span className="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                )}
              </h1>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Scenario
            </button>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ServerIcon className="w-6 h-6 text-indigo-500" />
              Scenarios
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {campaignScenarios.length} scenario{campaignScenarios.length !== 1 ? 's' : ''}
            </span>
          </div>

          {campaignScenarios.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No Scenarios
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                This campaign doesn't have any scenarios yet. Create one to get started.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Scenario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaignScenarios.map((scenario) => (
                <div
                  key={scenario._id}
                  onClick={() => navigate(`/projects/${projectId}/campaigns/${campaignId}/scenarios/${scenario._id}`)}
                  className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
                    hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors p-4 cursor-pointer"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {scenario.name}
                      </h3>
                      <StatusBadge status={scenario.status} />
                    </div>

                    {scenario.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {scenario.description}
                      </p>
                    )}

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <ServerIcon className="w-4 h-4 mr-2" />
                      <span>{scenario.targets?.length || 0} target{scenario.targets?.length !== 1 ? 's' : ''}</span>
                      <span className="mx-2">•</span>
                      <BeakerIcon className="w-4 h-4 mr-2" />
                      <span>{scenario.attacks?.length || 0} attack{scenario.attacks?.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Scenario Modal */}
      <CreateScenarioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId!}
        campaignId={campaignId}
      />
    </div>
  );
};

export default CampaignScenarioList;
