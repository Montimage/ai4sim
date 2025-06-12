import { useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { websocket } from '../services/websocket';
import { executionHistoryService } from '../services/executionHistoryService';

/**
 * Type for a terminal output line
 */
interface OutputLine {
  content: string;
  type: 'info' | 'error' | 'warning' | 'success';
  timestamp: Date;
  attackId?: string; // Optional attack identifier
}

// Utility function to extract useful text from an object
const extractTextFromObject = (obj: any): string | undefined => {
  if (!obj) return undefined;
  
  if (typeof obj === 'string') return obj;
  
  if (obj.content) return typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
  if (obj.message) return typeof obj.message === 'string' ? obj.message : JSON.stringify(obj.message);
  if (obj.output) return typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
  
  if (obj.data) {
    const dataContent = extractTextFromObject(obj.data);
    if (dataContent) return dataContent;
  }
  
  if (obj.terminal) {
    return extractTextFromObject(obj.terminal);
  }
  
  return JSON.stringify(obj);
};

// Utility functions for localStorage persistence
const getStorageKey = (scenarioId: string, type: 'output' | 'attackOutputs' | 'executionId') => 
  `scenario_terminal_${scenarioId}_${type}`;

const saveToStorage = (scenarioId: string, type: 'output' | 'attackOutputs' | 'executionId', data: any) => {
  try {
    localStorage.setItem(getStorageKey(scenarioId, type), JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (scenarioId: string, type: 'output' | 'attackOutputs' | 'executionId') => {
  try {
    const stored = localStorage.getItem(getStorageKey(scenarioId, type));
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects for output
      if (type === 'output' || type === 'attackOutputs') {
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
        } else if (typeof parsed === 'object') {
          const result: Record<string, OutputLine[]> = {};
          Object.entries(parsed).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              result[key] = value.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp)
              }));
            }
          });
          return result;
        }
      }
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
  return type === 'attackOutputs' ? {} : type === 'output' ? [] : null;
};

