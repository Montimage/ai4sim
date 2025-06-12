// filepath: /home/hamdouni-mohamed/MMT/Dashboard/17.04/frontend/src/components/views/ScenarioExecutor.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DocumentTextIcon,
  BeakerIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { useProjectStore } from '../../store/projectStore';
import { useProjectManagementStore } from '../../store/projectManagementStore';
import ScenarioTerminal from '../features/ScenarioTerminal/ScenarioTerminal';
import { websocket } from '../../services/websocket';
import { scenarioTerminalService } from '../../services/scenarioTerminalService';
import { Target } from '../../types/project';

// Définition des types

interface Attack {
  _id: string;
  tool: string;
  status: string;
  parameters?: {
    targetIndex: number;
    [key: string]: any;
  };
}

interface Scenario {
  _id: string;
  name: string;
  description: string;
  status: string;
  targets: Target[];
  attacks: Attack[];
  executionTime?: number;
}

/**
 * Interface d'exécution et de monitoring d'un scénario en temps réel
 */
const ScenarioExecutor: React.FC = () => {
  const { projectId, campaignId, scenarioId } = useParams<{ 
    projectId: string; 
    campaignId: string; 
    scenarioId: string;
  }>();
  const navigate = useNavigate();
  const { selectProject } = useProjectStore();
  const { 
    loadScenarioById,
    startScenario,
    stopScenario,
    pauseScenario,
    resumeScenario,
    isLoadingScenarios,
    currentScenario
  } = useProjectManagementStore();
  
  // État du scénario
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  
  // Charger les données du scénario
  useEffect(() => {
    if (projectId) {
      selectProject(projectId);
    }
    
    if (scenarioId && projectId && campaignId) {
      const loadScenario = async () => {
        try {
          await loadScenarioById(scenarioId, projectId, campaignId);
          
          if (currentScenario) {
            setScenario(currentScenario as unknown as Scenario);
          
            // Sélectionner le premier terminal actif par défaut si nécessaire
            const terminals = scenarioTerminalService.getTerminalsByScenario(scenarioId);
            if (terminals.length > 0 && !activeTerminalId) {
              setActiveTerminalId(terminals[0].terminalId);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement du scénario:', error);
          toast.error('Erreur lors du chargement du scénario');
        }
      };
      
      loadScenario();
      
      // Mettre en place une actualisation périodique
      const intervalId = setInterval(loadScenario, 5000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [projectId, campaignId, scenarioId, selectProject, loadScenarioById, currentScenario, activeTerminalId]);
  
  // S'abonner aux mises à jour de terminaux via WebSocket
  useEffect(() => {
    // S'abonner au scénario
    if (scenarioId) {
      websocket.send({
        type: 'subscribe',
        scenarioId
      });
      
      // Rafraîchir la sélection du terminal actif toutes les secondes
      const intervalId = setInterval(() => {
        const terminals = scenarioTerminalService.getTerminalsByScenario(scenarioId);
        
        // Sélectionner le premier terminal s'il n'y en a pas d'actif
        if (terminals.length > 0 && !activeTerminalId) {
          setActiveTerminalId(terminals[0].terminalId);
        }
      }, 1000);
      
      return () => {
        // Se désabonner du scénario
        websocket.send({
          type: 'unsubscribe',
          scenarioId
        });
        
        clearInterval(intervalId);
      };
    }
  }, [scenarioId, activeTerminalId]);
  
  // Navigation vers la page de la campagne
  const handleBack = () => {
    if (projectId && campaignId) {
      navigate(`/projects/${projectId}/campaigns/${campaignId}`);
    }
  };
  
  // Démarrer l'exécution du scénario
  const handleStartScenario = async () => {
    if (!scenarioId || !projectId || !campaignId) return;
    
    try {
      await startScenario(scenarioId, projectId, campaignId);
      toast.success('Scenario started successfully');
      
      // Refresh scenario data
      await loadScenarioById(scenarioId, projectId, campaignId);
      if (currentScenario) {
        setScenario(currentScenario as unknown as Scenario);
      }
    } catch (error) {
      console.error('Error while starting scenario:', error);
      toast.error('Error while starting scenario');
    }
  };
  
  // Pause the scenario
  const handlePauseScenario = async () => {
    if (!scenarioId || !projectId || !campaignId) return;
    
    try {
      await pauseScenario(scenarioId, projectId, campaignId);
      toast.success('Scenario paused');
      
      // Refresh scenario data
      if (projectId && campaignId) {
        await loadScenarioById(scenarioId, projectId, campaignId);
        if (currentScenario) {
          setScenario(currentScenario as unknown as Scenario);
        }
      }
    } catch (error) {
      console.error('Error while pausing scenario:', error);
      toast.error('Error while pausing scenario');
    }
  };
  
  // Resume scenario execution
  const handleResumeScenario = async () => {
    if (!scenarioId || !projectId || !campaignId) return;
    
    try {
      await resumeScenario(scenarioId, projectId, campaignId);
      toast.success('Scenario execution resumed');
      
      // Refresh scenario data
      if (projectId && campaignId) {
        await loadScenarioById(scenarioId, projectId, campaignId);
        if (currentScenario) {
          setScenario(currentScenario as unknown as Scenario);
        }
      }
    } catch (error) {
      console.error('Error while resuming scenario:', error);
      toast.error('Error while resuming scenario');
    }
  };
  
  // Stop scenario execution
  const handleStopScenario = async () => {
    if (!scenarioId || !projectId || !campaignId) return;
    
    try {
      // Vérifier que le scénario est en cours d'exécution ou en pause
      if (scenario?.status !== 'running' && scenario?.status !== 'paused') {
        toast.error('Le scénario doit être en cours d\'exécution ou en pause pour être arrêté');
        return;
      }

      await stopScenario(scenarioId, projectId, campaignId);
      toast.success('Scenario stopped');
      
      // Refresh scenario data
      if (projectId && campaignId) {
        await loadScenarioById(scenarioId, projectId, campaignId);
        if (currentScenario) {
          setScenario(currentScenario as unknown as Scenario);
        }
      }
    } catch (error) {
      console.error('Error while stopping scenario:', error);
      toast.error('Error while stopping scenario');
    }
  };
  
  // Determine status color for scenario or attack
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-600';
      case 'pending':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Determine status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };
  
  // Show loading indicator if needed
  if (isLoadingScenarios || !scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-400 hover:text-white"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <h1 className="text-xl font-semibold">
                {scenario.name}
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                  {getStatusText(scenario.status)}
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {scenario.status === 'running' && (
                <>
                  <button
                    onClick={handlePauseScenario}
                    className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    title="Pause"
                  >
                    <PauseIcon className="w-5 h-5 mr-1" />
                    Pause
                  </button>
                  <button
                    onClick={handleStopScenario}
                    className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Stop"
                  >
                    <StopIcon className="w-5 h-5 mr-1" />
                    Stop
                  </button>
                </>
              )}
              {scenario.status === 'paused' && (
                <>
                  <button
                    onClick={handleResumeScenario}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                    title="Resume"
                  >
                    <PlayIcon className="w-5 h-5 mr-1" />
                    Resume
                  </button>
                  <button
                    onClick={handleStopScenario}
                    className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Stop"
                  >
                    <StopIcon className="w-5 h-5 mr-1" />
                    Stop
                  </button>
                </>
              )}
              {scenario.status !== 'running' && scenario.status !== 'paused' && (
                <button
                  onClick={handleStartScenario}
                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                  title="Start"
                  disabled={scenario.status === 'completed' || scenario.status === 'failed'}
                >
                  <PlayIcon className="w-5 h-5 mr-1" />
                  Start
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Scenario information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-medium text-white flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Scenario Details
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Description</h3>
                  <p className="mt-1 text-white">
                    {scenario.description || 'No description'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Status</h3>
                  <div className="mt-1 flex items-center">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(scenario.status)} mr-2`}></div>
                    <span className="text-white">{getStatusText(scenario.status)}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Execution Time</h3>
                  <p className="mt-1 text-white">
                    {scenario.executionTime ? `${scenario.executionTime} seconds` : 'Not available'}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Targets</h3>
                  <div className="space-y-2">
                    {scenario.targets && scenario.targets.map((target, index) => (
                      <div key={index} className="px-3 py-2 bg-gray-700 rounded-md">
                        <div className="flex justify-between">
                          <span className="font-medium text-white">{target.host}</span>
                          <span className="text-sm text-gray-400">{target.protocol}://{target.port}</span>
                        </div>
                        {target.description && (
                          <p className="text-sm text-gray-300 mt-1">{target.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Middle column: Attacks */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-medium text-white flex items-center">
                  <BeakerIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Attacks
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {scenario.attacks && scenario.attacks.length > 0 ? (
                  scenario.attacks.map((attack, index) => {
                    // Find associated target
                    const targetIndex = attack.parameters?.targetIndex || 0;
                    const target = scenario.targets[targetIndex];
                    
                    return (
                      <div 
                        key={index}
                        className={`border border-gray-700 rounded-lg p-4 cursor-pointer ${
                          activeTerminalId === attack._id ? 'border-blue-500 bg-gray-700' : 'hover:bg-gray-700/50'
                        }`}
                        onClick={() => setActiveTerminalId(attack._id)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center">
                              <div className={`h-3 w-3 rounded-full ${getStatusColor(attack.status)} mr-2`}></div>
                              <h3 className="font-medium text-white">
                                {attack.tool}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {getStatusText(attack.status)}
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                            {`#${index + 1}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center mt-2 text-xs text-blue-400 bg-blue-900/20 rounded-md px-2 py-1 w-fit">
                          <ServerIcon className="h-3 w-3 mr-1" />
                          Target: {target ? target.host : 'Unknown'} {target?.description ? `(${target.description})` : ''}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <BeakerIcon className="w-12 h-12 mx-auto text-gray-600" />
                    <h3 className="mt-2 text-sm font-medium text-white">No attacks</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      This scenario contains no attacks
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right column: Active terminal */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-medium text-white flex items-center">
                  <ServerIcon className="w-5 h-5 mr-2 text-blue-500" />
                  Terminal
                </h2>
              </div>
              
              <div className="flex-1 min-h-0">
                {activeTerminalId && scenarioId ? (
                  <ScenarioTerminal
                    scenarioId={scenarioId}
                    terminalId={activeTerminalId}
                    className="h-full"
                    height="400px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center p-6">
                      <ServerIcon className="h-12 w-12 mx-auto mb-4" />
                      <p>No active terminal</p>
                      <p className="text-sm">Select an attack to view its terminal</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScenarioExecutor;
