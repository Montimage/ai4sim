import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  TrashIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { useConversations } from '../hooks/useConversations';

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  isVisible: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  currentConversationId,
  onConversationSelect,
  isVisible
}) => {
  const {
    conversations,
    createNewConversation,
    deleteConversation
  } = useConversations();

  const getConversationTitle = (conversation: any) => {
    if (conversation.title && conversation.title !== 'New conversation') {
      return conversation.title;
    }
    
    if (conversation.messages.length > 0) {
      const firstMessage = conversation.messages[0];
      return firstMessage.content.substring(0, 30) + (firstMessage.content.length > 30 ? '...' : '');
    }
    
    return 'New conversation';
  };

  const handleNewConversation = () => {
    const newConv = createNewConversation();
    onConversationSelect(newConv.id);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (conversations.length > 1) {
      deleteConversation(id, () => {}); // Empty function for deleteChatHistory
      if (currentConversationId === id) {
        // Select the first remaining conversation
        const remaining = conversations.filter(c => c.id !== id);
        if (remaining.length > 0) {
          onConversationSelect(remaining[0].id);
        }
      }
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-70 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversations
          </h2>
          <button
            onClick={handleNewConversation}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="New conversation"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {conversations.map((conversation) => (
            <motion.div
              key={conversation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`group relative cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                currentConversationId === conversation.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                  : ''
              }`}
              onClick={() => onConversationSelect(conversation.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {conversation.pentestSession && (
                        <CommandLineIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {getConversationTitle(conversation)}
                      </h3>
                    </div>
                    
                    {/* Last message preview */}
                    {conversation.messages.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {conversation.messages[conversation.messages.length - 1].content}
                      </p>
                    )}
                    
                    {/* Pentest session info */}
                    {conversation.pentestSession && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          conversation.pentestSession.status === 'executing' ? 'bg-blue-500 animate-pulse' :
                          conversation.pentestSession.status === 'completed' ? 'bg-green-500' :
                          conversation.pentestSession.status === 'failed' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`}></span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {conversation.pentestSession.target}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(conversation.updatedAt)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {conversation.messages.length} msg
                      </span>
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteConversation(e, conversation.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200 ml-2"
                      title="Supprimer la conversation"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Loading indicator */}
              {conversation.isLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <FolderIcon className="w-4 h-4" />
          <span>{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ConversationSidebar;
