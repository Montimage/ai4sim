import React, { useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { Project, Scenario, Target } from '../../../types/project';
import { PlayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ProjectCampaignsProps {
  project: Project;
  onRunScenario: (campaignId: string, scenario: Scenario) => void;
}

export const ProjectCampaigns: React.FC<ProjectCampaignsProps> = ({ project, onRunScenario }) => {
  const { addCampaign, addScenario } = useProjectStore();
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [showNewScenarioForm, setShowNewScenarioForm] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [targets, setTargets] = useState<Target[]>([]);

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    await addCampaign({
      name: newCampaignName,
      description: newCampaignDesc
    });
    setNewCampaignName('');
    setNewCampaignDesc('');
    setShowNewCampaignForm(false);
  };

  const handleAddScenario = async (campaignId: string) => {
    if (!newScenarioName.trim() || targets.length === 0) return;
    const scenario: Scenario = {
      name: newScenarioName,
      targets,
      attacks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await addScenario(campaignId, scenario);
    setNewScenarioName('');
    setTargets([]);
    setShowNewScenarioForm(false);
  };

  const handleAddTarget = () => {
    setTargets([
      ...targets,
      {
        host: '',
        name: `Target ${targets.length + 1}`,
        port: 0,
        protocol: 'tcp',
        hasAgent: false
      }
    ]);
  };

  const handleUpdateTarget = (index: number, field: keyof Target, value: any) => {
    const updatedTargets = [...targets];
    updatedTargets[index] = { ...updatedTargets[index], [field]: value };
    setTargets(updatedTargets);
  };

  const handleRemoveTarget = (index: number) => {
    const updatedTargets = [...targets];
    updatedTargets.splice(index, 1);
    setTargets(updatedTargets);
  };

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaignId(expandedCampaignId === campaignId ? null : campaignId);
    setShowNewScenarioForm(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Campaigns</h2>
        <button
          onClick={() => setShowNewCampaignForm(!showNewCampaignForm)}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          New Campaign
        </button>
      </div>

      {showNewCampaignForm && (
        <form onSubmit={handleAddCampaign} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className="mb-3">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Campaign Name
            </label>
            <input
              type="text"
              id="name"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              value={newCampaignDesc}
              onChange={(e) => setNewCampaignDesc(e.target.value)}
              rows={2}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowNewCampaignForm(false)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100 transition ease-in-out duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {(project.campaigns || []).length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No campaigns found. Create your first campaign to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {(project.campaigns || []).map((campaign) => (
            <div key={campaign._id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <button
                onClick={() => toggleCampaign(campaign._id || '')}
                className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{campaign.description}</p>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-gray-500 transform transition-transform ${
                    expandedCampaignId === campaign._id ? 'rotate-180' : ''
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {expandedCampaignId === campaign._id && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Scenarios</h4>
                    <button
                      onClick={() => setShowNewScenarioForm(!showNewScenarioForm)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded-md text-white bg-green-600 hover:bg-green-500 focus:outline-none"
                    >
                      <PlusIcon className="w-3 h-3 mr-1" />
                      Add Scenario
                    </button>
                  </div>

                  {showNewScenarioForm && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="mb-3">
                        <label htmlFor="scenarioName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Scenario Name
                        </label>
                        <input
                          type="text"
                          id="scenarioName"
                          value={newScenarioName}
                          onChange={(e) => setNewScenarioName(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Targets</label>
                          <button
                            type="button"
                            onClick={handleAddTarget}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none"
                          >
                            <PlusIcon className="w-3 h-3 mr-1" />
                            Add Target
                          </button>
                        </div>

                        {targets.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">No targets added. Add at least one target.</p>
                        ) : (
                          <div className="space-y-2">
                            {targets.map((target, index) => (
                              <div key={index} className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-700">
                                <input
                                  type="text"
                                  value={target.host}
                                  onChange={(e) => handleUpdateTarget(index, 'host', e.target.value)}
                                  placeholder="Host"
                                  className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 dark:bg-gray-800 dark:text-white"
                                  required
                                />
                                <input
                                  type="number"
                                  value={target.port || ''}
                                  onChange={(e) => handleUpdateTarget(index, 'port', parseInt(e.target.value) || 0)}
                                  placeholder="Port"
                                  className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 dark:bg-gray-800 dark:text-white"
                                />
                                <select
                                  value={target.protocol}
                                  onChange={(e) => handleUpdateTarget(index, 'protocol', e.target.value)}
                                  className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded-md px-1 py-1 dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="tcp">TCP</option>
                                  <option value="udp">UDP</option>
                                  <option value="http">HTTP</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTarget(index)}
                                  className="p-1 rounded-full text-red-400 hover:text-red-500 focus:outline-none"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowNewScenarioForm(false)}
                          className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddScenario(campaign._id || '')}
                          className="inline-flex items-center px-2 py-1 text-xs border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none"
                        >
                          Add Scenario
                        </button>
                      </div>
                    </div>
                  )}

                  {campaign.scenarios.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No scenarios in this campaign yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {campaign.scenarios.map((scenario, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-md p-3"
                        >
                          <div className="flex justify-between items-center">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">{scenario.name}</h5>
                            <button
                              onClick={() => onRunScenario(campaign._id || '', scenario)}
                              className="inline-flex items-center px-2 py-1 text-xs border border-transparent rounded-md text-white bg-green-600 hover:bg-green-500 focus:outline-none"
                            >
                              <PlayIcon className="w-3 h-3 mr-1" />
                              Run
                            </button>
                          </div>

                          <div className="mt-2">
                            <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300">Targets ({scenario.targets.length}):</h6>
                            <ul className="mt-1 space-y-1">
                              {scenario.targets.map((target, tIdx) => (
                                <li key={tIdx} className="text-xs text-gray-600 dark:text-gray-400">
                                  {target.host}{target.port ? `:${target.port}` : ''} ({target.protocol})
                                  {target.hasAgent && ' - Agent enabled'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
