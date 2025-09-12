import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../../store/themeStore';
import { 
  Cog6ToothIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckIcon,
  CalendarIcon,
  ClockIcon,
  PlayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Scenario } from '../../../../types/projectManagement';
import { Button, StatusBadge } from '../../../shared/UI';

interface ScenarioSettingsProps {
  scenario: Scenario;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
}

const ScenarioSettings: React.FC<ScenarioSettingsProps> = ({ scenario, onSave }) => {
  const theme = useThemeStore(state => state.theme);
  const [selectedSetting, setSelectedSetting] = useState<string>('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: scenario.name,
    description: scenario.description || '',
    sequence: scenario.sequence || false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settingsCategories = [
    {
      id: 'general',
      name: 'General Settings',
      description: 'Basic scenario configuration'
    },
    {
      id: 'execution',
      name: 'Execution Settings',
      description: 'Control how attacks are executed'
    },
    {
      id: 'metadata',
      name: 'Metadata & Info',
      description: 'View scenario information'
    }
  ];

  const filteredCategories = settingsCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      await onSave({
        name: formData.name,
        description: formData.description,
        sequence: formData.sequence
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: theme === 'light' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-green-500/20 text-green-300 border-green-500/30',
          label: 'Completed'
        };
      case 'running':
        return {
          icon: PlayIcon,
          color: theme === 'light' 
            ? 'bg-blue-100 text-blue-800 border-blue-200' 
            : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          label: 'Running'
        };
      case 'error':
        return {
          icon: InformationCircleIcon,
          color: theme === 'light' 
            ? 'bg-red-100 text-red-800 border-red-200' 
            : 'bg-red-500/20 text-red-300 border-red-500/30',
          label: 'Error'
        };
      default:
        return {
          icon: ClockIcon,
          color: theme === 'light' 
            ? 'bg-gray-100 text-gray-800 border-gray-200' 
            : 'bg-gray-500/20 text-gray-300 border-gray-500/30',
          label: 'Not Started'
        };
    }
  };

  const statusConfig = getStatusConfig(scenario.status || 'idle');

  return (
    <div className={`flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-gray-900'}`} style={{ height: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className={`flex-shrink-0 p-6 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-purple-100' : 'bg-purple-500/20'}`}>
              <Cog6ToothIcon className={`w-6 h-6 ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Settings Configuration</h2>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                Configure scenario parameters and execution settings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={getStatusColor(scenario.status || 'idle')}>
              {statusConfig.label}
            </StatusBadge>
            <Button
              variant="secondary"
              icon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={() => {/* Refresh logic if needed */}}
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
                placeholder="Search settings..."
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Settings Categories */}
        <div className={`w-1/3 border-r flex flex-col ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
          <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Settings ({filteredCategories.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedSetting === category.id 
                    ? theme === 'light'
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-purple-500/20 border-purple-500/50'
                    : theme === 'light'
                      ? 'bg-white border-slate-200 hover:bg-slate-50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setSelectedSetting(category.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedSetting === category.id
                      ? theme === 'light' ? 'bg-purple-200' : 'bg-purple-600/30'
                      : theme === 'light' ? 'bg-gray-100' : 'bg-white/10'
                  }`}>
                    <Cog6ToothIcon className={`w-4 h-4 ${
                      selectedSetting === category.id
                        ? theme === 'light' ? 'text-purple-700' : 'text-purple-300'
                        : theme === 'light' ? 'text-gray-600' : 'text-white/60'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {category.name}
                    </h4>
                    <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                      {category.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Panel - Setting Details */}
        <div className="w-2/3 flex flex-col">
          <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {settingsCategories.find(c => c.id === selectedSetting)?.name || 'Settings'}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedSetting === 'general' && (
              <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  General Configuration
                </h4>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                      Scenario Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-white/10 border-white/20 text-white'
                      }`}
                      placeholder="Enter scenario name..."
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-white/10 border-white/20 text-white'
                      }`}
                      placeholder="Describe your scenario objectives and methodology..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmitting}
                      icon={<CheckIcon className="w-4 h-4" />}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {selectedSetting === 'execution' && (
              <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Execution Configuration
                </h4>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className={`p-4 rounded-lg border ${
                    theme === 'light' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <input
                        id="sequence"
                        type="checkbox"
                        checked={formData.sequence}
                        onChange={(e) => setFormData(prev => ({ ...prev, sequence: e.target.checked }))}
                        className={`mt-1 h-4 w-4 rounded border-2 transition-colors ${
                          theme === 'light'
                            ? 'border-gray-300 text-indigo-600 focus:ring-indigo-500'
                            : 'border-gray-500 bg-gray-700 text-indigo-400 focus:ring-indigo-400'
                        }`}
                      />
                      <div className="flex-1">
                        <label htmlFor="sequence" className={`font-medium ${
                          theme === 'light' ? 'text-blue-900' : 'text-blue-300'
                        }`}>
                          Sequential Execution Mode
                        </label>
                        <p className={`text-sm mt-1 ${
                          theme === 'light' ? 'text-blue-700' : 'text-blue-400'
                        }`}>
                          When enabled, attacks will be executed one after another in order. 
                          When disabled, all attacks will run simultaneously for faster execution.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmitting}
                      icon={<CheckIcon className="w-4 h-4" />}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {selectedSetting === 'metadata' && (
              <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  <InformationCircleIcon className="w-5 h-5 mr-2" />
                  Scenario Information
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Scenario ID</p>
                    <p className={`font-mono text-sm font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'} break-all`}>
                      {scenario._id}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Status</p>
                    <StatusBadge status={getStatusColor(scenario.status || 'idle')}>
                      {statusConfig.label}
                    </StatusBadge>
                  </div>
                  {scenario.createdAt && (
                    <div>
                      <p className={`text-sm flex items-center space-x-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                        <CalendarIcon className="w-3 h-3" />
                        <span>Created</span>
                      </p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {new Date(scenario.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Execution Mode</p>
                    <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {scenario.sequence ? 'Sequential' : 'Parallel'}
                    </p>
                  </div>
                </div>

                <div className={`mt-6 p-4 rounded-lg border ${
                  theme === 'light' 
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200' 
                    : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30'
                }`}>
                  <h5 className={`font-semibold mb-3 ${
                    theme === 'light' ? 'text-indigo-900' : 'text-indigo-300'
                  }`}>
                    💡 Tips
                  </h5>
                  <ul className={`text-sm space-y-2 ${
                    theme === 'light' ? 'text-indigo-700' : 'text-indigo-400'
                  }`}>
                    <li>• Use descriptive names for easy identification</li>
                    <li>• Sequential mode is safer but slower</li>
                    <li>• Parallel mode is faster but may cause conflicts</li>
                    <li>• Save regularly to avoid losing changes</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'error':
      return 'error';
    case 'running':
      return 'info';
    case 'pending':
      return 'warning';
    default:
      return 'neutral';
  }
};

export default ScenarioSettings;
