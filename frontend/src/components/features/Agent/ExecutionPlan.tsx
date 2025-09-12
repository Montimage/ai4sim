import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../store/themeStore';
import { useAgentStore } from '../../../store/agentStore';
import { 
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CpuChipIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const ExecutionPlan: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  
  const {
    currentSession,
    isExecuting,
    approveStep,
    startExecution,
    pauseExecution,
    stopExecution
  } = useAgentStore();

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'running':
        return <PlayIcon className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'waiting_approval':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'waiting_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return 'N/A';
    if (!end) return 'En cours...';
    
    const duration = end.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  const handleStepApproval = (stepId: string) => {
    if (currentSession) {
      approveStep(currentSession.id, stepId);
    }
  };

  const handleExecutionControl = () => {
    if (!currentSession?.executionPlan) return;
    
    if (isExecuting) {
      pauseExecution();
    } else {
      // startExecution expects a string, not an array
      startExecution(currentSession.id);
    }
  };

  if (!currentSession || !currentSession.executionPlan) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <CpuChipIcon className={`w-16 h-16 mx-auto mb-4 ${
            theme === 'light' ? 'text-slate-400' : 'text-gray-500'
          }`} />
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'light' ? 'text-slate-700' : 'text-gray-300'
          }`}>
            Aucun plan d'exécution
          </h3>
          <p className={`text-sm ${
            theme === 'light' ? 'text-slate-500' : 'text-gray-400'
          }`}>
            Créez une session pour générer un plan d'attaque automatisé
          </p>
        </div>
      </div>
    );
  }

  const plan = currentSession.executionPlan;
  const completedSteps = plan.filter((step: any) => step.status === 'DONE').length;
  const totalSteps = plan.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Plan Header */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              Plan d'Exécution
            </h2>
            <p className={`text-sm ${
              theme === 'light' ? 'text-slate-600' : 'text-gray-400'
            }`}>
              Session: {currentSession.id} | Cible: {currentSession.targetIp}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExecutionControl}
              disabled={totalSteps === 0}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium ${
                isExecuting
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isExecuting ? (
                <>
                  <PauseIcon className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Démarrer
                </>
              )}
            </button>
            
            {isExecuting && (
              <button
                onClick={stopExecution}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <XCircleIcon className="w-4 h-4 mr-2" />
                Arrêter
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
              Progression: {completedSteps}/{totalSteps} étapes
            </span>
            <span className={`font-medium ${
              theme === 'light' ? 'text-slate-700' : 'text-gray-300'
            }`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Plan Info */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className={`text-xs font-medium ${
              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
            }`}>
              DURÉE ESTIMÉE
            </p>
            <p className={`text-lg font-semibold ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              {Math.round(totalSteps * 2.5)}min
            </p>
          </div>
          <div>
            <p className={`text-xs font-medium ${
              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
            }`}>
              ÉTAPES TOTALES
            </p>
            <p className={`text-lg font-semibold ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              {totalSteps}
            </p>
          </div>
          <div>
            <p className={`text-xs font-medium ${
              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
            }`}>
              MODE
            </p>
            <p className={`text-lg font-semibold ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              {currentSession.mode === 'auto' ? 'Automatique' : 'Semi-auto'}
            </p>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {plan.map((step: any, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`border rounded-lg overflow-hidden ${
              theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
            }`}
          >
            {/* Step Header */}
            <div 
              className={`p-4 cursor-pointer transition-colors ${
                theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-700/50'
              }`}
              onClick={() => toggleStepExpansion(step.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {expandedSteps.has(step.id) ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      Étape {index + 1}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStepStatusIcon(step.status)}
                    <h3 className={`font-semibold ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                      {step.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    theme === 'light' ? getStepStatusColor(step.status) : 
                    `bg-slate-700 text-white border-slate-600`
                  }`}>
                    {step.status}
                  </div>
                  
                  {step.status === 'waiting_approval' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStepApproval(step.id);
                      }}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approuver
                    </button>
                  )}
                </div>
              </div>

              <p className={`mt-2 text-sm ${
                theme === 'light' ? 'text-slate-600' : 'text-gray-400'
              }`}>
                {step.description}
              </p>
            </div>

            {/* Step Details */}
            {expandedSteps.has(step.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`border-t px-4 pb-4 ${
                  theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-slate-700/50'
                }`}
              >
                <div className="grid grid-cols-2 gap-6 mt-4">
                  {/* Agent Info */}
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${
                      theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                    }`}>
                      Agent
                    </h4>
                    <div className="flex items-center space-x-2">
                      <CpuChipIcon className="w-4 h-4" />
                      <span className={`text-sm ${
                        theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                      }`}>
                        {step.agent}
                      </span>
                    </div>
                  </div>

                  {/* Timing */}
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${
                      theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                    }`}>
                      Durée
                    </h4>
                    <span className={`text-sm ${
                      theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      {formatDuration(step.startedAt, step.completedAt)}
                    </span>
                  </div>

                  {/* Parameters */}
                  <div className="col-span-2">
                    <h4 className={`text-sm font-medium mb-2 ${
                      theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                    }`}>
                      Paramètres
                    </h4>
                    <div className={`p-3 rounded-lg text-sm font-mono ${
                      theme === 'light' ? 'bg-white border border-slate-200' : 'bg-slate-800 border border-gray-600'
                    }`}>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(step.parameters, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Results */}
                  {step.results && (
                    <div className="col-span-2">
                      <h4 className={`text-sm font-medium mb-2 ${
                        theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                      }`}>
                        Résultats
                      </h4>
                      <div className={`p-3 rounded-lg text-sm font-mono ${
                        theme === 'light' ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-800'
                      }`}>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(step.results, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {step.error && (
                    <div className="col-span-2">
                      <h4 className={`text-sm font-medium mb-2 ${
                        theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                      }`}>
                        Erreur
                      </h4>
                      <div className={`p-3 rounded-lg text-sm ${
                        theme === 'light' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/20 border border-red-800 text-red-300'
                      }`}>
                        {step.error}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ExecutionPlan; 