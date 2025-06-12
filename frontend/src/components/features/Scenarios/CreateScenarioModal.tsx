import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BeakerIcon } from '@heroicons/react/24/outline';
import { useProjectManagementStore } from '../../../store/projectManagementStore';
import { toast } from 'react-toastify';
import { Button } from '../../shared/UI/Button';

interface CreateScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  projectId: string;
  campaignId?: string;
}

const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  projectId,
  campaignId 
}) => {
  const { createScenario } = useProjectManagementStore();
  const [formState, setFormState] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState({
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors = { name: '' };
    let isValid = true;

    if (!formState.name.trim()) {
      newErrors.name = 'Scenario name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const scenarioData = {
        name: formState.name,
        description: formState.description,
        campaignId,
        targets: [],
        attacks: [],
        sequence: false
      };
      
      await createScenario(projectId, scenarioData);
      toast.success('Scenario created successfully');
      
      setFormState({ name: '', description: '' });
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast.error('Error creating scenario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center space-x-3 mb-6">
          <BeakerIcon className="w-8 h-8 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Scenario
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scenario Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formState.name}
              onChange={handleChange}
              placeholder="Enter scenario name"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                errors.name 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={handleChange}
              placeholder="Describe what this scenario will test"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Scenario'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export { CreateScenarioModal };
export default CreateScenarioModal;
