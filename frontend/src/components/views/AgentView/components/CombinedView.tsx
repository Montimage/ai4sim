import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon,
  CpuChipIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  CommandLineIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  BoltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

import { useChat } from '../hooks/useChat';
import { usePipeline } from '../hooks/usePipeline';

import { ChatMessage as ChatMessageType, ExecutionStep } from '../types';
import { extractTarget } from '../utils/targetUtils';

interface CombinedViewProps {
  currentConversationId: string | null;
  conversationHooks: any;
  sessionHooks: any;
}

const CombinedView: React.FC<CombinedViewProps> = ({ 
  currentConversationId, 
  conversationHooks, 
  sessionHooks
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pipelineEndRef = useRef<HTMLDivElement>(null);
  const [chatWidth, setChatWidth] = useState(55);
  const [isResizing, setIsResizing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Utilise les hooks passés depuis le parent
  const { getCurrentConversation, addMessageToConversation } = conversationHooks;
  const { currentSession } = sessionHooks;
  const currentConversation = getCurrentConversation(currentConversationId);
  
  const { generateReport, exportSessionData: exportData } = usePipeline(
    sessionHooks, 
    addMessageToConversation
  );

  const {
    newMessage,
    setNewMessage,
    sendMessage,
    startPentestPipeline,
    shouldShowPentestButton
  } = useChat(conversationHooks, sessionHooks);

  // Auto-scroll pour les messages
  const scrollToBottom = useCallback(() => {
    if (autoSync) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoSync]);

  // Auto-scroll pour le pipeline
  const scrollPipelineToBottom = useCallback(() => {
    if (autoSync && currentSession?.status === 'running') {
      pipelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoSync, currentSession?.status]);

  useEffect(() => {
    if (currentConversation?.messages.length) {
      scrollToBottom();
    }
  }, [currentConversation?.messages.length, scrollToBottom]);

  useEffect(() => {
    if (currentSession?.steps.length) {
      scrollPipelineToBottom();
    }
  }, [currentSession?.steps.length, scrollPipelineToBottom]);

  // Handle message sending
  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      await sendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartPentest = async (message: ChatMessageType) => {
    const target = extractTarget(message.content);
    if (target) {
      await startPentestPipeline(message.content);
    }
  };

  // Format message content avec meilleure gestion du code
  const formatMessageContent = (content: string) => {
    const codeBlockRegex = /```([\\s\\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    let formatted = content
      .replace(codeBlockRegex, '<pre class="bg-gray-900 dark:bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto text-sm border border-gray-700"><code>$1</code></pre>')
      .replace(inlineCodeRegex, '<code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    formatted = formatted.replace(/\\n/g, '<br>');
    return formatted;
  };

  const getMessageIcon = (message: ChatMessageType) => {
    if (message.isAgent) {
      if (message.type === 'error') return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      if (message.type === 'success') return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      if (message.type === 'info') return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
      return <CpuChipIcon className="w-4 h-4 text-purple-500" />;
    }
    return <UserIcon className="w-4 h-4 text-blue-600" />;
  };

  // Pipeline helper functions
  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'running':
        return <PlayIcon className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800';
      case 'running':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 animate-pulse';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  // Handle resizing avec amélioration
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = document.getElementById('combined-container');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      
      // Limiter entre 25% et 75%
      if (newWidth >= 25 && newWidth <= 75) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <CpuChipIcon className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Vue Combinée AI4SIM
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sélectionnez une conversation pour voir le chat et le pipeline simultanément
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <EyeIcon className="w-4 h-4" />
              <span>Chat en temps réel</span>
              <span>•</span>
              <CommandLineIcon className="w-4 h-4" />
              <span>Pipeline de test</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div id="combined-container" className="flex-1 flex overflow-hidden relative">
      {/* Chat Section */}
      <div 
        className="flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-200"
        style={{ width: `${chatWidth}%` }}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CpuChipIcon className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-semibold text-white">Assistant IA</h2>
                <p className="text-blue-100 text-sm">
                  {currentConversation.title}
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`p-2 rounded-lg transition-colors ${
                  autoSync ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                }`}
                title={autoSync ? 'Désactiver auto-scroll' : 'Activer auto-scroll'}
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {currentConversation.messages.map((message: ChatMessageType) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.isAgent ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[85%] ${message.isAgent ? 'order-1' : 'order-2'}`}>
                  <div
                    className={`p-3 rounded-lg shadow-sm transition-all duration-200 ${
                      message.isAgent
                        ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getMessageIcon(message)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: formatMessageContent(message.content)
                          }}
                        />
                        <div className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pentest Button */}
                  {shouldShowPentestButton(message) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 flex justify-end"
                    >
                      <button
                        onClick={() => handleStartPentest(message)}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-xs px-3 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <BoltIcon className="w-3 h-3" />
                        <span>Lancer Pentest</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Loading indicator */}
          {currentConversation.isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <CpuChipIcon className="w-5 h-5 text-purple-500 animate-pulse" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">L'IA réfléchit...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                disabled={currentConversation.isLoading}
                rows={newMessage.includes('\n') ? 3 : 1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || currentConversation.isLoading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={`w-2 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-all duration-200 relative group ${
          isResizing ? 'bg-blue-500' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="h-full flex items-center justify-center">
          <div className="w-1 h-12 bg-gray-400 dark:bg-gray-500 group-hover:bg-white transition-colors rounded-full"></div>
        </div>
        {/* Resize Indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowsRightLeftIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Pipeline Section */}
      <div 
        className="flex flex-col bg-gray-50 dark:bg-gray-900 transition-all duration-200"
        style={{ width: `${100 - chatWidth}%` }}
      >
        {/* Pipeline Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CommandLineIcon className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-semibold text-white">Pipeline Pentest</h2>
                {currentSession && (
                  <p className="text-green-100 text-sm font-mono">
                    {currentSession.target}
                  </p>
                )}
              </div>
            </div>
            
            {/* Status and Controls */}
            <div className="flex items-center space-x-3">
              {currentSession && (
                <>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    currentSession.status === 'running' ? 'bg-green-100 text-green-800 animate-pulse' :
                    currentSession.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    currentSession.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {currentSession.status === 'running' ? 'En cours' :
                     currentSession.status === 'completed' ? 'Terminé' :
                     currentSession.status === 'failed' ? 'Échoué' : 'En pause'}
                  </span>
                  
                  <button
                    onClick={() => setCompactMode(!compactMode)}
                    className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                    title={compactMode ? 'Vue détaillée' : 'Vue compacte'}
                  >
                    <ChartBarIcon className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!currentSession ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <CommandLineIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Prêt pour le pentest
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Décrivez une cible dans le chat pour démarrer une session de test
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <BoltIcon className="w-3 h-3" />
                    <span>Tests automatisés</span>
                    <span>•</span>
                    <ChartBarIcon className="w-3 h-3" />
                    <span>Rapports détaillés</span>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress Summary */}
              {currentSession.summary && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-3 gap-3 mb-6"
                >
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-green-600">{currentSession.summary.successful}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Réussis</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-red-600">{currentSession.summary.failed}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Échoués</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentSession.summary.totalTools || currentSession.steps.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                  </div>
                </motion.div>
              )}

              {/* Execution Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Étapes d'exécution
                  </h3>
                  {currentSession.status === 'running' && (
                    <div className="flex items-center space-x-2 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>En cours d'exécution</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {currentSession.steps.map((step: ExecutionStep, index: number) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border rounded-lg transition-all duration-200 ${getStatusColor(step.status)} ${
                        compactMode ? 'p-2' : 'p-3'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {getStatusIcon(step.status)}
                          <div className="min-w-0 flex-1">
                            <h4 className={`font-semibold text-gray-900 dark:text-white truncate ${
                              compactMode ? 'text-xs' : 'text-sm'
                            }`}>
                              {step.tool}
                            </h4>
                            {!compactMode && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {step.progress !== undefined && (
                          <div className="ml-3">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${step.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
                              {step.progress}%
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Output/Error Display */}
                      {step.output && !compactMode && (
                        <div className="mt-3 p-2 bg-gray-900 dark:bg-gray-950 rounded text-xs text-green-400 font-mono overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{step.output}</pre>
                        </div>
                      )}
                      
                      {step.error && !compactMode && (
                        <div className="mt-3 p-2 bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                          {step.error}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Export Controls */}
              {currentSession.status === 'completed' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex space-x-3"
                >
                  <button
                    onClick={() => generateReport()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Générer rapport</span>
                  </button>
                  
                  <button
                    onClick={() => exportData()}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span>Exporter données</span>
                  </button>
                </motion.div>
              )}
              
              <div ref={pipelineEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombinedView;
