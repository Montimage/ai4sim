import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useScenarioTerminal } from '../../../../hooks/useScenarioTerminal';
import { useWebSocket } from '../../../../hooks/useWebSocket';
import { Scenario } from '../../../../types/projectManagement';
import { ExecutionStatus } from '../../../../types/execution';
import { 
  PlayIcon, 
  StopIcon, 
  PauseIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { ScenarioService } from '../../../../services/projectManagementService';
import { useParams } from 'react-router-dom';

// Utility function for deep comparison of objects
const deepEqual = (objA: any, objB: any): boolean => {
  if (objA === objB) return true;
  if (objA == null || objB == null) return false;
  if (typeof objA !== typeof objB) return false;
  
  if (typeof objA !== 'object') return objA === objB;
  
  if (Array.isArray(objA) !== Array.isArray(objB)) return false;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  for (let key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }
  
  return true;
};

interface ScenarioExecutionProps {
  scenario: Scenario;
}

// Main component wrapped in React.memo to avoid unnecessary renders
const ScenarioExecution: React.FC<ScenarioExecutionProps> = React.memo(({ scenario }) => {
  // Vérifier que scenario._id existe avant d'utiliser le hook
  if (!scenario._id) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500">Erreur: ID du scénario manquant</div>
      </div>
    );
  }

  const { 
    output, 
    appendOutput, 
    clearTerminal,
    attackOutputs,
    startExecution,
    completeExecution,
    currentExecutionId,
    checkExecutionCompletion,
    stopAllProcesses
  } = useScenarioTerminal(scenario._id);
  
  const { isConnected, sendMessage: wsMessage, addListener } = useWebSocket();
  const sendMessage = wsMessage;
  
  // Convertir AttackStatus vers ExecutionStatus compatible
  const convertToExecutionStatus = (status: string | undefined): ExecutionStatus => {
    if (!status) return 'idle';
    
    switch (status) {
      case 'failed':
        return 'error';
      case 'completed':
        return 'completed';
      case 'running':
        return 'running';
      case 'paused':
        return 'paused';
      case 'stopped':
        return 'stopped';
      default:
        return 'idle';
    }
  };
  
  const [status, setStatus] = useState<ExecutionStatus>(convertToExecutionStatus(scenario.status));
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('global');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scenarioService = ScenarioService.getInstance();
  const { projectId, campaignId } = useParams<{ projectId: string; campaignId: string }>();
  
  // Stable reference for scenario and its attacks
  const scenarioRef = useRef<Scenario>(scenario);
  
  // Update scenario reference only when necessary
  useEffect(() => {
    if (!deepEqual(scenarioRef.current, scenario)) {
      scenarioRef.current = scenario;
    }
  }, [scenario]);
  
  // Create stable version of attacks
  const scenarioAttacks = useMemo(() => scenario.attacks || [], [scenario._id, scenario.attacks?.length]);

  // Check for execution completion automatically
  useEffect(() => {
    if (status === 'running' && output.length > 0) {
      const checkCompletion = async () => {
        try {
          const completionResult = await checkExecutionCompletion(scenario);
          if (completionResult?.completed) {
            setStatus(completionResult.status === 'completed' ? 'completed' : 'error');
            
            // Stop the timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              startTimeRef.current = null;
            }
          }
        } catch (error) {
          console.error('Error checking execution completion:', error);
        }
      };
      
      checkCompletion();
    }
  }, [status, output, scenario, checkExecutionCompletion]);

  // Update status when it changes in props
  useEffect(() => {
    setStatus(convertToExecutionStatus(scenario.status));
  }, [scenario.status]);

  // Specific handler for status and progress
  const handleStatusUpdate = useCallback((data: any) => {
    // Ignore messages not related to this scenario
    const scenarioId = data.scenarioId || data.data?.scenarioId;
    if (scenarioId && scenarioId !== scenario._id) {
      return;
    }

    switch (data.type) {
      case 'scenario_status_update':
        if (data.data?.status) {
          setStatus(data.data.status);
        }
        break;
        
      case 'scenario_progress_update':
        if (data.data?.progress !== undefined) {
          const progressValue = Math.round(data.data.progress);
          setProgress(progressValue);
        }
        break;
    }
  }, [scenario._id]);

  // The initialization messages are now handled solely by the backend
  // to avoid duplicates

  // Force attack tabs initialization when scenario starts running
  useEffect(() => {
    if (status === 'running') {
      // No more sending messages here - the backend takes care of it
      // Just initialize the attack tabs without messages
      scenarioAttacks.forEach((_, index) => {
        // Utiliser le même format d'ID que dans useScenarioTerminal
        const attackId = `attack-${index + 1}`;
        // Just make sure the tab exists in the state without a message
        if (!attackOutputs[attackId]) {
          // Silently initialize the tab
        }
      });
    }
  }, [status, scenarioAttacks, attackOutputs]);

  // Initialize scenario context when parameters are available
  useEffect(() => {
    if (projectId && campaignId && scenario) {
      console.log(`Scenario initialized for project ${projectId} and campaign ${campaignId}`);
    }
  }, [projectId, campaignId, scenario]);

  // Handle timer for elapsed time
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Start timer when status is "running"
    if (status === 'running') {
      // Initialize start time if not already set
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        setElapsedTime(0); // Reset elapsed time
      }
      
      // Update elapsed time every second
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else {
      // Stop timer when status is not "running"
      // Complete execution in history if not already done
      if ((status === 'completed' || status === 'error') && currentExecutionId) {
        completeExecution(status === 'completed' ? 'completed' : 'failed');
      } else if (status === 'stopped' && currentExecutionId) {
        completeExecution('stopped');
      }
      
      // Keep the last elapsed time if the status is completed or errored
      if (status === 'completed' || status === 'error' || status === 'stopped') {
        // Use backend execution time if available, otherwise keep current elapsed time
        if (scenario.executionTime) {
          setElapsedTime(scenario.executionTime);
        }
        // Reset start time reference
        startTimeRef.current = null;
      }
    }
    
    // Cleanup on component destruction
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, currentExecutionId, completeExecution, scenario.executionTime]);

  // Configuration of WebSocket listeners
  useEffect(() => {
    if (!scenario._id || !isConnected) return;

    // Explicitly subscribe to the scenario upon connection
    sendMessage({
      type: 'subscribe-scenario',
      scenarioId: scenario._id,
      timestamp: new Date().toISOString()
    });

    // Specific listeners for status and progress
    const removeStatusListener = addListener('scenario_status_update', handleStatusUpdate);
    const removeProgressListener = addListener('scenario_progress_update', handleStatusUpdate);
    
    // Cleanup function
    return () => {
      removeStatusListener();
      removeProgressListener();
      
      // Unsubscribe from the scenario on destruction
      sendMessage({
        type: 'unsubscribe-scenario',
        scenarioId: scenario._id,
        timestamp: new Date().toISOString()
      });
    };
  }, [scenario._id, addListener, isConnected, handleStatusUpdate, sendMessage]);

  const handleStart = async () => {
    try {
      // Check that parameters are defined
      if (!projectId || !campaignId || !scenario._id) {
        throw new Error('Project, campaign, and scenario context is missing');
      }
      
      clearTerminal();
      setStatus('running');
      
      // Start execution tracking in history
      startExecution(scenario);
      
      appendOutput('Starting scenario...', 'info');
      
      // First, subscribe to scenario updates (already done in useEffect but we ensure it)
      const subscribeRequest = {
        type: 'subscribe-scenario',
        scenarioId: scenario._id,
        projectId: scenario.project,
        timestamp: new Date().toISOString()
      };
      
      sendMessage(subscribeRequest);
      
      // Request specific information for this scenario
      sendMessage({
        type: 'get_scenario_info',
        scenarioId: scenario._id,
        timestamp: new Date().toISOString()
      });
      
      // Use REST API to start scenario execution
      await scenarioService.startScenario(projectId, campaignId, scenario._id);
      
      appendOutput(`Execution request sent for scenario ${scenario.name}`, 'info');
      
      // Add information about targets and attacks
      appendOutput(`- ${scenario.targets.length} target(s) configured`, 'info');
      appendOutput(`- ${scenario.attacks.length} attack(s) configured`, 'info');
      
      // No longer initialize attack outputs here - the backend takes care of it
      // Launch and preparation messages will come from the backend
      
      // Start at 0%
      setProgress(0);
    } catch (error) {
      setStatus('error');
      // Complete execution with error status - use 'failed' instead of 'error'
      completeExecution('failed');
      appendOutput('Error starting scenario', 'error');
      appendOutput(error instanceof Error ? error.message : 'Unknown error', 'error');
    }
  };

  const handleStop = async () => {
    try {
      if (!projectId || !campaignId || !scenario._id) {
        throw new Error('Project, campaign, and scenario context is missing');
      }

      setStatus('stopped');
      appendOutput('🛑 Stopping scenario execution...', 'warning');
      
      // First, stop all running attack processes
      stopAllProcesses(scenario);
      
      // Then use REST API to stop scenario execution on the backend
      await scenarioService.stopScenario(projectId, campaignId, scenario._id);
      
      // Complete execution with stopped status
      completeExecution('stopped');
      
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        startTimeRef.current = null;
      }
      
      appendOutput('✅ Scenario execution stopped successfully', 'success');
    } catch (error) {
      completeExecution('failed');
      appendOutput('❌ Error stopping scenario', 'error');
      appendOutput(error instanceof Error ? error.message : 'Unknown error', 'error');
    }
  };

  const handlePause = async () => {
    try {
      if (!projectId || !campaignId || !scenario._id) {
        throw new Error('Project, campaign, and scenario context is missing');
      }

      setStatus('paused');
      appendOutput('Pausing scenario...', 'warning');
      
      // Use REST API to pause scenario execution
      await scenarioService.pauseScenario(projectId, campaignId, scenario._id);
      
      appendOutput('Pause has been requested', 'warning');
    } catch (error) {
      appendOutput('Error pausing scenario', 'error');
      appendOutput(error instanceof Error ? error.message : 'Unknown error', 'error');
    }
  };

  const handleResume = async () => {
    try {
      if (!projectId || !campaignId || !scenario._id) {
        throw new Error('Project, campaign, and scenario context is missing');
      }

      setStatus('running');
      appendOutput('Resuming scenario...', 'info');
      
      // Use REST API to resume scenario execution
      await scenarioService.resumeScenario(projectId, campaignId, scenario._id);
      
      appendOutput('Resume request sent', 'info');
    } catch (error) {
      appendOutput('Error resuming scenario', 'error');
      appendOutput(error instanceof Error ? error.message : 'Unknown error', 'error');
    }
  };

  const getStatusBadgeStyle = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return 'In progress';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Ready';
    }
  };

  // Format elapsed time as hours:minutes:seconds
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-scrolling for the terminal
  const terminalRef = useRef<HTMLDivElement>(null);
  
  // Scroll the terminal down when new messages arrive
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, attackOutputs, autoScroll]);

  // Detect when the user manually scrolls up to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!terminalRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // Disable auto-scroll only if the user manually scrolls up
    if (!isScrolledToBottom && autoScroll) {
      setAutoScroll(false);
    }
  }, [autoScroll]);

  // For rendering attack outputs - version avec onglets
  const renderAttackOutput = useCallback(() => {
    if (activeTab === 'global') {
      // Onglet global - afficher TOUS les messages
      if (output.length === 0) {
        return (
          <div className="text-gray-400 italic">
            <div className="mb-2">Ready to execute scenario...</div>
            <div className="text-xs text-gray-500">
              💡 Use the Start button to begin scenario execution
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-1">
          {output.map((line, index) => (
            <div 
              key={`global-${index}`}
              className={`py-0.5 flex items-start space-x-2 ${
                line.type === 'error' ? 'text-red-400' :
                line.type === 'warning' ? 'text-yellow-400' :
                line.type === 'success' ? 'text-green-400' :
                'text-gray-300'
              }`}
            >
              <span className="text-xs text-gray-500 mt-0.5 min-w-[60px]">
                {line.timestamp.toLocaleTimeString()}
              </span>
              <span className="flex-1">{line.content}</span>
            </div>
          ))}
          
          {/* Show completion summary if scenario is completed */}
          {status === 'completed' && (
            <div className="mt-4 p-3 bg-green-900/30 rounded border border-green-700">
              <h4 className="text-sm font-medium text-green-300 mb-2">✅ Execution Completed</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Total Time:</span>
                  <span className="ml-2 text-white">{formatElapsedTime(elapsedTime)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Attacks Run:</span>
                  <span className="ml-2 text-white">{Object.keys(attackOutputs).length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Logs:</span>
                  <span className="ml-2 text-white">{output.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Success Rate:</span>
                  <span className="ml-2 text-green-400">
                    {output.filter(log => log.type === 'success').length} successful operations
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      // Onglet spécifique à une attaque
      const attackOutput = attackOutputs[activeTab] || [];
      
      if (attackOutput.length === 0) {
        return (
          <div className="text-gray-400 italic">
            <div className="mb-2">No output yet for this attack...</div>
            <div className="text-xs text-gray-500">
              💡 Output will appear here when the attack starts
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-1">
          {attackOutput.map((line, index) => (
            <div 
              key={`attack-${activeTab}-${index}`}
              className={`py-0.5 flex items-start space-x-2 ${
                line.type === 'error' ? 'text-red-400' :
                line.type === 'warning' ? 'text-yellow-400' :
                line.type === 'success' ? 'text-green-400' :
                'text-gray-300'
              }`}
            >
              <span className="text-xs text-gray-500 mt-0.5 min-w-[60px]">
                {line.timestamp.toLocaleTimeString()}
              </span>
              <span className="flex-1">{line.content}</span>
            </div>
          ))}
        </div>
      );
    }
  }, [activeTab, output, attackOutputs, status, elapsedTime, formatElapsedTime]);

  // Fonction pour rendre les onglets
  const renderTabs = useCallback(() => {
    const tabs = [
      { id: 'global', name: 'Global Output', count: output.length }
    ];
    
    // Ajouter les onglets pour chaque attaque
    scenario.attacks.forEach((attack, index) => {
      // Utiliser le même format d'ID que dans useScenarioTerminal
      const attackId = `attack-${index + 1}`;
      const attackOutput = attackOutputs[attackId] || [];
      tabs.push({
        id: attackId,
        name: `${attack.tool || 'Attack'} ${index + 1}`,
        count: attackOutput.length
      });
    });
    
    return (
      <div className="flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 text-xs font-medium rounded-t-md whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tab.name}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-600 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }, [activeTab, output.length, scenario.attacks, attackOutputs]);

  return (
    <div className="p-6 space-y-6">
      {/* Execution controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleStart}
            disabled={status === 'running' || !isConnected}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Start
          </button>

          <button
            onClick={handleStop}
            disabled={status !== 'running' && status !== 'paused' || !isConnected}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StopIcon className="h-4 w-4 mr-2" />
            Stop
          </button>

          {status === 'running' ? (
            <button
              onClick={handlePause}
              disabled={!isConnected}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PauseIcon className="h-4 w-4 mr-2" />
              Pause
            </button>
          ) : status === 'paused' ? (
            <button
              onClick={handleResume}
              disabled={!isConnected}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Resume
            </button>
          ) : null}
        </div>

        <div className="flex items-center space-x-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(status)}`}>
            {getStatusText(status)}
          </span>

          {status === 'running' && (
            <div className="flex items-center">
              <ArrowPathIcon className="h-4 w-4 text-green-500 dark:text-green-400 animate-spin mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progress}%
              </span>
            </div>
          )}
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Elapsed: {formatElapsedTime(elapsedTime)}
          </div>
        </div>
      </div>

      {/* Output terminal - version avec onglets */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-sm font-medium text-gray-200">
              Scenario Output
            </h3>
            {renderTabs()}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoScroll(true)}
              className={`text-xs px-2 py-1 rounded ${
                autoScroll 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              Auto-scroll
            </button>
            <button
              onClick={clearTerminal}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div 
          ref={terminalRef}
          onScroll={handleScroll}
          className="p-4 h-96 overflow-auto font-mono text-sm"
        >
          {renderAttackOutput()}
          
          {/* Display a message if not connected */}
          {!isConnected && (
            <div className="text-red-400 mb-2">
              ⚠️ WebSocket connection lost. Attempting to reconnect...
            </div>
          )}
        </div>
      </div>

      {/* Execution statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tested Targets
          </h4>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {scenario.targets?.length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Launched Attacks
          </h4>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {scenario.attacks?.length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Elapsed Time
          </h4>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {formatElapsedTime(elapsedTime)}
          </p>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Performance optimization: update the component only if necessary
  
  // If the scenario ID changes, it's definitely a new scenario
  if (prevProps.scenario._id !== nextProps.scenario._id) return false;
  
  // If the status changes, it needs to be updated
  if (prevProps.scenario.status !== nextProps.scenario.status) return false;
  
  // If the attacks arrays have different lengths, update
  if ((prevProps.scenario.attacks?.length || 0) !== (nextProps.scenario.attacks?.length || 0)) return false;
  
  // If the attacks are identical in number but different in content, update
  if (prevProps.scenario.attacks && nextProps.scenario.attacks) {
    const prevAttacks = prevProps.scenario.attacks;
    const nextAttacks = nextProps.scenario.attacks;
    
    // Check each attack
    for (let i = 0; i < prevAttacks.length; i++) {
      if (prevAttacks[i].tool !== nextAttacks[i].tool || 
          prevAttacks[i].processId !== nextAttacks[i].processId) {
        return false;
      }
    }
  }
  
  // Otherwise, do not update
  return true;
});

export default ScenarioExecution;
