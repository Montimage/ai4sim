import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../../store/themeStore';
import { 
  PlusIcon, 
  TrashIcon, 
  BeakerIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  CpuChipIcon,
  BoltIcon,
  ShieldCheckIcon,
  CommandLineIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Scenario, Attack } from '../../../../types/projectManagement';
import { ATTACK_TOOLS } from '../../../../constants/attackTools';
import { AttackTool, AttackVariant } from '../../../../types/attackTool';
import { Button, StatusBadge, Card } from '../../../shared/UI';

interface ScenarioAttacksProps {
  scenario: Scenario;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
}

type FunnelStep = 'overview' | 'category' | 'tool' | 'attack' | 'configure';

const ScenarioAttacks: React.FC<ScenarioAttacksProps> = ({ scenario, onSave }) => {
  const theme = useThemeStore(state => state.theme);
  const [attacks, setAttacks] = useState<Attack[]>(scenario.attacks || []);
  const [selectedScenarioAttack, setSelectedScenarioAttack] = useState<Attack | null>(null);
  const [selectedAttackIndex, setSelectedAttackIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState<FunnelStep>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<AttackTool | null>(null);
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);

  // Get unique categories
  const categories = Array.from(new Set(ATTACK_TOOLS.map(tool => tool.category)));

  // Get tool and attack info from a scenario attack
  const getToolAndAttackInfo = (attack: Attack) => {
    const tool = ATTACK_TOOLS.find(t => t.id === attack.tool);
    if (!tool) return { toolName: attack.tool, attackName: "Unknown", category: "Unknown" };
    
    const foundAttack = tool.attacks.find(a => a.id === attack.parameters?.attackId);
    
    return {
      toolName: tool.name,
      attackName: foundAttack?.name || tool.name,
      category: tool.category
    };
  };

  const getTargetInfoFromAttack = (attack: Attack) => {
    if (!attack.parameters || !attack.parameters.targetIndex) {
      return "No target specified";
    }
    
    const targetIndex = parseInt(attack.parameters.targetIndex.toString());
    if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= scenario.targets.length) {
      return "Invalid target";
    }
    
    const target = scenario.targets[targetIndex];
    return `${target.name} (${target.host})`;
  };

  // Get tools for selected category
  const getToolsForCategory = (category: string) => {
    return ATTACK_TOOLS.filter(tool => tool.category === category);
  };

  // Get selected attack variant based on tool and attack ID
  const getSelectedAttackVariant = (): AttackVariant | null => {
    if (!selectedTool || !selectedAttackId) return null;
    return selectedTool.attacks.find(attack => attack.id === selectedAttackId) || null;
  };

  const selectedAttackVariant = getSelectedAttackVariant();

  // Filter attacks based on search
  const filteredAttacks = attacks.filter(attack => {
    const toolInfo = getToolAndAttackInfo(attack);
    return toolInfo.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           toolInfo.attackName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           toolInfo.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectAttack = (attack: Attack, index: number) => {
    setSelectedScenarioAttack(attack);
    setSelectedAttackIndex(index);
  };

  const handleRemoveAttack = async (index: number) => {
    const updatedAttacks = attacks.filter((_, i) => i !== index);
    try {
      setIsSubmitting(true);
      await onSave({ attacks: updatedAttacks });
      setAttacks(updatedAttacks);
      if (selectedAttackIndex === index) {
        setSelectedScenarioAttack(null);
        setSelectedAttackIndex(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFunnel = () => {
    setCurrentStep('overview');
    setSelectedCategory(null);
    setSelectedTool(null);
    setSelectedAttackId(null);
    setParameters({});
    setSelectedTargetIndex(null);
  };

  const handleAddAttack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool || !selectedAttackVariant || selectedTargetIndex === null) return;

    // Integrate selected target information into parameters
    const updatedParameters: Record<string, any> = { ...parameters };
    if (selectedTargetIndex !== null && scenario.targets[selectedTargetIndex]) {
      const target = scenario.targets[selectedTargetIndex];
      updatedParameters.targetIndex = selectedTargetIndex.toString();
      updatedParameters.attackId = selectedAttackId;
      
      // Replace target-related parameters with selected target values
      Object.keys(updatedParameters).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('target') && (lowerKey.includes('ip') || lowerKey.includes('host'))) {
          updatedParameters[key] = target.host;
        }
      });
      
      // Also check parameter definitions and replace them based on type or name
      if (selectedAttackVariant.parameters) {
        Object.entries(selectedAttackVariant.parameters).forEach(([key, param]) => {
          // Check if this is a target parameter by type or name
          const isTargetParam = param.type === 'target' || 
                               (key.toLowerCase().includes('target') && 
                                (key.toLowerCase().includes('ip') || key.toLowerCase().includes('host')));
          
          if (isTargetParam) {
            updatedParameters[key] = target.host;
          }
        });
      }
    }

    const newAttack: Attack = {
      tool: selectedTool.id,
      parameters: {
        ...updatedParameters,
        attackId: selectedAttackVariant.id // Ajouter l'ID de la variante d'attaque
      },
      status: 'idle',
      processId: undefined,
      startTime: undefined,
      endTime: undefined,
      logs: [],
      results: null
    };

    const updatedAttacks = [...attacks, newAttack];

    try {
      setIsSubmitting(true);
      await onSave({ attacks: updatedAttacks });
      setAttacks(updatedAttacks);
      resetFunnel();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fuzzing':
        return BoltIcon;
      case 'simulation':
        return BeakerIcon;
      case 'framework':
        return CommandLineIcon;
      case 'other':
        return Cog6ToothIcon;
      default:
        return ShieldCheckIcon;
    }
  };

  const renderCategorySelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Select Attack Category
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Choose the type of security testing you want to perform
          </p>
        </div>
        <Button
          variant="ghost"
          icon={<ArrowLeftIcon className="w-4 h-4" />}
          onClick={() => setCurrentStep('overview')}
        >
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const IconComponent = getCategoryIcon(category);
          const toolCount = getToolsForCategory(category).length;
          
          return (
            <motion.div
              key={category}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary-300 dark:hover:border-primary-600 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentStep('tool');
                }}
              >
                <div className="text-center p-8">
                  <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mx-auto mb-6 shadow-lg">
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {category.toUpperCase()}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {toolCount} tool{toolCount !== 1 ? 's' : ''} available
                  </p>
                  <div className="flex justify-center">
                    <StatusBadge status="info" size="sm">
                      {toolCount} tools
                    </StatusBadge>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderToolSelection = () => {
    if (!selectedCategory) return null;
    
    const tools = getToolsForCategory(selectedCategory);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Select {selectedCategory.toUpperCase()} Tool
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a specific tool for {selectedCategory.toLowerCase()} attacks
            </p>
          </div>
          <Button
            variant="ghost"
            icon={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={() => setCurrentStep('category')}
          >
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <motion.div
              key={tool.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-600 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20"
                onClick={() => {
                  setSelectedTool(tool);
                  setCurrentStep('attack');
                }}
              >
                <div className="flex items-center space-x-4 p-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <CpuChipIcon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {tool.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {tool.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status="neutral" size="sm">
                        {tool.attacks.length} attack{tool.attacks.length !== 1 ? 's' : ''}
                      </StatusBadge>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttackSelection = () => {
    if (!selectedTool) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Select {selectedTool.name} Attack
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a specific attack variant to configure
            </p>
          </div>
          <Button
            variant="ghost"
            icon={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={() => setCurrentStep('tool')}
          >
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {selectedTool.attacks.map((attack) => (
            <motion.div
              key={attack.id}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-300 dark:hover:border-green-600 bg-gradient-to-r from-white to-green-50 dark:from-gray-800 dark:to-green-900/20"
                onClick={() => {
                  setSelectedAttackId(attack.id);
                  setCurrentStep('configure');
                }}
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <BoltIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {attack.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {attack.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status="neutral" size="sm">
                          {Object.keys(attack.parameters || {}).length} parameter{Object.keys(attack.parameters || {}).length !== 1 ? 's' : ''}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderConfiguration = () => {
    if (!selectedTool || !selectedAttackVariant) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Configure {selectedAttackVariant.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Set parameters and select target for this attack
            </p>
          </div>
          <Button
            variant="ghost"
            icon={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={() => setCurrentStep('attack')}
          >
            Back
          </Button>
        </div>

        <form onSubmit={handleAddAttack} className="space-y-6">
          {/* Target Selection */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                <CpuChipIcon className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                Select Target
              </h4>
            </div>
            {scenario.targets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {scenario.targets.map((target, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedTargetIndex === index
                        ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target"
                      value={index}
                      checked={selectedTargetIndex === index}
                      onChange={() => setSelectedTargetIndex(index)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedTargetIndex === index
                          ? 'border-primary-500 bg-primary-500 shadow-md'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}>
                        {selectedTargetIndex === index && (
                          <CheckIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600">
                          <CpuChipIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {target.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {target.host}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <CpuChipIcon className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No targets configured. Please add targets first.
                </p>
              </div>
            )}
          </Card>

          {/* Parameters */}
          {selectedAttackVariant.parameters && Object.keys(selectedAttackVariant.parameters).length > 0 && (
            <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                  <CommandLineIcon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  Attack Parameters
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(selectedAttackVariant.parameters).map(([key, param]) => {
                  // Check if this is a target-related parameter by type or name
                  const isTargetParam = param.type === 'target' || 
                                       (key.toLowerCase().includes('target') && 
                                        (key.toLowerCase().includes('ip') || key.toLowerCase().includes('host')));
                  const displayValue = isTargetParam && selectedTargetIndex !== null && scenario.targets[selectedTargetIndex]
                    ? scenario.targets[selectedTargetIndex].host
                    : parameters[key] || '';
                  
                  return (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                        {param.label || key}
                        {isTargetParam && selectedTargetIndex !== null && (
                          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-normal bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded-full">
                            Auto-filled from selected target
                          </span>
                        )}
                      </label>
                      {param.type === 'select' && param.options ? (
                        <select
                          value={parameters[key] || ''}
                          onChange={(e) => setParameters(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                        >
                          <option value="">Select {param.label || key}</option>
                          {param.options.map((option: string) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={param.type === 'target' ? 'text' : (param.type || 'text')}
                          value={displayValue}
                          onChange={(e) => setParameters(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={param.default}
                          disabled={isTargetParam && selectedTargetIndex !== null}
                          className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 transition-all duration-200 ${
                            isTargetParam && selectedTargetIndex !== null 
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400' 
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:border-primary-500'
                          }`}
                        />
                      )}
                      {param.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                          {param.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFunnel}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={selectedTargetIndex === null}
              icon={<CheckIcon className="w-4 h-4" />}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
            >
              Add Attack
            </Button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-gray-900'}`} style={{ height: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className={`flex-shrink-0 p-6 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-red-100' : 'bg-red-500/20'}`}>
              <BeakerIcon className={`w-6 h-6 ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Attack Configuration</h2>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                Configure attacks for your scenario ({attacks.length} total)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              icon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={() => setCurrentStep('overview')}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className={`flex-shrink-0 p-6 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`} />
              <input
                type="text"
                placeholder="Search attacks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-white/10 border-white/20 text-white placeholder-white/40'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="primary"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => setCurrentStep('category')}
            >
              Add Attack
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Attacks List */}
        <div className={`w-1/3 border-r flex flex-col ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
          <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Attacks ({filteredAttacks.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredAttacks.length > 0 ? (
              filteredAttacks.map((attack, index) => {
                const { toolName, attackName, category } = getToolAndAttackInfo(attack);
                const targetInfo = getTargetInfoFromAttack(attack);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedAttackIndex === index 
                        ? theme === 'light'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-red-500/20 border-red-500/50'
                        : theme === 'light'
                          ? 'bg-white border-slate-200 hover:bg-slate-50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => handleSelectAttack(attack, index)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <BoltIcon className={`w-5 h-5 ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`} />
                        <div>
                          <h4 className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            {attackName}
                          </h4>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                            {toolName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status="warning">
                          {category}
                        </StatusBadge>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<TrashIcon className="w-4 h-4" />}
                          onClick={() => handleRemoveAttack(index)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>Target</p>
                        <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          {targetInfo}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <BeakerIcon className={`w-12 h-12 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/40'}`} />
                <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>No attacks found</p>
                <p className={`text-sm mt-2 ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
                  {searchTerm ? 'Try adjusting your search' : 'Add your first attack to get started'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Attack Details / Configuration */}
        <div className="w-2/3 flex flex-col">
          {currentStep !== 'overview' ? (
            <>
              <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Add New Attack
                  </h3>
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep('overview')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {currentStep === 'category' && renderCategorySelection()}
                {currentStep === 'tool' && renderToolSelection()}
                {currentStep === 'attack' && renderAttackSelection()}
                {currentStep === 'configure' && renderConfiguration()}
              </div>
            </>
          ) : selectedScenarioAttack ? (
            <>
              <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Attack Details</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                  <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    <InformationCircleIcon className="w-5 h-5 mr-2" />
                    General Information
                  </h4>
                  
                  {(() => {
                    const { toolName, attackName, category } = getToolAndAttackInfo(selectedScenarioAttack);
                    const targetInfo = getTargetInfoFromAttack(selectedScenarioAttack);
                    
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Attack Name</p>
                          <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{attackName}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Tool</p>
                          <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{toolName}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Category</p>
                          <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{category}</p>
                        </div>
                        <div>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Target</p>
                          <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{targetInfo}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Parameters Section */}
                {selectedScenarioAttack.parameters && (
                  <div className={`mt-6 rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                    <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      <CommandLineIcon className="w-5 h-5 mr-2" />
                      Parameters
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedScenarioAttack.parameters).map(([key, value]) => (
                        <div key={key}>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>{key}</p>
                          <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BeakerIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/40'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                  Select an attack
                </h3>
                <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>
                  Choose an attack from the list to view its details or add a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioAttacks;
