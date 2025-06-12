import React from 'react';


interface ScenarioStatusBadgeProps {
  attacks?: Array<{ status?: string }>;
}

const getScenarioStatus = (attacks?: { status?: string }[]) => {
  if (!attacks || attacks.length === 0) return 'idle';
  
  if (attacks.every(a => a.status === 'completed')) return 'completed';
  if (attacks.some(a => a.status === 'error')) return 'error';
  if (attacks.some(a => a.status === 'running')) return 'running';
  if (attacks.some(a => a.status === 'stopped')) return 'stopped';
  
  return 'idle';
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        text: 'Completed',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      };
    case 'running':
      return {
        text: 'Running',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      };
    case 'error':
      return {
        text: 'Failed',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      };
    case 'stopped':
      return {
        text: 'Stopped',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      };
    default:
      return {
        text: 'Pending',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      };
  }
};

export const ScenarioStatusBadge: React.FC<ScenarioStatusBadgeProps> = ({ attacks }) => {
  const status = getScenarioStatus(attacks);
  const { text, className } = getStatusConfig(status);

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${className}`}>
      {text}
    </span>
  );
};

export { getScenarioStatus };
