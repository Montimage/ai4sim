import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useThemeStore } from '../../../../store/themeStore';
import { executionHistoryService, ExecutionRecord } from '../../../../services/executionHistoryService';
import { processStatusService } from '../../../../services/processStatusService';
import { pdfExportService } from '../../../../services/pdfExportService';
import { getToolDisplayName, getAttackDisplayNameFromParams } from '../../../../constants/toolMapping';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  DocumentArrowDownIcon,
  CommandLineIcon,
  ArrowPathIcon,
  TrashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button, StatusBadge } from '../../../shared/UI';
import AIAnalysisPanel from './AIAnalysisPanel';

type FilterStatus = 'all' | 'completed' | 'failed' | 'running' | 'stopped';
type SortBy = 'date' | 'duration' | 'attacks' | 'status';

const ScenarioHistory: React.FC = () => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const theme = useThemeStore((state) => state.theme);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'ai-analysis'>('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [selectedExecutions, setSelectedExecutions] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  
  const toDate = (dateValue: string | Date): Date => {
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    return dateValue;
  };

  const loadExecutions = async () => {
    if (!scenarioId) return;
    
    try {
      setLoading(true);
      
      // Nettoyer d'abord les exécutions bloquées
      await executionHistoryService.cleanupStaleExecutions();
      
      const executionHistory = await executionHistoryService.getExecutionsForScenario(scenarioId);
      
      // Corriger les statuts d'exécution avec le même service que ReportsView
      const correctedExecutions = await processStatusService.correctExecutionStatuses(executionHistory);
      setExecutions(correctedExecutions);
    } catch (error) {
      console.error('Error loading executions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [scenarioId]);

  const filteredAndSortedExecutions = useMemo(() => {
    let filtered = executions;

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.scenarioName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.attacks.some(a => {
          const toolDisplayName = getToolDisplayName(a.tool);
          const attackDisplayName = getAttackDisplayNameFromParams(
            a.tool,
            a.parameters?.attackId,
            a.parameters
          );
          return toolDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 attackDisplayName.toLowerCase().includes(searchTerm.toLowerCase());
        }) ||
        e.targets.some(t => t.host.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return toDate(b.startTime).getTime() - toDate(a.startTime).getTime();
        case 'duration':
          const aDuration = a.endTime ? toDate(a.endTime).getTime() - toDate(a.startTime).getTime() : 0;
          const bDuration = b.endTime ? toDate(b.endTime).getTime() - toDate(b.startTime).getTime() : 0;
          return bDuration - aDuration;
        case 'attacks':
          return b.attacks.length - a.attacks.length;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
    }
    });

    return filtered;
  }, [executions, filterStatus, searchTerm, sortBy]);

  // Utiliser les mêmes fonctions que ReportsView pour la cohérence
  const getStatusIcon = (status: string) => {
    const baseClasses = "w-5 h-5";
    
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className={`${baseClasses} text-green-400`} />;
      case 'failed':
        return <XCircleIcon className={`${baseClasses} text-red-400`} />;
      case 'running':
        return <PlayIcon className={`${baseClasses} text-blue-400`} />;
      case 'stopped':
        return <ExclamationTriangleIcon className={`${baseClasses} text-yellow-400`} />;
      default:
        return <ClockIcon className={`${baseClasses} ${theme === 'light' ? 'text-slate-400' : 'text-white/60'}`} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'stopped':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const formatDuration = (startTime: string | Date, endTime?: string | Date) => {
    if (!endTime) return 'Running...';
    
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    const duration = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      default:
        return status;
    }
  };

  const deleteExecution = async (executionId: string) => {
    if (window.confirm('Are you sure you want to delete this execution?')) {
      await executionHistoryService.deleteExecution(executionId);
      loadExecutions();
      if (selectedExecution?.id === executionId) {
        setSelectedExecution(null);
      }
    }
  };

  const handleDeleteExecution = (executionId: string) => () => {
    deleteExecution(executionId);
  };

  const toggleExecutionSelection = (executionId: string) => {
    setSelectedExecutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(executionId)) {
        newSet.delete(executionId);
      } else {
        newSet.add(executionId);
      }
      return newSet;
    });
  };

  const selectAllExecutions = () => {
    if (selectedExecutions.size === filteredAndSortedExecutions.length) {
      setSelectedExecutions(new Set());
    } else {
      setSelectedExecutions(new Set(filteredAndSortedExecutions.map(e => e.id)));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setSortBy('date');
  };

  const exportSelectedExecutions = async () => {
    if (selectedExecutions.size === 0) return;
    
    try {
      setIsExporting(true);
      const executionsToExport = executions.filter(e => selectedExecutions.has(e.id));
      
      for (const execution of executionsToExport) {
        await pdfExportService.exportExecutionReport(execution);
      }
      
      // Clear selection after export
      setSelectedExecutions(new Set());
    } catch (error) {
      console.error('Error exporting executions:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Composant pour afficher les détails d'exécution (identique à ReportsView)
  const ExecutionDetailsPanel: React.FC<{ execution: ExecutionRecord }> = ({ execution }) => (
    <div className="space-y-6">
      {/* Vue d'ensemble de l'exécution */}
      <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
          <InformationCircleIcon className="w-5 h-5 mr-2" />
          General Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Scenario</p>
            <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{execution.scenarioName}</p>
          </div>
          <div>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Execution Mode</p>
            <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{execution.isSequential ? 'Sequential' : 'Parallel'}</p>
          </div>
          <div>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Status</p>
            <div className="flex items-center space-x-2">
              {getStatusIcon(execution.status)}
              <span className={`text-sm font-medium capitalize ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {translateStatus(execution.status)}
              </span>
            </div>
          </div>
          <div>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Duration</p>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white'}`}>
              {formatDuration(execution.startTime, execution.endTime)}
            </p>
          </div>
          <div>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>Start</p>
            <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white'}`}>
              {toDate(execution.startTime).toLocaleString()}
            </p>
          </div>
          {execution.endTime && (
            <div>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>End</p>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white'}`}>
                {toDate(execution.endTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Attacks */}
      <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
          <CommandLineIcon className="w-5 h-5 mr-2" />
          Attacks ({execution.attacks.length})
        </h3>
        <div className="space-y-3">
          {execution.attacks.map((attack, idx) => {
            const toolDisplayName = getToolDisplayName(attack.tool);
            const attackDisplayName = getAttackDisplayNameFromParams(
              attack.tool,
              attack.parameters?.attackId,
              attack.parameters
            );
            
            return (
              <div key={idx} className={`rounded-lg p-4 border ${
                theme === 'light' 
                  ? 'bg-white border-slate-200' 
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{attackDisplayName}</h4>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={getStatusColor(attack.status)}>
                      {translateStatus(attack.status)}
                    </StatusBadge>
                    <span className={`text-xs px-2 py-1 rounded border ${
                      theme === 'light'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {toolDisplayName}
                    </span>
                  </div>
                </div>
                {attack.parameters && Object.keys(attack.parameters).length > 0 && (
                  <div className={`text-sm mb-3 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                    <p className="font-medium mb-1">Parameters:</p>
                    <pre className={`p-2 rounded text-xs overflow-x-auto ${
                      theme === 'light' 
                        ? 'bg-slate-100 text-slate-800' 
                        : 'bg-black/30 text-white'
                    }`}>
                      {JSON.stringify(attack.parameters, null, 2)}
                    </pre>
                  </div>
                )}
                
                {/* Attack Output */}
                {attack.output && attack.output.length > 0 && (
                  <div className="mt-3">
                    <p className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>Output:</p>
                    <div className={`rounded p-3 max-h-40 overflow-y-auto ${
                      theme === 'light' 
                        ? 'bg-slate-100 border border-slate-200' 
                        : 'bg-black/50'
                    }`}>
                      {attack.output.map((line, lineIdx) => (
                        <div key={lineIdx} className={`text-xs font-mono ${
                          line.type === 'error' ? 'text-red-400' :
                          line.type === 'warning' ? 'text-yellow-400' :
                          line.type === 'success' ? 'text-green-400' :
                          theme === 'light' ? 'text-slate-600' : 'text-white/70'
                        }`}>
                          <span className={theme === 'light' ? 'text-slate-400 mr-2' : 'text-white/40 mr-2'}>
                            {new Date(line.timestamp).toLocaleTimeString()}
                          </span>
                          {line.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
                        
      {/* Targets */}
      <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
          <CommandLineIcon className="w-5 h-5 mr-2" />
          Targets ({execution.targets.length})
        </h3>
        <div className="space-y-2">
          {execution.targets.map((target, idx) => (
            <div key={idx} className={`flex items-center justify-between p-3 rounded border ${
              theme === 'light' 
                ? 'bg-white border-slate-200' 
                : 'bg-white/5 border-white/10'
            }`}>
              <div>
                <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{target.name}</p>
                <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>{target.host}{target.port ? `:${target.port}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>Loading execution history...</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-gray-900'}`} style={{ height: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div className={`flex-shrink-0 p-6 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-blue-100' : 'bg-blue-500/20'}`}>
              <ClockIcon className={`w-6 h-6 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Execution History</h2>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                Complete history of scenario executions ({executions.length} total)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              icon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={loadExecutions}
              loading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`flex-shrink-0 p-6 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`} />
              <input
                type="text"
                placeholder="Search executions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-white/10 border-white/20 text-white placeholder-white/40'
                }`}
              />
            </div>

            <div className="flex items-center space-x-2">
              <FunnelIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-white/10 border-white/20 text-white'
                }`}
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <ArrowsUpDownIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-white/10 border-white/20 text-white'
                }`}
              >
                <option value="date">Sort by date</option>
                <option value="duration">Sort by duration</option>
                <option value="attacks">Sort by attacks</option>
                <option value="status">Sort by status</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedExecutions.size > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                onClick={exportSelectedExecutions}
                loading={isExporting}
              >
                Export ({selectedExecutions.size})
              </Button>
            )}
            
            {(filterStatus !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {selectedExecutions.size > 0 && (
          <div className={`mt-4 flex items-center justify-between p-3 rounded-lg ${
            theme === 'light' 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-blue-500/20'
          }`}>
            <span className={`text-sm ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
              {selectedExecutions.size} execution(s) selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedExecutions(new Set())}
            >
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Execution List */}
        <div className={`w-1/3 border-r flex flex-col ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
          <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Executions ({filteredAndSortedExecutions.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllExecutions}
              >
                {selectedExecutions.size === filteredAndSortedExecutions.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredAndSortedExecutions.length > 0 ? (
              filteredAndSortedExecutions.map((execution, index) => (
                <motion.div
                  key={execution.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedExecution?.id === execution.id 
                      ? theme === 'light'
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-blue-500/20 border-blue-500/50'
                      : theme === 'light'
                        ? 'bg-white border-slate-200 hover:bg-slate-50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedExecution(execution)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedExecutions.has(execution.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleExecutionSelection(execution.id);
                        }}
                        className={`rounded focus:ring-blue-500 ${
                          theme === 'light'
                            ? 'border-slate-300 bg-white text-blue-600'
                            : 'border-white/20 bg-white/10 text-blue-500'
                        }`}
                      />
                      {getStatusIcon(execution.status)}
                      <div>
                        <h4 className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          Execution {execution.id.slice(-8)}
                        </h4>
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                          {toDate(execution.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={getStatusColor(execution.status)}>
                        {translateStatus(execution.status)}
                      </StatusBadge>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={handleDeleteExecution(execution.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>Duration</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {formatDuration(execution.startTime, execution.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>Attacks</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{execution.attacks.length}</p>
                    </div>
                    <div>
                      <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>Targets</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{execution.targets.length}</p>
                    </div>
                    <div>
                      <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>Mode</p>
                      <p className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {execution.isSequential ? 'Sequential' : 'Parallel'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <ClockIcon className={`w-12 h-12 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/40'}`} />
                <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>No executions found</p>
                <p className={`text-sm mt-2 ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
                  {filterStatus !== 'all' || searchTerm 
                    ? 'Try adjusting your filters' 
                    : 'Execute a scenario to see history here'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Execution Details */}
        <div className="w-2/3 flex flex-col">
          {selectedExecution ? (
            <>
              <div className={`flex-shrink-0 p-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Execution Details</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={activeTab === 'details' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('details')}
                    >
                      Details
                    </Button>
                    <Button
                      variant={activeTab === 'ai-analysis' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('ai-analysis')}
                    >
                      AI Analysis
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'details' ? (
                  <ExecutionDetailsPanel execution={selectedExecution} />
                ) : (
                  <AIAnalysisPanel 
                    execution={selectedExecution}
                    scenario={{
                      _id: selectedExecution.scenarioId || '',
                      name: selectedExecution.scenarioName,
                      project: '',
                      campaign: '',
                      targets: selectedExecution.targets,
                      attacks: selectedExecution.attacks.map(attack => ({
                        tool: attack.tool,
                        parameters: attack.parameters || {}
                      }))
                    } as any}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <InformationCircleIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/40'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                  Select an execution
                </h3>
                <p className={theme === 'light' ? 'text-slate-500' : 'text-white/60'}>
                  Choose an execution from the list to view its details and analysis
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioHistory;