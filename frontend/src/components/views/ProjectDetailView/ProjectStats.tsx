import React from 'react';
import { Project } from '../../../types/project';
import {
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ProjectStatsProps {
  project: Project;
}

export const ProjectStats: React.FC<ProjectStatsProps> = ({ project }) => {
  const calculateStats = () => {
    const campaignsCount = project.campaigns?.length || 0;
    const stats = project.campaigns?.reduce((acc, camp) => {
      const scenarios = camp.scenarios || [];
      scenarios.forEach(scenario => {
        const allCompleted = scenario.attacks?.every(a => a.status === 'completed') || false;
        const hasFailed = scenario.attacks?.some(a => a.status === 'failed') || false;
        const isRunning = scenario.attacks?.some(a => a.status === 'running') || false;

        if (allCompleted) acc.completed++;
        if (hasFailed) acc.failed++;
        if (isRunning) acc.running++;
        acc.total++;
      });
      return acc;
    }, { total: 0, completed: 0, failed: 0, running: 0 }) || { total: 0, completed: 0, failed: 0, running: 0 };

    return {
      campaigns: campaignsCount,
      ...stats,
    };
  };

  const stats = calculateStats();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-wrap -mx-2">
        <div className="w-full lg:w-1/3 px-2 mb-4 lg:mb-0">
          <div className="h-full bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-100">Campaign Progress</h3>
              <ChartBarIcon className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="space-y-4">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200 dark:text-indigo-200 dark:bg-indigo-900/40">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-200">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200 dark:bg-indigo-900/40">
                  <div
                    style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.campaigns}</div>
                  <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-wide">Campaigns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</div>
                  <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-wide">Scenarios</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-2/3 px-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.completed}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-lg">
                  <ExclamationCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">Failed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.failed}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Running</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.running}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
