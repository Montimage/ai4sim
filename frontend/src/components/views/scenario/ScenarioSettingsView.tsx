import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useThemeStore } from '../../../store/themeStore';
import { Card } from '../../shared/UI/Card';
import { CogIcon } from '@heroicons/react/24/outline';
import { Scenario } from '../../../types/projectManagement';

interface ScenarioContextType {
  scenario: Scenario;
  onUpdate: (scenario: Scenario) => void;
}

export const ScenarioSettingsView: React.FC = () => {
  const { scenario } = useOutletContext<ScenarioContextType>();
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            Scenario Settings
          </h2>
          <p className={`mt-1 ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
            Configure the settings and parameters of your scenario
          </p>
        </div>
      </div>

      {/* Content */}
      <Card className="p-12">
        <div className="text-center">
          <CogIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'text-slate-400' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            Scenario Settings
          </h3>
          <p className={`mb-6 ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
            This section will allow you to configure settings for the scenario "{scenario.name}".
          </p>
          <p className={`text-sm ${theme === 'light' ? 'text-slate-400' : 'text-gray-400'}`}>
            Coming soon...
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ScenarioSettingsView; 