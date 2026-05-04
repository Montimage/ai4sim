import React, { useState } from 'react';
import { useThemeStore } from '../../../store/themeStore';

import { useConversations } from './hooks/useConversations';
import { usePentestSessions } from './hooks/usePentestSessions';

import { ChatView, PipelineView, ConversationSidebar, CombinedView } from './components';

import { ViewType } from './types';

const AgentView: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  
  // State for views - ajout de 'combined'
  const [currentView, setCurrentView] = useState<ViewType | 'combined'>('combined');
  const [showConversationSidebar, setShowConversationSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Hooks for data management
  const conversationHooks = useConversations();
  const {
    currentConversationId,
    setCurrentConversationId
  } = conversationHooks;

  const sessionHooks = usePentestSessions(conversationHooks.conversations, currentConversationId, conversationHooks.getCurrentConversation, conversationHooks.addMessageToConversation);
  const { currentSession } = sessionHooks;

  const handleConversationSelect = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleSwitchToPipeline = () => {
    setCurrentView('pipeline');
  };

  const handleToggleSidebar = () => {
    setShowConversationSidebar(!showConversationSidebar);
  };

  const handleShowSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header - Mise à jour pour inclure la vue combinée */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Sidebar toggle and navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleToggleSidebar}
              className={`p-2 rounded-lg transition-colors ${
                showConversationSidebar 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={showConversationSidebar ? 'Masquer la sidebar' : 'Afficher la sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* View Navigation */}
            <nav className="flex space-x-1">
              <button
                onClick={() => setCurrentView('combined')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === 'combined'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span>Vue Combinée</span>
                  {currentSession && currentSession.status === 'running' && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setCurrentView('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === 'chat'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Chat</span>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('pipeline')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === 'pipeline'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span>Pipeline</span>
                  {currentSession && (
                    <span className={`w-2 h-2 rounded-full ${
                      currentSession.status === 'running' ? 'bg-green-500 animate-pulse' :
                      currentSession.status === 'completed' ? 'bg-blue-500' :
                      currentSession.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Right: Title and Settings */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                MMT-Pentester Agent
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your AI Assistant for Pentesting
              </p>
            </div>
            
            <button
              onClick={handleShowSettings}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Paramètres"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation Sidebar */}
        {showConversationSidebar && (
          <ConversationSidebar 
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            isVisible={showConversationSidebar}
          />
        )}

        {/* Main View Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'combined' && (
            <CombinedView 
              currentConversationId={currentConversationId}
              conversationHooks={conversationHooks}
              sessionHooks={sessionHooks}
            />
          )}

          {currentView === 'chat' && (
            <ChatView 
              currentConversationId={currentConversationId}
              onSwitchToPipeline={handleSwitchToPipeline}
            />
          )}

          {currentView === 'pipeline' && (
            <PipelineView 
              currentConversationId={currentConversationId}
            />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Paramètres
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Thème
                </label>
                <select 
                  value={theme}
                  onChange={(e) => useThemeStore.getState().setTheme(e.target.value as 'light' | 'dark')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentView;
