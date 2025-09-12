import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon,
  CpuChipIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { ChatMessage as ChatMessageType } from '../types';
import { useChat } from '../hooks/useChat';
import { useConversations } from '../hooks/useConversations';
import { usePentestSessions } from '../hooks/usePentestSessions';
import { extractTarget } from '../utils/targetUtils';
import TruncatedOutput from './TruncatedOutput';

interface ChatViewProps {
  currentConversationId: string | null;
  onSwitchToPipeline: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ currentConversationId, onSwitchToPipeline }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const conversationHooks = useConversations();
  const sessionHooks = usePentestSessions(conversationHooks.conversations, currentConversationId, conversationHooks.getCurrentConversation, conversationHooks.addMessageToConversation);
  const {
    currentConversation,
    newMessage,
    setNewMessage,
    sendMessage,
    startPentestPipeline,
    shouldShowPentestButton
  } = useChat(conversationHooks, sessionHooks);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentConversation?.messages.length) {
      scrollToBottom();
    }
  }, [currentConversation?.messages.length]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      await sendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleStartPentest = async (message: ChatMessageType) => {
    const target = extractTarget(message.content);
    if (target) {
      await startPentestPipeline(message.content);
      onSwitchToPipeline();
    }
  };

  const formatMessageContent = (content: string, message: ChatMessageType): React.ReactNode => {
    // Check if content is very long (over 500 characters) or contains code blocks
    const hasCodeBlocks = /```[\s\S]*?```/.test(content);
    const isLongContent = content.length > 500;
    
    if ((hasCodeBlocks || isLongContent) && message.isAgent) {
      // For agent messages with long content or code blocks, use TruncatedOutput
      return (
        <TruncatedOutput 
          content={content}
          maxLength={300}
          title={`Message de ${message.isAgent ? 'l\'agent' : 'l\'utilisateur'}`}
          timestamp={message.timestamp}
        />
      );
    }
    
    // For shorter content, use regular formatting
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    let formatted = content
      .replace(codeBlockRegex, '<pre class="bg-gray-800 text-green-400 p-3 rounded-lg overflow-x-auto text-sm"><code>$1</code></pre>')
      .replace(inlineCodeRegex, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
    
    // Format line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const getMessageIcon = (message: ChatMessageType) => {
    if (message.isAgent) {
      if (message.type === 'error') return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      if (message.type === 'success') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      if (message.type === 'info') return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      return <CpuChipIcon className="w-5 h-5 text-purple-500" />;
    }
    return <UserIcon className="w-5 h-5 text-gray-600" />;
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <CpuChipIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Sélectionnez une conversation pour commencer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
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
              <div className={`max-w-[70%] ${message.isAgent ? 'order-1' : 'order-2'}`}>
                <div
                  className={`p-3 rounded-lg shadow-sm ${
                    message.isAgent
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getMessageIcon(message)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm">
                        {formatMessageContent(message.content, message)}
                      </div>
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
                      className="inline-flex items-center space-x-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-xs px-3 py-1.5 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <PlayIcon className="w-3 h-3" />
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
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <CpuChipIcon className="w-5 h-5 text-purple-500 animate-pulse" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Tapez votre message..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={currentConversation.isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || currentConversation.isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
