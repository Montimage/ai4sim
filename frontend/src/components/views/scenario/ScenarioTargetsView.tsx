import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  TrashIcon,
  UserIcon,
  GlobeAltIcon,
  ServerIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { Scenario } from '../../../types/projectManagement';
import { Card } from '../../shared/UI/Card';
import { Button } from '../../shared/UI/Button';

interface ScenarioContextType {
  scenario: Scenario;
  onUpdate: (scenario: Scenario) => void;
}

interface LocalTarget {
  id: string;
  name: string;
  type: 'ip' | 'domain' | 'email' | 'phone' | 'user';
  value: string;
  description?: string;
  metadata?: Record<string, any>;
}

const TARGET_TYPES = [
  { value: 'ip', label: 'IP Address', icon: ServerIcon },
  { value: 'domain', label: 'Domain', icon: GlobeAltIcon },
  { value: 'email', label: 'Email', icon: UserIcon },
  { value: 'phone', label: 'Phone', icon: DevicePhoneMobileIcon },
  { value: 'user', label: 'User', icon: ComputerDesktopIcon }
];

const TargetCard: React.FC<{
  target: LocalTarget;
  onEdit: (target: LocalTarget) => void;
  onDelete: (targetId: string) => void;
}> = ({ target, onEdit, onDelete }) => {
  const targetType = TARGET_TYPES.find(t => t.value === target.type);
  const Icon = targetType?.icon || ServerIcon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {target.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {targetType?.label}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(target)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(target.id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Value:</span>
          <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
            {target.value}
          </p>
        </div>
        {target.description && (
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Description:</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {target.description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AddTargetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (target: Omit<LocalTarget, 'id'>) => void;
  editTarget?: LocalTarget | null;
}> = ({ isOpen, onClose, onAdd, editTarget }) => {
  const [formData, setFormData] = useState({
    name: editTarget?.name || '',
    type: editTarget?.type || 'ip' as LocalTarget['type'],
    value: editTarget?.value || '',
    description: editTarget?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.value.trim()) {
      toast.error('Name and value are required');
      return;
    }

    onAdd(formData);
    setFormData({ name: '', type: 'ip', value: '', description: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editTarget ? 'Edit Target' : 'Add New Target'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Target name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LocalTarget['type'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {TARGET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value
            </label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="192.168.1.1, example.com, user@domain.com, etc."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Additional information about this target"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <Button type="submit" variant="primary">
              {editTarget ? 'Update Target' : 'Add Target'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const ScenarioTargetsView: React.FC = () => {
  const { scenario, onUpdate } = useOutletContext<ScenarioContextType>();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LocalTarget | null>(null);

  // Convertir les targets du scénario en format local
  const targets: LocalTarget[] = scenario.targets?.map((target, index) => ({
    id: target._id || `target-${index}`,
    name: target.name || `Target ${index + 1}`,
    type: 'ip', // Par défaut, on peut améliorer cela plus tard
    value: target.host || '',
    description: target.description,
    metadata: {}
  })) || [];

  const handleAddTarget = (newTarget: Omit<LocalTarget, 'id'>) => {
    const target = {
      ...newTarget,
      id: `target-${Date.now()}`
    };

    const updatedTargets = [...targets, target];
    updateScenarioTargets(updatedTargets);
    toast.success('Target added successfully');
  };

  const handleEditTarget = (target: LocalTarget) => {
    setEditTarget(target);
    setIsAddModalOpen(true);
  };

  const handleUpdateTarget = (updatedTarget: Omit<LocalTarget, 'id'>) => {
    if (!editTarget) return;

    const updatedTargets = targets.map(t => 
      t.id === editTarget.id 
        ? { ...updatedTarget, id: editTarget.id }
        : t
    );
    
    updateScenarioTargets(updatedTargets);
    setEditTarget(null);
    toast.success('Target updated successfully');
  };

  const handleDeleteTarget = (targetId: string) => {
    const updatedTargets = targets.filter(t => t.id !== targetId);
    updateScenarioTargets(updatedTargets);
    toast.success('Target deleted successfully');
  };

  const updateScenarioTargets = (newTargets: LocalTarget[]) => {
    const updatedScenario = {
      ...scenario,
      targets: newTargets.map(target => ({
        _id: target.id,
        name: target.name,
        host: target.value,
        description: target.description
      }))
    };
    
    onUpdate(updatedScenario);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Targets Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Define the targets for your security testing scenario
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          icon={<PlusIcon className="w-4 h-4" />}
        >
          Add Target
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {TARGET_TYPES.map((type) => {
          const count = targets.filter(t => t.type === type.value).length;
          const Icon = type.icon;
          
          return (
            <Card key={type.value} className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{type.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Targets List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configured Targets ({targets.length})
          </h3>
        </div>

        {targets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                onEdit={handleEditTarget}
                onDelete={handleDeleteTarget}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Targets Configured
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Add targets to define what will be tested in this scenario.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add First Target
            </Button>
          </div>
        )}
      </Card>

      {/* Add/Edit Target Modal */}
      <AddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditTarget(null);
        }}
        onAdd={editTarget ? handleUpdateTarget : handleAddTarget}
        editTarget={editTarget}
      />
    </div>
  );
};

export default ScenarioTargetsView; 