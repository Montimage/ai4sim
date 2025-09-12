import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  CpuChipIcon, 
  CommandLineIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAttackStore } from '../../../store/attackStore';
import { websocket } from '../../../services/websocket';

interface FullAIAssessmentProps {
  tabId: string;
}

// Fonction pour coloriser l'output selon le contenu
const colorizeOutput = (text: string): { text: string; className: string } => {
  const line = text.toLowerCase();
  
  // Messages de succès
  if (line.includes('✅') || line.includes('success') || line.includes('completed') || line.includes('found') || line.includes('exploit')) {
    return { text, className: 'text-green-400' };
  }
  
  // Messages d'erreur
  if (line.includes('❌') || line.includes('error') || line.includes('failed') || line.includes('denied')) {
    return { text, className: 'text-red-400' };
  }
  
  // Messages d'avertissement
  if (line.includes('⚠️') || line.includes('warning') || line.includes('timeout') || line.includes('retry')) {
    return { text, className: 'text-yellow-400' };
  }
  
  // Messages d'information
  if (line.includes('ℹ️') || line.includes('info') || line.includes('starting') || line.includes('connecting')) {
    return { text, className: 'text-blue-400' };
  }
  
  // Messages de démarrage/lancement
  if (line.includes('🚀') || line.includes('🎯') || line.includes('🏠') || line.includes('⚙️') || line.includes('📡')) {
    return { text, className: 'text-purple-400' };
  }
  
  // Messages de scan/analyse
  if (line.includes('🔍') || line.includes('scanning') || line.includes('analyzing') || line.includes('checking')) {
    return { text, className: 'text-cyan-400' };
  }
  
  // Messages de vulnérabilités
  if (line.includes('🔓') || line.includes('vulnerability') || line.includes('exploit') || line.includes('payload')) {
    return { text, className: 'text-orange-400' };
  }
  
  // Messages de progression/barres
  if (line.includes('█') || line.includes('▓') || line.includes('░') || line.includes('%') || line.includes('progress')) {
    return { text, className: 'text-indigo-400' };
  }
  
  // Messages de réseau
  if (line.includes('🌐') || line.includes('port') || line.includes('tcp') || line.includes('udp') || line.includes('http')) {
    return { text, className: 'text-teal-400' };
  }
  
  // Messages par défaut
  return { text, className: 'text-gray-300' };
};

export const FullAIAssessment: React.FC<FullAIAssessmentProps> = ({ tabId }) => {
  const { getTabState, updateTabState } = useAttackStore();
  
  // Supprimer la référence au scénario actuel car l'onglet Attacks ne devrait pas être lié aux scénarios
  const [target, setTarget] = useState('172.17.0.2');
  const [lhost, setLhost] = useState('172.17.0.1');
  const [mode, setMode] = useState('exploitation');

  const tabState = getTabState(tabId);
  // L'état isRunning est maintenant géré dans le store global
  const isRunning = tabState?.isRunning || false;

  useEffect(() => {
    // Configurer automatiquement Shennina pour ce tab
    updateTabState(tabId, {
      selectedCategory: 'AI_TOOLS',
      selectedTool: 'shennina',
      selectedAttack: 'shennina-full-assessment',
      parameters: {
        target: target,
        lhost: lhost,
        mode: mode
      }
    });
  }, [tabId, target, lhost, mode, updateTabState]);

  // WebSocket events are now handled globally by GlobalWebSocketHandler
  // No need for component-specific WebSocket handling to avoid duplication

  const handleStartAssessment = async () => {
    // Forcer le mode exploitation lors du lancement Full AI Assessment
    setMode('exploitation');
    const effectiveMode = 'exploitation';
    // Mettre à jour l'état global pour indiquer que l'assessment est en cours
    updateTabState(tabId, {
      output: [],
      isRunning: true,
      status: 'running'
    });

    // Les messages seront envoyés automatiquement par le backend via WebSocket
    // Pas besoin d'ajouter des messages manuellement ici pour éviter la duplication
    
    try {
      // Utiliser le service WebSocket pour exécuter l'attaque
      websocket.send(JSON.stringify({
        type: 'execute',
        command: `cd tools/shennina && python3 shennina_standalone.py --target ${target} --lhost ${lhost} --mode ${effectiveMode}`,
        parameters: {
          target,
          lhost,
          mode: effectiveMode
        },
        tabId: tabId
      }));

      console.log('[FullAIAssessment] Command sent via WebSocket');
    } catch (error) {
      console.error('Error starting AI assessment:', error);
      // Error messages will be handled by GlobalWebSocketHandler
      updateTabState(tabId, {
        isRunning: false,
        status: 'error'
      });
    }
  };

  const handleStopAssessment = () => {
    // Arrêter l'attaque via WebSocket
    websocket.send(JSON.stringify({
      type: 'stop',
      tabId: tabId
    }));

    // Stop messages will be handled by GlobalWebSocketHandler
    updateTabState(tabId, {
      isRunning: false,
      status: 'stopped'
    });
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Configuration */}
      <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
              <CpuChipIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Full AI Assessment
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automated penetration testing with Shennina
              </p>
              {isRunning && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Assessment in progress
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target IP
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="172.17.0.2"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Local Host (LHOST)
                </label>
                <input
                  type="text"
                  value={lhost}
                  onChange={(e) => setLhost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="172.17.0.1"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assessment Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isRunning}
                >
                  <option value="exploitation">Full Exploitation</option>
                  <option value="training">Training Mode</option>
                  <option value="scan-only">Scan Only</option>
                </select>
              </div>
            </div>

            {/* Info Panel */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">About Full AI Assessment:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Automated vulnerability scanning and exploitation</li>
                    <li>• AI-driven attack path discovery</li>
                    <li>• Real-time threat simulation</li>
                    <li>• Comprehensive security assessment</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-3">
              {!isRunning ? (
                <button
                  onClick={handleStartAssessment}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  <PlayIcon className="h-5 w-5" />
                  <span>Start AI Assessment</span>
                </button>
              ) : (
                <button
                  onClick={handleStopAssessment}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <StopIcon className="h-5 w-5" />
                  <span>Stop Assessment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Output */}
      <div className="w-1/2 flex flex-col bg-gray-900">
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CommandLineIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-medium text-white">
                Assessment Output
              </h3>
            </div>
            {isRunning && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Live Output</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 font-mono text-sm overflow-hidden bg-black">
          <div className="h-full overflow-y-auto p-4 space-y-1">
            {tabState?.output && tabState.output.length > 0 ? (
              tabState.output.map((line, index) => {
                const { text, className } = colorizeOutput(line);
                return (
                  <div key={index} className={`whitespace-pre-wrap break-words ${className} leading-relaxed`}>
                    {text}
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 italic">
                No output yet. Start an assessment to see results here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 