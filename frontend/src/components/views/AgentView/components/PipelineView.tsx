import React from 'react';
import { motion } from 'framer-motion';
import { 
  CommandLineIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlayIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { ExecutionStep } from '../types';
import { usePentestSessions } from '../hooks/usePentestSessions';
import { usePipeline } from '../hooks/usePipeline';
import { useConversations } from '../hooks/useConversations';
import TruncatedOutput from './TruncatedOutput';

interface PipelineViewProps {
  currentConversationId: string | null;
}

const PipelineView: React.FC<PipelineViewProps> = ({ currentConversationId }) => {
  const conversationHooks = useConversations();
  const sessionHooks = usePentestSessions(conversationHooks.conversations, currentConversationId, conversationHooks.getCurrentConversation, conversationHooks.addMessageToConversation);
  const { currentSession } = sessionHooks;
  const { generateReport, exportSessionData: exportData } = usePipeline(sessionHooks, conversationHooks.addMessageToConversation);

  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
        return <PlayIcon className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'failed':
        return 'bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'running':
        return 'bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <CommandLineIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune session de pentest active</p>
          <p className="text-sm mt-2">Démarrez un pentest depuis le chat pour voir le pipeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Session Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pipeline Pentest
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Cible: <span className="font-mono font-semibold">{currentSession.target}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Démarré le {currentSession.startTime.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentSession.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
              currentSession.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
              currentSession.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {currentSession.status === 'running' ? 'En cours' :
               currentSession.status === 'completed' ? 'Terminé' :
               currentSession.status === 'failed' ? 'Échoué' : 'En pause'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      {currentSession.summary && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentSession.summary.totalTools}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Outils total</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">
              {currentSession.summary.successful}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Réussis</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-red-600">
              {currentSession.summary.failed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Échoués</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(currentSession.summary.totalDuration)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Durée totale</div>
          </div>
        </div>
      )}

      {/* Execution Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Étapes d'exécution
        </h3>
        
        {currentSession.steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(step.status)}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {step.tool}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {step.duration && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDuration(step.duration)}
                  </div>
                )}
                {step.progress !== undefined && (
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'failed' ? 'bg-red-500' :
                        step.status === 'running' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Command */}
            {step.command && (
              <div className="mt-3 p-2 bg-gray-800 rounded text-green-400 text-sm font-mono">
                {step.command}
              </div>
            )}
            
            {/* Output */}
            {step.output && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Result
                </div>
                <TruncatedOutput
                  content={step.output}
                  maxLength={800}
                  toolName={step.tool}
                  title={`Result from ${step.tool}`}
                />
              </div>
            )}
            
            {/* Error */}
            {step.error && (
              <div className="mt-3">
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  Erreur
                </div>
                <pre className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-800 dark:text-red-400 overflow-x-auto">
                  {step.error}
                </pre>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      {currentSession.status === 'completed' && (
        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => generateReport()}
            className="inline-flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            <span>Générer rapport</span>
          </button>
          <button
            onClick={() => exportData()}
            className="inline-flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            <span>Exporter données</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PipelineView;