const clearStorage = (scenarioId: string) => {
  try {
    localStorage.removeItem(getStorageKey(scenarioId, 'output'));
    localStorage.removeItem(getStorageKey(scenarioId, 'attackOutputs'));
    localStorage.removeItem(getStorageKey(scenarioId, 'executionId'));
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
};

/**
 * Hook personnalisé pour gérer le terminal d'un scénario
 */
export const useScenarioTerminal = (scenarioId: string) => {
  // Initialize state from localStorage
  const [output, setOutput] = useState<OutputLine[]>(() => loadFromStorage(scenarioId, 'output') as OutputLine[]);
  const [attackOutputs, setAttackOutputs] = useState<Record<string, OutputLine[]>>(() => 
    loadFromStorage(scenarioId, 'attackOutputs') as Record<string, OutputLine[]>
  );
  const [attackTools] = useState<{id: string, tool: string}[]>([]);
  const [recentMessages, setRecentMessages] = useState<Set<string>>(new Set());
  const [globalMessageTracker, setGlobalMessageTracker] = useState<Set<string>>(new Set());
  const [displayedErrorMessages, setDisplayedErrorMessages] = useState<Set<string>>(new Set());
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(() => 
    loadFromStorage(scenarioId, 'executionId') as string | null
  );
  const { isConnected, addListener } = useWebSocket({
    autoConnect: true
  });
  
  // Reference to avoid multiple subscriptions
  const subscriptionSent = useRef(false);
  // Reference for message debouncing
  const messageQueueRef = useRef<{
    content: string,
    type: 'info' | 'error' | 'warning' | 'success',
    attackId?: string
  }[]>([]);
  // Timer for batch message processing
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Timer for periodic status updates
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Timestamp of the last request for rate limiting
  const lastRequestTimeRef = useRef<number>(0);
  // Active listeners
  const activeListeners = useRef<(() => void)[]>([]);
  // Minimum interval between requests (500ms)
  const REQUEST_THROTTLE_INTERVAL = 500;

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(scenarioId, 'output', output);
  }, [scenarioId, output]);

  useEffect(() => {
    saveToStorage(scenarioId, 'attackOutputs', attackOutputs);
  }, [scenarioId, attackOutputs]);

  useEffect(() => {
    saveToStorage(scenarioId, 'executionId', currentExecutionId);
  }, [scenarioId, currentExecutionId]);

  // Fonction throttlée pour envoyer des messages websocket
  const throttledSendMessage = useCallback((message: any) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    
    if (timeSinceLastRequest < REQUEST_THROTTLE_INTERVAL) {
      // Retarder l'envoi pour respecter la limite de débit
      setTimeout(() => {
        websocket.send(message);
        lastRequestTimeRef.current = Date.now();
      }, REQUEST_THROTTLE_INTERVAL - timeSinceLastRequest);
    } else {
      // Envoyer immédiatement
      websocket.send(message);
      lastRequestTimeRef.current = now;
    }
  }, []);

  // Extract error code from error message
  const extractErrorCode = useCallback((message: string): string | null => {
    // Common patterns for error codes
    const patterns = [
      /exit.*?code\s*:?\s*(\d+)/i,
      /code\s*:?\s*(\d+)/i,
      /status\s*:?\s*(\d+)/i,
      /error\s*code\s*:?\s*(\d+)/i,
      /returned\s*(\d+)/i,
      /exited.*?(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }, []);

  const appendOutput = useCallback((
    content: string, 
    type: 'info' | 'error' | 'warning' | 'success' = 'info',
    attackId?: string
  ) => {
    if (!content || content.trim() === '') return;
    
    // Normalize content for deduplication
    const normalizedContent = content.trim().toLowerCase();
    
    // For global messages, use more aggressive deduplication (but still include timestamp for uniqueness)
    if (!attackId) {
      // For global messages, use content-based deduplication with a shorter window
      const globalKey = `global-${normalizedContent}-${type}`;
      if (globalMessageTracker.has(globalKey)) {
        return; // Ignore duplicate global message
      }
      
      setGlobalMessageTracker(prev => {
        const updated = new Set(prev);
        updated.add(globalKey);
        
        // Clean up old messages after 10 seconds for global tracker (shorter window)
        setTimeout(() => {
          setGlobalMessageTracker(current => {
            const cleaned = new Set(current);
            cleaned.delete(globalKey);
            return cleaned;
          });
        }, 10000);
        
        return updated;
      });
    } else {
      // For attack-specific messages, use attack-specific deduplication
      const attackKey = `${attackId}-${normalizedContent}-${type}`;
      if (recentMessages.has(attackKey)) {
        return; // Ignore duplicate attack message
      }
      
      setRecentMessages(prev => {
        const updated = new Set(prev);
        updated.add(attackKey);
        
        // Clean up old messages after 3 seconds for attack messages (shorter window)
        setTimeout(() => {
          setRecentMessages(current => {
            const cleaned = new Set(current);
            cleaned.delete(attackKey);
            return cleaned;
          });
        }, 3000);
        
        return updated;
      });
    }
    
    // Ajouter le message à la file d'attente
    messageQueueRef.current.push({ content, type, attackId });
    
    // Save to execution history if we have an active execution
    if (currentExecutionId) {
      const outputLine = {
        content,
        type,
        timestamp: new Date()
      };
      
      if (attackId) {
        // TOUJOURS sauvegarder dans l'attaque spécifique pour l'historique
        // même en mode séquentiel, pour avoir un format uniforme
        executionHistoryService.addAttackOutputLine(currentExecutionId, attackId, outputLine.content, outputLine.type);
      } else {
        // Save to global execution output
        executionHistoryService.addOutputLine(currentExecutionId, outputLine.content, outputLine.type);
      }
    }
    
    // Si un timer est déjà en cours, ne pas en créer un nouveau
    if (messageTimerRef.current) return;
    
    // Créer un timer pour traiter les messages par lots
    messageTimerRef.current = setTimeout(() => {
      const messages = [...messageQueueRef.current];
      messageQueueRef.current = [];
      messageTimerRef.current = null;
      
      // Pour l'affichage dans l'interface : TOUT va dans l'output global
      // (mode séquentiel unifié)
      const allMessages = messages.map(msg => ({ 
        content: msg.content, 
        type: msg.type as 'info' | 'error' | 'warning' | 'success',
        timestamp: new Date()
      }));
      
      if (allMessages.length > 0) {
        setOutput(prev => [...prev, ...allMessages]);
      }
      
      // Pour l'historique : sauvegarder aussi dans attackOutputs pour compatibilité
      // avec les rapports et l'historique détaillé
      const attackMessages = messages.filter(msg => msg.attackId);
      if (attackMessages.length > 0) {
        const updatesByAttackId: Record<string, Array<OutputLine>> = {};
        
        attackMessages.forEach(msg => {
          if (!msg.attackId) return;
          
          if (!updatesByAttackId[msg.attackId]) {
            updatesByAttackId[msg.attackId] = [];
          }
          
          updatesByAttackId[msg.attackId].push({
            content: msg.content,
            type: msg.type as 'info' | 'error' | 'warning' | 'success',
            timestamp: new Date(),
            attackId: msg.attackId
          });
        });
        
        // Mettre à jour attackOutputs pour l'historique et les rapports
        setAttackOutputs(prev => {
          const newOutputs = { ...prev };
          
          Object.entries(updatesByAttackId).forEach(([id, msgs]) => {
            newOutputs[id] = [...(newOutputs[id] || []), ...msgs];
          });
          
          return newOutputs;
        });
      }
    }, 100); // Regrouper les messages arrivant en 100ms
  }, [currentExecutionId]);

  // Function to complete execution tracking
  const completeExecution = useCallback((status: 'completed' | 'failed' | 'stopped') => {
    if (currentExecutionId) {
      executionHistoryService.completeExecution(currentExecutionId, status);
      setCurrentExecutionId(null);
    }
  }, [currentExecutionId]);

  // Function to check if all attacks are finished and auto-complete scenario
  const checkExecutionCompletion = useCallback(async (scenario: any) => {
    if (!scenario || !scenario.attacks || scenario.attacks.length === 0) return;
    
    // Si on a un currentExecutionId, vérifier le statut dans le backend
    if (currentExecutionId) {
      try {
        const execution = await executionHistoryService.getExecution(currentExecutionId);
        if (execution) {
          // Vérifier si toutes les attaques sont terminées
          const allAttacksFinished = execution.attacks.every(attack => 
            ['completed', 'failed', 'stopped', 'error'].includes(attack.status)
          );
          
          if (allAttacksFinished) {
            // Déterminer le statut final
            const hasAnyCompleted = execution.attacks.some(attack => attack.status === 'completed');
            const hasAnyFailed = execution.attacks.some(attack => 
              attack.status === 'failed' || attack.status === 'error'
            );
            
            let finalStatus: 'completed' | 'failed';
            if (hasAnyCompleted && !hasAnyFailed) {
              finalStatus = 'completed';
              appendOutput('🎉 All attacks completed successfully! Scenario execution finished.', 'success');
            } else if (hasAnyCompleted && hasAnyFailed) {
              finalStatus = 'completed'; // Partial success
              appendOutput('⚠️ Scenario execution finished with mixed results (some attacks succeeded, some failed).', 'warning');
            } else {
              finalStatus = 'failed';
              appendOutput('❌ All attacks failed. Scenario execution finished with errors.', 'error');
            }
            
            // Complete the execution
            completeExecution(finalStatus);
            
            return { completed: true, status: finalStatus };
          }
        }
      } catch (error) {
        console.error('Error checking execution status from backend:', error);
      }
    }
    
    // Fallback: Count attacks by status from the output messages (méthode existante)
    const attackStatuses = new Map<string, 'running' | 'completed' | 'failed' | 'pending'>();
    
    // Initialize all attacks as pending
    scenario.attacks.forEach((_: any, index: number) => {
      attackStatuses.set(`attack-${index + 1}`, 'pending');
    });
    
    // Parse status from output messages
    output.forEach(line => {
      const content = line.content.toLowerCase();
      
      // Check for launch messages
      const launchMatch = content.match(/🚀 launching attack (\d+):/);
      if (launchMatch) {
        attackStatuses.set(`attack-${launchMatch[1]}`, 'running');
      }
      
      // Check for completion messages
      const completedMatch = content.match(/✅ attack (\d+) completed/);
      if (completedMatch) {
        attackStatuses.set(`attack-${completedMatch[1]}`, 'completed');
      }
      
      // Check for failure messages
      const failedMatch = content.match(/❌ attack (\d+) failed/);
      if (failedMatch) {
        attackStatuses.set(`attack-${failedMatch[1]}`, 'failed');
      }
    });
    
    // Check if all attacks are finished (completed or failed)
    const allFinished = Array.from(attackStatuses.values()).every(status => 
      status === 'completed' || status === 'failed'
    );
    
    const hasAnyStarted = Array.from(attackStatuses.values()).some(status => 
      status !== 'pending'
    );
    
    if (allFinished && hasAnyStarted) {
      // Determine overall status
      const hasAnyCompleted = Array.from(attackStatuses.values()).some(status => status === 'completed');
      const hasAnyFailed = Array.from(attackStatuses.values()).some(status => status === 'failed');
      
      let finalStatus: 'completed' | 'failed';
      if (hasAnyCompleted && !hasAnyFailed) {
        finalStatus = 'completed';
        appendOutput('🎉 All attacks completed successfully! Scenario execution finished.', 'success');
      } else if (hasAnyCompleted && hasAnyFailed) {
        finalStatus = 'completed'; // Partial success
        appendOutput('⚠️ Scenario execution finished with mixed results (some attacks succeeded, some failed).', 'warning');
      } else {
        finalStatus = 'failed';
        appendOutput('❌ All attacks failed. Scenario execution finished with errors.', 'error');
      }
      
      // Complete the execution
      completeExecution(finalStatus);
      
      // Notify parent component about completion
      return { completed: true, status: finalStatus };
    }
    
    return { completed: false, status: null };
  }, [output, appendOutput, completeExecution, currentExecutionId]);

  // Function to start execution tracking
  const startExecution = useCallback(async (scenario: any) => {
    const execution = await executionHistoryService.startExecution(scenario);
    setCurrentExecutionId(execution.id);
    return execution.id;
  }, []);

  // Function to update attack status in history
  const updateAttackStatus = useCallback((attackId: string, status: 'completed' | 'failed' | 'stopped' | 'error' | 'running' | 'pending') => {
    if (currentExecutionId) {
      executionHistoryService.updateAttackStatus(currentExecutionId, attackId, status);
    }
  }, [currentExecutionId]);

  // Function to check and cleanup stale executions
  const checkStaleExecutions = useCallback(async () => {
    if (!currentExecutionId) return;
    
    try {
      const execution = await executionHistoryService.getExecution(currentExecutionId);
      if (execution && execution.status === 'running') {
        // Vérifier si l'exécution est vraiment en cours depuis trop longtemps
        const now = new Date();
        const startTime = new Date(execution.startTime);
        const timeDiff = now.getTime() - startTime.getTime();
        const maxExecutionTime = 30 * 60 * 1000; // 30 minutes max
        
        if (timeDiff > maxExecutionTime) {
          // Marquer comme failed si ça prend trop de temps
          console.warn(`Execution ${currentExecutionId} has been running for ${Math.floor(timeDiff / 60000)} minutes, marking as failed`);
          await executionHistoryService.completeExecution(currentExecutionId, 'failed');
          appendOutput('⚠️ Execution timed out and was marked as failed.', 'warning');
          setCurrentExecutionId(null);
        }
      }
    } catch (error) {
      console.error('Error checking stale execution:', error);
    }
  }, [currentExecutionId, appendOutput]);

  // Vérifier les exécutions stagnantes toutes les 2 minutes
  useEffect(() => {
    if (!currentExecutionId) return;

    const staleCheckInterval = setInterval(checkStaleExecutions, 2 * 60 * 1000); // 2 minutes

    return () => {
      clearInterval(staleCheckInterval);
    };
  }, [currentExecutionId, checkStaleExecutions]);

  // Fonction pour demander une mise à jour de statut périodique
  const requestStatusUpdate = useCallback(() => {
    if (!scenarioId || !isConnected) return;
    
    throttledSendMessage({
      type: 'get_scenario_status',
      scenarioId,
      timestamp: new Date().toISOString()
    });
  }, [scenarioId, isConnected, throttledSendMessage]);

  // Démarrer les mises à jour périodiques de statut toutes les 30 secondes (moins fréquent)
  useEffect(() => {
    if (!scenarioId || !isConnected) return;

    // Nettoyer le timer existant
    if (statusUpdateTimerRef.current) {
      clearInterval(statusUpdateTimerRef.current);
    }

    // Démarrer un timer pour les mises à jour périodiques (silencieuses)
    statusUpdateTimerRef.current = setInterval(() => {
      requestStatusUpdate();
      // Ne plus ajouter de message de heartbeat automatique dans les logs
    }, 30000); // 30 secondes

    return () => {
      if (statusUpdateTimerRef.current) {
        clearInterval(statusUpdateTimerRef.current);
        statusUpdateTimerRef.current = null;
      }
    };
  }, [scenarioId, isConnected, requestStatusUpdate]);

  // Nettoyer les écouteurs existants
  const cleanupListeners = useCallback(() => {
    while (activeListeners.current.length > 0) {
      const cleanup = activeListeners.current.pop();
      if (cleanup) cleanup();
    }
  }, []);

  // Gestionnaire générique pour tous les messages - stable avec useCallback
  const handleGenericMessage = useCallback((data: any) => {
    // Identifier si le message concerne ce scénario
    const messageScenarioId = data.scenarioId || (data.data && data.data.scenarioId);
    if (messageScenarioId && messageScenarioId !== scenarioId) {
      return; // Ignorer les messages pour d'autres scénarios
    }

    console.log(`📨 [ScenarioTerminal] Processing message for scenario ${scenarioId}:`, data);

    // Traitement de tous les types de messages pertinents
    if (data.type === 'scenario-update' && data.data?.type === 'terminal-output') {
      const attackId = data.data.data?.attackId || data.data.attackId;
      const output = data.data.data?.output || data.data.output;
      
      // Fonction pour détecter le type de message basé sur le contenu
      const detectMessageType = (text: string): 'info' | 'error' | 'warning' | 'success' => {
        const lowerText = text.toLowerCase();
        
        // Messages d'erreur
        if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('fail') ||
            lowerText.includes('cannot') || lowerText.includes('denied') || lowerText.includes('refused') ||
            lowerText.includes('timeout') || lowerText.includes('unreachable') || lowerText.includes('exception') ||
            lowerText.includes('invalid') || lowerText.includes('not found') || lowerText.includes('missing') ||
            lowerText.includes('exited with code') && !lowerText.includes('code 0')) {
          return 'error';
        }
        
        // Messages d'avertissement
        if (lowerText.includes('warning') || lowerText.includes('warn') || lowerText.includes('deprecated') ||
            lowerText.includes('potential') || lowerText.includes('caution') || lowerText.includes('notice')) {
          return 'warning';
        }
        
        // Messages de succès
        if (lowerText.includes('success') || lowerText.includes('completed') || lowerText.includes('finished') ||
            lowerText.includes('done') || lowerText.includes('ready') || lowerText.includes('connected') ||
            lowerText.includes('established') || lowerText.includes('started') || lowerText.includes('launched') ||
            (lowerText.includes('exited with code') && lowerText.includes('code 0'))) {
          return 'success';
        }
        
        // Par défaut : info
        return 'info';
      };
      
      const messageType = detectMessageType(output);
      
      // Déterminer si c'est un message spécifique à une attaque ou un message global
      if (attackId && attackId !== scenarioId) {
        // Extract numeric attack index for consistent routing
        const attackMatch = attackId.match(/(\d+)$/);
        const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
        
        // Messages spécifiques à une attaque : TOUJOURS sauvegarder avec attackId
        // pour l'historique, même en mode séquentiel
        appendOutput(output, messageType, normalizedAttackId);
        
      } else {
        // Messages globaux du scénario - afficher dans l'output global
        appendOutput(output, messageType);
        
        // Détecter les messages de début et fin de scénario pour ajouter du contexte
        const outputLower = output.toLowerCase();
        
        // Messages de début de scénario
        if (outputLower.includes('starting scenario') || outputLower.includes('scenario started') ||
            outputLower.includes('execution request sent')) {
          // Ajouter des informations contextuelles si disponibles
          if (outputLower.includes('execution request sent for scenario')) {
            const scenarioMatch = output.match(/execution request sent for scenario (.+)/i);
            if (scenarioMatch) {
              const scenarioName = scenarioMatch[1];
              console.log(`[ScenarioTerminal] Scenario ${scenarioName} execution started`);
            }
          }
        }
        
        // Messages de fin de scénario
        if (outputLower.includes('scenario execution finished') || 
            outputLower.includes('all attacks') ||
            outputLower.includes('execution completed')) {
          console.log(`[ScenarioTerminal] Scenario execution completed`);
        }
      }
    } else if (data.data?.type === 'terminal-error' && (data.data?.output || data.data?.error)) {
      const attackId = data.data.attackId || data.data.terminalId;
      const errorMessage = data.data.output || data.data.error;
      
      if (!attackId || attackId === scenarioId) {
        // Messages d'erreur globaux - toujours afficher dans l'output global
        appendOutput(errorMessage, 'error');
      } else {
        // Messages d'erreur d'attaque : sauvegarder avec attackId pour l'historique
        const attackMatch = attackId.match(/(\d+)$/);
        const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
        appendOutput(errorMessage, 'error', normalizedAttackId);
      }
    } else if (data.data?.type === 'terminal-status' && data.data?.status) {
      const attackId = data.data.attackId || data.data.terminalId;
      const attackMatch = attackId?.match(/(\d+)$/);
      const attackNum = attackMatch ? attackMatch[1] : attackId;
      
      // Track attack status
      if (data.data.status === 'completed') {
        updateAttackStatus(attackId, 'completed');
        appendOutput(`✅ Attack ${attackNum} completed successfully`, 'success');
      } else if (data.data.status === 'failed') {
        // Vérifier si un message d'erreur détaillé a déjà été affiché pour cette attaque
        const errorKey = `attack-${attackNum}-failed`;
        if (displayedErrorMessages.has(errorKey)) {
          // Un message d'erreur détaillé a déjà été affiché, ignorer le message générique
          console.log(`[DEBUG] Skipping generic error message for Attack ${attackNum} - detailed error already shown`);
          return;
        }
        
        // Analyser l'historique pour obtenir plus de détails sur l'échec
        const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
        const attackOutputHistory = attackOutputs[normalizedAttackId] || [];
        
        let errorDetails = '';
        let dockerError = '';
        let lastErrorMessage = '';
        
        // Analyser les messages récents pour trouver la cause de l'échec
        for (let i = attackOutputHistory.length - 1; i >= Math.max(0, attackOutputHistory.length - 15); i--) {
          const line = attackOutputHistory[i];
          const lineContent = line.content.toLowerCase();
          
          // Chercher les erreurs Docker (améliorer la détection)
          if (line.content.includes('docker:') && !dockerError) {
            const dockerMatch = line.content.match(/docker: (.+?)(\.|$)/);
            if (dockerMatch) {
              dockerError = dockerMatch[1].trim();
            }
          }
          
          // Chercher les erreurs de daemon Docker
          if (lineContent.includes('error response from daemon') && !dockerError) {
            const daemonMatch = line.content.match(/error response from daemon: (.+?)(\.|$)/i);
            if (daemonMatch) {
              dockerError = daemonMatch[1].trim();
            }
          }
          
          // Chercher les erreurs de pull access denied
          if (lineContent.includes('pull access denied') && !dockerError) {
            const pullMatch = line.content.match(/pull access denied for (.+?),/i);
            if (pullMatch) {
              dockerError = `Image not found or access denied: ${pullMatch[1]}`;
            } else {
              dockerError = 'Docker image pull access denied';
            }
          }
          
          // Chercher les erreurs de connexion Docker daemon
          if (lineContent.includes('cannot connect to the docker daemon') && !dockerError) {
            dockerError = 'Cannot connect to Docker daemon';
          }
          
          // Chercher les erreurs générales
          if (lineContent.includes('error') && line.type === 'error' && !lastErrorMessage) {
            lastErrorMessage = line.content.substring(0, 120);
          }
          
          // Chercher des erreurs spécifiques
          if ((lineContent.includes('connection refused') || 
               lineContent.includes('network unreachable') ||
               lineContent.includes('timeout') ||
               lineContent.includes('permission denied') ||
               lineContent.includes('not found') ||
               lineContent.includes('invalid') ||
               lineContent.includes('cannot') ||
               lineContent.includes('failed to')) && !errorDetails) {
            errorDetails = line.content.substring(0, 100);
          }
        }
        
        // Construire le message d'erreur final
        let finalErrorMessage = '';
        if (dockerError) {
          finalErrorMessage = `Docker error: ${dockerError}`;
        } else if (errorDetails) {
          finalErrorMessage = errorDetails;
        } else if (lastErrorMessage) {
          finalErrorMessage = lastErrorMessage;
        } else if (data.data.error) {
          finalErrorMessage = data.data.error.substring(0, 120);
        } else {
          // Ne pas afficher de message générique - l'erreur détaillée a déjà été affichée
          console.log(`[DEBUG] Skipping generic error message for Attack ${attackNum} - no additional details available`);
          return;
        }
        
        appendOutput(`❌ Attack ${attackNum} failed: ${finalErrorMessage}`, 'error');
        
        // Marquer ce message d'erreur comme affiché
        setDisplayedErrorMessages(prev => {
          const updated = new Set(prev);
          updated.add(errorKey);
          
          // Nettoyer après 60 secondes
          setTimeout(() => {
            setDisplayedErrorMessages(current => {
              const cleaned = new Set(current);
              cleaned.delete(errorKey);
              return cleaned;
            });
          }, 60000);
          
          return updated;
        });
        
        // Log de debug pour le diagnostic
        console.log(`[DEBUG] Attack ${attackNum} attack-status failure:`, {
          dockerError,
          errorDetails,
          lastErrorMessage,
          originalError: data.data.error,
          totalMessages: attackOutputHistory.length
        });
      } else if (data.data.status === 'running') {
        updateAttackStatus(attackId, 'running');
        // Ne pas spammer avec les messages de démarrage
      }
    }

    // Traitement des autres types de messages directs (sans encapsulation scenario-update)
    else if (data.type === 'terminal-output' && data.output) {
      const attackId = data.attackId || data.terminalId;
      
      if (!attackId || attackId === scenarioId) {
        appendOutput(data.output, 'info');
      } else {
        // Sauvegarder avec attackId pour l'historique
        const attackMatch = attackId.match(/(\d+)$/);
        const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
        appendOutput(data.output, 'info', normalizedAttackId);
      }
    } else if (data.type === 'terminal-error' && (data.output || data.error)) {
      const attackId = data.attackId || data.terminalId;
      const errorMessage = data.output || data.error;
      
      if (!attackId || attackId === scenarioId) {
        appendOutput(errorMessage, 'error');
      } else {
        // Sauvegarder avec attackId pour l'historique
        const attackMatch = attackId.match(/(\d+)$/);
        const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
        appendOutput(errorMessage, 'error', normalizedAttackId);
      }
    } else if (data.type === 'attack-output' && data.output) {
      // Messages d'attaque spécifiques
      const attackId = data.attackId;
      if (attackId) {
        // Sauvegarder avec attackId pour l'historique
        const attackMatch = attackId.match(/(\d+)$/);
        const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
        appendOutput(data.output, 'info', normalizedAttackId);
      }
    } else if (data.type === 'attack-status' && data.status) {
      // Statut d'attaque - afficher seulement les changements importants
      const attackId = data.attackId;
      if (attackId && data.status) {
        const attackMatch = attackId.match(/(\d+)$/);
        const attackNum = attackMatch ? attackMatch[1] : attackId;
        
        if (data.status === 'completed') {
          appendOutput(`✅ Attack ${attackNum} completed successfully`, 'success');
        } else if (data.status === 'failed') {
          // Vérifier si un message d'erreur détaillé a déjà été affiché pour cette attaque
          const errorKey = `attack-${attackNum}-failed`;
          if (displayedErrorMessages.has(errorKey)) {
            // Un message d'erreur détaillé a déjà été affiché, ignorer le message générique
            console.log(`[DEBUG] Skipping generic error message for Attack ${attackNum} - detailed error already shown`);
            return;
          }
          
          // Analyser l'historique pour obtenir plus de détails sur l'échec
          const normalizedAttackId = attackMatch ? `attack-${attackMatch[1]}` : attackId;
          const attackOutputHistory = attackOutputs[normalizedAttackId] || [];
          
          let errorDetails = '';
          let dockerError = '';
          let lastErrorMessage = '';
          
          // Analyser les messages récents pour trouver la cause de l'échec
          for (let i = attackOutputHistory.length - 1; i >= Math.max(0, attackOutputHistory.length - 15); i--) {
            const line = attackOutputHistory[i];
            const lineContent = line.content.toLowerCase();
            
            // Chercher les erreurs Docker (améliorer la détection)
            if (line.content.includes('docker:') && !dockerError) {
              const dockerMatch = line.content.match(/docker: (.+?)(\.|$)/);
              if (dockerMatch) {
                dockerError = dockerMatch[1].trim();
              }
            }
            
            // Chercher les erreurs de daemon Docker
            if (lineContent.includes('error response from daemon') && !dockerError) {
              const daemonMatch = line.content.match(/error response from daemon: (.+?)(\.|$)/i);
              if (daemonMatch) {
                dockerError = daemonMatch[1].trim();
              }
            }
            
            // Chercher les erreurs de pull access denied
            if (lineContent.includes('pull access denied') && !dockerError) {
              const pullMatch = line.content.match(/pull access denied for (.+?),/i);
              if (pullMatch) {
                dockerError = `Image not found or access denied: ${pullMatch[1]}`;
              } else {
                dockerError = 'Docker image pull access denied';
              }
            }
            
            // Chercher les erreurs de connexion Docker daemon
            if (lineContent.includes('cannot connect to the docker daemon') && !dockerError) {
              dockerError = 'Cannot connect to Docker daemon';
            }
            
            // Chercher les erreurs générales
            if (lineContent.includes('error') && line.type === 'error' && !lastErrorMessage) {
              lastErrorMessage = line.content.substring(0, 120);
            }
            
            // Chercher des erreurs spécifiques
            if ((lineContent.includes('connection refused') || 
                 lineContent.includes('network unreachable') ||
                 lineContent.includes('timeout') ||
                 lineContent.includes('permission denied') ||
                 lineContent.includes('not found') ||
                 lineContent.includes('invalid') ||
                 lineContent.includes('cannot') ||
                 lineContent.includes('failed to')) && !errorDetails) {
              errorDetails = line.content.substring(0, 100);
            }
          }
          
          // Construire le message d'erreur final
          let finalErrorMessage = '';
          if (dockerError) {
            finalErrorMessage = `Docker error: ${dockerError}`;
          } else if (errorDetails) {
            finalErrorMessage = errorDetails;
          } else if (lastErrorMessage) {
            finalErrorMessage = lastErrorMessage;
          } else if (data.error) {
            finalErrorMessage = data.error.substring(0, 120);
          } else {
            // Ne pas afficher de message générique - l'erreur détaillée a déjà été affichée
            console.log(`[DEBUG] Skipping generic error message for Attack ${attackNum} - no additional details available`);
            return;
          }
          
          appendOutput(`❌ Attack ${attackNum} failed: ${finalErrorMessage}`, 'error');
          
          // Marquer ce message d'erreur comme affiché
          setDisplayedErrorMessages(prev => {
            const updated = new Set(prev);
            updated.add(errorKey);
            
            // Nettoyer après 60 secondes
            setTimeout(() => {
              setDisplayedErrorMessages(current => {
                const cleaned = new Set(current);
                cleaned.delete(errorKey);
                return cleaned;
              });
            }, 60000);
            
            return updated;
          });
          
          // Log de debug pour le diagnostic
          console.log(`[DEBUG] Attack ${attackNum} attack-status failure:`, {
            dockerError,
            errorDetails,
            lastErrorMessage,
            originalError: data.error,
            totalMessages: attackOutputHistory.length,
            recentMessages: attackOutputHistory.slice(-5).map(m => ({ content: m.content, type: m.type }))
          });
        }
        // Ignore 'started' status to reduce noise
      }
    } else if (data.message) {
      // Messages génériques avec contenu textuel
      const messageType = data.level || data.type || 'info';
      let outputType: 'info' | 'error' | 'warning' | 'success' = 'info';
      
      if (messageType.includes('error') || messageType.includes('fail')) {
        outputType = 'error';
      } else if (messageType.includes('warn')) {
        outputType = 'warning';
      } else if (messageType.includes('success') || messageType.includes('complete')) {
        outputType = 'success';
      }
      
      appendOutput(data.message, outputType);
    }
  }, [scenarioId, appendOutput, attackOutputs, extractErrorCode]);

  // S'abonner aux événements du scénario
  useEffect(() => {
    if (!scenarioId || !isConnected) return;

    // Nettoyer les écouteurs existants avant d'en ajouter de nouveaux
    cleanupListeners();

    // Écouter plusieurs types de messages possibles
    const removeScenarioUpdateListener = addListener('scenario-update', handleGenericMessage);
    const removeTerminalOutputListener = addListener('terminal-output', handleGenericMessage);
    const removeTerminalErrorListener = addListener('terminal-error', handleGenericMessage);
    const removeAttackOutputListener = addListener('attack-output', handleGenericMessage);
    const removeAttackStatusListener = addListener('attack-status', handleGenericMessage);
    
    activeListeners.current.push(
      removeScenarioUpdateListener,
      removeTerminalOutputListener, 
      removeTerminalErrorListener,
      removeAttackOutputListener,
      removeAttackStatusListener
    );

    return () => {
      cleanupListeners();
    };
  }, [scenarioId, isConnected, cleanupListeners, handleGenericMessage, addListener]); // Dépendances stables

  // S'abonner au scénario - séparé de l'ajout des listeners
  useEffect(() => {
    if (!scenarioId || !isConnected || subscriptionSent.current) return;

    subscriptionSent.current = true;

    // S'abonner au scénario via WebSocket
    const subscription = {
      type: 'subscribe-scenario',
      scenarioId,
      timestamp: new Date().toISOString()
    };
    
    throttledSendMessage(subscription);

    // Demander les informations sur ce scénario
    throttledSendMessage({
      type: 'get_scenario_info',
      scenarioId,
      timestamp: new Date().toISOString()
    });

    // Utiliser la nouvelle méthode du service WebSocket
    if (websocket.subscribeToScenario) {
      websocket.subscribeToScenario(scenarioId);
    }

    return () => {
      if (websocket.unsubscribeFromScenario) {
        websocket.unsubscribeFromScenario(scenarioId);
      }
    };
  }, [scenarioId, isConnected, throttledSendMessage]);

  // Reset le flag de subscription quand le scenarioId change
  useEffect(() => {
    subscriptionSent.current = false;
  }, [scenarioId]);

  const requestTerminalHistory = useCallback(() => {
    if (!scenarioId) return;
    
    throttledSendMessage({
      type: 'get-terminal-history',
      scenarioId,
      timestamp: new Date().toISOString()
    });
  }, [scenarioId, throttledSendMessage]);

  // Clear terminal function that also clears localStorage
  const clearTerminal = useCallback(() => {
    setOutput([]);
    setAttackOutputs({});
    setRecentMessages(new Set());
    setGlobalMessageTracker(new Set());
    clearStorage(scenarioId);
  }, [scenarioId]);

  // Function to stop all running attack processes
  const stopAllProcesses = useCallback((scenario: any) => {
    if (!scenario || !scenario.attacks) return;
    
    appendOutput('🛑 Stopping all running attack processes...', 'warning');
    
    // Send stop commands for each attack
    scenario.attacks.forEach((attack: any, index: number) => {
      const attackId = attack.processId || `attack-${index + 1}`;
      
      // Send stop command via WebSocket
      websocket.send(JSON.stringify({
        type: 'stop',
        tabId: attackId,
        scenarioId: scenarioId,
        timestamp: new Date().toISOString()
      }));
      
      appendOutput(`🛑 Stop signal sent to attack ${index + 1}`, 'warning');
    });
    
    // Also send a general scenario stop command
    websocket.send(JSON.stringify({
      type: 'stop-scenario',
      scenarioId: scenarioId,
      timestamp: new Date().toISOString()
    }));
    
    appendOutput('🛑 Scenario stop signal sent to backend', 'warning');
  }, [scenarioId, appendOutput]);

  return {
    output,
    attackOutputs,
    appendOutput,
    clearTerminal,
    requestTerminalHistory,
    attackTools,
    startExecution,
    completeExecution,
    updateAttackStatus,
    currentExecutionId,
    checkExecutionCompletion,
    stopAllProcesses
  };
};
