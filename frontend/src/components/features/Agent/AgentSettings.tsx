import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../store/themeStore';
import { useAgentStore } from '../../../store/agentStore';
import { 
  CogIcon,
  CpuChipIcon,
  ClockIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface AgentConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  timeout: number;
  retryCount: number;
  priority: number;
  parameters: Record<string, any>;
}

const AgentSettings: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const { autoMode } = useAgentStore();
  
  const [globalSettings, setGlobalSettings] = useState({
    maxConcurrentAgents: 3,
    defaultTimeout: 300,
    enableDetailedLogs: true,
    autoApprovalMode: autoMode,
    notificationsEnabled: true,
    maxExecutionTime: 3600
  });

  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([
    {
      id: 'scanning-agent',
      name: 'Scan Agent',
      type: 'ScanningAgent',
      enabled: true,
      timeout: 600,
      retryCount: 3,
      priority: 1,
      parameters: {
        portRange: '1-1000',
        scanType: 'syn',
        timing: 'normal',
        osDetection: true
      }
    },
    {
      id: 'web-exploit-agent',
      name: 'Web Exploitation Agent',
      type: 'WebExploitAgent',
      enabled: true,
      timeout: 900,
      retryCount: 2,
      priority: 2,
      parameters: {
        testSQLi: true,
        testXSS: true,
        testCSRF: false,
        wordlistSize: 'medium'
      }
    },
    {
      id: 'privesc-agent',
      name: 'Privilege Escalation Agent',
      type: 'PrivEscAgent',
      enabled: false,
      timeout: 1200,
      retryCount: 1,
      priority: 3,
      parameters: {
        kernelExploits: true,
        serviceExploits: true,
        configMisconfigs: true,
        sudoMisconfigs: true
      }
    },
    {
      id: 'network-discovery-agent',
      name: 'Network Discovery Agent',
      type: 'NetworkDiscoveryAgent',
      enabled: true,
      timeout: 300,
      retryCount: 2,
      priority: 0,
      parameters: {
        pingSweep: true,
        arpScan: true,
        dnsEnum: false,
        threads: 50
      }
    }
  ]);

  const [isModified, setIsModified] = useState(false);

  const updateGlobalSetting = (key: string, value: any) => {
    setGlobalSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setIsModified(true);
    
    if (key === 'autoApprovalMode') {
      // setAutoMode(value); // This line was removed as per the edit hint
    }
  };

  const updateAgentConfig = (agentId: string, field: string, value: any) => {
    setAgentConfigs(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, [field]: value }
        : agent
    ));
    setIsModified(true);
  };

  const updateAgentParameter = (agentId: string, param: string, value: any) => {
    setAgentConfigs(prev => prev.map(agent => 
      agent.id === agentId 
        ? { 
            ...agent, 
            parameters: { ...agent.parameters, [param]: value }
          }
        : agent
    ));
    setIsModified(true);
  };

  const saveSettings = () => {
    // Here, we would save the settings to the server
    setIsModified(false);
    alert('Settings saved!');
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings?')) {
      setGlobalSettings({
        maxConcurrentAgents: 3,
        defaultTimeout: 300,
        enableDetailedLogs: true,
        autoApprovalMode: false,
        notificationsEnabled: true,
        maxExecutionTime: 3600
      });
      // setAutoMode(false); // This line was removed as per the edit hint
      setIsModified(true);
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'ScanningAgent':
        return <CpuChipIcon className="w-5 h-5 text-blue-500" />;
      case 'WebExploitAgent':
        return <BoltIcon className="w-5 h-5 text-orange-500" />;
      case 'PrivEscAgent':
        return <ShieldCheckIcon className="w-5 h-5 text-red-500" />;
      case 'NetworkDiscoveryAgent':
        return <ClockIcon className="w-5 h-5 text-green-500" />;
      default:
        return <CpuChipIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                Agent Settings
              </h1>
              <p className={`text-sm ${
                theme === 'light' ? 'text-slate-600' : 'text-gray-400'
              }`}>
                Global configuration and automated agent parameters
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={resetToDefaults}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Reset to Defaults
            </button>
            
            <button
              onClick={saveSettings}
              disabled={!isModified}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isModified
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : theme === 'light'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>
          Global Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'light' ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Max Concurrent Agents
              </label>
              <input
                type="number"
                value={globalSettings.maxConcurrentAgents}
                onChange={(e) => updateGlobalSetting('maxConcurrentAgents', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900'
                    : 'border-gray-600 bg-slate-700 text-white'
                }`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'light' ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Default Timeout (seconds)
              </label>
              <input
                type="number"
                value={globalSettings.defaultTimeout}
                onChange={(e) => updateGlobalSetting('defaultTimeout', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900'
                    : 'border-gray-600 bg-slate-700 text-white'
                }`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'light' ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Max Execution Time (seconds)
              </label>
              <input
                type="number"
                value={globalSettings.maxExecutionTime}
                onChange={(e) => updateGlobalSetting('maxExecutionTime', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900'
                    : 'border-gray-600 bg-slate-700 text-white'
                }`}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${
                theme === 'light' ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Enable Detailed Logs
              </label>
              <input
                type="checkbox"
                checked={globalSettings.enableDetailedLogs}
                onChange={(e) => updateGlobalSetting('enableDetailedLogs', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${
                theme === 'light' ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Auto Approval Mode
              </label>
              <input
                type="checkbox"
                checked={globalSettings.autoApprovalMode}
                onChange={(e) => updateGlobalSetting('autoApprovalMode', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${
                theme === 'light' ? 'text-slate-700' : 'text-gray-300'
              }`}>
                Enable Notifications
              </label>
              <input
                type="checkbox"
                checked={globalSettings.notificationsEnabled}
                onChange={(e) => updateGlobalSetting('notificationsEnabled', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Configuration */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>
          Agent Configuration
        </h2>
        
        <div className="space-y-6">
          {agentConfigs.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAgentIcon(agent.type)}
                  <div>
                    <h3 className={`font-semibold ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                      {agent.name}
                    </h3>
                    <p className={`text-sm ${
                      theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      {agent.type}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className={`text-sm ${
                      theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      Enabled
                    </label>
                    <input
                      type="checkbox"
                      checked={agent.enabled}
                      onChange={(e) => updateAgentConfig(agent.id, 'enabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className={`text-sm ${
                      theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                      Priority
                    </label>
                    <input
                      type="number"
                      value={agent.priority}
                      onChange={(e) => updateAgentConfig(agent.id, 'priority', parseInt(e.target.value))}
                      className={`w-16 px-2 py-1 text-sm border rounded ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900'
                          : 'border-gray-600 bg-slate-700 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={agent.timeout}
                    onChange={(e) => updateAgentConfig(agent.id, 'timeout', parseInt(e.target.value))}
                    className={`w-full px-2 py-1 text-sm border rounded ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-gray-600 bg-slate-700 text-white'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    Retry Count
                  </label>
                  <input
                    type="number"
                    value={agent.retryCount}
                    onChange={(e) => updateAgentConfig(agent.id, 'retryCount', parseInt(e.target.value))}
                    className={`w-full px-2 py-1 text-sm border rounded ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-gray-600 bg-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>
              
              {/* Agent-specific parameters */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <h4 className={`text-sm font-medium mb-3 ${
                  theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                }`}>
                  Agent Parameters
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(agent.parameters).map(([key, value]) => (
                    <div key={key}>
                      <label className={`block text-xs font-medium mb-1 ${
                        theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                      }`}>
                        {key}
                      </label>
                      {typeof value === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updateAgentParameter(agent.id, key, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <input
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) => updateAgentParameter(agent.id, key, typeof value === 'number' ? parseInt(e.target.value) : e.target.value)}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            theme === 'light'
                              ? 'border-slate-300 bg-white text-slate-900'
                              : 'border-gray-600 bg-slate-700 text-white'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentSettings; 