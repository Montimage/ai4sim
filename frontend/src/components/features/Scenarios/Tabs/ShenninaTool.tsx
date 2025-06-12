import React, { useState } from 'react';
import { 
  CpuChipIcon, 
  PlusIcon,
  InformationCircleIcon,
  BeakerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Scenario } from '../../../../types/projectManagement';
import { useProjectManagementStore } from '../../../../store/projectManagementStore';
import { toast } from 'react-toastify';

interface ShenninaToolProps {
  scenario: Scenario;
  onUpdate: () => void;
}

const ShenninaTool: React.FC<ShenninaToolProps> = ({ scenario, onUpdate }) => {
  const { updateScenario } = useProjectManagementStore();
  const [isAdding, setIsAdding] = useState(false);
  const [target, setTarget] = useState('172.17.0.2');
  const [lhost, setLhost] = useState('172.17.0.1');
  const [mode, setMode] = useState('exploitation');

  // Vérifier si Shennina est déjà dans les attaques
  const hasShenninaTool = scenario.attacks?.some(attack => attack.tool === 'shennina');

  const handleAddShenninaTool = async () => {
    if (!scenario._id) {
      toast.error('Scenario ID is missing');
      return;
    }

    try {
      setIsAdding(true);

      // Créer une nouvelle attaque Shennina
      const newAttack = {
        tool: 'shennina',
        parameters: {
          target,
          lhost,
          mode,
          targetIndex: 0 // Index de la cible par défaut
        }
      };

      // Ajouter la nouvelle attaque au scénario
      const updatedAttacks = [...(scenario.attacks || []), newAttack];

      // Mettre à jour le scénario
      await updateScenario(scenario._id, {
        attacks: updatedAttacks
      }, scenario.project || '', scenario.campaign || '');

      toast.success('Shennina AI tool added to scenario');
      onUpdate();
    } catch (error) {
      console.error('Error adding Shennina tool:', error);
      toast.error('Error adding Shennina tool to scenario');
    } finally {
      setIsAdding(false);
    }
  };

  const shenninaModes = [
    { value: 'exploitation', label: 'Full Exploitation', description: 'Complete penetration testing with exploitation' },
    { value: 'training', label: 'Training Mode', description: 'Safe training environment without real exploitation' },
    { value: 'scan-only', label: 'Scan Only', description: 'Vulnerability scanning without exploitation' }
  ];

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg">
            <CpuChipIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Analysis Tools
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add AI-powered penetration testing tools to your scenario
            </p>
          </div>
        </div>

        {/* Shennina Tool Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg">
                <BeakerIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Shennina AI Framework
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Advanced AI-powered penetration testing framework with automated vulnerability discovery, 
                  exploit selection, and attack path optimization.
                </p>
                
                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Automated vulnerability scanning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">AI-driven exploit selection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Real-time attack simulation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Multi-vector attack paths</span>
                  </div>
                </div>

                {hasShenninaTool && (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                      Shennina AI tool is already added to this scenario
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form (only show if not already added) */}
          {!hasShenninaTool && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Configuration
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target IP
                  </label>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="172.17.0.2"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="172.17.0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assessment Mode
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    {shenninaModes.map((modeOption) => (
                      <option key={modeOption.value} value={modeOption.value}>
                        {modeOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode Description */}
              <div className="mb-6">
                {shenninaModes.map((modeOption) => (
                  mode === modeOption.value && (
                    <div key={modeOption.value} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            {modeOption.label}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            {modeOption.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddShenninaTool}
                disabled={isAdding}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <PlusIcon className="h-4 w-4" />
                <span>{isAdding ? 'Adding...' : 'Add Shennina to Scenario'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="space-y-1 text-xs">
                <li>• AI tools will run continuously in the background during scenario execution</li>
                <li>• Make sure target systems are properly configured and accessible</li>
                <li>• Training mode is recommended for learning environments</li>
                <li>• Full exploitation mode should only be used on authorized targets</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShenninaTool; 