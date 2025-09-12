import { useState } from 'react';
import { extractTarget } from '../utils/targetUtils';
import { getBasePentestConfigs, getAdaptedTools, getToolDescription } from '../utils/sessionUtils';
import { ChatMessage } from '../types';

export const useChat = (conversationHooks: any, _sessionHooks: any) => {
  const [newMessage, setNewMessage] = useState('');
  
  const {
    getCurrentConversation,
    setConversationLoading,
    isConversationLoading,
    addChatMessage,
    addMessageToConversation,
    setConversations
  } = conversationHooks;

  // Configuration des outils
  const pentestConfigs = getBasePentestConfigs();

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
          context: getCurrentConversation()?.messages.slice(-5).map((msg: ChatMessage) => ({
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
        setConversations((prev: any) => prev.map((conv: any) => 
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
        const responseIsPentestRequest = isRealPentestRequest(data.response);
        const originalIsPentestRequest = isRealPentestRequest(userMessage);
        
        if (responseIsPentestRequest || originalIsPentestRequest) {
          const target = extractTarget(data.response) || extractTarget(userMessage);
          if (target) {
            const adaptedTools = getAdaptedTools(target, pentestConfigs);
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

  const shouldShowPentestButton = (message: ChatMessage): boolean => {
    // Ne pas montrer pour les messages de l'agent
    if (message.isAgent) return false;
    
    // Ne pas montrer si c'est déjà un message de confirmation
    if (message.content.includes('[CONFIRM_PENTEST:')) return false;
    
    // Vérifier si le message contient des mots-clés de pentest
    const pentestKeywords = ['pentest', 'scan', 'audit', 'test', 'vérifier', 'tester', 'lancer', 'démarrer', 'commencer', 'faire', 'effectuer', 'réaliser', 'exécuter', 'attaquer'];
    const hasPentestKeywords = pentestKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Vérifier si le message contient une cible valide
    const hasValidTarget = extractTarget(message.content) !== '';
    
    // Exclure les messages trop courts ou génériques
    if (message.content.trim().length < 10) return false;
    
    return hasPentestKeywords && hasValidTarget;
  };

  const sendMessage = async (message: string) => {
    if (message.trim()) {
      setNewMessage(message);
      await handleChatMessage();
    }
  };

  const startPentestPipeline = async (prompt: string) => {
    const target = extractTarget(prompt);
    if (!target) {
      const currentConv = getCurrentConversation();
      if (currentConv) {
        addMessageToConversation(currentConv.id, '❌ Aucune cible valide détectée. Veuillez spécifier une IP, un domaine ou une URL.', true, 'error');
      }
      return;
    }
    
    // Logic to start pentest (from original code)
    console.log('Starting pentest for target:', target);
  };

  return {
    currentConversation: getCurrentConversation(),
    newMessage,
    setNewMessage,
    sendMessage,
    startPentestPipeline,
    shouldShowPentestButton,
    handleChatMessage,
    handleKeyPress
  };
};
