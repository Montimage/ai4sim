import React from 'react';
import { Campaign } from '../../../types/project';
import {
  FolderIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { ScenarioStatusBadge, getScenarioStatus } from './ScenarioStatusBadge';

interface CampaignsViewProps {
  campaigns: Campaign[];
  onCreateCampaign: () => void;
  onOpenCampaign: (campaignId: string) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  onCreateCampaign,
  onOpenCampaign,
}) => {
  const getProgressInfo = (campaign: Campaign) => {
    if (!campaign.scenarios || campaign.scenarios.length === 0) {
      return { percentage: 0, color: 'text-gray-600 dark:text-gray-400' };
    }

    const stats = campaign.scenarios.reduce((acc, scenario) => {
      const status = getScenarioStatus(scenario.attacks);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = campaign.scenarios.length;
    const completed = stats['completed'] || 0;
    const running = stats['running'] || 0;
    const error = stats['error'] || 0;

    const percentage = Math.round((completed / total) * 100);

    let color = 'text-gray-600 dark:text-gray-400';
    if (error > 0) color = 'text-red-600 dark:text-red-400';
    else if (running > 0) color = 'text-blue-600 dark:text-blue-400';
    else if (completed === total) color = 'text-green-600 dark:text-green-400';
    else if (completed > 0) color = 'text-yellow-600 dark:text-yellow-400';

    return { percentage, color };
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderIcon className="w-6 h-6 text-gray-400" />
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Campaigns</h3>
        </div>
        <button
          onClick={onCreateCampaign}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <FolderIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No campaigns</h3>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Get started by creating a new campaign using the button above
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-10">
          {campaigns.map((campaign) => {
            const { percentage, color } = getProgressInfo(campaign);
            
            return (
              <div
                key={campaign._id}
                onClick={() => campaign._id && onOpenCampaign(campaign._id)}
                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 hover:shadow-2xl cursor-pointer transform hover:scale-110 hover:-translate-y-2"
              >
                <div className="p-10 space-y-8">
                  {/* Header avec nom et date */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {campaign.name}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="w-6 h-6 text-gray-400" />
                      <span className="text-base text-gray-500 dark:text-gray-400">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {campaign.description && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed">
                      {campaign.description}
                    </p>
                  )}

                  {/* Statistiques */}
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Scenarios
                      </p>
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {campaign.scenarios?.length || 0}
                        </span>
                        {campaign.scenarios?.length > 0 && (
                          <ScenarioStatusBadge attacks={campaign.scenarios[0].attacks} />
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                        Progress
                      </p>
                      <p className={`text-3xl font-bold ${color}`}>
                        {percentage}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
