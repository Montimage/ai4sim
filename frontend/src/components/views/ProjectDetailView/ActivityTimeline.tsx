import React from 'react';
import { Project } from '../../../types/project';
import {
  DocumentIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface ActivityTimelineProps {
  project: Project;
}

interface Activity {
  id: string;
  type: 'campaign_created' | 'user_added' | 'scenario_run';
  title: string;
  date: Date;
  description: string;
  icon: typeof DocumentIcon;
  iconBackground: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ project }) => {
  // Génération de l'historique d'activité à partir des données du projet
  const generateActivities = (project: Project): Activity[] => {
    const activities: Activity[] = [];

    // Ajout des campagnes
    project.campaigns?.forEach(campaign => {
      activities.push({
        id: `campaign-${campaign._id}`,
        type: 'campaign_created',
        title: `Campaign "${campaign.name}" created`,
        date: new Date(campaign.createdAt),
        description: campaign.description || 'No description provided',
        icon: DocumentIcon,
        iconBackground: 'bg-blue-500',
      });
    });

    // Ajout des utilisateurs
    project.sharedWith?.forEach(user => {
      activities.push({
        id: `user-${user.userId}`,
        type: 'user_added',
        title: `User ${user.username} added`,
        date: new Date(), // Idéalement, on aurait la date d'ajout
        description: `Added with ${user.role} permissions`,
        icon: UserGroupIcon,
        iconBackground: 'bg-green-500',
      });
    });

    // Tri par date décroissante
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const activities = generateActivities(project);

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${activity.iconBackground}`}
                  >
                    <activity.icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {activity.date.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
