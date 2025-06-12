import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { useParams } from 'react-router-dom';
import { useProjectManagementStore } from '../../../store/projectManagementStore';
import { toast } from 'react-toastify';
import ScenarioTargets from './Tabs/ScenarioTargets';
import ScenarioAttacks from './Tabs/ScenarioAttacks';
import ScenarioExecution from './Tabs/ScenarioExecution';
import ScenarioSettings from './Tabs/ScenarioSettings';
import { Scenario } from '../../../types/projectManagement';
import { 
  ComputerDesktopIcon, 
  BeakerIcon, 
  PlayIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const ScenarioView: React.FC = () => {
  const { projectId, campaignId, scenarioId = '' } = useParams<{
    projectId?: string;
    campaignId?: string;
    scenarioId?: string;
  }>();
  
  const { loadScenarioById, updateScenario } = useProjectManagementStore();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadScenario = async () => {
      if (!projectId || !campaignId || !scenarioId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const data = await loadScenarioById(scenarioId, projectId, campaignId);
        if (data) {
          setScenario(data);
        }
      } catch (err) {
        const error = err as Error;
        console.error('Error loading scenario:', error);
        toast.error('Error loading scenario');
      } finally {
        setIsLoading(false);
      }
    };

    loadScenario();
  }, [projectId, campaignId, scenarioId, loadScenarioById]);

  const handleSave = async (updates: Partial<Scenario>) => {
    if (!scenarioId || !projectId || !campaignId) return;
    
    try {
      await updateScenario(scenarioId, updates, projectId, campaignId);
      const updatedScenario = await loadScenarioById(scenarioId, projectId, campaignId);
      if (updatedScenario) {
        setScenario(updatedScenario);
      }
      toast.success('Scenario updated successfully');
    } catch (err) {
      const error = err as Error;
      console.error('Error updating scenario:', error);
      toast.error('Error updating scenario');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading scenario...</p>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">
            Scénario non trouvé
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Le scénario demandé n'existe pas ou vous n'avez pas les droits pour y accéder.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { name: 'Cibles', icon: ComputerDesktopIcon },
    { name: 'Attaques', icon: BeakerIcon },
    { name: 'Exécution', icon: PlayIcon },
    { name: 'Paramètres', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {scenario.name}
          </h1>
          {scenario.description && (
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {scenario.description}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <Tab.Group>
            <Tab.List className="flex border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    classNames(
                      'flex items-center gap-2 px-6 py-4 text-sm font-medium focus:outline-none',
                      selected
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    )
                  }
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel>
                <ScenarioTargets 
                  scenario={scenario} 
                  onSave={handleSave} 
                />
              </Tab.Panel>
              <Tab.Panel>
                <ScenarioAttacks 
                  scenario={scenario}
                  onSave={async (attacks) => {
                    await handleSave({ attacks });
                  }}
                />
              </Tab.Panel>
              <Tab.Panel>
                <ScenarioExecution scenario={scenario} />
              </Tab.Panel>
              <Tab.Panel>
                <ScenarioSettings 
                  scenario={scenario}
                  onSave={handleSave}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
};

export default ScenarioView;
