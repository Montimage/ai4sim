import React from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon,
  Cog6ToothIcon,
  DocumentArrowUpIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

interface InitialChoiceDialogProps {
  onChoice: (choice: 'new-session' | 'manage-configs' | 'import-config') => void;
}

export const InitialChoiceDialog: React.FC<InitialChoiceDialogProps> = ({ onChoice }) => {
  const options = [
    {
      id: 'new-session' as const,
      title: 'New Empty Session',
      description: 'Start a new attack session with manual tool selection',
      icon: PlusIcon,
      color: 'from-blue-600 to-indigo-600',
      hoverColor: 'from-blue-700 to-indigo-700'
    },
    {
      id: 'manage-configs' as const,
      title: 'Manage Configurations',
      description: 'View and edit saved attack configurations',
      icon: Cog6ToothIcon,
      color: 'from-gray-600 to-gray-700',
      hoverColor: 'from-gray-700 to-gray-800'
    },
    {
      id: 'import-config' as const,
      title: 'Import Configuration',
      description: 'Load an existing configuration file',
      icon: DocumentArrowUpIcon,
      color: 'from-green-600 to-emerald-600',
      hoverColor: 'from-green-700 to-emerald-700'
    }
  ];

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full">
              <RocketLaunchIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Attack Panel
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose how you want to start your security assessment
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <button
                  onClick={() => onChoice(option.id)}
                  className={`w-full p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                >
                  <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${option.color} group-hover:${option.hoverColor} rounded-lg flex items-center justify-center transition-all duration-300`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {option.description}
                  </p>
                </button>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can always change your approach later during the session
          </p>
        </motion.div>
      </div>
    </div>
  );
};
