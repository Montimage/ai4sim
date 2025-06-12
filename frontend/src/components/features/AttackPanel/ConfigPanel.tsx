import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { TOOLS } from '../../../constants/tools';
import { StopIcon, ClipboardIcon, AdjustmentsHorizontalIcon, ArrowsPointingOutIcon as ArrowsExpand, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { websocket } from '../../../services/websocket';
import { useNotificationStore } from '../../../store/notificationStore';
import { useThemeStore } from '../../../store/themeStore';
import { toolMonitor } from '../../../services/toolMonitor';

// Ajout d'une interface pour définir la structure d'un paramètre
interface ToolParameter {
  label: string;
  type: string;
  default?: string;
  required?: boolean;
  description?: string;
}

interface ConfigPanelProps {
  tabId: string;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ tabId }) => {
  // 1. State hooks first
  const [params, setParams] = useState<Record<string, any>>({});
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isEditingCommand, setIsEditingCommand] = React.useState(false);
  const [editedCommand, setEditedCommand] = React.useState("");
  const [commandPreview, setCommandPreview] = React.useState("");
  
  // 2. Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const commandTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 3. Store hooks
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  const updateTabState = useAttackStore(state => state.updateTabState);
  const addNotification = useNotificationStore(state => state.addNotification);
  const theme = useThemeStore(state => state.theme);
  
  // 4. Derived state
  const selectedTool = TOOLS.find(tool => tool.id === tabState?.selectedTool);
  const selectedAttack = selectedTool?.attacks?.find(attack => attack.id === tabState?.selectedAttack);
  const isRunning = tabState?.status === 'running' || tabState?.isRunning;
  const isLoading = tabState?.loading || false;
  const isIframeReady = tabState?.iframeReady || false;
  // Utilisation de l'état lockedForInteraction pour une cohérence avec le ToolSelectionFunnel
  const isLocked = tabState?.lockedForInteraction || isRunning || isLoading;
  const isActionDisabled = isLocked || isIframeReady;
  
  // 5. Handlers
  const handleFullscreen = useCallback(() => {
    if (!iframeRef.current) return;
    
    if (!isFullscreen) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Détecter les changements de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Communiquer avec l'iframe MAIP pour optimiser l'affichage
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'FULLSCREEN_CHANGE',
            isFullscreen: isCurrentlyFullscreen
          }, '*');
        } catch (error) {
          console.warn('Could not communicate with iframe:', error);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Optimiser l'iframe pour le plein écran
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      // Ajouter des styles pour optimiser le plein écran
      if (isFullscreen) {
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.zIndex = '9999';
        iframe.style.backgroundColor = '#fff';
      } else {
        iframe.style.position = '';
        iframe.style.top = '';
        iframe.style.left = '';
        iframe.style.width = '';
        iframe.style.height = '';
        iframe.style.zIndex = '';
        iframe.style.backgroundColor = '';
      }
    }
  }, [isFullscreen]);

  // Update command preview whenever params change
  useEffect(() => {
    if (selectedTool?.multiOutput?.enabled) {
      // Pour les outils avec outputs multiples, afficher toutes les commandes
      const commands = selectedTool.multiOutput.outputs.map(output => 
        `${output.name}: ${output.command}`
      ).join('\n');
      setCommandPreview(commands);
      
      if (!isEditingCommand) {
        setEditedCommand(commands);
      }
    } else if (selectedAttack?.command) {
      // Utiliser la commande de l'attaque sélectionnée
      const currentParams = tabState?.parameters || {};
      try {
        const cmd = selectedAttack.command(currentParams);
        setCommandPreview(cmd);
        
        if (!isEditingCommand) {
          setEditedCommand(cmd);
        }
      } catch (error) {
        console.error('Error generating command preview:', error);
        setCommandPreview('Error generating command');
      }
    } else if (selectedTool?.command) {
      // Fallback sur la commande de l'outil
      const currentParams = tabState?.parameters || {};
      try {
        const cmd = selectedTool.command(currentParams);
        setCommandPreview(cmd);
        
        if (!isEditingCommand) {
          setEditedCommand(cmd);
        }
      } catch (error) {
        console.error('Error generating command preview:', error);
        setCommandPreview('Error generating command');
      }
    }
  }, [selectedTool, selectedAttack, tabState?.parameters, isEditingCommand]);

  const handleStopAttack = useCallback(() => {
    const port = selectedTool?.iframe ? selectedTool.iframe.port : undefined;
    websocket.send(JSON.stringify({ type: "stop", tabId, port }));
    updateTabState(tabId, { 
      status: 'stopped',
      isRunning: false,
      loading: false,
      iframeReady: false,
      lockedForInteraction: false
    });
    addNotification({
      message: `Stopped ${selectedTool?.name}`,
      type: 'warning',
      category: 'attack',
      title: 'Attack Stopped',
      metadata: { tabId }
    });
  }, [selectedTool, tabId, updateTabState, addNotification]);

  const executeAttack = useCallback(async () => {
    if (!selectedTool) {
      addNotification({
        message: "No tool selected",
        type: 'error',
        category: 'attack',
        title: 'Error',
        metadata: { tabId }
      });
      return;
    }

    // Vérifier si une commande est disponible
    const hasCommand = selectedAttack?.command || selectedTool.command || tabState?.customCommand || selectedTool?.multiOutput?.enabled;
    if (!hasCommand) {
      addNotification({
        message: "No command defined for this attack",
        type: 'error',
        category: 'attack',
        title: 'Error',
        metadata: { tabId }
      });
      return;
    }

    // Clear output before starting new attack execution
    if (selectedTool?.multiOutput?.enabled) {
      // Initialiser les outputs multiples
      const outputIds = selectedTool.multiOutput.outputs.map(output => output.id);
      useAttackStore.getState().initializeMultiOutputs(tabId, outputIds);
      useAttackStore.getState().clearAllMultiOutputs(tabId);
    } else {
      useAttackStore.getState().clearOutput(tabId);
    }

    if (selectedTool.iframe) {
      try {
        const isRunning = await toolMonitor.isToolRunning(selectedTool.iframe.port);
        if (isRunning) {
          updateTabState(tabId, { 
            status: 'running',
            isRunning: true,
            loading: false,
            iframeReady: true,
            lockedForInteraction: true
          });
          return;
        }
      } catch (error) {
        console.error('Error checking tool status:', error);
      }
    }
    
    const currentState = useAttackStore.getState().tabStates[tabId];
    const currentParams = currentState?.parameters || {};
    
    if (selectedTool?.multiOutput?.enabled) {
      // Exécution des commandes multiples
      selectedTool.multiOutput.outputs.forEach(output => {
        websocket.send(JSON.stringify({ 
          type: "execute-multi", 
          command: output.command,
          outputId: output.id,
          workingDirectory: output.workingDirectory,
          parameters: currentParams,
          tabId 
        }));
      });
    } else {
      // Exécution simple
      // Priorité: commande personnalisée -> commande de l'attaque -> commande de l'outil
      let command = currentState.customCommand;
      if (!command) {
        try {
          if (selectedAttack?.command) {
            command = selectedAttack.command(currentParams);
          } else if (selectedTool.command) {
            command = selectedTool.command(currentParams);
          } else {
            command = "";
          }
        } catch (error) {
          console.error('Error generating command:', error);
          addNotification({
            message: "Error generating command",
            type: 'error',
            category: 'attack',
            title: 'Error',
            metadata: { tabId }
          });
          return;
        }
      }
      
      websocket.send(JSON.stringify({ 
        type: "execute", 
        command, 
        parameters: currentParams,
        tabId 
      }));
    }
    
    updateTabState(tabId, { 
      status: 'running',
      isRunning: true,
      loading: true,
      iframeReady: false,
      lockedForInteraction: true
    });
  }, [selectedTool, selectedAttack, tabId, updateTabState, addNotification, tabState?.customCommand]);

  const handleParameterChange = useCallback((key: string, value: string) => {
    // Ne pas permettre les changements si l'interface est verrouillée
    if (isLocked) return;
    
    setParams(prev => {
      const newParams = {
        ...prev,
        [key]: value
      };
      updateTabState(tabId, { parameters: newParams });
      return newParams;
    });
  }, [tabId, updateTabState, isLocked]);

  const handleEditCommand = () => {
    if (isLocked) return;
    
    setIsEditingCommand(true);
    setEditedCommand(tabState?.customCommand || commandPreview);
    // Focus the textarea after rendering
    setTimeout(() => {
      if (commandTextareaRef.current) {
        commandTextareaRef.current.focus();
      }
    }, 100);
  };

  const handleSaveCommand = () => {
    if (isLocked) return;
    
    updateTabState(tabId, { customCommand: editedCommand });
    setIsEditingCommand(false);
    addNotification({
      message: "Command updated successfully",
      type: 'success',
      category: 'attack',
      title: 'Success',
      metadata: { tabId }
    });
  };

  const handleCancelEdit = () => {
    setIsEditingCommand(false);
    setEditedCommand(tabState?.customCommand || commandPreview);
  };

  const handleCopyCommand = () => {
    const commandToCopy = tabState?.customCommand || commandPreview;
    navigator.clipboard.writeText(commandToCopy).then(() => {
      addNotification({
        message: "Command copied to clipboard",
        type: 'success',
        category: 'attack',
        title: 'Success',
        metadata: { tabId }
      });
    });
  };

  // Sync params with tabState
  React.useEffect(() => {
    if (tabState?.parameters) {
      setParams(tabState.parameters);
    }
  }, [tabState?.parameters]);
  
  // 6. WebSocket event handler
  React.useEffect(() => {
    const handleWebSocketEvent = (data: any) => {
      if (data.tabId && data.tabId !== tabId) return;
      
      // Check for fatal errors that should stop execution
      const isFatalError = (message: string): boolean => {
        const lowerMessage = message.toLowerCase();
        return lowerMessage.includes('process exited with code') && !lowerMessage.includes('code 0') ||
               lowerMessage.includes('cannot connect to the docker daemon') ||
               lowerMessage.includes('access denied') ||
               lowerMessage.includes('unable to find image') ||
               lowerMessage.includes('permission denied') ||
               lowerMessage.includes('connection refused') ||
               lowerMessage.includes('fatal error') ||
               lowerMessage.includes('critical error');
      };
      
      switch (data.type) {
        case "error":
          if (data.payload) {
            // Add output to the console for errors
            useAttackStore.getState().addOutput(tabId, data.payload);
            
            // Check if it's a fatal error
            const isFatal = isFatalError(data.payload);
            
            // Always update state for errors
            updateTabState(tabId, {
              status: isFatal ? 'error' : 'running',
              isRunning: !isFatal,
              loading: false,
              iframeReady: false,
              lockedForInteraction: !isFatal
            });
            
            // Add notification for all errors
            addNotification({
              message: data.payload,
              type: 'error',
              category: 'attack',
              title: isFatal ? 'Fatal Error - Execution Stopped' : 'Error',
              metadata: { tabId }
            });
            
            // If fatal error, send stop command
            if (isFatal) {
              websocket.send(JSON.stringify({ 
                type: "stop", 
                tabId 
              }));
            }
          }
          break;
          
        case "output":
          if (data.payload) {
            // Vérifier si c'est un output multiple
            if (data.outputId && selectedTool?.multiOutput?.enabled) {
              useAttackStore.getState().addMultiOutput(tabId, data.outputId, data.payload);
              
              // Vérifier si c'est un message de succès pour l'iframe
              const outputConfig = selectedTool.multiOutput.outputs.find(o => o.id === data.outputId);
              if (outputConfig?.successMessage && data.payload.includes(outputConfig.successMessage)) {
                updateTabState(tabId, {
                  loading: false,
                  iframeReady: true,
                  lockedForInteraction: true
                });
                
                addNotification({
                  message: `${outputConfig.name} is ready`,
                  type: 'success',
                  title: 'Success',
                  category: 'attack'
                });
              }
            } else {
              // Output simple
              useAttackStore.getState().addOutput(tabId, data.payload);
              
              // Vérifier si c'est un message de succès pour l'iframe
              if (selectedTool?.iframe?.successMessage && data.payload.includes(selectedTool.iframe.successMessage)) {
                updateTabState(tabId, {
                  loading: false,
                  iframeReady: true,
                  lockedForInteraction: true
                });
                
                addNotification({
                  message: `${selectedTool.name} interface is ready`,
                  type: 'success',
                  title: 'Success',
                  category: 'attack'
                });
              }
            }
          } else if (data.message) {
            // Vérifier si c'est un output multiple
            if (data.outputId && selectedTool?.multiOutput?.enabled) {
              useAttackStore.getState().addMultiOutput(tabId, data.outputId, data.message);
              
              // Vérifier si c'est un message de succès pour l'iframe
              const outputConfig = selectedTool.multiOutput.outputs.find(o => o.id === data.outputId);
              if (outputConfig?.successMessage && data.message.includes(outputConfig.successMessage)) {
                updateTabState(tabId, {
                  loading: false,
                  iframeReady: true,
                  lockedForInteraction: true
                });
                
                addNotification({
                  message: `${outputConfig.name} is ready`,
                  type: 'success',
                  title: 'Success',
                  category: 'attack'
                });
              }
            } else {
              // Output simple
              useAttackStore.getState().addOutput(tabId, data.message);
            
              // Vérifier si c'est un message de succès pour l'iframe
              if (selectedTool?.iframe?.successMessage && data.message.includes(selectedTool.iframe.successMessage)) {
                updateTabState(tabId, {
                  loading: false,
                  iframeReady: true,
                  lockedForInteraction: true
                });
                
                addNotification({
                  message: `${selectedTool.name} interface is ready`,
                  type: 'success',
                  title: 'Success',
                  category: 'attack'
                });
              }
            }
          }
          break;
          
        case "message":
          // Add output to the console for general messages
          if (data.payload) {
            useAttackStore.getState().addOutput(tabId, data.payload);
          } else if (data.message) {
            useAttackStore.getState().addOutput(tabId, data.message);
          }
          break;
          
        case "notification":
          if (data.message && selectedTool?.iframe?.successMessage) {
            if (data.message.includes(selectedTool.iframe.successMessage)) {
              updateTabState(tabId, {
                loading: false,
                iframeReady: true,
                // Maintenir le verrouillage même si l'iframe est prêt
                lockedForInteraction: true
              });
              
              addNotification({
                message: `${selectedTool.name} interface is ready`,
                type: 'success',
                category: 'attack',
                title: 'Success',
                metadata: { tabId }
              });
            }
          }
          break;
      }
    };

    websocket.on("message", handleWebSocketEvent);
    websocket.on("error", handleWebSocketEvent);
    websocket.on("output", handleWebSocketEvent);
    websocket.on("notification", handleWebSocketEvent);
    
    return () => {
      websocket.off("message", handleWebSocketEvent);
      websocket.off("error", handleWebSocketEvent);
      websocket.off("output", handleWebSocketEvent);
      websocket.off("notification", handleWebSocketEvent);
    };
  }, [tabId, selectedTool, updateTabState, addNotification]);

  // Monitor tool state
  React.useEffect(() => {
    if (selectedTool?.iframe) {
      toolMonitor.startMonitoring(selectedTool.iframe.port);
    }
    
    return () => {
      if (selectedTool?.iframe) {
        toolMonitor.stopMonitoring(selectedTool.iframe.port);
      }
    };
  }, [selectedTool?.id, selectedTool?.iframe]);

  // 7. Render
  if (!selectedTool) {
    return (
      <div className={`h-full flex items-center justify-center ${
        theme === 'light' 
          ? 'bg-white' 
          : 'bg-gray-900/50'
      } backdrop-blur-sm`}>
        <div className="text-center space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            theme === 'light'
              ? 'bg-gray-100 border border-gray-200'
              : 'bg-gray-800/50 border border-gray-700'
          }`}>
            <AdjustmentsHorizontalIcon className={`h-8 w-8 ${
              theme === 'light' ? 'text-gray-400' : 'text-indigo-400'
            }`} />
          </div>
          <h3 className={`text-xl font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-100'}`}>
            Select a Tool
          </h3>
          <p className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            Choose a tool from the list to configure your attack
          </p>
        </div>
      </div>
    );
  }

  // Déterminer le titre et la description à afficher
  const displayTitle = selectedAttack?.name || selectedTool.name;
  const displayDescription = selectedAttack?.description || selectedTool.description;

  // Render attack configuration form
  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* Header - HAUTEUR FIXE */}
      <div className={`flex-shrink-0 h-32 ${
        theme === 'light' 
          ? 'bg-white border-gray-200' 
          : 'bg-gray-900/80 backdrop-blur-sm border-gray-700'
      } border-b overflow-hidden`}>
        <div className="p-4 space-y-2 h-full overflow-y-auto">
          {/* Tool Title and Badges */}
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">
              {displayTitle}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Badge */}
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full flex-shrink-0
                ${selectedTool.type === 'FUZZING' 
                  ? theme === 'light' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-green-500/20 text-green-300 ring-1 ring-green-500/50'
                  : selectedTool.type === 'SIMULATION'
                  ? theme === 'light'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                  : theme === 'light'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50'
                }`}
              >
                {selectedTool.type}
              </span>
              
              {/* Status Badge */}
              <span className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
                ${selectedTool.status === 'implemented' 
                  ? theme === 'light'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30'
                  : selectedTool.status === 'in-progress'
                  ? theme === 'light'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30'
                  : theme === 'light'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                }`}
              >
                {selectedTool.status}
              </span>
              
              {/* Execution Status Badge */}
              {isRunning && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                  Running
                </span>
              )}
            </div>
          </div>
          
          {/* Description */}
          <div className="flex-1 min-h-0">
            <p className={`text-xs leading-relaxed line-clamp-2 ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}>
              {displayDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Command Preview Section - HAUTEUR FIXE */}
      <div className={`flex-shrink-0 h-32 border-b ${
        theme === 'light' 
          ? 'bg-white border-gray-200' 
          : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/70'
      } p-3 overflow-hidden`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-xs font-medium ${
            theme === 'light' ? 'text-gray-700' : 'text-gray-200'
          }`}>
            Command Preview
          </h3>
          <div className="flex items-center gap-1">
            {!isEditingCommand ? (
              <>
                <button
                  onClick={handleEditCommand}
                  className={`p-1 rounded hover:bg-gray-200/20 ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  } ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Edit command"
                  disabled={isActionDisabled}
                >
                  <PencilSquareIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={handleCopyCommand}
                  className={`p-1 rounded hover:bg-gray-200/20 ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}
                  title="Copy to clipboard"
                >
                  <ClipboardIcon className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveCommand}
                  className={`p-1 rounded hover:bg-green-200/20 ${
                    theme === 'light' ? 'text-green-600' : 'text-green-400'
                  } ${isActionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Save changes"
                  disabled={isActionDisabled}
                >
                  <CheckIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className={`p-1 rounded hover:bg-red-200/20 ${
                    theme === 'light' ? 'text-red-600' : 'text-red-400'
                  }`}
                  title="Cancel"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
        {isEditingCommand ? (
          <textarea
            ref={commandTextareaRef}
            value={editedCommand}
            onChange={(e) => setEditedCommand(e.target.value)}
            className={`w-full rounded-md font-mono text-xs p-2 h-20 focus:outline-none focus:ring-1 resize-none ${
              theme === 'light'
                ? 'bg-gray-50 border border-gray-300 text-gray-800 focus:ring-indigo-500/30'
                : 'bg-gray-900 border border-gray-700 text-gray-200 focus:ring-indigo-500/30'
            } ${isActionDisabled ? 'opacity-70' : ''}`}
            placeholder="Enter command to execute..."
            disabled={isActionDisabled}
          />
        ) : (
          <div className={`rounded-md font-mono text-xs p-2 overflow-auto h-20 whitespace-pre-wrap break-all ${
            theme === 'light'
              ? 'bg-gray-50 border border-gray-300 text-gray-800'
              : 'bg-gray-900 border border-gray-700 text-gray-200'
          }`}>
            {tabState?.customCommand || commandPreview || "No command available"}
          </div>
        )}
      </div>
      
      {/* Footer with buttons - HAUTEUR FIXE */}
      <div className={`flex-shrink-0 h-16 border-b p-3 ${
        theme === 'light' 
          ? 'bg-white border-gray-200' 
          : 'bg-gray-900/80 backdrop-blur-sm border-gray-700/50'
      }`}>
        <div className="flex items-center justify-between h-full">
          <div className="flex gap-3">
            <button
              onClick={executeAttack}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                isActionDisabled
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
              disabled={isActionDisabled}
            >
              {selectedTool?.iframe ? "Start Interface" : "Execute Attack"}
            </button>
            <button
              onClick={handleStopAttack}
              disabled={!isRunning}
              className={`p-1.5 rounded border transition-all duration-200 ${
                isRunning 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400'
              }`}
              title="Stop Execution"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          </div>
          
          {/* Status indicator */}
          {isRunning && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className={`text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                Running
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Parameters or Iframe - HAUTEUR CALCULÉE FIXE */}
      <div 
        className={`flex-1 p-3 overflow-hidden ${
        theme === 'light' ? 'bg-gray-50' : 'bg-gray-900/50'
        }`}
        style={{ height: 'calc(100% - 224px)' }}
      >
        {selectedTool.iframe && isLoading && !isIframeReady ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : selectedTool.iframe && (isIframeReady || isRunning) ? (
          <div className="h-full relative">
            <iframe
              ref={iframeRef}
              src={`http://localhost:${selectedTool.iframe.port}`}
              className="w-full h-full border-none"
              title={selectedTool.name}
            />
            <button
              onClick={handleFullscreen}
              className={`absolute top-2 right-2 p-2 rounded border transition-all duration-200 ${
                isFullscreen 
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-500' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
              }`}
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <ArrowsExpand className="h-5 w-5" />
              )}
            </button>
          </div>
        ) : (
          // Utiliser les paramètres de l'attaque sélectionnée si disponibles, sinon utiliser ceux de l'outil
          (selectedAttack?.parameters && Object.keys(selectedAttack.parameters).length > 0) || 
          (selectedTool.parameters && Object.keys(selectedTool.parameters).length > 0) ? (
            <div className="h-full overflow-y-auto">
              {/* Configuration form */}
              <div className={`grid grid-cols-1 gap-3 p-2 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                {Object.entries(selectedAttack?.parameters || selectedTool.parameters || {}).map(([key, paramValue]) => {
                  // Conversion explicite pour satisfaire TypeScript
                  const param = paramValue as ToolParameter;
                  
                  return (
                    <div key={key} className="space-y-1">
                      <label className="flex items-center justify-between">
                        <span className={`block text-xs font-medium ${
                          theme === 'light' 
                            ? 'text-gray-700' 
                            : 'text-gray-200'
                        }`}>
                          {param.label}
                        </span>
                        {param.required && (
                          <span className="text-xs text-red-500">Required</span>
                        )}
                      </label>
                      <input
                        type={param.type === 'number' ? 'number' : 'text'}
                        className={`w-full px-2 py-1.5 rounded-lg border text-sm ${
                          theme === 'light'
                            ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20'
                            : 'border-2 border-gray-700 bg-gray-800/50 text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20'
                        }`}
                        placeholder={param.description}
                        value={params[key] || param.default || ''}
                        onChange={(e) => handleParameterChange(key, e.target.value)}
                        disabled={isLocked}
                      />
                      {param.description && (
                        <p className={`text-xs ${
                          theme === 'light' 
                            ? 'text-gray-500' 
                            : 'text-gray-400'
                        }`}>
                          {param.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                No parameters needed for this attack.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
