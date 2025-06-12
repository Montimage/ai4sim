import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
} from '@heroicons/react/24/outline';
import { Scenario, Attack } from '../../../../types/projectManagement';
import { ATTACK_TOOLS } from '../../../../constants/attackTools';
import { AttackTool, AttackVariant } from '../../../../types/attackTool';
import { Card } from '../../../shared/UI/Card';
import { Button } from '../../../shared/UI/Button';
import { StatusBadge } from '../../../shared/UI/StatusBadge';

interface ScenarioAttacksProps {
  scenario: Scenario;
  onSave: (attacks: Attack[]) => Promise<void>;
}

type FunnelStep = 'overview' | 'category' | 'tool' | 'attack' | 'configure';

const ScenarioAttacks: React.FC<ScenarioAttacksProps> = ({ scenario, onSave }) => {
  const [attacks, setAttacks] = useState<Attack[]>(scenario.attacks || []);
  const [currentStep, setCurrentStep] = useState<FunnelStep>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<AttackTool | null>(null);
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);

  // Get unique categories
  const categories = Array.from(new Set(ATTACK_TOOLS.map(tool => tool.category)));

  // Get tools for selected category
  const getToolsForCategory = (category: string) => {
    return ATTACK_TOOLS.filter(tool => tool.category === category);
  };

  // Get selected attack based on tool and attack ID
  const getSelectedAttack = (): AttackVariant | null => {
    if (!selectedTool || !selectedAttackId) return null;
    return selectedTool.attacks.find(attack => attack.id === selectedAttackId) || null;
  };

  const selectedAttack = getSelectedAttack();

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
    if (!selectedTool || !selectedAttack || selectedTargetIndex === null) return;

    // Integrate selected target information into parameters
    const updatedParameters: Record<string, any> = { ...parameters };
    if (selectedTargetIndex !== null && scenario.targets[selectedTargetIndex]) {
      const target = scenario.targets[selectedTargetIndex];
      updatedParameters.targetIndex = selectedTargetIndex.toString();
      updatedParameters.attackId = selectedAttackId;
      
      // Replace ALL target-related parameters with selected target values
      Object.keys(updatedParameters).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('target') && (lowerKey.includes('ip') || lowerKey.includes('host'))) {
          updatedParameters[key] = target.host;
        }
        if (lowerKey.includes('target') && lowerKey.includes('port') && target.port) {
          updatedParameters[key] = target.port.toString();
        }
      });
      
      // Also check parameter definitions and replace them based on type or name
      if (selectedAttack.parameters) {
        Object.entries(selectedAttack.parameters).forEach(([key, param]) => {
          // Check if this is a target parameter by type or name
          const isTargetParam = param.type === 'target' || 
                               (key.toLowerCase().includes('target') && 
                                (key.toLowerCase().includes('ip') || key.toLowerCase().includes('host')));
          
          if (isTargetParam) {
            updatedParameters[key] = target.host;
          }
          
          // Handle port parameters
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('target') && lowerKey.includes('port') && target.port) {
            updatedParameters[key] = target.port.toString();
          }
        });
      }
    }

    const newAttack: Attack = {
      tool: selectedTool.id,
      parameters: updatedParameters,
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
      await onSave(updatedAttacks);
      setAttacks(updatedAttacks);
      resetFunnel();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAttack = async (index: number) => {
    const updatedAttacks = attacks.filter((_, i) => i !== index);
    try {
      setIsSubmitting(true);
      await onSave(updatedAttacks);
      setAttacks(updatedAttacks);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fuzzing':
        return BoltIcon;
      case 'network':
        return CpuChipIcon;
      case 'ai':
        return BeakerIcon;
      default:
        return ShieldCheckIcon;
    }
  };

  const renderBreadcrumb = () => {
    const steps = [
      { id: 'overview', name: 'Overview' },
      { id: 'category', name: selectedCategory || 'Category' },
      { id: 'tool', name: selectedTool?.name || 'Tool' },
      { id: 'attack', name: selectedAttack?.name || 'Attack' },
      { id: 'configure', name: 'Configure' }
    ];

    const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
      <nav className="flex items-center space-x-2 text-sm">
        {steps.slice(0, currentStepIndex + 1).map((step, index) => (
          <React.Fragment key={step.id}>
            {index > 0 && <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
            <button
              onClick={() => {
                if (index < currentStepIndex) {
                  setCurrentStep(step.id as FunnelStep);
                }
              }}
              className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                index === currentStepIndex
                  ? 'text-white bg-gradient-to-r from-primary-500 to-primary-600 font-bold shadow-md'
                  : index < currentStepIndex
                  ? 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  : 'text-gray-500 dark:text-gray-400 font-medium'
              }`}
            >
              {step.name}
            </button>
          </React.Fragment>
        ))}
      </nav>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
            <BeakerIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attack Configuration</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure and manage attacks for this scenario ({attacks.length} configured)
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon className="w-4 h-4" />}
          onClick={() => setCurrentStep('category')}
        >
          Add Attack
        </Button>
      </div>

      {/* Configured Attacks */}
      {attacks.length > 0 ? (
      <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configured Attacks
        </h3>
          <div className="grid grid-cols-1 gap-4">
            {attacks.map((attack, index) => {
              const { toolName, attackName, category } = getToolAndAttackInfo(attack);
              const targetInfo = getTargetInfoFromAttack(attack);
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                          <BoltIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {attackName}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <StatusBadge status="info" size="sm">
                        {toolName}
                            </StatusBadge>
                            <StatusBadge status="neutral" size="sm">
                          {category}
                            </StatusBadge>
                    </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                            <CpuChipIcon className="w-4 h-4 mr-1" />
                            Target: {targetInfo}
                          </p>
                    </div>
                  </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttack(index)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          </div>
        ) : (
        <Card className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="p-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <BeakerIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            No attacks configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Start by adding your first attack to this scenario. Choose from various categories like fuzzing, network attacks, and AI-based testing.
          </p>
          <Button
            variant="primary"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setCurrentStep('category')}
          >
            Add First Attack
          </Button>
        </Card>
      )}
    </div>
  );

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
    if (!selectedTool || !selectedAttack) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Configure {selectedAttack.name}
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
                            {target.host}{target.port ? `:${target.port}` : ''}
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
          {selectedAttack.parameters && Object.keys(selectedAttack.parameters).length > 0 && (
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
                {Object.entries(selectedAttack.parameters).map(([key, param]) => {
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
                          {param.options.map((option) => (
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
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      {currentStep !== 'overview' && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-md">
          {renderBreadcrumb()}
        </Card>
      )}

      {/* Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {currentStep === 'overview' && renderOverview()}
        {currentStep === 'category' && renderCategorySelection()}
        {currentStep === 'tool' && renderToolSelection()}
        {currentStep === 'attack' && renderAttackSelection()}
        {currentStep === 'configure' && renderConfiguration()}
      </motion.div>
    </div>
  );
};

export default ScenarioAttacks;
