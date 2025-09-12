import { useState, useEffect } from 'react';
import { Conversation, ChatMessage } from '../types';
import { generateUniqueMessageId } from '../utils/messageUtils';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  // Fonctions pour la persistence des conversations
  const saveConversationsToStorage = (conversations: Conversation[]) => {
    try {
      const serializedConversations = conversations.map(conv => ({
        ...conv,
        messages: conv.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        })),
        createdAt: conv.createdAt instanceof Date ? conv.createdAt.toISOString() : conv.createdAt,
        updatedAt: conv.updatedAt instanceof Date ? conv.updatedAt.toISOString() : conv.updatedAt
      }));
      localStorage.setItem('agent_conversations', JSON.stringify(serializedConversations));
      localStorage.setItem('agent_current_conversation_id', currentConversationId || '');
    } catch (error) {
      console.error('Error saving conversations to localStorage:', error);
    }
  };

  const loadConversationsFromStorage = (): { conversations: Conversation[], currentId: string | null } => {
    try {
      const stored = localStorage.getItem('agent_conversations');
      const currentId = localStorage.getItem('agent_current_conversation_id');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const conversations = parsed.map((conv: any) => ({
          ...conv,
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          isLoading: false // Reset loading state
        }));
        
        return { 
          conversations, 
          currentId: currentId && conversations.find((c: Conversation) => c.id === currentId) ? currentId : null 
        };
      }
    } catch (error) {
      console.error('Error loading conversations from localStorage:', error);
    }
    
    return { conversations: [], currentId: null };
  };

  // Fonctions pour gérer les conversations
  const getCurrentConversation = (): Conversation | null => {
    return conversations.find(conv => conv.id === currentConversationId) || null;
  };

  // Fonctions pour gérer l'état de chargement par conversation
  const setConversationLoading = (conversationId: string, isLoading: boolean) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId
        ? { ...conv, isLoading }
        : conv
    ));
  };

  const isConversationLoading = (conversationId: string): boolean => {
    const conv = conversations.find(c => c.id === conversationId);
    return conv?.isLoading || false;
  };

  const createNewConversation = (): Conversation => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `New conversation ${conversations.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isLoading: false
    };
    
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(newConversation.id);
    return newConversation;
  };

  const switchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setConversations(prev => prev.map(conv => ({
      ...conv,
      isActive: conv.id === conversationId
    })));
  };

  const deleteConversation = (conversationId: string, deleteChatHistory: (id: string) => void) => {
    // Supprimer l'historique du backend
    deleteChatHistory(conversationId);
    
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // Si on supprime la conversation active, créer une nouvelle
    if (currentConversationId === conversationId) {
      if (conversations.length > 1) {
        const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
        setCurrentConversationId(remainingConversations[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  const updateConversationTitle = (conversationId: string, title: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, title, updatedAt: new Date() }
        : conv
    ));
  };

  const addChatMessage = (content: string, isAgent: boolean = true, type: string = 'info') => {
    const currentConv = getCurrentConversation();
    if (!currentConv) return;

    const message: ChatMessage = {
      id: generateUniqueMessageId(),
      content,
      isAgent,
      timestamp: new Date(),
      type
    };

    setConversations(prev => prev.map(conv => 
      conv.id === currentConversationId
        ? {
            ...conv,
            messages: [...conv.messages, message],
            updatedAt: new Date()
          }
        : conv
    ));

    // Mettre à jour le titre de la conversation si c'est le premier message
    if (currentConv.messages.length === 0 && !isAgent) {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      updateConversationTitle(currentConv.id, title);
    }

    return message;
  };

  // Fonction pour ajouter un message à une conversation spécifique (pour le traitement en arrière-plan)
  const addMessageToConversation = (conversationId: string, content: string, isAgent: boolean = true, type: string = 'info') => {
    const message: ChatMessage = {
      id: generateUniqueMessageId(),
      content,
      isAgent,
      timestamp: new Date(),
      type
    };

    setConversations(prev => prev.map(conv => 
      conv.id === conversationId
        ? {
            ...conv,
            messages: [...conv.messages, message],
            updatedAt: new Date()
          }
        : conv
    ));

    // Mettre à jour le titre de la conversation si c'est le premier message
    const targetConv = conversations.find(c => c.id === conversationId);
    if (targetConv && targetConv.messages.length === 0 && !isAgent) {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      updateConversationTitle(conversationId, title);
    }

    return message;
  };

  // Charger les conversations au démarrage
  useEffect(() => {
    const { conversations: savedConversations, currentId } = loadConversationsFromStorage();
    
    if (savedConversations.length > 0) {
      // Mettre à jour l'état isActive pour toutes les conversations
      const updatedConversations = savedConversations.map(conv => ({
        ...conv,
        isActive: conv.id === currentId
      }));
      
      setConversations(updatedConversations);
      setCurrentConversationId(currentId);
    } else {
      // Créer une nouvelle conversation si aucune n'existe
      createNewConversation();
    }
    
    setConversationsLoaded(true);
  }, []);

  // Sauvegarder les conversations à chaque changement (avec debounce)
  useEffect(() => {
    if (conversationsLoaded && conversations.length > 0) {
      const timeoutId = setTimeout(() => {
        saveConversationsToStorage(conversations);
      }, 500); // Debounce de 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [conversations.length, currentConversationId, conversationsLoaded]);

  // Initialiser une conversation par défaut au chargement
  useEffect(() => {
    if (conversationsLoaded && conversations.length === 0) {
      createNewConversation();
    }
  }, [conversationsLoaded]);

  return {
    conversations,
    currentConversationId,
    conversationsLoaded,
    setConversations,
    setCurrentConversationId,
    setConversationsLoaded,
    getCurrentConversation,
    setConversationLoading,
    isConversationLoading,
    createNewConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    addChatMessage,
    addMessageToConversation
  };
};
