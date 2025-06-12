import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAISettingsStore, AIProvider, OllamaModel } from '../../store/aiSettingsStore';
import { useAttackStore } from '../../store/attackStore';
import { securitySettingsService } from '../../services/securitySettingsService';
import { authService } from '../../services/api';
import { Card } from '../shared/UI/Card';
import { Button } from '../shared/UI/Button';
import { 
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  BellIcon,
  UserIcon,
  KeyIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  CheckIcon,
  CpuChipIcon, 
  CloudIcon, 
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon, 
  XCircleIcon,
  FolderIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ArrowRightOnRectangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const SettingsView: React.FC = () => {
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { savedConfigs, deleteConfig, loadConfig } = useAttackStore();
  
  // Determine initial tab from URL params
  const urlParams = new URLSearchParams(location.search);
  const initialTab = urlParams.get('tab') || 'general';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // AI Settings
  const {
    settings: aiSettings,
    updateProvider,
    updateOpenRouterSettings,
    updateOllamaSettings,
    addOllamaModel,
    testConnection,
    fetchOllamaModels
  } = useAISettingsStore();

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState(securitySettingsService.getSettings());
  
  // User settings state
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    timezone: 'UTC'
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // AI Settings state
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelDisplayName, setNewModelDisplayName] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<{
      openrouter: 'idle' | 'testing' | 'success' | 'error';
      ollama: 'idle' | 'testing' | 'success' | 'error';
    }>({
      openrouter: 'idle',
      ollama: 'idle'
    });

  // Safe access to AI settings with fallbacks
  const safeAISettings = {
    provider: aiSettings?.provider || 'ollama',
    openrouter: aiSettings?.openrouter || {
      apiKey: '',
      model: 'meta-llama/llama-4-maverick:free',
      baseUrl: 'https://openrouter.ai/api/v1'
    },
    ollama: aiSettings?.ollama || {
      baseUrl: 'http://localhost:11434',
      selectedModel: 'llama3.2:latest',
      availableModels: []
    }
  };

  const safeOllamaModels = Array.isArray(safeAISettings.ollama?.availableModels)
    ? safeAISettings.ollama.availableModels
    : [];

  useEffect(() => {
    // Load user settings from localStorage or API
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setUserSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    // Handle system theme by setting to light or dark based on system preference
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    } else {
      setTheme(newTheme);
    }
    
    addNotification({
      title: 'Theme Updated',
      message: `Theme changed to ${newTheme}`,
      type: 'success',
      category: 'system'
    });
  };

  const handleSecuritySettingChange = (setting: keyof typeof securitySettings, value: boolean) => {
    const newSettings = { ...securitySettings, [setting]: value };
    setSecuritySettings(newSettings);
    securitySettingsService.updateSetting(setting, value);
    
    addNotification({
      title: 'Security Settings Updated',
      message: `${setting} has been ${value ? 'enabled' : 'disabled'}`,
      type: 'success',
      category: 'security'
    });
  };

  const handleUserSettingChange = (setting: keyof typeof userSettings, value: any) => {
    const newSettings = { ...userSettings, [setting]: value };
    setUserSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    
    addNotification({
      title: 'Settings Updated',
      message: `${setting} has been updated`,
      type: 'success',
      category: 'system'
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification({
        title: 'Password Error',
        message: 'New passwords do not match',
        type: 'error',
        category: 'system'
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      addNotification({
        title: 'Password Error',
        message: 'New password must be at least 8 characters long',
        type: 'error',
        category: 'system'
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      addNotification({
        title: 'Password Updated',
        message: 'Your password has been successfully changed',
        type: 'success',
        category: 'security'
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      addNotification({
        title: 'Password Error',
        message: errorMessage,
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    addNotification({
      title: 'Logged Out',
      message: 'You have been successfully logged out',
      type: 'info',
      category: 'system'
    });
  };

  const handleTestConnection = async (provider: AIProvider) => {
    setConnectionStatus(prev => ({ ...prev, [provider]: 'testing' }));
    
    try {
      const isConnected = await testConnection(provider);
      setConnectionStatus(prev => ({ 
        ...prev, 
        [provider]: isConnected ? 'success' : 'error' 
      }));
      
      setTimeout(() => {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'idle' }));
      }, 3000);
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      setTimeout(() => {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'idle' }));
      }, 3000);
    }
  };

  const handleFetchOllamaModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await fetchOllamaModels();
      models.forEach(model => {
        if (!safeOllamaModels.find(m => m.name === model.name)) {
          addOllamaModel(model);
        }
      });
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleAddCustomModel = () => {
    if (newModelName.trim()) {
      const model: OllamaModel = {
        name: newModelName.trim(),
        displayName: newModelDisplayName.trim() || newModelName.trim(),
        description: 'Custom model'
      };
      addOllamaModel(model);
      setNewModelName('');
      setNewModelDisplayName('');
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container-padding space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your application preferences and configurations
          </p>
        </div>
        
        <Button
          variant="secondary"
          onClick={handleLogout}
          icon={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
        >
          Logout
        </Button>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Cog6ToothIcon },
            { id: 'ai', label: 'AI Settings', icon: CpuChipIcon },
            { id: 'configurations', label: 'Configurations', icon: FolderIcon },
            { id: 'account', label: 'Account', icon: UserIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Theme Settings */}
            <Card className="space-y-6">
              <div className="flex items-center space-x-3">
                <SunIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Theme</h2>
              </div>
              
              <div className="space-y-3">
                {[
                  { value: 'light', label: 'Light', icon: SunIcon },
                  { value: 'dark', label: 'Dark', icon: MoonIcon },
                  { value: 'system', label: 'System', icon: ComputerDesktopIcon }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value as any)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                      theme === option.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <option.icon className={`w-5 h-5 ${
                      theme === option.value ? 'text-primary-600' : 'text-gray-500'
                    }`} />
                    <span className={`font-medium ${
                      theme === option.value ? 'text-primary-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.label}
                    </span>
                    {theme === option.value && (
                      <CheckIcon className="w-5 h-5 text-primary-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* Notifications */}
            <Card className="space-y-6">
              <div className="flex items-center space-x-3">
                <BellIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications in the app</p>
                  </div>
                  <button
                    onClick={() => handleUserSettingChange('notifications', !userSettings.notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      userSettings.notifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        userSettings.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Wazuh Integration</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable Wazuh security monitoring</p>
                  </div>
                  <button
                    onClick={() => handleSecuritySettingChange('wazuhEnabled', !securitySettings.wazuhEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.wazuhEnabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securitySettings.wazuhEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>

            {/* Region */}
            <Card className="space-y-6">
              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Region</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={userSettings.timezone}
                    onChange={(e) => handleUserSettingChange('timezone', e.target.value)}
                    className="input-field"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* AI Provider Selection */}
            <Card className="space-y-6">
              <div className="flex items-center space-x-3">
                <CpuChipIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Provider</h2>
              </div>
          
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
              onClick={() => updateProvider('ollama')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    safeAISettings.provider === 'ollama'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-3">
                    <CpuChipIcon className={`w-8 h-8 ${
                      safeAISettings.provider === 'ollama' ? 'text-primary-600' : 'text-gray-500'
                }`} />
                    <div className="text-left">
                      <h3 className={`font-semibold ${
                        safeAISettings.provider === 'ollama' ? 'text-primary-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    Ollama (Local)
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Run AI models locally on your machine
                </p>
              </div>
                    {safeAISettings.provider === 'ollama' && (
                      <CheckIcon className="w-6 h-6 text-primary-600 ml-auto" />
                    )}
            </div>
                </button>
          
                <button
              onClick={() => updateProvider('openrouter')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    safeAISettings.provider === 'openrouter'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-3">
                    <CloudIcon className={`w-8 h-8 ${
                      safeAISettings.provider === 'openrouter' ? 'text-primary-600' : 'text-gray-500'
                }`} />
                    <div className="text-left">
                      <h3 className={`font-semibold ${
                        safeAISettings.provider === 'openrouter' ? 'text-primary-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    OpenRouter (Cloud)
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Access multiple AI models via API
                </p>
              </div>
                    {safeAISettings.provider === 'openrouter' && (
                      <CheckIcon className="w-6 h-6 text-primary-600 ml-auto" />
                    )}
            </div>
                </button>
          </div>
            </Card>

            {/* Provider-specific settings */}
            {safeAISettings.provider === 'ollama' && (
              <Card className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CpuChipIcon className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ollama Configuration</h2>
                  </div>
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon(connectionStatus.ollama)}
                    <Button
                      variant="secondary"
                      size="sm"
                onClick={() => handleTestConnection('ollama')}
                      disabled={connectionStatus.ollama === 'testing'}
              >
                      Test Connection
                    </Button>
            </div>
          </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base URL
              </label>
              <input
                type="text"
                      value={safeAISettings.ollama.baseUrl}
                onChange={(e) => updateOllamaSettings({ baseUrl: e.target.value })}
                      className="input-field"
                placeholder="http://localhost:11434"
              />
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Selected Model
                </label>
                    <div className="flex space-x-2">
              <select
                        value={safeAISettings.ollama.selectedModel}
                onChange={(e) => updateOllamaSettings({ selectedModel: e.target.value })}
                        className="input-field flex-1"
                      >
                        {safeOllamaModels.length === 0 ? (
                          <option value="">No models available</option>
                        ) : (
                          safeOllamaModels.map((model) => (
                  <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                  </option>
                          ))
                        )}
              </select>
                      <Button
                        variant="secondary"
                        onClick={handleFetchOllamaModels}
                        disabled={isLoadingModels}
                        icon={<ArrowPathIcon className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} />}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
            </div>

                {/* Add Custom Model */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Custom Model</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Model Name
                      </label>
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                        className="input-field"
                        placeholder="llama3.2:latest"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Name
                      </label>
                  <input
                    type="text"
                    value={newModelDisplayName}
                    onChange={(e) => setNewModelDisplayName(e.target.value)}
                        className="input-field"
                        placeholder="Llama 3.2 Latest"
                  />
                </div>
                  </div>
                  <div className="mt-4">
                    <Button
                    onClick={handleAddCustomModel}
                      disabled={!newModelName}
                      icon={<PlusIcon className="w-4 h-4" />}
                  >
                      Add Model
                    </Button>
                </div>
              </div>
              </Card>
            )}

            {safeAISettings.provider === 'openrouter' && (
              <Card className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CloudIcon className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">OpenRouter Configuration</h2>
                  </div>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon(connectionStatus.openrouter)}
                    <Button
                      variant="secondary"
                      size="sm"
                  onClick={() => handleTestConnection('openrouter')}
                      disabled={connectionStatus.openrouter === 'testing'}
          >
                      Test Connection
                    </Button>
                </div>
              </div>
              
                <div className="grid grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                        value={safeAISettings.openrouter.apiKey}
                    onChange={(e) => updateOpenRouterSettings({ apiKey: e.target.value })}
                        className="input-field pr-10"
                    placeholder="sk-or-..."
                  />
                <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKey ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                </button>
              </div>
            </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <select
                      value={safeAISettings.openrouter.model}
                  onChange={(e) => updateOpenRouterSettings({ model: e.target.value })}
                      className="input-field"
                >
                  <option value="meta-llama/llama-4-maverick:free">Llama 4 Maverick (Free)</option>
                  <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
                  <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B (Free)</option>
                  <option value="microsoft/wizardlm-2-8x22b">WizardLM 2 8x22B</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                </select>
                  </div>

              <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base URL
                </label>
                <input
                  type="text"
                      value={safeAISettings.openrouter.baseUrl}
                  onChange={(e) => updateOpenRouterSettings({ baseUrl: e.target.value })}
                      className="input-field"
                  placeholder="https://openrouter.ai/api/v1"
                />
                </div>
              </div>
              </Card>
        )}
      </div>
        )}

        {activeTab === 'configurations' && (
      <div className="space-y-6">
            <Card className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FolderIcon className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Saved Configurations</h2>
        </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {savedConfigs.length} configurations
                </span>
          </div>

              {savedConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No saved configurations
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Save attack configurations from the Attacks tab to manage them here
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.location.href = '/attacks'}
                    icon={<BoltIcon className="w-4 h-4" />}
                  >
                    Go to Attacks
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedConfigs.map((config, index) => (
                    <div
                      key={config.exportDate}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {config.name || `Configuration ${index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Created: {new Date(config.exportDate).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {config.tabs?.length || 0} tabs • {config.version || 'v1.0'}
                          </p>
              </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              loadConfig(config);
                              addNotification({
                                title: 'Configuration Loaded',
                                message: `Configuration "${config.name}" has been loaded`,
                                type: 'success',
                                category: 'system'
                              });
                            }}
                            icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                          >
                            Load
                          </Button>
                          <Button
                            variant="error"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this configuration?')) {
                                deleteConfig(config.exportDate);
                                addNotification({
                                  title: 'Configuration Deleted',
                                  message: `Configuration "${config.name}" has been deleted`,
                                  type: 'success',
                                  category: 'system'
                                });
                              }
                            }}
                            icon={<TrashIcon className="w-4 h-4" />}
                          >
                            Delete
                          </Button>
            </div>
          </div>
            </div>
                  ))}
            </div>
              )}
            </Card>
                </div>
              )}

        {activeTab === 'account' && (
      <div className="space-y-6">
            {/* User Profile */}
            <Card className="space-y-6">
              <div className="flex items-center space-x-3">
                <UserIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Profile</h2>
          </div>

              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
              </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {user?.username || 'User'}
          </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role || 'admin'}
                  </p>
            </div>
          </div>
            </Card>

            {/* Password Change */}
            <Card className="space-y-6">
              <div className="flex items-center space-x-3">
                <KeyIcon className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h2>
        </div>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="input-field"
                      required
                    />
        </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="input-field"
                      required
                      minLength={8}
                    />
              </div>
                  
                      <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="input-field"
                      required
                      minLength={8}
                    />
        </div>
          </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={isChangingPassword}
                    disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    Update Password
                  </Button>
          </div>
              </form>
            </Card>
        </div>
        )}
      </motion.div>
    </div>
  );
};

export default SettingsView;
