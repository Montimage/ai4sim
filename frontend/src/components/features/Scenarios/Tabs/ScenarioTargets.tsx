import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  TrashIcon, 
  ServerIcon,
  GlobeAltIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Scenario, Target } from '../../../../types/projectManagement';
import { Card } from '../../../shared/UI/Card';
import { Button } from '../../../shared/UI/Button';
import { StatusBadge } from '../../../shared/UI/StatusBadge';

interface ScenarioTargetsProps {
  scenario: Scenario;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
}

const ScenarioTargets: React.FC<ScenarioTargetsProps> = ({ scenario, onSave }) => {
  const [targets, setTargets] = useState<Target[]>(scenario.targets || []);
  const [newTarget, setNewTarget] = useState({
    host: '',
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <ServerIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Target Configuration</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Define and manage targets for your security testing scenario ({targets.length} configured)
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon className="w-4 h-4" />}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          Add Target
        </Button>
      </div>

      {/* Add Target Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                <PlusIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add New Target
              </h3>
            </div>
            
            <form onSubmit={handleAddTarget} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    Target Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newTarget.name}
                    onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                    placeholder="Web Server"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="host" className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    IP Address / Hostname
                  </label>
                  <input
                    type="text"
                    id="host"
                    value={newTarget.host}
                    onChange={(e) => setNewTarget({ ...newTarget, host: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                    placeholder="192.168.1.100 or example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTarget({ host: '', name: '' });
                  }}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  icon={<CheckIcon className="w-4 h-4" />}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
                >
                  Add Target
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Targets List */}
      {targets.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configured Targets
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {targets.map((target, index) => (
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
                        <ServerIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {target.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <StatusBadge status="info" size="sm">
                            Target #{index + 1}
                          </StatusBadge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                          <GlobeAltIcon className="w-4 h-4 mr-1" />
                          {target.host}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTarget(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="p-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <ServerIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            No targets configured
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Start by adding your first target to this scenario. Targets define what systems will be tested during security assessments.
          </p>
          <Button
            variant="primary"
            icon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setShowAddForm(true)}
          >
            Add First Target
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ScenarioTargets;
