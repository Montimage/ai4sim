import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
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
  
  // State for views
  const [currentView, setCurrentView] = useState<'chat' | 'pipeline'>('chat');
  
  // ✅ OPTIMISATION UI : Préservation des positions de scroll
  const scrollPositions = useRef<{[key: string]: {x: number, y: number}}>({});
  
  // Fonctions utilitaires pour préserver l'état UI
  const saveScrollPosition = useCallback((containerId: string) => {
    const container = document.getElementById(containerId);
    if (container) {
      scrollPositions.current[containerId] = {
        x: container.scrollLeft,
        y: container.scrollTop
      };
    }
  }, []);
  
  const restoreScrollPosition = useCallback((containerId: string) => {
    const container = document.getElementById(containerId);
    if (container && scrollPositions.current[containerId]) {
      const { x, y } = scrollPositions.current[containerId];
      container.scrollTo({ left: x, top: y, behavior: 'instant' });
    }
  }, []);
  
  
  // Fonction pour changer de vue et nettoyer l'état si nécessaire
  const switchView = useCallback((view: 'chat' | 'pipeline') => {
    console.log(`🔄 Switching from ${currentView} to ${view}`);
    
    // ✅ Sauvegarder l'état de la vue actuelle avant de changer
    if (currentView === 'chat') {
      saveScrollPosition('chat-container');
      saveScrollPosition('conversations-sidebar');
    } else if (currentView === 'pipeline') {
      saveScrollPosition('pipeline-container');
      saveScrollPosition('pipeline-steps');
    }
    
    setCurrentView(view);
    
    // ✅ Restaurer l'état de la nouvelle vue après un court délai
    setTimeout(() => {
      if (view === 'chat') {
        restoreScrollPosition('chat-container');
        restoreScrollPosition('conversations-sidebar');
      } else if (view === 'pipeline') {
        restoreScrollPosition('pipeline-container');
        restoreScrollPosition('pipeline-steps');
      }
    }, 50);
    
    // Si on va vers le chat et qu'il n'y a pas de session associée à la conversation courante, vider la pipeline
    if (view === 'chat') {
      const currentConversation = getCurrentConversation();
      if (!currentConversation?.pentestSession) {
        console.log(`🧹 Clearing pipeline session when switching to chat (no session for conversation)`);
            // ✅ NE PAS vider la session si on était déjà en vue chat
            if (currentView !== 'chat') {
        setCurrentSession(null);
            }
      }
    }
    
    // Si on va vers la pipeline, forcer la synchronisation
    if (view === 'pipeline') {
      console.log(`🔄 Switching to pipeline, forcing session sync`);
      
      // ✅ Synchronisation immédiate et plus robuste
      setTimeout(async () => {
        const currentConversation = getCurrentConversation();
        
        if (currentConversation?.pentestSession) {
          console.log(`🔄 Found pentest session for current conversation: ${currentConversation.pentestSession.sessionId}`);
          
          // ✅ Créer immédiatement une session temporaire si elle n'existe pas
          if (!currentSession || currentSession.id !== currentConversation.pentestSession.sessionId) {
            console.log(`🚀 Creating temporary session while loading backend data...`);
            const tempSession = {
              id: currentConversation.pentestSession.sessionId,
              target: currentConversation.pentestSession.target || 'Unknown',
              status: 'running' as const,
              startTime: new Date(),
              steps: [
                { id: 'loading', tool: 'Loading...', description: 'Loading tools from backend...', status: 'pending' as const, progress: 0 }
              ],
              summary: {
                totalTools: 0,
                successful: 0,
                failed: 0,
                totalDuration: 0
              }
            };
            setCurrentSession(tempSession);
          }
          
          // ✅ Forcer la synchronisation avec le backend (avec gestion d'erreur)
          try {
            await refreshSessionStatus(currentConversation.pentestSession.sessionId);
          } catch (error) {
            console.error(`❌ Failed to refresh session ${currentConversation.pentestSession.sessionId}:`, error);
            // En cas d'erreur, créer une session temporaire avec les outils par défaut
            const defaultTools = ['nmap', 'masscan', 'sqlmap', 'shennina'];
            const tempSession = {
              id: currentConversation.pentestSession.sessionId,
              target: currentConversation.pentestSession.target || 'Unknown',
              status: 'completed' as const, // Marquer comme terminée si on ne peut pas la récupérer
              startTime: new Date(),
              steps: defaultTools.map((toolName, index) => ({
                id: `step-${currentConversation.pentestSession?.sessionId || 'fallback'}-${index}`,
                tool: toolName,
                description: getToolDescription(toolName),
                status: 'completed' as const,
                progress: 100
              })),
              summary: {
                totalTools: defaultTools.length,
                successful: defaultTools.length,
                failed: 0,
                totalDuration: 0
              }
            };
            setCurrentSession(tempSession);
          }
          
          // ✅ Reload complet des sessions pour s'assurer qu'on a les dernières données
          await loadPentestSessions();
        } else {
          console.log(`❌ No session found for current conversation, keeping current session if exists`);
          
          // ✅ NE PAS vider la session courante s'il n'y a pas de session pour la conversation
          // Charger toutes les sessions pour vérifier s'il y en a d'autres
          await loadPentestSessions();
          
          // ✅ Si on n'a toujours pas de session après le chargement, chercher une session active
          if (!currentSession) {
            const activeSessions = Object.values(pentestSessions).filter((session: any) => 
              session.status === 'running' || session.status === 'executing'
            );
            
            if (activeSessions.length > 0) {
              console.log(`🔄 Using active session: ${activeSessions[0].id}`);
              setCurrentSession(activeSessions[0]);
            }
          }
        }
      }, 100);
    }
  }, [currentView, saveScrollPosition, restoreScrollPosition]);
  
  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversationSidebar, setShowConversationSidebar] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  
  // State for chat
  const [newMessage, setNewMessage] = useState('');
  // Supprimé: const [isLoading, setIsLoading] = useState(false); - maintenant géré par conversation
  
  // State for pipeline
  const [currentSession, setCurrentSessionRaw] = useState<PentestSession | null>(null);
  
  // Wrapper pour logger les changements de currentSession
  const setCurrentSession = useCallback((newSession: PentestSession | null | ((prev: PentestSession | null) => PentestSession | null)) => {
    if (typeof newSession === 'function') {
      setCurrentSessionRaw(prev => {
        const result = newSession(prev);
        console.log(`🔄 CURRENT SESSION UPDATE (function):`, {
          previousSteps: prev?.steps?.length || 0,
          newSteps: result?.steps?.length || 0,
          previousId: prev?.id,
          newId: result?.id,
          stackTrace: new Error().stack?.split('\n').slice(1, 6).join('\n'),
          timestamp: new Date().toISOString()
        });
        if (prev?.steps?.length !== result?.steps?.length) {
          console.log(`⚠️ STEPS COUNT CHANGED: ${prev?.steps?.length || 0} → ${result?.steps?.length || 0}`, {
            previousSteps: prev?.steps?.map(s => ({ tool: s.tool, status: s.status })) || [],
            newSteps: result?.steps?.map(s => ({ tool: s.tool, status: s.status })) || []
          });
        }
        return result;
      });
    } else {
      console.log(`🔄 CURRENT SESSION UPDATE (direct):`, {
        previousSteps: currentSession?.steps?.length || 0,
        newSteps: newSession?.steps?.length || 0,
        previousId: currentSession?.id,
        newId: newSession?.id,
        stackTrace: new Error().stack?.split('\n').slice(1, 6).join('\n'),
        timestamp: new Date().toISOString()
      });
      if (currentSession?.steps?.length !== newSession?.steps?.length) {
        console.log(`⚠️ STEPS COUNT CHANGED: ${currentSession?.steps?.length || 0} → ${newSession?.steps?.length || 0}`, {
          previousSteps: currentSession?.steps?.map(s => ({ tool: s.tool, status: s.status })) || [],
          newSteps: newSession?.steps?.map(s => ({ tool: s.tool, status: s.status })) || []
        });
      }
      setCurrentSessionRaw(newSession);
    }
  }, [currentSession]);
  const [showSettings, setShowSettings] = useState(false);
  const [pentestSessions, setPentestSessions] = useState<Record<string, any>>({});
  
  // State for output expansion
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [outputModal, setOutputModal] = useState<{isOpen: boolean, stepId: string, content: string, title: string}>({
    isOpen: false,
    stepId: '',
    content: '',
    title: ''
  });
  
  // Fonction pour synchroniser le currentSession avec la conversation active et charger les sessions de pentest
  useEffect(() => {
    const currentConversation = getCurrentConversation();
    
    // Toujours réinitialiser la session courante quand la conversation change
    console.log(`🔄 Synchronizing pipeline session for conversation: ${currentConversationId}`);
    
    // Première priorité : Session associée à la conversation active
    if (currentConversation?.pentestSession) {
      const session = currentConversation.pentestSession;
      
      console.log(`📋 Found pentest session for conversation: ${session.sessionId}`);
      
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
      console.log(`❌ No pentest session for conversation ${currentConversationId}, checking existing session`);
      
      // ✅ CORRECTION: NE PAS vider automatiquement la session courante
      // Seulement la vider si on est en vue chat ET qu'il n'y a vraiment aucune session active
      
      if (currentView === 'chat') {
        // En vue chat, on peut vider la session si pas de session pour cette conversation
        setCurrentSession(null);
      } else if (currentView === 'pipeline') {
        // En vue pipeline, chercher d'autres sessions actives avant de vider
        const activeSessions = Object.values(pentestSessions).filter((session: any) => 
          session.status === 'running' || session.status === 'executing'
        );
        
        if (activeSessions.length > 0) {
          console.log(`🔄 No session for conversation, using active session: ${activeSessions[0].id}`);
          setCurrentSession(activeSessions[0]);
        } else {
          // Seulement vider s'il n'y a vraiment aucune session active
          console.log(`🧹 No active sessions found, clearing current session`);
          setCurrentSession(null);
        }
      }
    }
  }, [currentConversationId, currentView]); // Ajouter currentView pour réagir au changement d'onglet

  // Fonction pour charger les sessions de pentest depuis le backend
  const loadPentestSessions = useCallback(async () => {
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
            // ✅ CORRECTION: S'assurer qu'on a des tools avant de créer la session
            const sessionTools = session.tools || [];
            const sessionSteps = session.executionSteps || [];
            
            if (sessionTools.length > 0 || sessionSteps.length > 0) {
              activeSession = {
                id: session.id,
                target: session.target,
                status: session.status === 'executing' ? 'running' : session.status,
                startTime: new Date(session.startedAt || session.createdAt),
                steps: sessionTools.length > 0 
                  ? sessionTools.map((tool: any, index: number) => ({
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
                  : sessionSteps.map((step: any, index: number) => ({
                      id: step.id || `step-${step.tool}-${index}`,
                      tool: step.tool,
                      description: step.description || getToolDescription(step.tool),
                      status: step.status || 'pending',
                      output: step.output,
                      error: step.error,
                      duration: step.duration,
                      progress: step.status === 'completed' ? 100 : step.status === 'running' ? 50 : 0
                    }))
              };
            }
          }
          });
          
          // ✅ OPTIMISATION : Éviter les re-renders inutiles en comparant le contenu
          setPentestSessions(prev => {
            // Vérifier si quelque chose a vraiment changé
            const sessionsEqual = JSON.stringify(prev) === JSON.stringify(sessionsMap);
            if (sessionsEqual) {
              console.log('🔄 No changes in sessions, skipping update');
              return prev; // Retourner la référence précédente pour éviter re-render
            }
            console.log('🔄 Sessions updated:', Object.keys(sessionsMap).length);
            return sessionsMap;
          });
          
          // Si on a trouvé une session active et qu'on n'a pas de currentSession, l'activer
          if (activeSession && !currentSession && (activeSession as any).steps && (activeSession as any).steps.length > 0) {
            console.log(`🚀 Setting current session from loadPentestSessions: ${(activeSession as any).id} with ${(activeSession as any).steps.length} steps`);
            setCurrentSession(activeSession as any);
          }
        }
      }
    } catch (error) {
      console.error('Error loading pentest sessions:', error);
    }
  }, [currentSession]);

  // Fonction pour rafraîchir le statut d'une session en temps réel
  const refreshSessionStatus = useCallback(async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      console.log(`🔄 Fetching session status for: ${sessionId}`);
      
      const response = await fetch(`/api/agents/pentest-session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log(`📡 Response status: ${response.status} for session ${sessionId}`);
      
      if (response.status === 404) {
        console.warn(`⚠️ Session ${sessionId} not found (404). Creating fallback session.`);
        
        // Créer une session de fallback avec des informations basiques
        const fallbackSession = {
          id: sessionId,
          target: 'Unknown Target',
          status: 'completed' as const,
          startTime: new Date(),
          steps: [
            {
              id: 'info-missing',
              tool: 'Session Lost',
              description: 'Session data was lost (server restart or expired)',
              status: 'completed' as const,
              progress: 100,
              output: 'This session was completed but the detailed data is no longer available. The backend server may have been restarted.'
            }
          ],
          summary: {
            totalTools: 1,
            successful: 1,
            failed: 0,
            totalDuration: 0
          }
        };
        
        setCurrentSession(fallbackSession);
        return;
      }
      
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
              
              // ✅ Nouvelle logique : seulement si le résultat n'existait pas avant ou a changé
              const resultChanged = !previousResult || 
                                  previousResult.status !== 'completed' ||
                                  previousResult.output !== currentResult.output ||
                                  previousResult.error !== currentResult.error;
              
              // ✅ Vérifier aussi qu'on n'a pas déjà envoyé ce message récemment
              const conversationWithSession = conversations.find(conv => conv.pentestSession?.sessionId === sessionId);
              let hasRecentMessage = false;
              
              if (conversationWithSession) {
                const recentMessages = conversationWithSession.messages.slice(-20); // Augmenter la fenêtre
                hasRecentMessage = recentMessages.some(msg => {
                  const includesToolName = msg.content.includes(`**${toolName}**`);
                  const includesStatus = currentResult.error ? 
                    msg.content.includes('failed') : 
                    msg.content.includes('completed successfully');
                  const isRecent = Date.now() - msg.timestamp.getTime() < 60000; // 1 minute
                  
                  // Si c'est un message de résultat avec la même sortie
                  if (includesToolName && includesStatus && isRecent) {
                    const msgOutput = msg.content.match(/```\n(.*?)\n```/s)?.[1] || '';
                    const currentOutput = currentResult.output || currentResult.error || '';
                    // Comparer les premiers 200 caractères de la sortie
                    const msgPreview = msgOutput.substring(0, 200);
                    const currentPreview = currentOutput.substring(0, 200);
                    return msgPreview === currentPreview;
                  }
                  
                  return false;
                });
              }
              
              // Si c'est un nouveau résultat ET qu'on n'a pas de message récent identique
              if (resultChanged && !hasRecentMessage) {
                if (currentResult.error) {
                  updateChatWithPentestProgress(sessionId, toolName, 'failed', undefined, currentResult.error);
                } else if (currentResult.output) {
                  updateChatWithPentestProgress(sessionId, toolName, 'completed', currentResult.output);
                }
              }
            });
          }
          
          // Mettre à jour la session dans pentestSessions avec comparaison
          setPentestSessions(prev => {
            // ✅ PRIORITÉ ABSOLUE: Conserver les steps existants pour éviter les changements de compteur
            let steps = [];
            
            if (prev[sessionId]?.steps && prev[sessionId].steps.length > 0) {
              // ✅ PRIORITÉ 1: Mettre à jour les steps existants avec les nouvelles données
              steps = prev[sessionId].steps.map((existingStep: any) => {
                // Chercher les résultats pour cet outil
                const toolResult = session.results?.[existingStep.tool];
                const executionStep = session.executionSteps?.find((step: any) => step.tool === existingStep.tool);
                
                return {
                  ...existingStep,
                  status: toolResult ? 'completed' : 
                         executionStep?.status || 
                         existingStep.status, // Garder le status existant si pas de nouvelles données
                  output: toolResult?.output || executionStep?.output || existingStep.output,
                  error: toolResult?.error || executionStep?.error || existingStep.error,
                  duration: toolResult?.duration || executionStep?.duration || existingStep.duration,
                  progress: toolResult ? 100 : 
                           executionStep?.status === 'running' ? 50 : 
                           existingStep.progress || 0
                };
              });
              console.log(`✅ PENTEST-SESSIONS: ${steps.length} outils existants conservés et mis à jour`);
            } else if (session.tools && session.tools.length > 0) {
              // Cas 2: Première fois avec session.tools
              steps = session.tools.map((tool: any, index: number) => ({
                id: `step-${tool.name || tool.toolName}-${index}`,
                tool: tool.name || tool.toolName,
                description: getToolDescription(tool.name || tool.toolName),
                status: session.results?.[tool.name || tool.toolName] ? 'completed' : 'pending',
                output: session.results?.[tool.name || tool.toolName]?.output,
                error: session.results?.[tool.name || tool.toolName]?.error,
                duration: session.results?.[tool.name || tool.toolName]?.duration,
                progress: session.results?.[tool.name || tool.toolName] ? 100 : 0
              }));
              console.log(`✅ PENTEST-SESSIONS: ${steps.length} outils créés depuis session.tools`);
            } else if (session.executionSteps && session.executionSteps.length > 0) {
              // Cas 3: Première fois avec session.executionSteps
              steps = session.executionSteps.map((step: any, index: number) => ({
                id: step.id || `step-${step.tool}-${index}`,
                tool: step.tool,
                description: step.description || getToolDescription(step.tool),
                status: step.status || 'pending',
                output: step.output,
                error: step.error,
                duration: step.duration,
                progress: step.status === 'completed' ? 100 : step.status === 'running' ? 50 : 0
              }));
              console.log(`✅ PENTEST-SESSIONS: ${steps.length} outils créés depuis executionSteps`);
            } else {
              // Cas 4: Fallback - créer les outils par défaut
              const defaultTools = ['nmap', 'masscan', 'sqlmap', 'shennina'];
              steps = defaultTools.map((toolName, index) => ({
                id: `step-${toolName}-${index}`,
                tool: toolName,
                description: getToolDescription(toolName),
                status: 'pending',
                progress: 0
              }));
              console.log(`⚠️ PENTEST-SESSIONS: ${steps.length} outils par défaut créés`);
            }
            
            const newSessionData = {
              id: session.id,
              target: session.target,
              status: session.status === 'executing' ? 'running' : session.status,
              startTime: new Date(session.startedAt || session.createdAt),
              steps: steps
            };
            
            // ✅ Comparer avec la session précédente pour éviter re-renders inutiles
            if (prev[sessionId] && JSON.stringify(prev[sessionId]) === JSON.stringify(newSessionData)) {
              console.log(`🔄 No changes in session ${sessionId}, skipping update`);
              return prev;
            }
            
            console.log(`🔄 Session ${sessionId} updated with new data`);
            return {
              ...prev,
              [sessionId]: newSessionData
            };
          });
          
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
          
          // Si c'est la session courante, la mettre à jour avec comparaison
          if (currentSession?.id === sessionId) {
            console.log(`🔄 REFRESH SESSION: Updating current session ${sessionId}`, {
              sessionId,
              source: 'refreshSessionStatus - currentSession update',
              timestamp: new Date().toISOString()
            });
            
            setCurrentSession(prev => {
              if (!prev) {
                console.log(`❌ NO PREVIOUS SESSION to update`);
                return null;
              }
              
              console.log(`🔍 REFRESH SESSION - Backend data:`, {
                sessionId,
                backendTools: session.tools?.length || 0,
                backendExecutionSteps: session.executionSteps?.length || 0,
                previousSteps: prev.steps?.length || 0,
                source: 'refreshSessionStatus - backend data inspection'
              });
          
          // ✅ PRIORITÉ 1: Toujours conserver les steps existants si on en a
          let steps = [];
          
          if (prev.steps && prev.steps.length > 0) {
            // ✅ PRIORITÉ 1: Mettre à jour les steps existants avec les nouvelles données
            steps = prev.steps.map(existingStep => {
              // Chercher les résultats pour cet outil
              const toolResult = session.results?.[existingStep.tool];
              const executionStep = session.executionSteps?.find((step: any) => step.tool === existingStep.tool);
              
              return {
                ...existingStep,
                status: toolResult ? 'completed' : 
                       executionStep?.status || 
                       existingStep.status, // Garder le status existant si pas de nouvelles données
                output: toolResult?.output || executionStep?.output || existingStep.output,
                error: toolResult?.error || executionStep?.error || existingStep.error,
                duration: toolResult?.duration || executionStep?.duration || existingStep.duration,
                progress: toolResult ? 100 : 
                         executionStep?.status === 'running' ? 50 : 
                         existingStep.progress || 0
              };
            });
            console.log(`✅ REFRESH SESSION - CASE 1: Updating ${steps.length} existing steps`, {
              sessionId,
              stepsCount: steps.length,
              source: 'refreshSessionStatus - existing steps update'
            });
          } else if (session.tools && session.tools.length > 0) {
            // Cas 2: Première fois avec session.tools
            steps = session.tools.map((tool: any, index: number) => ({
                id: `step-${tool.name || tool.toolName}-${index}`,
                tool: tool.name || tool.toolName,
                description: getToolDescription(tool.name || tool.toolName),
              status: session.results?.[tool.name || tool.toolName] ? 'completed' : 'pending',
                output: session.results?.[tool.name || tool.toolName]?.output,
                error: session.results?.[tool.name || tool.toolName]?.error,
                duration: session.results?.[tool.name || tool.toolName]?.duration,
              progress: session.results?.[tool.name || tool.toolName] ? 100 : 0
            }));
            console.log(`✅ REFRESH SESSION - CASE 2: Creating ${steps.length} steps from session.tools`, {
              sessionId,
              stepsCount: steps.length,
              source: 'refreshSessionStatus - session.tools'
            });
          } else if (session.executionSteps && session.executionSteps.length > 0) {
            // Cas 3: Première fois avec session.executionSteps
            steps = session.executionSteps.map((step: any, index: number) => ({
              id: step.id || `step-${step.tool}-${index}`,
              tool: step.tool,
              description: step.description || getToolDescription(step.tool),
              status: step.status || 'pending',
              output: step.output,
              error: step.error,
              duration: step.duration,
              progress: step.status === 'completed' ? 100 : step.status === 'running' ? 50 : 0
            }));
            console.log(`✅ REFRESH SESSION - CASE 3: Creating ${steps.length} steps from executionSteps`, {
              sessionId,
              stepsCount: steps.length,
              source: 'refreshSessionStatus - executionSteps'
            });
          } else {
            // Cas 4: Fallback - créer les outils par défaut
            const defaultTools = ['nmap', 'masscan', 'sqlmap', 'shennina'];
            steps = defaultTools.map((toolName, index) => ({
              id: `step-${toolName}-${index}`,
              tool: toolName,
              description: getToolDescription(toolName),
              status: 'pending',
              progress: 0
            }));
            console.log(`⚠️ REFRESH SESSION - CASE 4: Creating ${steps.length} default steps (fallback)`, {
              sessionId,
              stepsCount: steps.length,
              source: 'refreshSessionStatus - fallback'
            });
          }
          
          const newCurrentSession = {
            ...prev,
            status: session.status === 'executing' ? 'running' : session.status,
            steps: steps
          };
          
          console.log(`🔢 REFRESH SESSION - Final steps count: ${steps.length}`, {
            sessionId,
            stepsCount: steps.length,
            steps: steps.map((s: any) => ({ tool: s.tool, status: s.status })),
            source: 'refreshSessionStatus - final newCurrentSession creation'
          });
              
              // ✅ Comparer avec la session courante précédente
              if (JSON.stringify(prev) === JSON.stringify(newCurrentSession)) {
                console.log(`🔄 REFRESH SESSION - No changes detected, keeping previous session`);
                return prev;
              }
              
              console.log(`🔄 REFRESH SESSION - Changes detected, updating session with ${steps.length} steps`);
              return newCurrentSession;
            });
          }
          
          console.log(`🔄 Session ${sessionId} status updated: ${session.status}`);
        }
      }
    } catch (error) {
      console.error(`Error refreshing session ${sessionId}:`, error);
    }
  }, [currentSession, conversations, pentestSessions]);

  // Charger les sessions au démarrage
  useEffect(() => {
    loadPentestSessions();
  }, [loadPentestSessions]);

  // Periodic update of active sessions - AMÉLIORATION TEMPS RÉEL
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentView === 'pipeline') {
      // ✅ TEMPS RÉEL pour vue pipeline: polling toutes les 2 secondes
      interval = setInterval(async () => {
        console.log('🔄 Pipeline real-time update check...');
        
        // Vérifier s'il y a une session courante
        if (currentSession) {
          console.log(`🔄 Refreshing session ${currentSession.id}`);
          await refreshSessionStatus(currentSession.id);
        }
        
        // Vérifier toutes les sessions actives des conversations
        for (const conv of conversations) {
          if (conv.pentestSession && conv.pentestSession.status === 'executing') {
            console.log(`🔄 Refreshing conversation session ${conv.pentestSession.sessionId}`);
            await refreshSessionStatus(conv.pentestSession.sessionId);
          }
        }
        
        // ✅ OPTIMISATION : Charger toutes les sessions seulement si nécessaire (moins fréquent)
        // Uniquement toutes les 10 itérations (20 secondes) au lieu de toutes les 2 secondes
        const pollCount = (window as any).pollCount || 0;
        (window as any).pollCount = pollCount + 1;
        
        if (pollCount % 10 === 0) {
          console.log('🔄 Full sessions reload (every 20s)');
        await loadPentestSessions();
        }
      }, 2000); // ✅ 2 secondes pour temps réel
      
      console.log('⚡ Pipeline real-time polling started (2s interval)');
    } else {
      // ✅ Mode normal pour autres vues: polling plus lent
      interval = setInterval(async () => {
        const hasActiveSessions = conversations.some(conv => 
          conv.pentestSession && 
          (conv.pentestSession.status === 'executing')
        );
        
        if (hasActiveSessions) {
          console.log('🔄 Background update for active sessions');
          for (const conv of conversations) {
            if (conv.pentestSession && conv.pentestSession.status === 'executing') {
              await refreshSessionStatus(conv.pentestSession.sessionId);
            }
          }
        }
      }, 15000); // 15 secondes en arrière-plan
      
      console.log('📡 Background polling started (15s interval)');
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('🛑 Polling stopped');
      }
    };
  }, [currentView, refreshSessionStatus, loadPentestSessions, currentSession, conversations]); // ✅ Ajouter toutes les dépendances stables
  
  // ✅ OPTIMISATION : Préserver la position de scroll pendant les mises à jour
  useEffect(() => {
    if (currentView === 'pipeline') {
      // Sauvegarder automatiquement la position de scroll toutes les secondes
      const saveInterval = setInterval(() => {
        saveScrollPosition('pipeline-container');
        saveScrollPosition('pipeline-steps');
      }, 1000);
      
      return () => clearInterval(saveInterval);
    } else if (currentView === 'chat') {
      const saveInterval = setInterval(() => {
        saveScrollPosition('chat-container');
        saveScrollPosition('conversations-sidebar');
      }, 1000);
      
      return () => clearInterval(saveInterval);
    }
  }, [currentView, saveScrollPosition]);
  
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
    
    // ✅ Analyse intelligente du type de machine/cible
    const isLocalMachine = target.includes('127.0.0.1') || 
                          target.includes('localhost') || 
                          target.includes('192.168.') ||
                          target.includes('10.0.') ||
                          target.includes('172.16.');
    
    const isInfrastructureTarget = target.includes('router') || 
                                  target.includes('switch') || 
                                  target.includes('firewall') ||
                                  target.match(/\d+\.\d+\.\d+\.1$/); // Gateway IPs
    
    return pentestConfigs.map(config => {
      let adaptedConfig = { ...config };
      
      // ✅ Logique d'analyse intelligente - désactiver certains outils selon le contexte
      if (isLocalMachine || isInfrastructureTarget) {
        // Pour les machines locales/infrastructure, désactiver les outils web
        if (config.toolName === 'nikto') {
          adaptedConfig.enabled = false;
          adaptedConfig.parameters = {
            ...config.parameters,
            analysisResult: 'Not suitable for local/infrastructure targets - Web vulnerability scanner'
          };
        }
        
        if (config.toolName === 'gobuster') {
          adaptedConfig.enabled = false;
          adaptedConfig.parameters = {
            ...config.parameters,
            analysisResult: 'Not suitable for infrastructure targets - Directory enumeration tool'
          };
        }
        
        if (config.toolName === 'gan-fuzzer') {
          adaptedConfig.enabled = false;
          adaptedConfig.parameters = {
            ...config.parameters,
            analysisResult: 'Not suitable for local machine - AI fuzzer optimized for web applications'
          };
        }
      }
      
      // Adapter les paramètres pour les outils restants selon le type de cible
      if (config.toolName === 'shennina' && adaptedConfig.enabled) {
        adaptedConfig.parameters = {
          ...config.parameters,
          target: target,
          mode: isWebTarget ? 'web' : 'network'
        };
      }
      
      if (config.toolName === 'gan-fuzzer' && adaptedConfig.enabled) {
        adaptedConfig.parameters = {
          ...config.parameters,
          target: target,
          mode: isWebTarget ? 'web' : 'api',
          threads: isWebTarget ? 15 : 10
        };
      }
      
      if (config.toolName === 'nikto' && adaptedConfig.enabled) {
        adaptedConfig.parameters = {
          ...config.parameters,
          port: isWebTarget ? 443 : 80,
          ssl: isWebTarget
        };
      }
      
      if (config.toolName === 'gobuster' && adaptedConfig.enabled) {
        adaptedConfig.parameters = {
          ...config.parameters,
          url: isWebTarget ? `https://${target}` : `http://${target}`
        };
      }
      
      return adaptedConfig;
    });
  };
  
  // Keywords to detect pentest requests - more specific
  const pentestKeywords = [
    'pentest', 'penetration test', 'vulnerability scan', 'security audit',
    'network reconnaissance', 'security test', 'security verification',
    'vulnerability analysis', 'intrusion test', 'penetration audit'
  ];

  // Functions for output expansion
  const toggleOutputExpansion = (stepId: string) => {
    setExpandedOutputs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const openOutputModal = (stepId: string, content: string, title: string) => {
    setOutputModal({
      isOpen: true,
      stepId,
      content,
      title
    });
  };

  const closeOutputModal = () => {
    setOutputModal({
      isOpen: false,
      stepId: '',
      content: '',
      title: ''
    });
  };

  // Function to preserve text formatting
  const formatOutput = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
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
    
    // Exclude messages that are just general cybersecurity questions (French and English)
    const generalQuestions = [
      // French
      'qu\'est-ce que', 'comment', 'pourquoi', 'expliquer', 'définir', 
      'c\'est quoi', 'aide-moi', 'peux-tu', 'que fait', 'que signifie',
      // English
      'what is', 'how do', 'why', 'explain', 'define', 
      'what does', 'help me', 'can you', 'what means', 'tell me about'
    ];
    
    const isGeneralQuestion = generalQuestions.some(q => 
      message.content.toLowerCase().includes(q)
    );
    
    // Show button only if:
    // 1. Has pentest keywords AND valid target
    // 2. OR if it's a direct pentest request (even without target)
    const isDirectPentestRequest = message.content.toLowerCase().includes('pentest') || 
                                  message.content.toLowerCase().includes('test de pénétration') ||
                                  message.content.toLowerCase().includes('penetration test') ||
                                  (message.content.toLowerCase().includes('lance') && hasPentestKeywords) ||
                                  (message.content.toLowerCase().includes('launch') && hasPentestKeywords) ||
                                  (message.content.toLowerCase().includes('start') && hasPentestKeywords);
    
    if (isDirectPentestRequest && !isGeneralQuestion) {
      return true;
    }
    
    // For other cases, require both keywords AND valid target
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
    return `msg-${Date.now()}-${messageCounter.current}-${Math.random().toString(36).substr(2, 9)}`;
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

  // Component to display content with smart truncation and modal for very long outputs
  const TruncatedContent: React.FC<{ content: string; maxLength?: number }> = ({ content, maxLength = 1000 }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Only truncate if content is VERY long AND contains tool outputs, code blocks, or is clearly system output
    const hasCodeBlocks = /```[\s\S]*?```/.test(content);
    const hasToolOutput = content.includes('Starting Nmap') || content.includes('Starting masscan') || content.includes('Starting Nikto') || content.includes('Gobuster') || content.includes('sqlmap') || content.includes('SHENNINA') || content.includes('GAN Fuzzer');
    const isVeryLong = content.length > maxLength;
    
    // Only truncate content that is very long AND appears to be tool output
    const shouldTruncate = isVeryLong && (hasCodeBlocks || hasToolOutput);
    
    if (!shouldTruncate) {
      return <span>{formatBoldText(content)}</span>;
    }
    
    const truncated = content.substring(0, maxLength) + '...';
    
    return (
      <>
        <span>{formatBoldText(truncated)}</span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-2 text-blue-500 hover:text-blue-700 text-sm font-medium"
        >
          View more
        </button>
        
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Full Content</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm">
                {formatBoldText(content)}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const createNewConversation = () => {
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
  };

  const switchConversation = (conversationId: string) => {
    console.log(`🔄 Switching conversation from ${currentConversationId} to ${conversationId}`);
    
    // ✅ NE PAS vider currentSession si on reste sur la même conversation
    if (currentConversationId !== conversationId) {
      console.log(`🔄 Different conversation, clearing current session`);
    setCurrentSession(null);
    } else {
      console.log(`🔄 Same conversation, keeping current session`);
    }
    
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
    
    // 🔥 CRITIQUE: Nettoyer la session de pentest si elle appartient à cette conversation
    const conversationToDelete = conversations.find(conv => conv.id === conversationId);
    if (conversationToDelete?.pentestSession?.sessionId) {
      const sessionId = conversationToDelete.pentestSession.sessionId;
      console.log(`🗑️ Cleaning up pentest session ${sessionId} for deleted conversation ${conversationId}`);
      
      // Supprimer de pentestSessions
      setPentestSessions(prev => {
        const newSessions = { ...prev };
        delete newSessions[sessionId];
        return newSessions;
      });
      
      // Si c'est la session courante, la vider
      if (currentSession?.id === sessionId) {
        console.log(`🗑️ Clearing current session ${sessionId}`);
        setCurrentSession(null);
      }
    }
    
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

  // Function to add a message to a specific conversation (for background processing)
  const addMessageToConversation = (conversationId: string, content: string, isAgent: boolean = true, type: string = 'info') => {
    // Check for duplicate messages to prevent spam
    const targetConv = conversations.find(c => c.id === conversationId);
    if (targetConv) {
      // Check if the same message was added recently (last 3 messages)
      const recentMessages = targetConv.messages.slice(-3);
      const isDuplicate = recentMessages.some(msg => 
        msg.content === content && 
        msg.isAgent === isAgent && 
        Date.now() - msg.timestamp.getTime() < 30000 // Within 30 seconds
      );
      
      if (isDuplicate) {
        console.log('🚫 Duplicate message prevented:', content.substring(0, 50) + '...');
        return;
      }
    }

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

    // Update conversation title if it's the first message
    if (targetConv && targetConv.messages.length === 0 && !isAgent) {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      updateConversationTitle(conversationId, title);
    }

    // ✅ Use updated state directly for saving
    setTimeout(() => {
      // Get conversation with new message
      setConversations(current => {
        const updatedConv = current.find(c => c.id === conversationId);
        if (updatedConv) {
          saveChatHistory(conversationId, updatedConv.messages);
        }
        return current; // No change, just to access current state
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

  // Function to detect local IP
  const getLocalIP = (): string => {
    // Fallback to common local IP
    return '192.168.1.176';
  };

  // Function to extract target with automatic local IP detection
  const extractTarget = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect self-testing requests (French and English) - be more specific
    if ((lowerPrompt.includes('attaque moi') && lowerPrompt.includes('pentest')) || 
        (lowerPrompt.includes('test moi') && (lowerPrompt.includes('pentest') || lowerPrompt.includes('hack') || lowerPrompt.includes('scan'))) || 
        lowerPrompt.includes('test de m\'attaquer') ||
        (lowerPrompt.includes('test moi même') && lowerPrompt.includes('pentest')) ||
        (lowerPrompt.includes('attaque moi même') && lowerPrompt.includes('pentest')) ||
        (lowerPrompt.includes('attack me') && lowerPrompt.includes('pentest')) ||
        (lowerPrompt.includes('test me') && lowerPrompt.includes('pentest')) ||
        (lowerPrompt.includes('scan me') && (lowerPrompt.includes('security') || lowerPrompt.includes('vulnerability'))) ||
        lowerPrompt.includes('pentest me') ||
        (lowerPrompt.includes('test myself') && lowerPrompt.includes('pentest'))) {
      return getLocalIP();
    }
    
    // Extract existing IP
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?\b/g;
    const ips = prompt.match(ipPattern);
    if (ips && ips.length > 0) {
      return ips[0];
    }
    
    // Extract domain
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
      addChatMessage('❌ No valid target detected. Please specify an IP, domain or URL.', false, 'error');
      return;
    }

    const currentConversation = getCurrentConversation();
    if (!currentConversation) {
      addChatMessage('❌ Error: No active conversation.', false, 'error');
      return;
    }

    try {
      addChatMessage(`🚀 **Starting pentest on ${target}**\n\nInitializing...`, false, 'pentest-start');
      
      // Trigger the automatic pentest through the chat system
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Launch automatic pentest now on ${target}`,
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
        addChatMessage(`✅ Pentest session ${data.pentestSession} created and running on ${data.target}`, true, 'pentest-started');
        
        // Visual indicator in chat before switch
        addChatMessage('🔧 Switching to pipeline view for real-time monitoring in 3 seconds...', true, 'info');
        
        // ✅ Initialize the pipeline session IMMEDIATELY to avoid 0/0 display
        initializePipelineSession(data.pentestSession, data.target, data.tools || []);
        
        // Switch automatically to pipeline view after a delay
        setTimeout(() => {
          switchView('pipeline');
        }, 3000);
      } else {
        // Add regular response
        addChatMessage(data.response || '✅ Pentest launched successfully', true, 'info');
      }

      // Force reload chat history to get updated pentest session info
      setTimeout(() => {
        loadChatHistory(currentConversation.id);
      }, 1000);

    } catch (error) {
      console.error('Error starting pentest pipeline:', error);
      addChatMessage('❌ Error starting pentest. Please try again.', false, 'error');
    }
  };

  // Function to update status messages in chat in real-time
  const updateChatWithPentestProgress = (sessionId: string, toolName: string, status: string, output?: string, error?: string) => {
    const conversationWithSession = conversations.find(conv => conv.pentestSession?.sessionId === sessionId);
    if (!conversationWithSession) return;

    // ✅ Déduplication simplifiée et moins agressive pour éviter les suppressions intempestives
    const recentMessages = conversationWithSession.messages.slice(-5); // Réduire drastiquement la fenêtre de vérification
    
    const hasExactDuplicate = recentMessages.some(msg => {
      // Vérification stricte : même outil ET même statut ET même contenu ET très récent (< 5 secondes)
      const includesToolName = msg.content.includes(`**${toolName}**`);
      const includesStatus = msg.content.includes(status === 'running' ? 'running' : status === 'completed' ? 'completed successfully' : 'failed');
      const isVeryRecent = Date.now() - msg.timestamp.getTime() < 5000; // Seulement 5 secondes pour éviter les vrais doublons
      
      // Pour les messages de statut simple (running, failed sans output), vérification basique
      if (status === 'running' || (status === 'failed' && !error)) {
        return includesToolName && includesStatus && isVeryRecent;
      }
      
      // Pour les messages avec output/error, vérifier le contenu spécifique plus strictement
      if (output || error) {
        const contentToCheck = (output || error || '').substring(0, 50);
        const exactContentMatch = msg.content.includes(contentToCheck);
        return includesToolName && includesStatus && exactContentMatch && isVeryRecent;
      }
      
      return includesToolName && includesStatus && isVeryRecent;
    });

    if (hasExactDuplicate) {
      console.log(`🚫 Exact duplicate message prevented for ${toolName} (${status}) within 5 seconds`);
      return;
    }

    let statusMessage = '';
    let messageType: 'info' | 'success' | 'error' = 'info';

    switch (status) {
      case 'running':
        statusMessage = `🔄 **${toolName}** running...`;
        messageType = 'info';
        break;
      case 'completed':
        statusMessage = `✅ **${toolName}** completed successfully`;
        // ✅ Suppression de l'affichage des outputs dans le chat - disponibles dans Pipeline
        messageType = 'success';
        break;
      case 'failed':
        statusMessage = `❌ **${toolName}** failed`;
        if (error) {
          statusMessage += `\nError: \`${error}\``;
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
      nmap: 'Port scanning and service discovery',
      masscan: 'Fast port scanning',
      nikto: 'Web vulnerability scanner',
      gobuster: 'Web directory brute forcing',
      sqlmap: 'SQL injection testing',
      shennina: 'AI automated pentesting (AI4SIM)',
      'gan-fuzzer': 'AI vulnerability fuzzing (AI4SIM)'
    };
    return descriptions[tool] || 'Pentesting tool';
  };

  const forcePentest = () => {
    const target = prompt('Enter target (IP or domain):');
    if (target) {
      startPentestPipeline(`Launch pentest on ${target}`);
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
    
    // ✅ Ajouter un message temporaire pour informer l'utilisateur
    const tempLoadingMessage = `🤖 **Thinking...** Please wait while I process your request.`;
    addMessageToConversation(conversationId, tempLoadingMessage, true, 'loading');
    
    try {
      // Call the real AI agent API with current AI settings
      const token = localStorage.getItem('token');
      
      // ✅ Ajouter un timeout côté frontend (2 minutes pour les requêtes normales)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('🚨 Request aborted due to 2min timeout');
      }, 120000);
      
      try {
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
          }),
          signal: controller.signal
      });
        
        clearTimeout(timeoutId);

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
        
        // ✅ Switch automatiquement vers Pipeline après 3 secondes
        // ✅ Initialize the pipeline session IMMEDIATELY to avoid 0/0 display
        initializePipelineSession(data.pentestSession, data.target, data.tools || []);
        
        setTimeout(() => {
          console.log('🔄 Auto-switching to pipeline view for pentest monitoring');
          switchView('pipeline');
        }, 3000);
      } else {
        // ✅ Supprimer le message de loading avant d'ajouter la vraie réponse
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages: conv.messages.filter(msg => msg.type !== 'loading')
              }
            : conv
        ));
        
        // Handle regular responses or other pentest responses
        
        // Function to check if text contains a real pentest request
        const isRealPentestRequest = (text: string): boolean => {
          const lowerText = text.toLowerCase();
          
          // Check if text contains specific pentest keywords (more restrictive)
          const pentestKeywords = [
            'pentest', 'penetration test', 'vulnerability scan', 'security audit', 'security test',
            'network scan', 'port scan', 'security assessment', 'vulnerability assessment',
            'hack', 'attack', 'exploit', 'intrusion test',
            // French keywords for backward compatibility  
            'test de pénétration', 'audit de sécurité', 'scan de vulnérabilité',
            'lancer un pentest', 'démarrer un scan', 'attaquer'
          ];
          
          // More specific matching - require more context
          const hasPentestKeywords = pentestKeywords.some(keyword => 
            lowerText.includes(keyword.toLowerCase())
          ) || (
            // More restrictive single word matches - require additional context
            (lowerText.includes('scan') || lowerText.includes('test')) && 
            (lowerText.includes('security') || lowerText.includes('vulnerability') || 
             lowerText.includes('network') || lowerText.includes('port') ||
             lowerText.includes('sécurité') || lowerText.includes('vulnérabilité'))
          );
          
          // Check if text contains a valid target
          const hasValidTarget = extractTarget(text) !== '';
          
          // Exclude common false positives
          const falsePositives = ['hi', 'hello', 'bonjour', 'salut', 'help', 'aide'];
          const isFalsePositive = falsePositives.some(fp => lowerText.trim() === fp);
          
          // Text must contain keywords AND a valid target AND not be a false positive
          return hasPentestKeywords && hasValidTarget && !isFalsePositive;
        };
        
        // Check if original message was a pentest request (don't check AI response)
        const originalIsPentestRequest = isRealPentestRequest(userMessage);
        
        if (originalIsPentestRequest) {
          const target = extractTarget(userMessage);
          if (target) {
            const adaptedTools = getAdaptedTools(target);
            const enabledTools = adaptedTools.filter(config => config.enabled);
            const disabledTools = adaptedTools.filter(config => !config.enabled);
            
            const toolsList = enabledTools.map(config => {
              const description = getToolDescription(config.toolName);
              const isAI4SIM = config.toolName === 'shennina' || config.toolName === 'gan-fuzzer';
              return `• ${config.toolName}${isAI4SIM ? ' (AI4SIM)' : ''}: ${description}`;
            }).join('\n');

            // ✅ List of disabled tools with reasons
            const disabledToolsList = disabledTools.length > 0 ? disabledTools.map(config => {
              const reason = config.parameters.analysisResult || 'Not suitable for this target';
              const isAI4SIM = config.toolName === 'shennina' || config.toolName === 'gan-fuzzer';
              return `• ${config.toolName}${isAI4SIM ? ' (AI4SIM)' : ''}: ${reason}`;
            }).join('\n') : '';
            
            // ✅ Message with intelligent analysis and disabled tools - FULLY ENGLISH
            addMessageToConversation(conversationId, `🔍 **Pentest Analysis Complete for ${target}**

┌───────────────────────────────────────────────┐
│  🎯 **INTELLIGENT TARGET ANALYSIS**          │
└───────────────────────────────────────────────┘

**📋 Analysis Summary:**
• **Target:** \`${target}\`
• **Tools Evaluated:** ${adaptedTools.length}
• **Tools Selected:** ${enabledTools.length}
• **Tools Excluded:** ${disabledTools.length}

✅ **SELECTED TOOLS**
${toolsList}

${disabledTools.length > 0 ? `❌ **EXCLUDED TOOLS (AI Analysis)**
${disabledToolsList}

` : ''}**🚀 Ready to Launch Pentest?**
Click the button below to start the automated security assessment.`, true, 'pentest-suggestion');
            
          } else {
            const defaultTools = pentestConfigs.filter(config => config.enabled).map(config => {
              const description = getToolDescription(config.toolName);
              const isAI4SIM = config.toolName === 'shennina' || config.toolName === 'gan-fuzzer';
              return `• ${config.toolName}${isAI4SIM ? ' (AI4SIM)' : ''}: ${description}`;
            }).join('\n');
            
            addMessageToConversation(conversationId, `🔍 **Penetration Testing Tools Available**

╭─────────────────────────────────────────────────────╮
│  🛠️ **PENETRATION TESTING TOOLKIT**               │
╰─────────────────────────────────────────────────────╯

**Available Tools:**
${defaultTools}

**📝 Instructions:**
Please specify a target (IP, domain, or URL) to launch the automated pentest.

**Examples:**
• "Launch pentest on 192.168.1.1"
• "Test example.com"
• "Scan 10.0.0.0/24"`, true, 'pentest-suggestion-no-target');
          }
        } else {
          // Regular chat response from AI - ajouter à la conversation spécifique
          addMessageToConversation(conversationId, data.response, true, 'info');
        }
      }
      
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error calling AI agent:', error);
      
      // ✅ Gestion spécifique des différents types d'erreurs
      let errorMessage = `❌ **Error**: Failed to get AI response. Please check your AI settings in Settings > AI Settings.`;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `⏱️ **Request Timeout**: The AI took too long to respond (>2min). This might be because:\n\n• The AI model is busy or overloaded\n• Network connectivity issues\n• Complex request requiring more processing time\n\n**💡 Try:**\n• Simplifying your request\n• Waiting a moment and trying again\n• Using a different AI model if available`;
        } else if (error.message.includes('timeout')) {
          errorMessage = `⏱️ **Timeout Error**: The AI service timed out. Please try again in a moment.`;
        } else if (error.message.includes('Network')) {
          errorMessage = `🌐 **Network Error**: Unable to reach the AI service. Please check your connection.`;
        }
      }
      
      // ✅ Supprimer le message de loading en cas d'erreur aussi
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              messages: conv.messages.filter(msg => msg.type !== 'loading')
            }
          : conv
      ));
      
      addMessageToConversation(conversationId, errorMessage, true, 'error');
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
      addChatMessage('❌ No active session to generate report.', true, 'error');
      return;
    }
    
    addChatMessage('📊 **Generating report...**', true, 'info');
    
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
            provider: 'ollama',
            model: 'llama3.2:latest',
            baseUrl: 'http://localhost:11434',
            apiKey: ''
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
        
        // Build detailed message with intelligent report
        let reportMessage = `📊 **AI-GENERATED SECURITY REPORT**

🎯 **Target:** ${report.target}
📅 **Date:** ${new Date().toLocaleDateString()}
⏱️ **Duration:** ${report.statistiques?.totalExecutionTime ? Math.round(report.statistiques.totalExecutionTime / 1000) : 0}s

📋 **EXECUTIVE SUMMARY**
${report.executiveSummary || 'Security analysis completed'}

📖 **ATTACK NARRATIVE**
${report.attackNarrative || 'Pentest tools executed successfully'}

🛠️ **METHODOLOGY USED**
${report.methodologyUsed?.map((method: string) => `• ${method}`).join('\n') || 'Standard pentest tools'}

📊 **STATISTICS**
• Ports scanned: ${report.statistiques?.totalPortsScanned || 0}
• Open ports: ${report.statistiques?.openPorts || 0}
• Vulnerabilities found: ${report.statistiques?.vulnerabilitiesFound || 0}
• Risk score: ${report.riskScore || 50}/100

🔍 **IDENTIFIED VULNERABILITIES**
${report.findings?.length > 0 ? 
  report.findings.map((finding: any, index: number) => 
    `${index + 1}. **${finding.vulnerability}** (${finding.severity?.toUpperCase()})
   Service: ${finding.service}:${finding.port}
   Impact: ${finding.impact}
   Fix: ${finding.fix}`
  ).join('\n\n') : 
  'No critical vulnerabilities identified'
}

🎯 **REMEDIATION PLAN**
${report.remediationPlan?.length > 0 ? 
  report.remediationPlan.map((item: any, index: number) => 
    `${index + 1}. **${item.vulnerability}** (Priority ${item.priority})
   Estimated effort: ${item.estimatedEffort}
   Business impact: ${item.businessImpact}
   Solution: ${item.fix}`
  ).join('\n\n') : 
  'No urgent remediation required'
}

💡 **RECOMMENDATIONS**
${report.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || 'Perform regular security testing'}

🚀 **NEXT STEPS**
${report.nextSteps?.map((step: string) => `• ${step}`).join('\n') || 'Analyze results in detail'}`;

        addChatMessage(reportMessage, true, 'success');
        
        // Créer un lien de téléchargement pour le rapport complet
        const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportLink = document.createElement('a');
        reportLink.href = reportUrl;
        reportLink.download = `ai4sim-rapport-${currentSession.target}-${new Date().toISOString()}.json`;
        reportLink.click();
        URL.revokeObjectURL(reportUrl);
        
        addChatMessage(`📁 **Report downloaded!** File: \`ai4sim-report-${currentSession.target}-${new Date().toISOString()}.json\``, true, 'info');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      addChatMessage(`❌ **Error generating report**: ${error instanceof Error ? error.message : 'Unknown error'}`, true, 'error');
    }
  };

  const exportSessionData = async () => {
    if (!currentSession) {
      addChatMessage('❌ No active session to export.', true, 'error');
      return;
    }
    
    addChatMessage('📁 **Exporting data...**', true, 'info');
    
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
      
      addChatMessage(`📁 **Session data exported!**

Downloaded file: \`pentest-session-${currentSession.id}.json\`
Contains all session data for external analysis.`, true, 'success');
    } catch (error) {
      console.error('❌ Error exporting session:', error);
      addChatMessage(`❌ **Export error**: ${error instanceof Error ? error.message : 'Unknown error'}`, true, 'error');
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
            🚀 Active Pentest Session
          </h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            session.status === 'completed' ? 'bg-green-100 text-green-800' :
            session.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {session.status === 'analyzing' ? 'Analyzing' :
             session.status === 'executing' ? 'Executing' :
             session.status === 'completed' ? 'Completed' : 'Failed'}
          </span>
        </div>
        
        <div className={`text-sm ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
          <p><strong>Target:</strong> {session.target}</p>
          <p><strong>Session ID:</strong> {session.sessionId}</p>
          <p><strong>Progress:</strong> {completedTools}/{totalTools} tools completed</p>
        </div>

        {session.finalReport && (
          <div className="mt-3 p-3 rounded bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">
              ✅ Smart report generated automatically
            </p>
          </div>
        )}
      </div>
    );
  };

  // Fonction pour initialiser la session pipeline avec mises à jour en temps réel
  const initializePipelineSession = (sessionId: string, target: string, tools: string[]) => {
    console.log(`🚀 INITIALIZE PIPELINE SESSION: ${sessionId} with ${tools.length} tools`, {
      sessionId,
      target,
      tools,
      source: 'initializePipelineSession',
      timestamp: new Date().toISOString()
    });
    
    // ✅ Créer une session temporaire immédiatement pour éviter l'affichage "0 tools"
    const steps: ExecutionStep[] = tools.map((toolName, index) => ({
      id: `step-${sessionId}-${index}`,
      tool: toolName,
      description: getToolDescription(toolName),
      status: 'pending',
      progress: 0
    }));

    const session: PentestSession = {
      id: sessionId,
      target: target,
      status: 'running',
      startTime: new Date(),
      steps: steps,
      summary: {
        totalTools: tools.length,
        successful: 0,
        failed: 0,
        totalDuration: 0
      }
    };

    console.log(`🔢 INITIALIZING WITH ${steps.length} STEPS:`, {
      sessionId,
      stepsCount: steps.length,
      steps: steps.map(s => ({ tool: s.tool, status: s.status })),
      source: 'initializePipelineSession - setCurrentSession call',
      timestamp: new Date().toISOString()
    });

    setCurrentSession(session);
    
    // ✅ Synchroniser immédiatement avec le backend pour obtenir les vraies données
    setTimeout(async () => {
      console.log(`🔄 Syncing pipeline session ${sessionId} with backend...`);
      await refreshSessionStatus(sessionId);
    }, 500);
    
    // Start listening for real-time updates
    startPipelineUpdates(sessionId);
  };

  // Fonction pour démarrer les mises à jour en temps réel de la pipeline
  const startPipelineUpdates = (sessionId: string) => {
    // Listen for WebSocket events for this session
    // Note: WebSocket functionality would be implemented separately
    console.log(`📡 Starting pipeline updates for session ${sessionId}`);
    
    // Polling alternative for real-time updates
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/agents/pentest-session/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            // Update pipeline with latest session data
            updateSessionFromPoll(sessionId, data.session);
          }
        }
      } catch (error) {
        console.error('Error polling session:', error);
      }
    }, 2000);

    // Clear interval after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  // Fonction pour mettre à jour la session depuis les données de polling - AMÉLIORATION TEMPS RÉEL
  const updateSessionFromPoll = (sessionId: string, sessionData: any) => {
    console.log(`🔄 Updating session ${sessionId} from poll:`, sessionData);
    
    setCurrentSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;

      // ✅ Conversion améliorée des execution steps vers pipeline steps
      const updatedSteps = sessionData.executionSteps?.map((step: any) => {
        return {
          id: step.id || `step-${step.tool}`,
          tool: step.tool,
          description: step.description || getToolDescription(step.tool),
          status: step.status,
          command: step.command, // ✅ Ajout de la commande
          output: step.output || '', // ✅ S'assurer qu'on a l'output
          error: step.error,
          duration: step.duration,
          progress: step.status === 'completed' ? 100 : 
                   step.status === 'running' ? 50 : 
                   step.status === 'failed' ? 100 : 0
        };
      }) || prev.steps;

      // ✅ Calcul amélioré du résumé
      const summary = {
        totalTools: updatedSteps.length,
        successful: updatedSteps.filter((s: any) => s.status === 'completed').length,
        failed: updatedSteps.filter((s: any) => s.status === 'failed').length,
        totalDuration: sessionData.completedAt ? 
          new Date(sessionData.completedAt).getTime() - new Date(sessionData.startedAt).getTime() : 
          Date.now() - prev.startTime.getTime()
      };

      // ✅ Mise à jour du statut global de la session
      let newStatus: 'running' | 'paused' | 'completed' | 'failed' = 'running';
      if (sessionData.status === 'completed') {
        newStatus = 'completed';
      } else if (sessionData.status === 'failed') {
        newStatus = 'failed';
      } else if (summary.successful + summary.failed === summary.totalTools) {
        newStatus = 'completed';
      }

      console.log(`📊 Session ${sessionId} summary:`, summary, 'Status:', newStatus);

      return {
        ...prev,
        steps: updatedSteps,
        summary,
        status: newStatus
      };
    });

    // ✅ Mise à jour du store des sessions pentest
    setPentestSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        ...sessionData,
        lastUpdated: new Date()
      }
    }));

    // ✅ Mise à jour des conversations avec les données de session
    setConversations(prev => prev.map(conv => {
      if (conv.pentestSession?.sessionId === sessionId) {
        return {
          ...conv,
          pentestSession: {
            ...conv.pentestSession,
            status: sessionData.status,
            results: sessionData.results || {},
            finalReport: sessionData.finalReport,
            executionSteps: sessionData.executionSteps || []
          }
        };
      }
      return conv;
    }));

    // ✅ Logique améliorée pour les mises à jour de chat - éviter les doublons
    if (sessionData.executionSteps) {
      sessionData.executionSteps.forEach((step: any) => {
        // Seulement notifier les nouveaux changements de statut
        const prevStep = currentSession?.steps.find(s => s.tool === step.tool);
        if (!prevStep || prevStep.status !== step.status) {
          console.log(`📝 New status for ${step.tool}: ${step.status}`);
          updateChatWithPentestProgress(sessionId, step.tool, step.status, step.output, step.error);
        }
      });
    }

    // ✅ Notification de génération de rapport
    if (sessionData.finalReport && sessionData.status === 'completed') {
      const currentConv = conversations.find(c => c.pentestSession?.sessionId === sessionId);
      if (currentConv) {
        const hasReportMessage = currentConv.messages.some(m => 
          m.content.includes('📊 Security Report Generated') || 
          m.content.includes('Report ready')
        );
        
        if (!hasReportMessage) {
          console.log(`📊 Adding report notification for session ${sessionId}`);
          addMessageToConversation(currentConv.id, 
            '📊 **Security Report Generated!** Your comprehensive penetration testing report is now ready for review.', 
            true, 'success'
          );
        }
      }
    }
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
              onClick={() => switchView('chat')}
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
              onClick={() => switchView('pipeline')}
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
              title={showConversationSidebar ? 'Hide conversations' : 'Show conversations'}
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
                  
                  {/* Available Tools */}
                  <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-blue-900' : 'text-blue-300'}`}>
                      🛠️ Available Tools
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
                              {isEnabled ? 'Active' : 'Inactive'}
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
                                  <span className="ml-2 text-blue-500 font-medium">• AI writing...</span>
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
                      🤖 AI Security Assistant
                    </h3>
                    <p className={`text-sm mb-6 ${
                      theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      Ask questions or request a pentest with a target
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
                      🤖 AI Security Assistant
                    </h3>
                    <p className={`text-sm mb-6 ${
                      theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      Ask questions or request a pentest with a target
                    </p>
                  </div>
                ) : (
                  <AnimatePresence key={getCurrentConversation()?.id || 'no-conversation'}>
                    {getCurrentConversation()?.messages.map((message, index) => (
                      <motion.div
                        key={`${message.id}-${index}`}
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
                            <TruncatedContent content={message.content} />
                          </div>
                          
                          {/* Integrated pentest buttons according to message type */}
                          {message.type === 'pentest-suggestion' && (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => {
                                  const target = extractTarget(message.content);
                                  if (target) {
                                    startPentestPipeline(`pentest ${target}`);
                                  } else {
                                    addChatMessage(`❌ **Error**: Unable to extract target from message.`, true, 'error');
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                              >
                                <PlayIcon className="w-4 h-4" />
                                <span>🚀 Start Pentest</span>
                              </button>
                              <button
                                onClick={() => {
                                  addChatMessage(`❌ **Pentest cancelled**. I can help you with something else in cybersecurity!`, true, 'info');
                                }}
                                className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                Cancel
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
                                <span>🎯 Specify Target</span>
                              </button>
                              <button
                                onClick={() => {
                                  addChatMessage(`❌ **Pentest cancelled**. I can help you with something else in cybersecurity!`, true, 'info');
                                }}
                                className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          
                          {/* Button to launch pentest if user message contains keywords (unchanged) */}
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
                                🚀 Launch Pentest
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
                    placeholder="Ask a question or request 'pentest testphp.vulnweb.com'..."
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
                    🔧 Penetration Testing Pipeline
                  </h2>
                  <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>
                    Real-time monitoring of penetration tests
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
                    🔄 Refresh
                  </button>
                  
                  {currentSession && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      currentSession.status === 'running' ? 'bg-green-100 text-green-800' :
                      currentSession.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      currentSession.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {currentSession.status === 'running' ? '🔄 Running' :
                       currentSession.status === 'completed' ? '✅ Completed' :
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
                    No test running
                  </h3>
                  <p className={`text-sm mb-4 ${
                    theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    Launch a pentest from Chat to see the pipeline here
                  </p>
                  <div className="space-y-2">
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-gray-500'}`}>
                      💡 Example commands in Chat:
                    </p>
                    <div className={`text-xs space-y-1 ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>
                      <p>• "Launch pentest on testphp.vulnweb.com"</p>
                      <p>• "Security test on 192.168.1.1"</p>
                      <p>• "Vulnerability audit on example.com"</p>
                    </div>
                  </div>
                  <button
                    onClick={() => switchView('chat')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🚀 Go to Chat
                  </button>
                  <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 max-w-md mx-auto">
                    <h4 className={`font-medium mb-2 ${theme === 'light' ? 'text-blue-900' : 'text-blue-300'}`}>
                      📊 Previous sessions available
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
                              {session.startedAt ? new Date(session.startedAt).toLocaleString() : 'Unknown date'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                        No previous sessions
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
                        🎯 Pentest Running
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
                        {currentSession.steps && currentSession.steps.length > 0 
                          ? Math.round((currentSession.steps.filter(s => s.status === 'completed').length / currentSession.steps.length) * 100)
                          : 0}%
                      </div>
                      <div className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>
                        {(() => {
                          const completed = currentSession.steps ? currentSession.steps.filter(s => s.status === 'completed').length : 0;
                          const total = currentSession.steps ? currentSession.steps.length : 0;
                          console.log(`🔢 PIPELINE COUNTER DISPLAY: ${completed}/${total} tools completed`, {
                            sessionId: currentSession.id,
                            stepsCount: currentSession.steps?.length || 0,
                            completedCount: completed,
                            totalCount: total,
                            steps: currentSession.steps?.map(s => ({ tool: s.tool, status: s.status })) || [],
                            source: 'Pipeline Header Display',
                            timestamp: new Date().toISOString()
                          });
                          return `${completed}/${total} tools completed`;
                        })()}
                      </div>

                      {currentSession.status === 'completed' && (
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={generateReport}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            <span>Generate Report</span>
                          </button>
                          <button
                            onClick={exportSessionData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            <span>Export Data</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Steps Pipeline */}
                <div className="space-y-4">
                  {(currentSession.steps || []).map((step, _index) => (
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
                            {step.status === 'completed' ? 'Completed' :
                             step.status === 'running' ? 'Running...' :
                             step.status === 'failed' ? 'Failed' : 'Pending'}
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
                        <div className={`relative p-3 rounded text-xs font-mono ${
                          step.error 
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : theme === 'light'
                              ? 'bg-gray-50 text-gray-800 border border-gray-200'
                              : 'bg-gray-900 text-gray-300 border border-gray-700'
                        }`}>
                          <div className="max-h-40 overflow-y-auto pr-20">
                            {step.error ? (
                              <div className="whitespace-pre-wrap">{formatOutput(step.error)}</div>
                            ) : (
                              <>
                                {expandedOutputs.has(step.id) ? (
                                  <div className="whitespace-pre-wrap">{formatOutput(step.output || '')}</div>
                                ) : (
                                  <div className="whitespace-pre-wrap">{formatOutput(step.output?.substring(0, 800) || '')}</div>
                                )}
                              </>
                            )}
                          </div>
                          
                          {/* Always visible buttons for long outputs */}
                          {step.output && step.output.length > 800 && (
                            <div className="absolute bottom-2 right-2 flex flex-col gap-1">
                              <button
                                onClick={() => toggleOutputExpansion(step.id)}
                                className={`px-2 py-1 text-xs rounded shadow-sm transition-colors ${
                                  theme === 'light'
                                    ? 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
                                    : 'bg-gray-800 text-blue-400 hover:bg-gray-700 border border-blue-600'
                                }`}
                              >
                                {expandedOutputs.has(step.id) ? 'Show less' : `+${step.output.length - 800} more`}
                              </button>
                              <button
                                onClick={() => openOutputModal(step.id, step.output || '', `${step.tool.toUpperCase()} Output`)}
                                className={`px-2 py-1 text-xs rounded shadow-sm transition-colors ${
                                  theme === 'light'
                                    ? 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600'
                                }`}
                              >
                                📋 Modal
                              </button>
                            </div>
                          )}
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

      {/* Output Modal */}
      <AnimatePresence>
        {outputModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={closeOutputModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-4xl max-h-[80vh] rounded-lg shadow-xl ${
                theme === 'light' ? 'bg-white' : 'bg-gray-800'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b ${
                theme === 'light' ? 'border-gray-200' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                    {outputModal.title}
                  </h3>
                  <button
                    onClick={closeOutputModal}
                    className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                <div className={`p-4 rounded font-mono text-sm ${
                  theme === 'light'
                    ? 'bg-gray-50 text-gray-800 border border-gray-200'
                    : 'bg-gray-900 text-gray-300 border border-gray-700'
                }`}>
                  <div className="whitespace-pre-wrap">{formatOutput(outputModal.content)}</div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-4 border-t ${
                theme === 'light' ? 'border-gray-200' : 'border-gray-700'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {outputModal.content.length} characters
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(outputModal.content);
                        // Optional: Show toast notification
                      }}
                      className={`px-4 py-2 text-sm rounded border ${
                        theme === 'light'
                          ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Copy
                    </button>
                    <button
                      onClick={closeOutputModal}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentView;