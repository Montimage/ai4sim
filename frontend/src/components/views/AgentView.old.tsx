import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useAISettingsStore } from '../../store/aiSettingsStore';
import { 
  PaperAirplaneIcon,
  CpuChipIcon, 
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon, 
  DocumentArrowDownIcon,
  PlusIcon,
  TrashIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

// Types for real pentesting tools
interface PentestConfig {
  toolName: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

interface ChatMessage {
  id: string;
  content: string;
  isAgent: boolean;
  timestamp: Date;
  type?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isLoading?: boolean; // État de chargement spécifique à cette conversation
  pentestSession?: {
    sessionId: string;
    target: string;
    status: 'analyzing' | 'executing' | 'completed' | 'failed';
    tools: PentestConfig[];
    results: Record<string, any>;
    finalReport?: any;
  };
}

interface ExecutionStep {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  command?: string;
  output?: string;
  error?: string;
  duration?: number;
  progress?: number;
}

interface PentestSession {
  id: string;
  target: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  steps: ExecutionStep[];
  summary?: {
    totalTools: number;
    successful: number;
    failed: number;
    totalDuration: number;
  };
}

const AgentView: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  const { settings: aiSettings } = useAISettingsStore();
  
  // State for views
  const [currentView, setCurrentView] = useState<'chat' | 'pipeline'>('chat');
  
  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversationSidebar, setShowConversationSidebar] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  
  // State for chat
  const [newMessage, setNewMessage] = useState('');
  // Supprimé: const [isLoading, setIsLoading] = useState(false); - maintenant géré par conversation
  
  // State for pipeline
  const [currentSession, setCurrentSession] = useState<PentestSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pentestSessions, setPentestSessions] = useState<Record<string, any>>({});
  
  // Fonction pour synchroniser le currentSession avec la conversation active et charger les sessions de pentest
  useEffect(() => {
    const currentConversation = getCurrentConversation();
    
    // Première priorité : Session associée à la conversation active
    if (currentConversation?.pentestSession) {
      const session = currentConversation.pentestSession;
      
      // Créer ou mettre à jour la session dans le Pipeline
      const pipelineSession: PentestSession = {
        id: session.sessionId,
        target: session.target,
        status: session.status === 'executing' ? 'running' : 
               session.status === 'completed' ? 'completed' : 
               session.status === 'failed' ? 'failed' : 'paused',
        startTime: new Date(), // On peut améliorer cela plus tard avec la vraie date
        steps: session.tools.map((tool, index) => ({
          id: `step-${tool.toolName}-${index}`,
          tool: tool.toolName,
          description: getToolDescription(tool.toolName),
          status: session.results[tool.toolName] ? 'completed' : 'pending',
          output: session.results[tool.toolName]?.output,
          error: session.results[tool.toolName]?.error,
          duration: session.results[tool.toolName]?.duration,
          progress: session.results[tool.toolName] ? 100 : 0
        }))
      };
      
      setCurrentSession(pipelineSession);
      setPentestSessions(prev => ({
        ...prev,
        [session.sessionId]: pipelineSession
      }));
    } else {
      // Deuxième priorité : Sessions actives du backend
      const activeSessions = Object.values(pentestSessions).filter((session: any) => 
        session.status === 'running' || session.status === 'executing'
      );
      
      if (activeSessions.length > 0) {
        // Prendre la session la plus récente
        const latestSession = activeSessions[activeSessions.length - 1];
        setCurrentSession(latestSession);
      } else {
        // Troisième priorité : Autres sessions des conversations
        const conversationSessions = conversations
          .filter(conv => conv.pentestSession)
          .map(conv => conv.pentestSession!);
        
        if (conversationSessions.length > 0) {
          const latestSession = conversationSessions[conversationSessions.length - 1];
          const pipelineSession: PentestSession = {
            id: latestSession.sessionId,
            target: latestSession.target,
            status: latestSession.status === 'executing' ? 'running' : 
                   latestSession.status === 'completed' ? 'completed' : 
                   latestSession.status === 'failed' ? 'failed' : 'paused',
            startTime: new Date(),
            steps: latestSession.tools.map((tool, index) => ({
              id: `step-${tool.toolName}-${index}`,
              tool: tool.toolName,
              description: getToolDescription(tool.toolName),
              status: latestSession.results[tool.toolName] ? 'completed' : 'pending',
              output: latestSession.results[tool.toolName]?.output,
              error: latestSession.results[tool.toolName]?.error,
              duration: latestSession.results[tool.toolName]?.duration,
              progress: latestSession.results[tool.toolName] ? 100 : 0
            }))
          };
          setCurrentSession(pipelineSession);
        } else {
          setCurrentSession(null);
        }
      }
    }
  }, [currentConversationId]); // Dépendance fixe seulement sur l'ID de conversation

  // Fonction pour charger les sessions de pentest depuis le backend
  const loadPentestSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agents/pentest-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sessions) {
          const sessionsMap: Record<string, any> = {};
          let activeSession = null;
          
          data.sessions.forEach((session: any) => {
            sessionsMap[session.id] = session;
            
            // Si c'est une session active et qu'on n'a pas encore de currentSession
            if ((session.status === 'running' || session.status === 'executing') && !currentSession) {
              activeSession = {
                id: session.id,
                target: session.target,
                status: session.status === 'executing' ? 'running' : session.status,
                startTime: new Date(session.startedAt || session.createdAt),
                steps: (session.tools || []).map((tool: any, index: number) => ({
                  id: `step-${tool.name || tool.toolName}-${index}`,
                  tool: tool.name || tool.toolName,
                  description: getToolDescription(tool.name || tool.toolName),
                  status: session.results?.[tool.name || tool.toolName] ? 'completed' : 
                         session.status === 'executing' ? 'running' : 'pending',
                  output: session.results?.[tool.name || tool.toolName]?.output,
                  error: session.results?.[tool.name || tool.toolName]?.error,
                  duration: session.results?.[tool.name || tool.toolName]?.duration,
                  progress: session.results?.[tool.name || tool.toolName] ? 100 : 
                           session.status === 'executing' ? 50 : 0
                }))
              };
            }
          });
          
          setPentestSessions(sessionsMap);
          
          // Si on a trouvé une session active et qu'on n'a pas de currentSession, l'activer
          if (activeSession && !currentSession) {
            setCurrentSession(activeSession);
          }
        }
      }
    } catch (error) {
      console.error('Error loading pentest sessions:', error);
    }
  };

  // Fonction pour rafraîchir le statut d'une session en temps réel
  const refreshSessionStatus = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/agents/pentest-session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          const session = data.session;
          const previousSession = pentestSessions[sessionId];
          
          // Comparer l'état précédent pour détecter les changements
          if (previousSession && session.results) {
            Object.keys(session.results).forEach(toolName => {
              const previousResult = previousSession.steps?.find((s: any) => s.tool === toolName);
              const currentResult = session.results[toolName];
              
              // Si c'est un nouveau résultat ou un changement de statut
              if (!previousResult || previousResult.status !== 'completed') {
                if (currentResult.error) {
                  updateChatWithPentestProgress(sessionId, toolName, 'failed', undefined, currentResult.error);
                } else if (currentResult.output) {
                  updateChatWithPentestProgress(sessionId, toolName, 'completed', currentResult.output);
                }
              }
            });
          }
          
          // Mettre à jour la session dans pentestSessions
          setPentestSessions(prev => ({
            ...prev,
            [sessionId]: {
              id: session.id,
              target: session.target,
              status: session.status === 'executing' ? 'running' : session.status,
              startTime: new Date(session.startedAt || session.createdAt),
              steps: (session.tools || []).map((tool: any, index: number) => ({
                id: `step-${tool.name || tool.toolName}-${index}`,
                tool: tool.name || tool.toolName,
                description: getToolDescription(tool.name || tool.toolName),
                status: session.results?.[tool.name || tool.toolName] ? 'completed' : 
                       session.status === 'executing' ? 'running' : 'pending',
                output: session.results?.[tool.name || tool.toolName]?.output,
                error: session.results?.[tool.name || tool.toolName]?.error,
                duration: session.results?.[tool.name || tool.toolName]?.duration,
                progress: session.results?.[tool.name || tool.toolName] ? 100 : 
                         session.status === 'executing' ? 50 : 0
              }))
            }
          }));
          
          // Mettre à jour la conversation associée
          setConversations(prev => prev.map(conv => {
            if (conv.pentestSession?.sessionId === sessionId) {
              return {
                ...conv,
                pentestSession: {
                  ...conv.pentestSession,
                  status: session.status,
                  results: session.results || {},
                  finalReport: session.finalReport
                }
              };
            }
            return conv;
          }));
          
          // Si c'est la session courante, la mettre à jour
          if (currentSession?.id === sessionId) {
            setCurrentSession(prev => prev ? {
              ...prev,
              status: session.status === 'executing' ? 'running' : session.status,
              steps: (session.tools || []).map((tool: any, index: number) => ({
                id: `step-${tool.name || tool.toolName}-${index}`,
                tool: tool.name || tool.toolName,
                description: getToolDescription(tool.name || tool.toolName),
                status: session.results?.[tool.name || tool.toolName] ? 'completed' : 
                       session.status === 'executing' ? 'running' : 'pending',
                output: session.results?.[tool.name || tool.toolName]?.output,
                error: session.results?.[tool.name || tool.toolName]?.error,
                duration: session.results?.[tool.name || tool.toolName]?.duration,
                progress: session.results?.[tool.name || tool.toolName] ? 100 : 
                         session.status === 'executing' ? 50 : 0
              }))
            } : null);
          }
          
          console.log(`🔄 Session ${sessionId} status updated: ${session.status}`);
        }
      }
    } catch (error) {
      console.error(`Error refreshing session ${sessionId}:`, error);
    }
  };

  // Charger les sessions au démarrage
  useEffect(() => {
    loadPentestSessions();
  }, []);

  // Mise à jour périodique des sessions actives
  useEffect(() => {
    const interval = setInterval(() => {
      // Recharger les sessions seulement si on a des conversations avec des sessions de pentest
      const hasActiveSessions = conversations.some(conv => conv.pentestSession);
      if (hasActiveSessions || currentView === 'pipeline') {
        loadPentestSessions();
        
        // Recharger l'historique des conversations avec des sessions actives
        conversations.forEach(conv => {
          if (conv.pentestSession && (conv.pentestSession.status === 'executing' || conv.pentestSession.status === 'analyzing')) {
            loadChatHistory(conv.id);
          }
        });

        // Rafraîchir le statut des sessions actives
        Object.keys(pentestSessions).forEach(sessionId => {
          refreshSessionStatus(sessionId);
        });
      }
    }, 10000); // Toutes les 10 secondes

    return () => clearInterval(interval);
  }, [currentView]); // Dépendance réduite pour éviter les boucles
  
  // Configuration des outils avec filtrage selon les paramètres
  const [pentestConfigs] = useState<PentestConfig[]>(() => {
    const baseConfigs: PentestConfig[] = [
      { toolName: 'nmap', enabled: true, parameters: { scanType: 'syn', ports: '1-1000', timing: 'T4' } },
      { toolName: 'masscan', enabled: true, parameters: { ports: '80,443,22,21,25,53', rate: '1000' } },
      { toolName: 'nikto', enabled: true, parameters: { port: 80, ssl: false } },
      { toolName: 'gobuster', enabled: true, parameters: { wordlist: '/usr/share/wordlists/dirb/common.txt', extensions: 'php,html,txt', threads: 10 } },
      { toolName: 'sqlmap', enabled: true, parameters: { level: 1, risk: 1 } },
      { toolName: 'shennina', enabled: true, parameters: { mode: 'scan-only', target: '' } }, // AI4SIM
      { toolName: 'gan-fuzzer', enabled: true, parameters: { mode: 'web', threads: 10 } } // AI4SIM
    ];
    
    // ✅ Tous les outils sont actifs, maintenant
    return baseConfigs;
  });

  // Fonction pour adapter les outils selon le type de cible
  const getAdaptedTools = (target: string): PentestConfig[] => {
    const isWebTarget = target.includes('http') || target.includes('www') || 
                       target.includes('.com') || target.includes('.org') || 
                       target.includes('.net') || target.includes('.io');
    
    return pentestConfigs.map(config => {
      let adaptedConfig = { ...config };
      
      // Adapter les paramètres selon le type de cible
      if (config.toolName === 'shennina') {
        adaptedConfig.parameters = {
          ...config.parameters,
          target: target,
          mode: isWebTarget ? 'web' : 'network'
        };
      }
      
      if (config.toolName === 'gan-fuzzer') {
        adaptedConfig.parameters = {
          ...config.parameters,
          target: target,
          mode: isWebTarget ? 'web' : 'api',
          threads: isWebTarget ? 15 : 10
        };
      }
      
      if (config.toolName === 'nikto') {
        adaptedConfig.parameters = {
          ...config.parameters,
          port: isWebTarget ? 443 : 80,
          ssl: isWebTarget
        };
      }
      
      if (config.toolName === 'gobuster') {
        adaptedConfig.parameters = {
          ...config.parameters,
          url: isWebTarget ? `https://${target}` : `http://${target}`
        };
      }
      
      return adaptedConfig;
    });
  };
  
  // Mots-clés pour détecter les demandes de pentest - plus spécifiques
  const pentestKeywords = [
    'pentest', 'test de pénétration', 'scan de vulnérabilité', 'audit de sécurité',
    'reconnaissance réseau', 'test de sécurité', 'vérification de sécurité',
    'analyse de vulnérabilité', 'test d\'intrusion', 'audit de pénétration'
  ];
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCounter = useRef(0);

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

  // Fonction pour vérifier si un message utilisateur nécessite un bouton pentest
  const shouldShowPentestButton = (message: ChatMessage): boolean => {
    // Ne pas montrer pour les messages de l'agent
    if (message.isAgent) return false;
    
    // Ne pas montrer si c'est déjà un message de confirmation
    if (message.content.includes('[CONFIRM_PENTEST:')) return false;
    
    // Vérifier si le message contient des mots-clés de pentest
    const hasPentestKeywords = pentestKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Vérifier si le message contient une cible valide
    const hasValidTarget = extractTarget(message.content) !== '';
    
    // Exclure les messages trop courts ou génériques
    if (message.content.trim().length < 10) return false;
    
    // Exclure les messages qui sont juste des questions générales sur la cybersécurité
    const generalQuestions = [
      'qu\'est-ce que', 'comment', 'pourquoi', 'expliquer', 'définir', 
      'c\'est quoi', 'aide-moi', 'peux-tu', 'que fait', 'que signifie'
    ];
    
    const isGeneralQuestion = generalQuestions.some(q => 
      message.content.toLowerCase().includes(q)
    );
    
    // Ne montrer le bouton que si :
    // 1. Il y a des mots-clés de pentest ET une cible valide
    // 2. OU si c'est une demande directe de pentest (même sans cible, on peut demander)
    const isDirectPentestRequest = message.content.toLowerCase().includes('pentest') || 
                                  message.content.toLowerCase().includes('test de pénétration') ||
                                  message.content.toLowerCase().includes('lance') && hasPentestKeywords;
    
    if (isDirectPentestRequest && !isGeneralQuestion) {
      return true;
    }
    
    // Pour les autres cas, exiger à la fois mots-clés ET cible valide
    return hasPentestKeywords && hasValidTarget && !isGeneralQuestion;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const currentConv = getCurrentConversation();
    if (currentConv?.messages.length) {
      scrollToBottom();
    }
  }, [currentConversationId, conversations.find(c => c.id === currentConversationId)?.messages.length]);

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
      
      // Charger l'historique depuis le backend pour chaque conversation
      savedConversations.forEach(conv => {
        loadChatHistory(conv.id);
      });
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

  // Initialiser une conversation par défaut au chargement (ancien code - maintenant géré ci-dessus)
  useEffect(() => {
    if (conversationsLoaded && conversations.length === 0) {
      createNewConversation();
    }
  }, [conversationsLoaded]);

  const generateUniqueMessageId = (): string => {
    messageCounter.current += 1;
    return `msg-${Date.now()}-${messageCounter.current}`;
  };

  // Fonction utilitaire pour formater le texte en gras
  const formatBoldText = (text: string): React.ReactNode => {
    if (!text) return text;
    
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Texte entre ** - le rendre en gras
        const boldText = part.slice(2, -2);
        return (
          <span key={index} className="font-bold">
            {boldText}
          </span>
        );
      }
      return part;
    });
  };

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Nouvelle conversation ${conversations.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isLoading: false
    };
    
    setConversations(prev => [...prev, newConversation]);
    setCurrentConversationId(newConversation.id);
  };

  const switchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setConversations(prev => prev.map(conv => ({
      ...conv,
      isActive: conv.id === conversationId
    })));
    
    // Charger l'historique de la conversation seulement si elle n'a pas de messages
    const targetConversation = conversations.find(conv => conv.id === conversationId);
    if (targetConversation && targetConversation.messages.length === 0) {
      loadChatHistory(conversationId);
    }
  };

  const deleteConversation = (conversationId: string) => {
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

  // Fonction pour supprimer l'historique du backend
  const deleteChatHistory = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/agents/session/${conversationId}/chat-history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error deleting chat history:', error);
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

    // Sauvegarder l'historique automatiquement
    setTimeout(() => {
      saveChatHistory(currentConv.id, [...currentConv.messages, message]);
    }, 1000);
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

    // ✅ Utiliser l'état mis à jour directement pour la sauvegarde
    setTimeout(() => {
      // Récupérer la conversation avec le nouveau message
      setConversations(current => {
        const updatedConv = current.find(c => c.id === conversationId);
        if (updatedConv) {
          saveChatHistory(conversationId, updatedConv.messages);
        }
        return current; // Pas de changement, juste pour accéder à l'état actuel
      });
    }, 1000);
  };

  // Sauvegarder l'historique du chat
  const saveChatHistory = async (conversationId: string, messages: ChatMessage[]) => {
    try {
      const token = localStorage.getItem('token');
      
      // Convertir les messages pour la sérialisation (dates en strings)
      const serializedMessages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      
      const response = await fetch(`/api/agents/session/${conversationId}/chat-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: serializedMessages })
      });

      if (!response.ok) {
        console.warn('Failed to save chat history');
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // Charger l'historique du chat
  const loadChatHistory = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/agents/session/${conversationId}/chat-history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.history && data.history.length > 0) {
          // Convertir les dates strings en objets Date
          const messagesWithDates = data.history.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          // Mettre à jour la conversation avec l'historique chargé ET les informations de pentest session
          setConversations(prev => prev.map(conv => 
            conv.id === conversationId 
              ? { 
                  ...conv, 
                  messages: messagesWithDates,
                  updatedAt: new Date(Math.max(...messagesWithDates.map((m: any) => m.timestamp.getTime()))),
                  // Add pentest session info if available
                  pentestSession: data.pentestSession ? {
                    sessionId: data.pentestSession.id,
                    target: data.pentestSession.target,
                    status: data.pentestSession.status === 'executing' ? 'executing' : 
                           data.pentestSession.status === 'completed' ? 'completed' : 
                           data.pentestSession.status === 'failed' ? 'failed' : 'analyzing',
                    tools: (data.pentestSession.tools || []).map((tool: any) => ({
                      toolName: tool.toolName || tool.name || tool,
                      enabled: tool.enabled !== undefined ? tool.enabled : true,
                      parameters: tool.parameters || {}
                    })),
                    results: data.pentestSession.results || {},
                    finalReport: data.pentestSession.finalReport
                  } : undefined
                }
              : conv
          ));
          
          console.log(`✅ Chat history loaded for conversation ${conversationId}: ${messagesWithDates.length} messages`);
          if (data.pentestSession) {
            console.log(`🔗 Pentest session linked: ${data.pentestSession.id} (${data.pentestSession.status})`);
          }
        } else {
          console.log(`ℹ️ No chat history found for conversation ${conversationId}`);
        }
      } else {
        console.warn(`Failed to load chat history for ${conversationId}:`, response.status);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Fonction pour détecter l'IP locale
  const getLocalIP = (): string => {
    // Fallback vers une IP locale commune
    return '192.168.1.176';
  };

  // Fonction pour extraire la cible avec détection automatique d'IP locale
  const extractTarget = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Détecter les demandes de test sur soi-même
    if (lowerPrompt.includes('attaque moi') || 
        lowerPrompt.includes('test moi') || 
        lowerPrompt.includes('test de m\'attaquer') ||
        lowerPrompt.includes('test moi même') ||
        lowerPrompt.includes('attaque moi même')) {
      return getLocalIP();
    }
    
    // Extraction d'IP existante
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?\b/g;
    const ips = prompt.match(ipPattern);
    if (ips && ips.length > 0) {
      return ips[0];
    }
    
    // Extraction de domaine
    const domainPattern = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
    const domains = prompt.match(domainPattern);
    if (domains && domains.length > 0) {
      return domains[0];
    }
    
    return '';
  };

  const startPentestPipeline = async (prompt: string) => {
    const target = extractTarget(prompt);
    if (!target) {
      addChatMessage('❌ Aucune cible valide détectée. Veuillez spécifier une IP, un domaine ou une URL.', false, 'error');
      return;
    }

    const currentConversation = getCurrentConversation();
    if (!currentConversation) {
      addChatMessage('❌ Erreur: Aucune conversation active.', false, 'error');
      return;
    }

    try {
      addChatMessage(`🚀 **Lancement du pentest sur ${target}**\n\nInitialisation en cours...`, false, 'pentest-start');
      
      // Trigger the automatic pentest through the chat system
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Lance un pentest automatique maintenant sur ${target}`,
          sessionId: currentConversation.id,
          aiSettings: {
            provider: 'ollama',
            model: 'llama3.2:latest',
            baseUrl: 'http://localhost:11434',
            apiKey: ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if this is a pentest action response
      if (data.action === 'pentest_started' && data.pentestSession) {
        // Update the conversation with pentest session info
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversation.id 
            ? { 
                ...conv, 
                pentestSession: {
                  sessionId: data.pentestSession,
                  target: data.target,
                  status: 'executing',
                  tools: data.tools?.map((toolName: string) => ({
                    toolName,
                    enabled: true,
                    parameters: {}
                  })) || [],
                  results: {},
                  finalReport: undefined
                }
              }
            : conv
        ));
        
        console.log(`🚀 Pentest session started: ${data.pentestSession} for conversation ${currentConversation.id}`);
        addChatMessage(`✅ Session de pentest ${data.pentestSession} créée et en cours d'exécution sur ${data.target}`, true, 'pentest-started');
      } else {
        // Add regular response
        addChatMessage(data.response || '✅ Pentest lancé avec succès', true, 'info');
      }

      // Force reload chat history to get updated pentest session info
      setTimeout(() => {
        loadChatHistory(currentConversation.id);
      }, 1000);

    } catch (error) {
      console.error('Error starting pentest pipeline:', error);
      addChatMessage('❌ Erreur lors du démarrage du pentest. Veuillez réessayer.', false, 'error');
    }
  };

  // Fonction pour mettre à jour les messages de statut dans le chat en temps réel
  const updateChatWithPentestProgress = (sessionId: string, toolName: string, status: string, output?: string, error?: string) => {
    const conversationWithSession = conversations.find(conv => conv.pentestSession?.sessionId === sessionId);
    if (!conversationWithSession) return;

    let statusMessage = '';
    let messageType: 'info' | 'success' | 'error' = 'info';

    switch (status) {
      case 'running':
        statusMessage = `🔄 **${toolName}** en cours d'exécution...`;
        messageType = 'info';
        break;
      case 'completed':
        statusMessage = `✅ **${toolName}** terminé avec succès`;
        if (output && output.length > 0) {
          const preview = output.length > 200 ? output.substring(0, 200) + '...' : output;
          statusMessage += `\n\`\`\`\n${preview}\n\`\`\``;
        }
        messageType = 'success';
        break;
      case 'failed':
        statusMessage = `❌ **${toolName}** a échoué`;
        if (error) {
          statusMessage += `\nErreur: \`${error}\``;
        }
        messageType = 'error';
        break;
    }

    if (statusMessage) {
      addMessageToConversation(conversationWithSession.id, statusMessage, true, messageType);
    }
  };

  const getToolDescription = (tool: string): string => {
    const descriptions: Record<string, string> = {
      nmap: 'Scan de ports et découverte de services',
      masscan: 'Scan rapide de ports',
      nikto: 'Scanner de vulnérabilités web',
      gobuster: 'Bruteforce de répertoires web',
      sqlmap: 'Test d\'intrusion SQL',
      shennina: 'IA de pentest automatisé (AI4SIM)',
      'gan-fuzzer': 'Fuzzing IA de vulnérabilités (AI4SIM)'
    };
    return descriptions[tool] || 'Outil de pentesting';
  };

  const forcePentest = () => {
    const target = prompt('Entrez la cible (IP ou domaine) :');
    if (target) {
      startPentestPipeline(`Lancez un pentest sur ${target}`);
    }
  };

  const handleChatMessage = async () => {
    const currentConv = getCurrentConversation();
    if (!newMessage.trim() || !currentConv) return;
    
    // Vérifier si cette conversation est déjà en train de charger
    if (isConversationLoading(currentConv.id)) return;

    const userMessage = newMessage.trim();
    const conversationId = currentConv.id; // Capturer l'ID pour usage async
    setNewMessage('');

    // Marquer cette conversation comme en cours de chargement
    setConversationLoading(conversationId, true);
    
    // Add user message
    addChatMessage(userMessage, false);
    
    try {
      // Call the real AI agent API with current AI settings
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: conversationId, // Include conversation ID for mapping
          context: getCurrentConversation()?.messages.slice(-5).map(msg => ({
            role: msg.isAgent ? 'assistant' : 'user',
            content: msg.content
          })) || [],
          aiSettings: {
            provider: 'ollama',
            model: 'llama3.2:latest',
            baseUrl: 'http://localhost:11434',
            apiKey: ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if this is a pentest action response
      if (data.action === 'pentest_started' && data.pentestSession) {
        // Update the conversation with pentest session info
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                pentestSession: {
                  sessionId: data.pentestSession,
                  target: data.target,
                  status: 'executing',
                  tools: data.tools?.map((toolName: string) => ({
                    toolName,
                    enabled: true,
                    parameters: {}
                  })) || [],
                  results: {},
                  finalReport: undefined
                }
              }
            : conv
        ));
        
        // Add the response message with pentest info
        addMessageToConversation(conversationId, data.response, true, 'pentest-started');
        
        console.log(`🚀 Pentest session started: ${data.pentestSession} for conversation ${conversationId}`);
      } else {
        // Handle regular responses or other pentest responses
        
        // Fonction pour vérifier si un texte contient une vraie demande de pentest
        const isRealPentestRequest = (text: string): boolean => {
          const lowerText = text.toLowerCase();
          
          // Vérifier si le texte contient des mots-clés spécifiques de pentest
          const pentestKeywords = ['pentest', 'scan', 'audit', 'test', 'vérifier', 'tester', 'lancer', 'démarrer', 'commencer', 'faire', 'effectuer', 'réaliser', 'exécuter', 'attaquer'];
          const hasPentestKeywords = pentestKeywords.some(keyword => 
            lowerText.includes(keyword.toLowerCase())
          );
          
          // Vérifier si le texte contient une cible valide
          const hasValidTarget = extractTarget(text) !== '';
          
          // Le texte doit contenir à la fois des mots-clés ET une cible valide
          return hasPentestKeywords && hasValidTarget;
        };
        
        // Vérifier si la réponse contient une demande de pentest
        const responseIsPentestRequest = isRealPentestRequest(data.response);
        
        // Vérifier aussi si le message original était une demande de pentest
        const originalIsPentestRequest = isRealPentestRequest(userMessage);
        
        if (responseIsPentestRequest || originalIsPentestRequest) {
          const target = extractTarget(data.response) || extractTarget(userMessage);
          if (target) {
            const adaptedTools = getAdaptedTools(target);
            const enabledTools = adaptedTools.filter(config => config.enabled);
            const toolsList = enabledTools.map(config => {
              const description = getToolDescription(config.toolName);
              const isAI4SIM = config.toolName === 'shennina' || config.toolName === 'gan-fuzzer';
              return `• ${config.toolName}${isAI4SIM ? ' (AI4SIM)' : ''}: ${description}`;
            }).join('\n');
            
            // ✅ Message avec boutons intégrés, pas de [CONFIRM_PENTEST:]
            addMessageToConversation(conversationId, `${data.response}

🔍 **Pentest suggéré sur ${target}**

**Outils disponibles :**
${toolsList}

**Voulez-vous lancer ce pentest ?**`, true, 'pentest-suggestion');
            
          } else {
            const defaultTools = pentestConfigs.filter(config => config.enabled).map(config => {
              const description = getToolDescription(config.toolName);
              const isAI4SIM = config.toolName === 'shennina' || config.toolName === 'gan-fuzzer';
              return `• ${config.toolName}${isAI4SIM ? ' (AI4SIM)' : ''}: ${description}`;
            }).join('\n');
            
            addMessageToConversation(conversationId, `${data.response}

🔍 **Pentest suggéré**

**Outils disponibles :**
${defaultTools}

**Spécifiez une cible (IP ou domaine) pour lancer le pentest.**`, true, 'pentest-suggestion-no-target');
          }
        } else {
          // Regular chat response from AI - ajouter à la conversation spécifique
          addMessageToConversation(conversationId, data.response, true, 'info');
        }
      }
      
    } catch (error) {
      console.error('Error calling AI agent:', error);
      addMessageToConversation(conversationId, `❌ **Error**: Failed to get AI response. Please check your AI settings in Settings > AI Settings.`, true, 'error');
    } finally {
      // Toujours arrêter le chargement pour cette conversation
      setConversationLoading(conversationId, false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatMessage();
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const generateReport = async () => {
    if (!currentSession) {
      addChatMessage('❌ Aucune session active pour générer un rapport.', true, 'error');
      return;
    }
    
    addChatMessage('📊 **Génération du rapport en cours...**', true, 'info');
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Generating report for session:', currentSession.id);
      
      const response = await fetch(`/api/agents/session/${currentSession.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          aiSettings: {
            provider: aiSettings?.provider || 'google',
            model: aiSettings?.provider === 'google' ? aiSettings.google?.model : 'gemini-2.0-flash',
            baseUrl: aiSettings?.provider === 'google' ? aiSettings.google?.baseUrl : 'https://generativelanguage.googleapis.com',
            apiKey: aiSettings?.provider === 'google' ? aiSettings.google?.apiKey : ''
          }
        })
      });

      console.log('📡 Report generation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Report generation failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Report generation response:', data);
      
      if (data.success) {
        const report = data.report;
        
        // Construire un message détaillé avec le rapport intelligent
        let reportMessage = `📊 **RAPPORT DE SÉCURITÉ GÉNÉRÉ PAR IA**

🎯 **Cible :** ${report.target}
📅 **Date :** ${new Date().toLocaleDateString()}
⏱️ **Durée :** ${report.statistiques?.totalExecutionTime ? Math.round(report.statistiques.totalExecutionTime / 1000) : 0}s

📋 **RÉSUMÉ EXÉCUTIF**
${report.executiveSummary || 'Analyse de sécurité terminée'}

📖 **NARRATIVE D'ATTAQUE**
${report.attackNarrative || 'Les outils de pentest ont été exécutés avec succès'}

🛠️ **MÉTHODOLOGIE UTILISÉE**
${report.methodologyUsed?.map((method: string) => `• ${method}`).join('\n') || 'Outils de pentest standards'}

📊 **STATISTIQUES**
• Ports scannés : ${report.statistiques?.totalPortsScanned || 0}
• Ports ouverts : ${report.statistiques?.openPorts || 0}
• Vulnérabilités trouvées : ${report.statistiques?.vulnerabilitiesFound || 0}
• Score de risque : ${report.riskScore || 50}/100

🔍 **VULNÉRABILITÉS IDENTIFIÉES**
${report.findings?.length > 0 ? 
  report.findings.map((finding: any, index: number) => 
    `${index + 1}. **${finding.vulnerability}** (${finding.severity?.toUpperCase()})
   Service : ${finding.service}:${finding.port}
   Impact : ${finding.impact}
   Correction : ${finding.fix}`
  ).join('\n\n') : 
  'Aucune vulnérabilité critique identifiée'
}

🎯 **PLAN DE REMÉDIATION**
${report.remediationPlan?.length > 0 ? 
  report.remediationPlan.map((item: any, index: number) => 
    `${index + 1}. **${item.vulnerability}** (Priorité ${item.priority})
   Effort estimé : ${item.estimatedEffort}
   Impact business : ${item.businessImpact}
   Solution : ${item.fix}`
  ).join('\n\n') : 
  'Aucune remédiation urgente requise'
}

💡 **RECOMMANDATIONS**
${report.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || 'Effectuer des tests de sécurité réguliers'}

🚀 **PROCHAINES ÉTAPES**
${report.nextSteps?.map((step: string) => `• ${step}`).join('\n') || 'Analyser les résultats en détail'}`;

        addChatMessage(reportMessage, true, 'success');
        
        // Créer un lien de téléchargement pour le rapport complet
        const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportLink = document.createElement('a');
        reportLink.href = reportUrl;
        reportLink.download = `ai4sim-rapport-${currentSession.target}-${new Date().toISOString()}.json`;
        reportLink.click();
        URL.revokeObjectURL(reportUrl);
        
        addChatMessage(`📁 **Rapport téléchargé !** Fichier : \`ai4sim-rapport-${currentSession.target}-${new Date().toISOString()}.json\``, true, 'info');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      addChatMessage(`❌ **Erreur lors de la génération du rapport**: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, true, 'error');
    }
  };

  const exportSessionData = async () => {
    if (!currentSession) {
      addChatMessage('❌ Aucune session active pour exporter.', true, 'error');
      return;
    }
    
    addChatMessage('📁 **Export des données en cours...**', true, 'info');
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Exporting session data for:', currentSession.id);
      
      const response = await fetch(`/api/agents/session/${currentSession.id}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Export response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Export failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📁 Export data received:', data);
      
      // Créer un fichier de téléchargement
      const exportBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const exportUrl = URL.createObjectURL(exportBlob);
      const exportLink = document.createElement('a');
      exportLink.href = exportUrl;
      exportLink.download = `pentest-session-${currentSession.id}.json`;
      exportLink.click();
      URL.revokeObjectURL(exportUrl);
      
      addChatMessage(`📁 **Données de session exportées !**

Fichier téléchargé : \`pentest-session-${currentSession.id}.json\`
Contient toutes les données de la session pour analyse externe.`, true, 'success');
    } catch (error) {
      console.error('❌ Error exporting session:', error);
      addChatMessage(`❌ **Erreur lors de l'export**: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, true, 'error');
    }
  };

  // Fonction pour afficher l'état de la session de pentest
  const renderPentestSessionStatus = () => {
    const currentConversation = getCurrentConversation();
    if (!currentConversation?.pentestSession) return null;

    const session = currentConversation.pentestSession;
    const completedTools = Object.keys(session.results).length;
    const totalTools = session.tools.filter(tool => tool.enabled).length;

    return (
      <div className={`p-4 rounded-lg mb-4 ${
        theme === 'light' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900 border border-blue-700'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-semibold ${theme === 'light' ? 'text-blue-900' : 'text-blue-100'}`}>
            🚀 Session de Pentest Active
          </h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            session.status === 'completed' ? 'bg-green-100 text-green-800' :
            session.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {session.status === 'analyzing' ? 'Analyse' :
             session.status === 'executing' ? 'Exécution' :
             session.status === 'completed' ? 'Terminé' : 'Échec'}
          </span>
        </div>
        
        <div className={`text-sm ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
          <p><strong>Cible:</strong> {session.target}</p>
          <p><strong>Session ID:</strong> {session.sessionId}</p>
          <p><strong>Progression:</strong> {completedTools}/{totalTools} outils terminés</p>
        </div>

        {session.finalReport && (
          <div className="mt-3 p-3 rounded bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">
              ✅ Rapport intelligent généré automatiquement
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with navigation */}
      <div className={`p-4 border-b flex items-center justify-between ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
          <div className="flex items-center space-x-3">
          <CpuChipIcon className="w-8 h-8 text-blue-600" />
            <div>
            <h1 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              AI4SIM Agent
              </h1>
              <p className={theme === 'light' ? 'text-slate-600' : 'text-gray-400'}>
              Your AI Assistant for Pentesting
              </p>
          </div>
        </div>

        {/* Navigation between views */}
          <div className="flex items-center space-x-2">
          <div className={`flex rounded-lg overflow-hidden border ${
            theme === 'light' ? 'border-gray-300' : 'border-gray-600'
          }`}>
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-4 py-2 flex items-center space-x-2 transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-600 text-white'
                  : theme === 'light'
                    ? 'bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Chat</span>
            </button>
                <button
              onClick={() => setCurrentView('pipeline')}
              className={`px-4 py-2 flex items-center space-x-2 transition-colors ${
                currentView === 'pipeline'
                  ? 'bg-blue-600 text-white'
                  : theme === 'light'
                    ? 'bg-white text-gray-700 hover:bg-gray-50'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <CommandLineIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Pipeline</span>
              {currentSession && (
                <div className={`w-2 h-2 rounded-full ${
                  currentSession.status === 'running' ? 'bg-green-400 animate-pulse' :
                  currentSession.status === 'paused' ? 'bg-yellow-400' :
                  currentSession.status === 'completed' ? 'bg-blue-400' :
                  'bg-red-400'
                }`} />
                  )}
                </button>
          </div>

          {/* Toggle Conversation Sidebar */}
          {currentView === 'chat' && (
            <button
              onClick={() => setShowConversationSidebar(!showConversationSidebar)}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'hover:bg-gray-100 text-gray-600' 
                  : 'hover:bg-slate-700 text-gray-400'
              }`}
              title={showConversationSidebar ? 'Masquer les conversations' : 'Afficher les conversations'}
            >
              <FolderIcon className="w-5 h-5" />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'light' 
                ? 'hover:bg-gray-100 text-gray-600' 
                : 'hover:bg-slate-700 text-gray-400'
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Chat View */}
        {currentView === 'chat' && (
          <div className="flex-1 flex">
            {/* Conversation Sidebar */}
            {showConversationSidebar && (
              <div className={`w-80 border-r ${
                theme === 'light' ? 'border-gray-200 bg-white' : 'border-gray-700 bg-slate-800'
              }`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      Conversations
                    </h3>
                    <button
                      onClick={createNewConversation}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'light' 
                          ? 'hover:bg-gray-100 text-gray-600' 
                          : 'hover:bg-slate-700 text-gray-400'
                      }`}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Outils disponibles */}
                  <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-blue-900' : 'text-blue-300'}`}>
                      🛠️ Outils Disponibles
                    </h4>
                    <div className="text-xs space-y-1">
                      {pentestConfigs.map(config => {
                        const isAI4SIM = config.toolName === 'shennina' || config.toolName === 'gan-fuzzer';
                        const isEnabled = config.enabled;
                        
                        return (
                          <div key={config.toolName} className="flex items-center justify-between">
                            <span className={`${theme === 'light' ? 'text-blue-800' : 'text-blue-300'}`}>
                              {config.toolName}
                              {isAI4SIM && <span className="ml-1 text-xs text-orange-600">(AI4SIM)</span>}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              isEnabled 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {isEnabled ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                        Aucune conversation
                      </p>
                      <button
                        onClick={createNewConversation}
                        className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Créer une conversation
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                            conversation.isActive
                              ? theme === 'light'
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-blue-900/30 border border-blue-700'
                              : theme === 'light'
                                ? 'hover:bg-gray-50'
                                : 'hover:bg-slate-700'
                          }`}
                          onClick={() => switchConversation(conversation.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className={`text-sm font-medium truncate ${
                                  conversation.isActive
                                    ? theme === 'light' ? 'text-blue-900' : 'text-blue-200'
                                    : theme === 'light' ? 'text-slate-900' : 'text-white'
                                }`}>
                                  {conversation.title}
                                </h4>
                                {/* Indicateur de chargement pour cette conversation */}
                                {conversation.isLoading && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                  </div>
                                )}
                              </div>
                              <p className={`text-xs truncate ${
                                theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                              }`}>
                                {conversation.messages.length} messages • {conversation.updatedAt.toLocaleDateString()}
                                {conversation.isLoading && (
                                  <span className="ml-2 text-blue-500 font-medium">• IA en cours d'écriture...</span>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conversation.id);
                              }}
                              className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-colors ${
                                theme === 'light' 
                                  ? 'hover:bg-red-100 text-red-600' 
                                  : 'hover:bg-red-900/30 text-red-400'
                              }`}
                            >
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Session de pentest active */}
              {renderPentestSessionStatus()}
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {!getCurrentConversation() ? (
                  <div className="text-center py-12">
                    <CpuChipIcon className={`w-16 h-16 mx-auto mb-4 ${
                      theme === 'light' ? 'text-slate-400' : 'text-gray-500'
                    }`} />
                    <h3 className={`text-lg font-semibold mb-2 ${
                      theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                    }`}>
                      🤖 AI Assistant spécialisé en cybersécurité
                    </h3>
                    <p className={`text-sm mb-6 ${
                      theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      Posez des questions ou demandez un pentest avec une cible
                    </p>
                  </div>
                ) : getCurrentConversation()?.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <CpuChipIcon className={`w-16 h-16 mx-auto mb-4 ${
                      theme === 'light' ? 'text-slate-400' : 'text-gray-500'
                    }`} />
                    <h3 className={`text-lg font-semibold mb-2 ${
                      theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                    }`}>
                      🤖 AI Assistant spécialisé en cybersécurité
                    </h3>
                    <p className={`text-sm mb-6 ${
                      theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      Posez des questions ou demandez un pentest avec une cible
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {getCurrentConversation()?.messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-start space-x-3 ${message.isAgent ? 'justify-start' : 'justify-end'}`}
                      >
                        {message.isAgent && (
                          <div className={`p-2 rounded-full ${
                            theme === 'light' ? 'bg-blue-100' : 'bg-blue-800/50'
                          }`}>
                            <CpuChipIcon className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        
                        <div className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                          message.isAgent
                            ? theme === 'light'
                              ? 'bg-white border border-slate-200'
                              : 'bg-slate-800 border border-gray-700'
                            : theme === 'light'
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-500 text-white'
                        }`}>
                          <div className="flex items-center space-x-2 mb-1">
                            {message.type && getMessageIcon(message.type)}
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {formatBoldText(message.content)}
                          </div>
                          
                          {/* Boutons de pentest intégrés selon le type de message */}
                          {message.type === 'pentest-suggestion' && (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => {
                                  const target = extractTarget(message.content);
                                  if (target) {
                                    startPentestPipeline(`pentest ${target}`);
                                  } else {
                                    addChatMessage(`❌ **Erreur**: Impossible d'extraire la cible du message.`, true, 'error');
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                              >
                                <PlayIcon className="w-4 h-4" />
                                <span>🚀 Lancer le pentest</span>
                              </button>
                              <button
                                onClick={() => {
                                  addChatMessage(`❌ **Pentest annulé**. Je peux vous aider avec autre chose en cybersécurité !`, true, 'info');
                                }}
                                className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                          
                          {message.type === 'pentest-suggestion-no-target' && (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={forcePentest}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                              >
                                <PlayIcon className="w-4 h-4" />
                                <span>🎯 Spécifier une cible</span>
                              </button>
                              <button
                                onClick={() => {
                                  addChatMessage(`❌ **Pentest annulé**. Je peux vous aider avec autre chose en cybersécurité !`, true, 'info');
                                }}
                                className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                          
                          {/* Bouton pour lancer un pentest si le message utilisateur contient des mots-clés (inchangé) */}
                          {shouldShowPentestButton(message) && (
                            <div className="mt-3">
                              <button
                                onClick={() => {
                                  const target = extractTarget(message.content);
                                  if (target) {
                                    startPentestPipeline(`pentest ${target}`);
                                  } else {
                                    forcePentest();
                                  }
                                }}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                              >
                                🚀 Lancer un Pentest
                              </button>
                            </div>
                          )}
                        </div>

                        {!message.isAgent && (
                          <div className={`p-2 rounded-full ${
                            theme === 'light' ? 'bg-slate-100' : 'bg-slate-700'
                          }`}>
                            <UserIcon className="w-5 h-5 text-slate-600" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {/* Typing Indicator */}
                <AnimatePresence>
                  {getCurrentConversation()?.isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex items-start space-x-3"
                    >
                      <div className={`p-2 rounded-full ${
                        theme === 'light' ? 'bg-blue-100' : 'bg-blue-800/50'
                      }`}>
                        <CpuChipIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className={`px-4 py-3 rounded-lg ${
                        theme === 'light' 
                          ? 'bg-white border border-slate-200' 
                          : 'bg-slate-800 border border-gray-700'
                      }`}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className={`p-4 border-t ${
                theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
              }`}>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Posez une question ou demandez 'pentest testphp.vulnweb.com'..."
                    className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-500'
                        : 'border-gray-600 bg-slate-700 text-white placeholder-gray-400'
                    }`}
                    disabled={!getCurrentConversation()}
                  />
                  <button
                    onClick={handleChatMessage}
                    disabled={!newMessage.trim() || !getCurrentConversation()}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      !newMessage.trim() || !getCurrentConversation()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline View */}
        {currentView === 'pipeline' && (
          <div className="flex-1 flex flex-col">
            {/* Pipeline Header */}
            <div className={`p-4 border-b ${
              theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    🔧 Pipeline de Pentesting
                  </h2>
                  <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                    Suivi en temps réel des tests de pénétration
                  </p>
                </div>
                
                {/* Pipeline Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadPentestSessions}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      theme === 'light'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    🔄 Actualiser
                  </button>
                  
                  {currentSession && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentSession.status === 'running' ? 'bg-green-100 text-green-800' :
                      currentSession.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      currentSession.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {currentSession.status === 'running' ? '🔄 En cours' :
                       currentSession.status === 'completed' ? '✅ Terminé' :
                       currentSession.status === 'failed' ? '❌ Échec' : '⏸️ En pause'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!currentSession ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <CommandLineIcon className={`w-16 h-16 mx-auto mb-4 ${
                    theme === 'light' ? 'text-slate-400' : 'text-gray-500'
                  }`} />
                  <h3 className={`text-lg font-semibold mb-2 ${
                    theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    Aucun test en cours
                  </h3>
                  <p className={`text-sm mb-4 ${
                    theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    Lancez un pentest depuis le Chat pour voir le pipeline ici
                  </p>
                  <div className="space-y-2">
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-gray-500'}`}>
                      � Exemples de commandes dans le Chat :
                    </p>
                    <div className={`text-xs space-y-1 ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                      <p>• "Lance un pentest sur testphp.vulnweb.com"</p>
                      <p>• "Test de sécurité sur 192.168.1.1"</p>
                      <p>• "Audit de vulnérabilités sur exemple.com"</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('chat')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🚀 Aller au Chat
                  </button>
                  <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 max-w-md mx-auto">
                    <h4 className={`font-medium mb-2 ${theme === 'light' ? 'text-blue-900' : 'text-blue-300'}`}>
                      📊 Sessions précédentes disponibles
                    </h4>
                    {Object.keys(pentestSessions).length > 0 ? (
                      <div className="space-y-2">
                        {Object.values(pentestSessions).slice(-3).map((session: any) => (
                          <div 
                            key={session.id}
                            className={`p-2 rounded text-xs ${
                              theme === 'light' ? 'bg-blue-100 text-blue-800' : 'bg-blue-800/50 text-blue-300'
                            }`}
                          >
                            <div className="font-medium">{session.target || session.id}</div>
                            <div className="text-xs opacity-75">
                              {session.startedAt ? new Date(session.startedAt).toLocaleString() : 'Date inconnue'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                        Aucune session précédente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-6 space-y-6">
                {/* Session Header */}
                <div className={`p-4 rounded-lg border ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        🎯 Pentest en cours
                      </h2>
                      <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                        Cible: <span className="font-mono">{currentSession.target}</span>
                      </p>
                      <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>
                        Session ID: {currentSession.id}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        currentSession.status === 'running' ? 'text-yellow-600' :
                        currentSession.status === 'completed' ? 'text-green-600' :
                        currentSession.status === 'failed' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {Math.round((currentSession.steps.filter(s => s.status === 'completed').length / currentSession.steps.length) * 100)}%
                      </div>
                      <div className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>
                        {currentSession.steps.filter(s => s.status === 'completed').length}/{currentSession.steps.length} outils terminés
                      </div>

                      {currentSession.status === 'completed' && (
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={generateReport}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            <span>Générer Rapport</span>
                          </button>
                          <button
                            onClick={exportSessionData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            <span>Exporter Données</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Steps Pipeline */}
                <div className="space-y-4">
                  {currentSession.steps.map((step, _index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-lg border ${
                        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.status === 'completed' ? 'bg-green-100 text-green-600' :
                            step.status === 'running' ? 'bg-yellow-100 text-yellow-600' :
                            step.status === 'failed' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {step.status === 'completed' ? '✅' :
                             step.status === 'running' ? '⚡' :
                             step.status === 'failed' ? '❌' : '⏳'}
                          </div>
                          <div>
                            <h3 className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                              {step.tool.toUpperCase()}
                              {(step.tool === 'shennina' || step.tool === 'gan-fuzzer') && (
                                <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">AI4SIM</span>
                              )}
                            </h3>
                            <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                              {step.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            step.status === 'completed' ? 'text-green-600' :
                            step.status === 'running' ? 'text-yellow-600' :
                            step.status === 'failed' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {step.status === 'completed' ? 'Terminé' :
                             step.status === 'running' ? 'En cours...' :
                             step.status === 'failed' ? 'Échec' : 'En attente'}
                          </div>
                          {step.duration && (
                            <div className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {Math.round(step.duration / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className={`w-full bg-gray-200 rounded-full h-2 ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        }`}>
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              step.status === 'completed' ? 'bg-green-500' :
                              step.status === 'running' ? 'bg-yellow-500' :
                              step.status === 'failed' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${step.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Output/Error */}
                      {(step.output || step.error) && (
                        <div className={`p-3 rounded text-xs font-mono ${
                          step.error 
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : theme === 'light'
                              ? 'bg-gray-50 text-gray-800 border border-gray-200'
                              : 'bg-gray-900 text-gray-300 border border-gray-700'
                        }`}>
                          <div className="max-h-32 overflow-y-auto">
                            {step.error ? step.error : step.output?.substring(0, 300)}
                            {step.output && step.output.length > 300 && '...'}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentView;