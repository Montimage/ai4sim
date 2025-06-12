import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
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
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';

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

export const ScenarioManagerView: React.FC = () => {
  const { projectId, campaignId } = useParams<{
    projectId: string;
    campaignId: string;
  }>();
  
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const { selectProject, isLoading: projectLoading } = useProjectStore();
  const {
    createScenario,
    isLoadingScenarios: creatingScenario
  } = useProjectManagementStore();
  
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

  // Handlers pour les événements
  const handleRemoveTarget = (index: number) => () => {
    removeTarget(index);
  };

  const handleShowAttackSelector = () => {
    setShowAttackSelector(true);
  };

  const handleRemoveAttack = (index: number) => () => {
    removeAttack(index);
  };

  const handleCloseAttackSelector = () => {
    setShowAttackSelector(false);
    setActiveAttack(null);
    setAttackParams({});
  };

  const handleSelectAttack = (attack: any) => () => {
    selectAttack(attack);
  };

  const handleBackToAttackList = () => {
    setActiveAttack(null);
    setAttackParams({});
  };

  const handleAddAttack = () => {
    addAttack();
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
      
      toast.info('Creating scenario...');
      
      try {
        const result = await createScenario(projectId, scenarioData);
        console.log('Server response:', result);
        toast.success('Scenario created successfully');
        
        // Reload project and navigate to campaign page
        await selectProject(projectId);
        navigate(`/projects/${projectId}/campaigns/${campaignId}`);
      } catch (error: any) {
        console.error('Error creating scenario:', error);
        
        let errorMessage = 'Error creating scenario';
        if (error.response) {
          console.error('Error details:', error.response.data);
          console.error('HTTP Status:', error.response.status);
          console.error('Headers:', error.response.headers);
          
          errorMessage = error.response.data?.message || 'Server error (code: ' + error.response.status + ')';
        } else if (error.request) {
          errorMessage = 'No response from server';
        } else {
          errorMessage = error.message || 'Unknown error';
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Global error creating scenario:', error);
      toast.error('Unexpected error creating scenario');
    }
  };

  // Show loading indicator if needed
  if (projectLoading) {
    return (
      <div className="container-padding">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
            onClick={handleCancel}
            className="p-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <BeakerIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {scenario.name || "New Scenario"}
              </h1>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
                Configure targets and attacks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            onClick={saveScenario}
            disabled={creatingScenario}
            icon={<DocumentTextIcon className="w-4 h-4" />}
          >
            {creatingScenario ? 'Saving...' : 'Save Scenario'}
          </Button>
        </div>
      </motion.div>

      {/* Scenario Basic Info */}
      <Card className="space-y-4">
        <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
          Scenario Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-gray-300'}`}>
              Scenario Name
            </label>
            <input
              type="text"
              value={scenario.name}
              onChange={(e) => setScenario(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                theme === 'light' 
                  ? 'border-slate-300 bg-white text-slate-900' 
                  : 'border-gray-600 bg-gray-700 text-white'
              }`}
              placeholder="Enter scenario name"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-gray-300'}`}>
              Description
            </label>
            <input
              type="text"
              value={scenario.description}
              onChange={(e) => setScenario(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                theme === 'light' 
                  ? 'border-slate-300 bg-white text-slate-900' 
                  : 'border-gray-600 bg-gray-700 text-white'
              }`}
              placeholder="Describe what this scenario tests"
            />
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Targets Panel */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'} flex items-center`}>
              <ServerIcon className="w-5 h-5 mr-2" />
              Targets
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={addTarget}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Add Target
            </Button>
          </div>
          
          <div className="space-y-3">
            {scenario.targets.map((target, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                  index === activeTarget 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setActiveTarget(index)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs mr-2">
                      {index + 1}
                    </span>
                    <span className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Target {index + 1}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveTarget(index)}
                    className={`text-red-600 hover:text-red-700 ${theme === 'light' ? 'bg-slate-100 dark:bg-gray-800' : 'bg-gray-700 dark:bg-gray-800'}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-medium ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'} mb-1`}>
                      IP Address / Host
                    </label>
                    <input
                      type="text"
                      value={target.host}
                      onChange={(e) => updateTarget(index, 'host', e.target.value)}
                      className={`block w-full rounded-md border ${
                        theme === 'light' 
                          ? 'border-slate-300 focus:border-primary-500' 
                          : 'border-gray-600 focus:border-primary-500'
                      } shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                      placeholder="e.g., 192.168.1.1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-xs font-medium ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'} mb-1`}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={target.description}
                      onChange={(e) => updateTarget(index, 'description', e.target.value)}
                      className={`block w-full rounded-md border ${
                        theme === 'light' 
                          ? 'border-slate-300 focus:border-primary-500' 
                          : 'border-gray-600 focus:border-primary-500'
                      } shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                      placeholder="e.g., Main web server"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                {index === activeTarget && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShowAttackSelector}
                      className={`text-primary-600 hover:text-primary-700 ${theme === 'light' ? 'bg-slate-100 dark:bg-gray-800' : 'bg-gray-700 dark:bg-gray-800'}`}
                    >
                      Add attack on this target
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {scenario.targets.length === 0 && (
              <div className="text-center py-8">
                <ServerIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'} mb-2`}>
                  No Targets
                </h3>
                <p className={`text-${theme === 'light' ? 'slate-500' : 'gray-400'} mb-6`}>
                  Start by adding a target for your scenario
                </p>
                <Button onClick={addTarget} icon={<PlusIcon className="w-4 h-4" />}>
                  Add First Target
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Attacks Panel */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'} flex items-center`}>
              <BeakerIcon className="w-5 h-5 mr-2" />
              Attacks
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShowAttackSelector}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              Add Attack
            </Button>
          </div>
          
          <div className="space-y-3">
            {scenario.attacks.map((attack, index) => {
              const targetIndex = attack.targetIndex;
              const target = scenario.targets[targetIndex];
              
              return (
                <div 
                  key={index}
                  className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${theme === 'light' ? 'bg-slate-100 dark:bg-gray-800' : 'bg-gray-700 dark:bg-gray-800'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {attack.name}
                      </h3>
                      <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                        {attack.toolName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAttack(index)}
                      className={`text-red-600 hover:text-red-700 ${theme === 'light' ? 'bg-slate-100 dark:bg-gray-800' : 'bg-gray-700 dark:bg-gray-800'}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center mt-2 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-md px-2 py-1 w-fit">
                    <ServerIcon className="h-3 w-3 mr-1" />
                    Target: {target ? target.host : 'Unknown'} {target?.description ? `(${target.description})` : ''}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h4 className={`text-xs font-medium ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'} mb-2`}>Parameters:</h4>
                    <div className="space-y-1">
                      {Object.entries(attack.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className={`text-${theme === 'light' ? 'slate-500' : 'gray-400'}`}>{key}:</span>
                          <span className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {scenario.attacks.length === 0 && (
              <div className="text-center py-8">
                <BeakerIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'} mb-2`}>
                  No Attacks
                </h3>
                <p className={`text-${theme === 'light' ? 'slate-500' : 'gray-400'} mb-6`}>
                  Select a target then add an attack
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Attack Selection Modal */}
      {showAttackSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className={`text-lg font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {activeAttack ? "Configure Attack" : "Select Attack"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseAttackSelector}
              >
                <XMarkIcon className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {!activeAttack ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableAttacks.map((attack, idx) => (
                    <div
                      key={idx}
                      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${theme === 'light' ? 'bg-slate-100 dark:bg-gray-800' : 'bg-gray-700 dark:bg-gray-800'}`}
                      onClick={handleSelectAttack(attack)}
                    >
                      <h3 className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {attack.name}
                      </h3>
                      <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'} mb-2`}>
                        {attack.toolName}
                      </p>
                      <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-300'}`}>
                        {attack.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-md p-4">
                    <h3 className={`font-medium ${theme === 'light' ? 'text-primary-800' : 'text-primary-300'} mb-1`}>
                      {activeAttack.name}
                    </h3>
                    <p className={`text-sm ${theme === 'light' ? 'text-primary-700' : 'text-primary-400'}`}>
                      {activeAttack.description}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className={`text-base font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'} mb-3 flex items-center`}>
                      <CogIcon className="w-5 h-5 mr-2 text-primary-500" />
                      Attack Parameters
                    </h3>
                    
                    <div className="space-y-4">
                      {activeAttack.parameters ? (
                        Object.entries(activeAttack.parameters).map(([key, paramValue]: [string, any]) => (
                          <div key={key}>
                            <label className={`block text-sm font-medium ${theme === 'light' ? 'text-slate-700' : 'text-gray-300'} mb-1`}>
                              {paramValue.label || key} {paramValue.required && '*'}
                            </label>
                            {paramValue.type === 'select' ? (
                              <select
                                value={attackParams[key] || ''}
                                onChange={(e) => updateAttackParam(key, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                  theme === 'light' 
                                    ? 'border-slate-300 bg-white text-slate-900' 
                                    : 'border-gray-600 bg-gray-700 text-white'
                                }`}
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
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                  theme === 'light' 
                                    ? 'border-slate-300 bg-white text-slate-900' 
                                    : 'border-gray-600 bg-gray-700 text-white'
                                }`}
                                placeholder={paramValue.default || ''}
                              />
                            )}
                            {paramValue.description && (
                              <p className={`mt-1 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                                {paramValue.description}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                          This attack requires no additional parameters.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              {activeAttack ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={handleBackToAttackList}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAddAttack}
                  >
                    Add to Scenario
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleCloseAttackSelector}
                >
                  Cancel
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ScenarioManagerView; 