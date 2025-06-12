import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({ isOpen, onClose }) => {
  const [formState, setFormState] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState({ ...formState, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formState.name.trim()) {
      setErrors({ name: 'Scenario name is required' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Add your form submission logic here
      
      // Clear any errors
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating scenario:', error);
      setErrors({ name: 'Failed to create scenario' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md p-6 mx-auto bg-white rounded-md shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            New Scenario
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formState.name}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md shadow-sm 
                ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} 
                dark:bg-gray-700 dark:text-white sm:text-sm`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateScenarioModal;