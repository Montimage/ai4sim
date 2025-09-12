import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../../store/themeStore';
import { useAgentStore } from '../../../store/agentStore';
import { 
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const AgentLogs: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const {
    currentSession,
    clearMessages
  } = useAgentStore();

  // Mock logs data pour la démo
  const mockLogs = [
    {
      id: 'log-1',
      timestamp: new Date('2024-01-16T14:30:00Z'),
      level: 'info',
      agent: 'NetworkDiscoveryAgent',
      message: 'Initialisation du scan réseau sur 10.0.0.0/24',
      details: 'Paramètres: timeout=5s, threads=50'
    },
    {
      id: 'log-2',
      timestamp: new Date('2024-01-16T14:30:15Z'),
      level: 'success',
      agent: 'NetworkDiscoveryAgent',
      message: 'Découverte de 4 hôtes actifs',
      details: 'Hôtes trouvés: 10.0.0.1, 10.0.0.10, 10.0.0.25, 10.0.0.100'
    },
    {
      id: 'log-3',
      timestamp: new Date('2024-01-16T14:30:30Z'),
      level: 'info',
      agent: 'ScanningAgent',
      message: 'Démarrage du scan de ports sur 10.0.0.1',
      details: 'Range de ports: 1-1000, Type: TCP SYN'
    },
    {
      id: 'log-4',
      timestamp: new Date('2024-01-16T14:30:45Z'),
      level: 'warning',
      agent: 'ScanningAgent',
      message: 'Détection possible de détection IDS',
      details: 'Réponses anormales détectées, ralentissement du scan'
    },
    {
      id: 'log-5',
      timestamp: new Date('2024-01-16T14:31:00Z'),
      level: 'success',
      agent: 'ScanningAgent',
      message: 'Scan terminé sur 10.0.0.1',
      details: 'Ports ouverts: 22 (SSH), 80 (HTTP), 443 (HTTPS)'
    },
    {
      id: 'log-6',
      timestamp: new Date('2024-01-16T14:31:15Z'),
      level: 'info',
      agent: 'WebExploitAgent',
      message: 'Analyse des services web détectés',
      details: 'Test de vulnérabilités communes: SQLi, XSS, CSRF'
    },
    {
      id: 'log-7',
      timestamp: new Date('2024-01-16T14:31:30Z'),
      level: 'error',
      agent: 'WebExploitAgent',
      message: 'Échec de connexion au service HTTP',
      details: 'Timeout après 10 secondes, service potentiellement filtré'
    },
    {
      id: 'log-8',
      timestamp: new Date('2024-01-16T14:31:45Z'),
      level: 'success',
      agent: 'WebExploitAgent',
      message: 'Vulnérabilité SQL Injection détectée',
      details: 'Parameter: login, Payload: \' OR 1=1--'
    }
  ];

  const scrollToBottom = () => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [mockLogs]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'success':
        return theme === 'light' ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-800';
      case 'warning':
        return theme === 'light' ? 'bg-yellow-50 border-yellow-200' : 'bg-yellow-900/20 border-yellow-800';
      case 'error':
        return theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-800';
      default:
        return theme === 'light' ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-800';
    }
  };

  const filteredLogs = mockLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const exportLogs = () => {
    const logsText = filteredLogs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.agent}] ${log.message}\n  Details: ${log.details}`
    ).join('\n\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer tous les logs ?')) {
      clearMessages();
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              Journaux d'Exécution
            </h2>
            <p className={`text-sm ${
              theme === 'light' ? 'text-slate-600' : 'text-gray-400'
            }`}>
              {currentSession ? `Session: ${currentSession.id}` : 'Aucune session active'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportLogs}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Exporter
            </button>
            
            <button
              onClick={handleClearLogs}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Effacer
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:border-primary-500 focus:ring-primary-500'
                  : 'border-gray-600 bg-slate-700 text-white placeholder-gray-400 focus:border-primary-400 focus:ring-primary-400'
              } focus:ring-2 focus:ring-opacity-50`}
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-slate-300 bg-white text-slate-900 focus:border-primary-500 focus:ring-primary-500'
                  : 'border-gray-600 bg-slate-700 text-white focus:border-primary-400 focus:ring-primary-400'
              } focus:ring-2 focus:ring-opacity-50`}
            >
              <option value="all">Tous</option>
              <option value="info">Info</option>
              <option value="success">Succès</option>
              <option value="warning">Avertissement</option>
              <option value="error">Erreur</option>
            </select>
          </div>

          {/* Auto Scroll */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className={`text-sm ${
              theme === 'light' ? 'text-slate-600' : 'text-gray-400'
            }`}>
              Auto-scroll
            </span>
          </label>
        </div>
      </div>

      {/* Logs Container */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-2 rounded-lg border ${
        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-gray-700'
      }`}>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <InformationCircleIcon className={`w-12 h-12 mx-auto mb-4 ${
              theme === 'light' ? 'text-slate-400' : 'text-gray-500'
            }`} />
            <h3 className={`text-lg font-semibold mb-2 ${
              theme === 'light' ? 'text-slate-700' : 'text-gray-300'
            }`}>
              Aucun log trouvé
            </h3>
            <p className={`text-sm ${
              theme === 'light' ? 'text-slate-500' : 'text-gray-400'
            }`}>
              {searchTerm || filter !== 'all' 
                ? 'Aucun log ne correspond aux critères de recherche'
                : 'Les logs d\'exécution apparaîtront ici'
              }
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border ${getLogBgColor(log.level)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-mono ${
                        theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                      }`}>
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.level === 'success' ? 'bg-green-200 text-green-800' :
                        log.level === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        log.level === 'error' ? 'bg-red-200 text-red-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        theme === 'light' 
                          ? 'bg-slate-200 text-slate-700' 
                          : 'bg-slate-600 text-slate-200'
                      }`}>
                        {log.agent}
                      </span>
                    </div>
                    
                    <p className={`text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                      {log.message}
                    </p>
                    
                    {log.details && (
                      <p className={`text-xs font-mono ${
                        theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                      }`}>
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className={`p-3 rounded-lg border text-center ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <p className={`text-xs ${
          theme === 'light' ? 'text-slate-500' : 'text-gray-400'
        }`}>
          {filteredLogs.length} log(s) affiché(s) sur {mockLogs.length} total
          {searchTerm && ` • Recherche: "${searchTerm}"`}
          {filter !== 'all' && ` • Filtre: ${filter}`}
        </p>
      </div>
    </div>
  );
};

export default AgentLogs; 