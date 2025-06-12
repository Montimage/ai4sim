import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useThemeStore } from '../../../store/themeStore';
import { Card } from '../../shared/UI/Card';
import { PlayIcon } from '@heroicons/react/24/outline';
import { Scenario } from '../../../types/projectManagement';

interface ScenarioContextType {
  scenario: Scenario;
  onUpdate: (scenario: Scenario) => void;
}

export const ScenarioExecutionView: React.FC = () => {
  const { scenario } = useOutletContext<ScenarioContextType>();
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            Execution Control
          </h2>
          <p className={`mt-1 ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
            Execute and monitor your security testing scenario
          </p>
        </div>
      </div>

      {/* Content */}
      <Card className="p-12">
        <div className="text-center">
          <PlayIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'text-slate-400' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            Execution Control
          </h3>
          <p className={`mb-6 ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
            This section will allow you to execute and monitor the scenario "{scenario.name}".
          </p>
          <p className={`text-sm ${theme === 'light' ? 'text-slate-400' : 'text-gray-400'}`}>
            Coming soon...
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ScenarioExecutionView; 