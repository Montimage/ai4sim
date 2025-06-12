import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useProjectManagementStore } from '../../store/projectManagementStore';
import { TOOLS } from '../../constants/tools';
import { toast } from 'react-toastify';
import { 
  ArrowLeftIcon,
  PlusIcon, 
  TrashIcon,
  ServerIcon,
  CogIcon,
  BeakerIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { ScenarioTerminalManager } from '../features/ScenarioTerminal/ScenarioTerminalManager';

// Types specific to this component
interface ScenarioTarget {
  host: string;
  description: string;
}

interface ScenarioAttack {
  id: string;
  name: string;
  toolId: string;
  toolName: string;
  targetIndex: number;
  parameters: Record<string, any>;
}

interface ScenarioState {
  name: string;
  description: string;
  targets: ScenarioTarget[];
  attacks: ScenarioAttack[];
}

// Constants for attack states
const ATTACK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const ScenarioManager: React.FC = () => {
  const { projectId, campaignId } = useParams<{ projectId: string; campaignId: string }>();
  const navigate = useNavigate();
  const { selectProject, isLoading: projectLoading } = useProjectStore();
  const { createScenario, isLoadingScenarios: creatingScenario } = useProjectManagementStore();
  
  // États du scénario
  const [scenario, setScenario] = useState<ScenarioState>({
    name: '',
    description: '',
    targets: [{ host: '', description: '' }],
    attacks: []
  });
  
  // État actif pour l'édition
  const [activeTarget, setActiveTarget] = useState<number>(0);
  const [activeAttack, setActiveAttack] = useState<any | null>(null);
  const [showAttackSelector, setShowAttackSelector] = useState<boolean>(false);
  const [attackParams, setAttackParams] = useState<Record<string, any>>({});
  
  // Liste des attaques disponibles (à filtrer depuis TOOLS)
  const availableAttacks = React.useMemo(() => {
    const attacks: any[] = [];
    TOOLS.forEach((tool: any) => {
      if (tool.attacks) {
        tool.attacks.forEach((attack: any) => {
          attacks.push({
            ...attack,
            toolId: tool.id,
            toolName: tool.name,
            toolType: tool.type
          });
        });
      }
    });
    return attacks;
  }, []);

  // Navigation vers la page de la campagne
  const handleCancel = () => {
    if (projectId && campaignId) {
      navigate(`/projects/${projectId}/campaigns/${campaignId}`);
    }
  };

  // Ajout d'une nouvelle cible
  const addTarget = () => {
    setScenario(prev => ({
      ...prev,
      targets: [...prev.targets, { host: '', description: '' }]
    }));
    // Activer la nouvelle cible
    setActiveTarget(scenario.targets.length);
  };

  // Suppression d'une cible
  const removeTarget = (index: number) => {
    if (scenario.targets.length <= 1) {
      toast.warning('At least one target is required');
      return;
    }
    
    // Remove the target
    const newTargets = [...scenario.targets];
    newTargets.splice(index, 1);
    
    // Update attacks that reference this target
    const newAttacks = scenario.attacks.filter(attack => 
      attack.targetIndex !== index
    ).map(attack => {
      if (attack.targetIndex > index) {
        return { ...attack, targetIndex: attack.targetIndex - 1 };
      }
      return attack;
    });
    
    setScenario(prev => ({
      ...prev, 
      targets: newTargets,
      attacks: newAttacks
    }));
    
    // Adjust active index if needed
    if (activeTarget >= newTargets.length) {
      setActiveTarget(newTargets.length - 1);
    }
  };

  // Mise à jour d'une cible
  const updateTarget = (index: number, field: string, value: any) => {
    const newTargets = [...scenario.targets];
    newTargets[index] = { ...newTargets[index], [field]: value };
    setScenario(prev => ({ ...prev, targets: newTargets }));
  };

  // Sélection d'une attaque à ajouter
  const selectAttack = (attack: any) => {
    // Initialiser les paramètres avec les valeurs par défaut
    const initialParams: Record<string, any> = {};
    if (attack.parameters) {
      Object.entries(attack.parameters).forEach(([key, param]: [string, any]) => {
        initialParams[key] = param.default || '';
      });
      
      // Ajouter automatiquement l'IP de la cible comme targetHost si ce paramètre existe
      if (attack.parameters['target-host'] && scenario.targets[activeTarget]) {
        initialParams['target-host'] = scenario.targets[activeTarget].host;
      }
    }
    
    setAttackParams(initialParams);
    setActiveAttack(attack);
  };

  // Ajout d'une attaque au scénario
  const addAttack = () => {
    if (!activeAttack) return;
    
    const newAttack: ScenarioAttack = {
      id: activeAttack.id,
      name: activeAttack.name,
      toolId: activeAttack.toolId,
      toolName: activeAttack.toolName,
      targetIndex: activeTarget,
      parameters: attackParams
    };
    
    setScenario(prev => ({
      ...prev,
      attacks: [...prev.attacks, newAttack]
    }));
    
    setActiveAttack(null);
    setAttackParams({});
    setShowAttackSelector(false);
    
    toast.success(`Attack "${activeAttack.name}" added to scenario`);
  };

  // Suppression d'une attaque
  const removeAttack = (index: number) => {
    const newAttacks = [...scenario.attacks];
    newAttacks.splice(index, 1);
    setScenario(prev => ({ ...prev, attacks: newAttacks }));
  };

  // Mise à jour d'un paramètre d'attaque
  const updateAttackParam = (key: string, value: any) => {
    setAttackParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Sauvegarde du scénario
  const saveScenario = async () => {
    if (!projectId || !campaignId) {
      toast.error('Missing project or campaign IDs');
      return;
    }
    
    if (!scenario.name.trim()) {
      toast.error('Scenario name is required');
      return;
    }
    
    if (scenario.targets.some(target => !target.host.trim())) {
      toast.error('All targets must have an IP address');
      return;
    }
    
    if (scenario.attacks.length === 0) {
      toast.error('At least one attack is required');
      return;
    }
    
    try {
      // Préparer les données pour la création du scénario
      const scenarioData = {
        name: scenario.name,
        description: scenario.description,
        targets: scenario.targets.map(target => ({
          host: target.host,
          name: target.description || `Target ${target.host}` // Use description as name, or generate default name
        })),
        attacks: scenario.attacks.map(attack => ({
          tool: attack.toolId,
          parameters: {
            ...attack.parameters,
            targetIndex: attack.targetIndex
          },
          status: ATTACK_STATUS.PENDING
        })),
        sequence: true, // Sequential execution by default
        campaignId: campaignId
      };
      
      console.log('Scenario data sent to server:', JSON.stringify(scenarioData, null, 2));
      
      // Show creation attempt message
      toast.info('Attempting to create scenario...');
      
      try {
        const result = await createScenario(projectId, scenarioData);
        console.log('Server response:', result);
        toast.success('Scenario created successfully');
        
        // Reload project and navigate to campaign page
        await selectProject(projectId);
        navigate(`/projects/${projectId}/campaigns/${campaignId}`);
      } catch (error: any) {
        console.error('Error creating scenario:', error);
        
        // Extract more precise error details
        let errorMessage = 'Error creating scenario';
        if (error.response) {
          // Request was made and server responded with a status code outside 2xx
          console.error('Error details:', error.response.data);
          console.error('HTTP Status:', error.response.status);
          console.error('Headers:', error.response.headers);
          
          errorMessage = error.response.data?.message || 'Server error (code: ' + error.response.status + ')';
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = 'No response from server';
        } else {
          // Something in the request setup triggered an error
          errorMessage = error.message || 'Unknown error';
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur globale lors de la création du scénario:', error);
      toast.error('Erreur inattendue lors de la création du scénario');
    }
  };

  // Show loading indicator if needed
  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header avec actions */}
      <div className="flex-none p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="flex items-center text-gray-400 hover:text-white"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back
            </button>
            <h1 className="text-xl font-semibold text-white">
              {scenario.name || "New Scenario"}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={saveScenario}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={creatingScenario}
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Main three-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel - Target configuration */}
        <div className="w-1/4 min-h-0 border-r border-gray-700 bg-gray-800">
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">Targets</h2>
                <button
                  onClick={addTarget}
                  className="flex items-center px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Liste des cibles existante */}
              <div className="space-y-4">
                {scenario.targets.map((target, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 ${
                      index === activeTarget 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400' 
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    } transition-colors cursor-pointer`}
                    onClick={() => setActiveTarget(index)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs mr-2">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Cible {index + 1}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTarget(index);
                        }}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Adresse IP / Hôte
                        </label>
                        <input
                          type="text"
                          value={target.host}
                          onChange={(e) => updateTarget(index, 'host', e.target.value)}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                          placeholder="Ex: 192.168.1.1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={target.description}
                          onChange={(e) => updateTarget(index, 'description', e.target.value)}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                          placeholder="Ex: Serveur web principal"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    {index === activeTarget && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAttackSelector(true);
                          }}
                          className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Ajouter une attaque sur cette cible
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {scenario.targets.length === 0 && (
                  <div className="text-center py-8">
                    <ServerIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune cible</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Commencez par ajouter une cible pour votre scénario
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={addTarget}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Ajouter une cible
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panneau central - Configuration des attaques */}
        <div className="w-1/3 min-h-0 border-r border-gray-700 bg-gray-800">
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">Attaques</h2>
                <button
                  onClick={() => setShowAttackSelector(true)}
                  className="flex items-center px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Ajouter
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Liste des attaques existante */}
              <div className="space-y-4">
                {scenario.attacks.map((attack, index) => {
                  // Trouver la cible associée
                  const targetIndex = attack.targetIndex;
                  const target = scenario.targets[targetIndex];
                  
                  return (
                    <div 
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {attack.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {attack.toolName}
                          </p>
                        </div>
                        <button
                          onClick={() => removeAttack(index)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center mt-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-md px-2 py-1 w-fit">
                        <ServerIcon className="h-3 w-3 mr-1" />
                        Cible: {target ? target.host : 'Inconnue'} {target?.description ? `(${target.description})` : ''}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Paramètres:</h4>
                        <div className="space-y-1">
                          {Object.entries(attack.parameters).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {scenario.attacks.length === 0 && (
                  <div className="text-center py-8">
                    <BeakerIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune attaque</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Sélectionnez une cible puis ajoutez une attaque
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panneau droit - Terminaux */}
        <div className="flex-1 min-h-0 bg-gray-900">
          <ScenarioTerminalManager className="h-full" />
        </div>
      </div>

      {/* Modal de sélection d'attaque */}
      {showAttackSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {activeAttack ? "Configure Attack" : "Select Attack"}
              </h2>
              <button
                onClick={() => {
                  setShowAttackSelector(false);
                  setActiveAttack(null);
                  setAttackParams({});
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {!activeAttack ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableAttacks.map((attack, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => selectAttack(attack)}
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {attack.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {attack.toolName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {attack.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-md p-4">
                    <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                      {activeAttack.name}
                    </h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                      {activeAttack.description}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                      <CogIcon className="w-5 h-5 mr-2 text-indigo-500" />
                      Paramètres de l'attaque
                    </h3>
                    
                    <div className="space-y-4">
                      {activeAttack.parameters ? (
                        Object.entries(activeAttack.parameters).map(([key, paramValue]: [string, any]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {paramValue.label || key} {paramValue.required && '*'}
                            </label>
                            {paramValue.type === 'select' ? (
                              <select
                                value={attackParams[key] || ''}
                                onChange={(e) => updateAttackParam(key, e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                              >
                                {paramValue.options && paramValue.options.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={paramValue.type === 'number' ? 'number' : 'text'}
                                value={attackParams[key] || ''}
                                onChange={(e) => updateAttackParam(key, e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                placeholder={paramValue.default || ''}
                              />
                            )}
                            {paramValue.description && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {paramValue.description}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Cette attaque ne nécessite pas de paramètres supplémentaires.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              {activeAttack ? (
                <>
                  <button
                    onClick={() => {
                      setActiveAttack(null);
                      setAttackParams({});
                    }}
                    className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Retour
                  </button>
                  <button
                    onClick={addAttack}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Ajouter au scénario
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAttackSelector(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;
