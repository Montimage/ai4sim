import React, { useState } from 'react';
import { Scenario } from '../../../../types/projectManagement';

interface ScenarioSettingsProps {
  scenario: Scenario;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
}

const ScenarioSettings: React.FC<ScenarioSettingsProps> = ({ scenario, onSave }) => {
  const [formData, setFormData] = useState({
    name: scenario.name,
    description: scenario.description || '',
    sequence: scenario.sequence || false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Scenario Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          />
        </div>

        <div className="relative flex items-start">
          <div className="flex items-center h-5">
            <input
              id="sequence"
              type="checkbox"
              checked={formData.sequence}
              onChange={(e) => setFormData(prev => ({ ...prev, sequence: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="sequence" className="font-medium text-gray-700 dark:text-gray-300">
              Sequential Execution
            </label>
            <p className="text-gray-500 dark:text-gray-400">
              If enabled, attacks will be executed one after another. Otherwise, they will be executed in parallel.
            </p>
          </div>
        </div>

        {/* Read-only metadata */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Information
          </h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">ID</dt>
              <dd className="mt-1 text-gray-900 dark:text-white font-mono">{scenario._id}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  scenario.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  scenario.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  scenario.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {scenario.status || 'Not started'}
                </span>
              </dd>
            </div>
            {scenario.createdAt && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created on</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">
                  {new Date(scenario.createdAt).toLocaleString()}
                </dd>
              </div>
            )}
            {scenario.updatedAt && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Last modified</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">
                  {new Date(scenario.updatedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScenarioSettings;
