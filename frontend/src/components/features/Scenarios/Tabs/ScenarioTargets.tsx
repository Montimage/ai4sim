import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../../store/themeStore';
import { 
  PlusIcon, 
  TrashIcon, 
  ServerIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Scenario, Target } from '../../../../types/projectManagement';
import { Button, StatusBadge } from '../../../shared/UI';

interface ScenarioTargetsProps {
  scenario: Scenario;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
}

const ScenarioTargets: React.FC<ScenarioTargetsProps> = ({ scenario, onSave }) => {
  const theme = useThemeStore(state => state.theme);
  const [targets, setTargets] = useState<Target[]>(scenario.targets || []);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTarget, setNewTarget] = useState({
    host: '',
    name: ''
  });

  // Filter targets based on search
  const filteredTargets = targets.filter(target =>
    target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    target.host.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.host || !newTarget.name) return;

    const target: Target = {
      host: newTarget.host,
      name: newTarget.name
    };

    const updatedTargets = [...targets, target];

    try {
      setIsSubmitting(true);
      await onSave({ targets: updatedTargets });
      setTargets(updatedTargets);
      setNewTarget({
        host: '',
        name: ''
      });
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTarget = async (index: number) => {
    const updatedTargets = targets.filter((_, i) => i !== index);
    try {
      setIsSubmitting(true);
      await onSave({ targets: updatedTargets });
      setTargets(updatedTargets);
      if (selectedTargetIndex === index) {
        setSelectedTarget(null);
        setSelectedTargetIndex(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTarget = (target: Target, index: number) => {
    setSelectedTarget(target);
    setSelectedTargetIndex(index);
  };

  return (
    <div className={`flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-gray-900'}`} style={{ height: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className={`flex-shrink-0 p-6 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-blue-100' : 'bg-blue-500/20'}`}>
              <ServerIcon className={`w-6 h-6 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Target Configuration</h2>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                Configure target systems for your scenario ({targets.length} total)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
                placeholder="Search targets..."
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
              onClick={() => setShowAddForm(true)}
            >
              Add Target
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Targets List */}
        <div className={`w-1/3 border-r flex flex-col ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
          <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Targets ({filteredTargets.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredTargets.length > 0 ? (
              filteredTargets.map((target, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedTargetIndex === index 
                      ? theme === 'light'
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-blue-500/20 border-blue-500/50'
                      : theme === 'light'
                        ? 'bg-white border-slate-200 hover:bg-slate-50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => handleSelectTarget(target, index)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <ServerIcon className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
                      <div>
                        <h4 className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          {target.name}
                        </h4>
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                          Target #{index + 1}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status="success">
                        Active
                      </StatusBadge>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={() => handleRemoveTarget(index)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>Host</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {target.host}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <ServerIcon className={`w-12 h-12 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/40'}`} />
                <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>No targets found</p>
                <p className={`text-sm mt-2 ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
                  {searchTerm ? 'Try adjusting your search' : 'Add your first target to get started'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Target Details / Add Form */}
        <div className="w-2/3 flex flex-col">
          {showAddForm ? (
            <>
              <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Add New Target</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleAddTarget} className="space-y-6">
                  <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                    <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Target Information
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="col-span-1">
                        <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                          Target Name *
                        </label>
                        <input
                          type="text"
                          value={newTarget.name}
                          onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            theme === 'light'
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-white/10 border-white/20 text-white'
                          }`}
                          placeholder="Web Server"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1">
                        <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                          Host / IP Address *
                        </label>
                        <input
                          type="text"
                          value={newTarget.host}
                          onChange={(e) => setNewTarget({ ...newTarget, host: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            theme === 'light'
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-white/10 border-white/20 text-white'
                          }`}
                          placeholder="192.168.1.100"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSubmitting}
                        icon={<CheckIcon className="w-4 h-4" />}
                      >
                        Add Target
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : selectedTarget ? (
            <>
              <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Target Details</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                  <h4 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    <InformationCircleIcon className="w-5 h-5 mr-2" />
                    General Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Name</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{selectedTarget.name}</p>
                    </div>
                    <div>
                      <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Host</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{selectedTarget.host}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ServerIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/40'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                  Select a target
                </h3>
                <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>
                  Choose a target from the list to view its details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioTargets;
