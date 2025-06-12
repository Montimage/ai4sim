import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { executionHistoryService, ExecutionRecord } from '../../services/executionHistoryService';
import { api } from '../../services/api';
import { processStatusService } from '../../services/processStatusService';
import { pdfExportService } from '../../services/pdfExportService';
import { getToolDisplayName, getAttackDisplayNameFromParams } from '../../constants/toolMapping';
import {
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  DocumentArrowDownIcon,
  BoltIcon,
  CpuChipIcon,
  InformationCircleIcon,
  FolderIcon,
  TrashIcon,
  CommandLineIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Card, CardBody, Button, StatusBadge } from '../shared/UI';
import AIAnalysisPanel from '../features/Scenarios/Tabs/AIAnalysisPanel';
import { useThemeStore } from '../../store/themeStore';

interface ReportWithContext extends ExecutionRecord {
  projectName?: string;
  campaignName?: string;
  projectId?: string;
  campaignId?: string;
}

type FilterStatus = 'all' | 'completed' | 'failed' | 'running' | 'stopped';
type SortBy = 'date' | 'duration' | 'attacks' | 'status';

export const ReportsView: React.FC = () => {
  const navigate = useNavigate();
  const theme = useThemeStore(state => state.theme);
  const [reports, setReports] = useState<ReportWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportWithContext | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'ai-analysis'>('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);


  const toDate = (dateValue: string | Date): Date => {
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    return dateValue;
  };

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const executions = await executionHistoryService.getAllExecutions();
      
      // Enrichir chaque rapport avec les informations de contexte
      const enrichedReports = await Promise.all(
        executions.map(async (execution) => {
          try {
            // Récupérer le contexte du scénario
            const projectsResponse = await api.get('/api/projects');
            const projects = projectsResponse.data;
            
            let projectName = 'Unknown Project';
            let campaignName = 'Unknown Campaign';
            let projectId = '';
            let campaignId = '';

            // Chercher le scénario dans tous les projets et campagnes
            for (const project of projects) {
              if (project.campaigns) {
                for (const campaign of project.campaigns) {
                  if (campaign.scenarios) {
                    const scenario = campaign.scenarios.find((s: any) => s._id === execution.scenarioId);
                    if (scenario) {
                      projectName = project.name;
                      campaignName = campaign.name;
                      projectId = project._id;
                      campaignId = campaign._id;
                      break;
                    }
                  }
                }
              }
            }

            return {
              ...execution,
              projectName,
              campaignName,
              projectId,
              campaignId
            } as ReportWithContext;
          } catch (error) {
            console.error('Error enriching report:', error);
            return {
              ...execution,
              projectName: 'Unknown Project',
              campaignName: 'Unknown Campaign',
              projectId: '',
              campaignId: ''
            } as ReportWithContext;
          }
        })
      );

      // Corriger les statuts d'exécution
      const correctedReports = await processStatusService.correctExecutionStatuses(enrichedReports);
      setReports(correctedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports;

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.scenarioName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.campaignName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.attacks.some(a => {
          const toolDisplayName = getToolDisplayName(a.tool);
          const attackDisplayName = getAttackDisplayNameFromParams(
            a.tool,
            a.parameters?.attackId,
            a.parameters
          );
          return toolDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 attackDisplayName.toLowerCase().includes(searchTerm.toLowerCase());
        }) ||
        r.targets.some(t => t.host.toLowerCase().includes(searchTerm.toLowerCase()))
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
  }, [reports, filterStatus, searchTerm, sortBy]);

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

  const deleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      await executionHistoryService.deleteExecution(reportId);
      loadReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
    }
  };

  const navigateToScenario = (report: ReportWithContext) => {
    if (report.projectId && report.campaignId && report.scenarioId) {
      navigate(`/projects/${report.projectId}/campaigns/${report.campaignId}/scenarios/${report.scenarioId}`);
    } else {
      console.warn('Missing navigation context for report:', report);
    }
  };

  const exportSingleReport = async (report: ReportWithContext) => {
    try {
      setIsExporting(true);
      await pdfExportService.exportExecutionReport(report, {
        includeDetails: true,
        includeLogs: true,
        includeParameters: true
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSelectedReports = async () => {
    if (selectedReports.size === 0) {
      alert('Please select at least one report to export.');
      return;
    }

    try {
      setIsExporting(true);
      const reportsToExport = reports.filter(r => selectedReports.has(r.id));
      
      if (reportsToExport.length === 1) {
        await pdfExportService.exportExecutionReport(reportsToExport[0]);
      } else {
        await pdfExportService.exportMultipleReports(reportsToExport);
      }
      
      setSelectedReports(new Set());
    } catch (error) {
      console.error('Error exporting reports:', error);
      alert('Failed to export reports. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const selectAllReports = () => {
    if (selectedReports.size === filteredAndSortedReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredAndSortedReports.map(r => r.id)));
    }
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setSearchTerm('');
  };

  // Composant pour afficher les détails d'exécution
  const ExecutionDetailsPanel: React.FC<{ execution: ReportWithContext }> = ({ execution }) => (
    <div className="space-y-6">
      {/* Execution Info */}
      <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
          <InformationCircleIcon className="w-5 h-5 mr-2" />
          Execution Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
              Status
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon(execution.status)}
              <span className={`font-medium capitalize ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {translateStatus(execution.status)}
              </span>
            </div>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
              Duration
            </p>
            <p className={`text-sm font-medium mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {formatDuration(execution.startTime, execution.endTime)}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
              Started
            </p>
            <p className={`text-sm font-medium mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {toDate(execution.startTime).toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
              Project
            </p>
            <p className={`text-sm font-medium mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {execution.projectName}
            </p>
          </div>
        </div>

        {execution.projectId && execution.campaignId && execution.scenarioId && (
          <div className={`mt-4 pt-4 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <Button
              variant="primary"
              icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
              onClick={() => navigateToScenario(execution)}
            >
              Go to scenario
            </Button>
          </div>
        )}
      </div>

      {/* Attacks */}
      <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}`}>
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
                  <h4 className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {attackDisplayName}
                  </h4>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">
                    {toolDisplayName}
                  </span>
                </div>
                {attack.parameters && Object.keys(attack.parameters).length > 0 && (
                  <div className={`text-sm mb-3 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                    <p className="font-medium mb-1">Parameters:</p>
                    <pre className={`p-2 rounded text-xs overflow-x-auto ${
                      theme === 'light' 
                        ? 'bg-slate-100 text-slate-800' 
                        : 'bg-black/30 text-white'
                    }`}>
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(attack.parameters).filter(([key]) => 
                            key !== 'attackId' && key !== 'targetIndex'
                          )
                        ), 
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                )}
                <div className="flex items-center space-x-2 mb-3">
                  {getStatusIcon(attack.status)}
                  <span className={`text-sm font-medium capitalize ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {translateStatus(attack.status)}
                  </span>
                </div>
                
                {/* Attack-specific output */}
                {attack.output && attack.output.length > 0 && (
                  <div className="mt-3">
                    <p className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      Attack output:
                    </p>
                    <div className={`rounded-lg p-3 max-h-48 overflow-y-auto ${
                      theme === 'light' 
                        ? 'bg-slate-100' 
                        : 'bg-black/50'
                    }`}>
                      <div className="space-y-1 font-mono text-xs">
                        {attack.output.map((output, outputIdx) => (
                          <div key={outputIdx} className="flex items-start space-x-2">
                            <span className={`text-xs whitespace-nowrap ${
                              theme === 'light' ? 'text-slate-500' : 'text-white/50'
                            }`}>
                              {new Date(output.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`px-1 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                              output.type === 'error' ? 'bg-red-900 text-red-200' :
                              output.type === 'warning' ? 'bg-yellow-900 text-yellow-200' :
                              output.type === 'success' ? 'bg-green-900 text-green-200' :
                              'bg-blue-900 text-blue-200'
                            }`}>
                              {output.type.toUpperCase()}
                            </span>
                            <span className={`flex-1 ${
                              output.type === 'error' ? 'text-red-400' :
                              output.type === 'warning' ? 'text-yellow-400' :
                              output.type === 'success' ? 'text-green-400' :
                              theme === 'light' ? 'text-slate-700' : 'text-white'
                            }`}>
                              {output.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Targets */}
      <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}`}>
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
          <CpuChipIcon className="w-5 h-5 mr-2" />
          Targets ({execution.targets.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {execution.targets.map((target, idx) => (
            <div key={idx} className={`rounded-lg p-4 border ${
              theme === 'light' 
                ? 'bg-white border-slate-200' 
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <CpuChipIcon className="w-4 h-4 text-blue-400" />
                <span className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {target.name}
                </span>
              </div>
              <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                {target.host}{target.port ? `:${target.port}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Complete execution logs */}
      {execution.output && execution.output.length > 0 && (
        <div className={`rounded-lg p-6 ${theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <CommandLineIcon className="w-5 h-5 mr-2" />
            Execution logs ({execution.output.length} entries)
          </h3>
          <div className={`rounded-lg p-4 max-h-96 overflow-y-auto ${
            theme === 'light' 
              ? 'bg-slate-100' 
              : 'bg-black/50'
          }`}>
            <div className="space-y-1 font-mono text-sm">
              {execution.output.map((output, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <span className={`text-xs whitespace-nowrap ${
                    theme === 'light' ? 'text-slate-500' : 'text-white/50'
                  }`}>
                    {new Date(output.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    output.type === 'error' ? 'bg-red-900 text-red-200' :
                    output.type === 'warning' ? 'bg-yellow-900 text-yellow-200' :
                    output.type === 'success' ? 'bg-green-900 text-green-200' :
                    'bg-blue-900 text-blue-200'
                  }`}>
                    {output.type.toUpperCase()}
                  </span>
                  <span className={`flex-1 ${
                    output.type === 'error' ? 'text-red-400' :
                    output.type === 'warning' ? 'text-yellow-400' :
                    output.type === 'success' ? 'text-green-400' :
                    theme === 'light' ? 'text-slate-700' : 'text-white'
                  }`}>
                    {output.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <div className="loading-spinner w-6 h-6" />
          <span className={`text-lg ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
            Loading reports...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-shrink-0 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <DocumentTextIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="heading-1 mb-0">Execution Reports</h1>
              <p className="text-body">
                Complete history of your security tests ({reports.length} executions)
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            icon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={loadReports}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Filtres et recherche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-shrink-0 mb-6"
      >
        <Card>
          <CardBody className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Recherche */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  theme === 'light' ? 'text-slate-400' : 'text-white/40'
                }`} />
                <input
                  type="text"
                  placeholder="Search in reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {/* Filtres */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FunnelIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`} />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="input"
                  >
                    <option value="all">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <ArrowsUpDownIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`} />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="input"
                  >
                    <option value="date">Sort by date</option>
                    <option value="duration">Sort by duration</option>
                    <option value="attacks">Sort by attacks</option>
                    <option value="status">Sort by status</option>
                  </select>
                </div>

                {selectedReports.size > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                    onClick={exportSelectedReports}
                    loading={isExporting}
                  >
                    Export ({selectedReports.size})
                  </Button>
                )}

                {(filterStatus !== 'all' || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<XMarkIcon className="w-4 h-4" />}
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Sélection multiple */}
            {filteredAndSortedReports.length > 0 && (
              <div className={`mt-4 pt-4 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedReports.size === filteredAndSortedReports.length && filteredAndSortedReports.length > 0}
                      onChange={selectAllReports}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>
                      Select all ({filteredAndSortedReports.length})
                    </span>
                  </label>
                  
                  {selectedReports.size > 0 && (
                    <span className="text-sm text-blue-400">
                      {selectedReports.size} selected
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Liste des exécutions */}
        <div className={`${selectedReport ? 'w-1/3' : 'w-full'} border-r ${
          theme === 'light' ? 'border-slate-200' : 'border-white/10'
        } overflow-y-auto transition-all duration-300`}>
          <div className="p-4">
            {filteredAndSortedReports.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className={`w-12 h-12 mx-auto mb-4 ${
                  theme === 'light' ? 'text-slate-400' : 'text-white/40'
                }`} />
                <h3 className={`text-lg font-medium mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  No executions found
                </h3>
                <p className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search filters'
                    : 'No executions have been performed yet'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                      selectedReport?.id === report.id 
                        ? 'bg-blue-500/20 border-blue-500/50' 
                        : theme === 'light'
                          ? 'bg-white border-slate-200 hover:bg-slate-50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    {/* Contenu */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedReports.has(report.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleReportSelection(report.id);
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        {getStatusIcon(report.status)}
                        <div>
                          <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            {report.scenarioName}
                          </h3>
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>
                            {toDate(report.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <StatusBadge 
                        status={
                          report.status === 'completed' ? 'success' :
                          report.status === 'failed' ? 'error' :
                          report.status === 'running' ? 'info' : 'warning'
                        } 
                        size="sm"
                      >
                        {translateStatus(report.status)}
                      </StatusBadge>
                    </div>

                    {/* Informations du projet */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <FolderIcon className="w-3 h-3 mr-1" />
                        {report.projectName}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <BoltIcon className="w-3 h-3 mr-1" />
                        {report.campaignName}
                      </span>
                    </div>

                    {/* Pills d'attaques */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {report.attacks.slice(0, 3).map((attack, idx) => {
                        const attackDisplayName = getAttackDisplayNameFromParams(
                          attack.tool,
                          attack.parameters?.attackId,
                          attack.parameters
                        );
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              theme === 'light'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-white/10 text-white/80'
                            }`}
                          >
                            <BoltIcon className="w-3 h-3 mr-1" />
                            {attackDisplayName}
                          </span>
                        );
                      })}
                      {report.attacks.length > 3 && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          theme === 'light'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-white/10 text-white/80'
                        }`}>
                          +{report.attacks.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Statistiques */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={theme === 'light' ? 'text-slate-600' : 'text-white/60'}>
                        {report.attacks.length} attacks • {report.targets.length} targets
                      </span>
                      <span className={`font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {formatDuration(report.startTime, report.endTime)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div 
                      className="flex items-center space-x-2 mt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                        onClick={() => exportSingleReport(report)}
                        loading={isExporting}
                      >
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={() => deleteReport(report.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panneau d'analyse */}
        {selectedReport && (
          <div className="w-2/3 overflow-y-auto">
            <div className="p-6">
              {/* Onglets */}
              <div className={`flex space-x-1 mb-6 rounded-lg p-1 ${
                theme === 'light' ? 'bg-slate-100' : 'bg-white/5'
              }`}>
                {[
                  { id: 'details', label: 'Details', icon: InformationCircleIcon },
                  { id: 'ai-analysis', label: 'AI Analysis', icon: CpuChipIcon },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : theme === 'light'
                          ? 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Contenu des onglets */}
              {activeTab === 'details' && <ExecutionDetailsPanel execution={selectedReport} />}
              {activeTab === 'ai-analysis' && (
                <AIAnalysisPanel 
                  execution={selectedReport} 
                  scenario={{
                    _id: selectedReport.scenarioId || '',
                    name: selectedReport.scenarioName,
                    project: '', // Pas disponible dans ExecutionRecord
                    campaign: '', // Pas disponible dans ExecutionRecord
                    targets: selectedReport.targets,
                    attacks: selectedReport.attacks.map(attack => ({
                      tool: attack.tool,
                      parameters: attack.parameters || {}
                    })),
                    createdAt: selectedReport.startTime,
                    updatedAt: selectedReport.startTime
                  } as any}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 