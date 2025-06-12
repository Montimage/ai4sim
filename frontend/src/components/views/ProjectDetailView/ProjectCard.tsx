import React from 'react';
import { Project } from '../../../types/project';
import {
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  // Calculer le pourcentage de progression une seule fois pour réutilisation
  const calculateProgress = () => {
    if (!project.campaigns || project.campaigns.length === 0) return 0;
    
    const totalProgress = project.campaigns.reduce((acc, camp) => {
      const total = camp.scenarios?.length || 0;
      const completed = camp.scenarios?.filter(s => 
        s.attacks?.every(a => a.status === 'completed')
      )?.length || 0;
      return acc + (total > 0 ? (completed / total) * 100 : 0);
    }, 0);
    
    return Math.round(totalProgress / project.campaigns.length);
  };
  
  const progressPercentage = calculateProgress();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-6">
        {/* Project Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Team</p>
                  <div className="flex -space-x-2 overflow-hidden">
                    {[project.owner, ...(project.sharedWith || [])].map((user, index) => {
                      console.log('🧑‍💻 User data in ProjectCard:', user, typeof user);
                      // Gestion sécurisée des différents formats d'utilisateurs
                      const key = typeof user === 'string' ? user : 
                                 (user && typeof user === 'object' && 'userId' in user) ? user.userId :
                                 (user && typeof user === 'object' && '_id' in user) ? user._id : 
                                 `user-${index}`;
                      
                      // Récupération sécurisée du nom d'utilisateur
                      const username = typeof user === 'string' ? 'U' : 
                                     (user && typeof user === 'object' && 'username' in user) ? user.username : '?';
                      
                      return (
                        <div
                          key={key}
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800"
                        >
                          <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-full">
                            {username && typeof username === 'string' ? username[0].toUpperCase() : '?'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {(project.sharedWith?.length || 0) + 1} members
              </span>
            </div>
          </div>
        </div>

        {/* Project Tags & Health */}
        <div className="flex flex-wrap gap-2">
          {project.campaigns?.length ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {project.campaigns.length} Campaign{project.campaigns.length !== 1 ? 's' : ''}
            </span>
          ) : null}
          {(() => {
            const scenarioCount = project.campaigns?.reduce((acc, camp) => acc + (camp.scenarios?.length || 0), 0) || 0;
            return scenarioCount > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {scenarioCount} Scenario{scenarioCount !== 1 ? 's' : ''}
              </span>
            ) : null;
          })()}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
