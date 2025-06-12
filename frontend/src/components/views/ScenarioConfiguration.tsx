import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useThemeStore } from '../../store/themeStore';
import {
  ArrowLeftIcon,
  BeakerIcon,
  ServerIcon,
  ClockIcon,
  CogIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { useProjectManagementStore } from '../../store/projectManagementStore';
import { Scenario, Attack } from '../../types/projectManagement';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';
import { StatusBadge } from '../shared/UI/StatusBadge';

// Import tab components
import ScenarioTargets from '../features/Scenarios/Tabs/ScenarioTargets';
import ScenarioAttacks from '../features/Scenarios/Tabs/ScenarioAttacks';
import ScenarioExecution from '../features/Scenarios/Tabs/ScenarioExecution';
import ScenarioHistory from '../features/Scenarios/Tabs/ScenarioHistory';
import ScenarioSettings from '../features/Scenarios/Tabs/ScenarioSettings';

export const ScenarioConfiguration: React.FC = () => {
  const { projectId, campaignId, scenarioId } = useParams<{
    projectId: string;
    campaignId: string;
    scenarioId: string;
  }>();
  const navigate = useNavigate();
  const {
    loadScenarioById,
    updateScenario,
    currentScenario
  } = useProjectManagementStore();
  const theme = useThemeStore((state) => state.theme);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('targets');

  // Define tabs with their icons
  const tabs = [
    {
      id: 'targets',
      name: 'Targets',
      icon: ServerIcon,
      description: 'Configure target systems'
    },
    {
      id: 'attacks',
      name: 'Attacks',
      icon: BeakerIcon,
      description: 'Select and configure attacks'
    },
    {
      id: 'execution',
      name: 'Execution',
      icon: BeakerIcon,
      description: 'Run and monitor attacks'
    },
    {
      id: 'history',
      name: 'History',
      icon: ClockIcon,
      description: 'View execution history'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      description: 'Scenario configuration'
    }
  ];

  // Initial scenario loading
  useEffect(() => {
    const loadScenario = async () => {
      if (!scenarioId || !projectId || !campaignId) return;
      try {
        await loadScenarioById(scenarioId, projectId, campaignId);
      } catch (err) {
        console.error('Error loading scenario:', err);
        toast.error('Error loading scenario');
      } finally {
        setIsLoading(false);
      }
    };

    loadScenario();
  }, [scenarioId, loadScenarioById, projectId, campaignId]);

  // Update local scenario when currentScenario changes
  useEffect(() => {
    if (currentScenario) {
      setScenario(currentScenario);
    }
  }, [currentScenario]);

  // Save function for child components
  const handleSave = async (updates: Partial<Scenario>) => {
    if (!scenarioId || !projectId || !campaignId || !scenario) return;
    try {
      const updatedScenario = { ...scenario, ...updates };
      await updateScenario(scenarioId, updatedScenario, projectId, campaignId);
      toast.success('Changes saved successfully');
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Error saving changes');
    }
  };

  // Save specific function for attacks
  const handleSaveAttacks = async (attacks: Attack[]) => {
    await handleSave({ attacks });
  };

  // Render current tab content
  const renderTabContent = () => {
    if (!scenario) return null;

    switch (activeTab) {
      case 'targets':
        return <ScenarioTargets scenario={scenario} onSave={handleSave} />;
      case 'attacks':
        return <ScenarioAttacks scenario={scenario} onSave={handleSaveAttacks} />;
      case 'execution':
        return <ScenarioExecution scenario={scenario} />;
      case 'history':
        return <ScenarioHistory />;
      case 'settings':
        return <ScenarioSettings scenario={scenario} onSave={handleSave} />;
      default:
        return <ScenarioTargets scenario={scenario} onSave={handleSave} />;
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

  // Loading state
  if (isLoading || !scenario) {
    return (
      <div className="container-padding">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>Loading scenario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-padding space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}/campaigns/${campaignId}`)}
            className="p-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <BeakerIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {scenario.name}
              </h1>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
                {scenario.description || 'Security testing scenario'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <StatusBadge status={getStatusColor(scenario.status)}>
            {scenario.status || 'pending'}
          </StatusBadge>
        </div>
      </motion.div>

      {/* Scenario Overview */}
      <Card className="space-y-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2 ${
              theme === 'light' ? 'bg-blue-100' : 'bg-blue-900/30'
            }`}>
              <ServerIcon className={`w-6 h-6 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {scenario.targets?.length || 0}
            </p>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>Targets</p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2 ${
              theme === 'light' ? 'bg-red-100' : 'bg-red-900/30'
            }`}>
              <BeakerIcon className={`w-6 h-6 ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {scenario.attacks?.length || 0}
            </p>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>Attacks</p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2 ${
              theme === 'light' ? 'bg-green-100' : 'bg-green-900/30'
            }`}>
              <ClockIcon className={`w-6 h-6 ${theme === 'light' ? 'text-green-600' : 'text-green-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {scenario.sequence ? 'Sequential' : 'Parallel'}
            </p>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>Execution</p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2 ${
              theme === 'light' ? 'bg-purple-100' : 'bg-purple-900/30'
            }`}>
              <FolderIcon className={`w-6 h-6 ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {scenario.createdAt ? new Date(scenario.createdAt).toLocaleDateString() : 'N/A'}
            </p>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>Created</p>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <Card>
        <div className={`border-b ${theme === 'light' ? 'border-slate-200' : 'border-gray-700'}`}>
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative py-4 px-6 inline-flex items-center border-b-2 font-medium text-sm transition-all duration-200 ${
                    theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-gray-800/50'
                  } ${
                    isActive
                      ? `border-primary-500 ${theme === 'light' ? 'text-primary-600 bg-primary-50' : 'text-primary-400 bg-primary-900/20'}`
                      : `border-transparent ${theme === 'light' ? 'text-slate-500 hover:text-slate-700 hover:border-slate-300' : 'text-gray-500 hover:text-gray-300 hover:border-gray-600'}`
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-2" />
                  <div className="flex flex-col items-start">
                    <span>{tab.name}</span>
                    <span className={`text-xs ${
                      theme === 'light' 
                        ? 'text-slate-400 group-hover:text-slate-500' 
                        : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {tab.description}
                    </span>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute inset-0 rounded-t-lg ${
                        theme === 'light' ? 'bg-primary-50' : 'bg-primary-900/20'
                      }`}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-[600px]"
        >
          {renderTabContent()}
        </motion.div>
      </Card>
    </div>
  );
};
