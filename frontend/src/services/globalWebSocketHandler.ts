import { useAttackStore } from '../store/attackStore';
import { websocket } from './websocket';
import { getFilteredTools } from '../constants/tools';

class GlobalWebSocketHandler {
  private isInitialized = false;

  public initialize() {
    if (this.isInitialized) {
      console.log('🌐 Global WebSocket handler already initialized');
      return;
    }

    console.log('🌐 Initializing global WebSocket handler for all tabs');
    
    websocket.on('message', this.handleMessage);
    websocket.on('error', this.handleMessage);
    websocket.on('output', this.handleMessage);
    websocket.on('notification', this.handleMessage);
    this.isInitialized = true;
  }

  public destroy() {
    if (!this.isInitialized) return;
    
    console.log('🌐 Destroying global WebSocket handler');
    websocket.off('message', this.handleMessage);
    websocket.off('error', this.handleMessage);
    websocket.off('output', this.handleMessage);
    websocket.off('notification', this.handleMessage);
    this.isInitialized = false;
  }

  private handleMessage = (data: any) => {
    if (!data.tabId) return;

    console.log(`🌐 Global handler: WebSocket event for tab ${data.tabId}:`, data.type, {
      hasPayload: !!data.payload,
      hasMessage: !!data.message,
      outputId: data.outputId,
      payload: data.payload?.substring?.(0, 100) || data.payload,
      message: data.message?.substring?.(0, 100) || data.message
    });
    
    switch (data.type) {
      case "output":
        // Gérer les deux formats: data.payload et data.message
        const outputContent = data.payload || data.message;
        if (outputContent) {
          // Récupérer l'état du tab pour déterminer le type d'output
          const tabState = useAttackStore.getState().tabStates[data.tabId];
          if (!tabState) {
            console.warn(`🌐 Global handler: No tab state found for ${data.tabId}`);
            return;
          }

          // Vérifier si c'est un output multiple ou séquentiel
          if (data.outputId && this.isMultiOutputEnabled(tabState)) {
            console.log(`🌐 Global handler: Adding multi-output for ${data.outputId} to tab ${data.tabId}`);
            useAttackStore.getState().addMultiOutput(data.tabId, data.outputId, outputContent);
          } else {
            console.log(`🌐 Global handler: Adding persistent output to tab ${data.tabId}`);
            useAttackStore.getState().addPersistentOutput(data.tabId, outputContent);
          }
        } else {
          console.warn(`🌐 Global handler: Output event with no content for tab ${data.tabId}`, data);
        }
        break;
        
      case "error":
        if (data.payload || data.message) {
          const errorMessage = data.payload || data.message;
          console.log(`🌐 Global handler: Adding error output to tab ${data.tabId}`);
          useAttackStore.getState().addPersistentOutput(data.tabId, `ERROR: ${errorMessage}`);
        }
        break;

      case "status":
        console.log(`🌐 Global handler: Status update for tab ${data.tabId}:`, data.payload || data.status);
        const status = data.payload?.status || data.status;
        useAttackStore.getState().updateTabState(data.tabId, {
          status: status || 'idle',
          isRunning: status === 'running',
          loading: status === 'running'
        });
        break;

      case "iframe-ready":
        console.log(`🌐 Global handler: Iframe ready for tab ${data.tabId}`, data);
        console.log(`🌐 Global handler: iframe-ready event received!`, {
          tabId: data.tabId,
          port: data.port,
          message: data.message
        });
        // Ajouter un message de confirmation pour l'utilisateur
        if (data.message) {
          useAttackStore.getState().addPersistentOutput(data.tabId, `🖼️ ${data.message}`);
        }
        console.log(`🌐 Global handler: Setting iframeReady=true for tab ${data.tabId}`);
        useAttackStore.getState().updateTabState(data.tabId, {
          iframeReady: true,
          status: 'completed',
          isRunning: false,
          loading: false
        });
        console.log(`🌐 Global handler: iframe-ready processing completed for tab ${data.tabId}`);
        break;

      case "sequential-completed":
        console.log(`🌐 Global handler: Sequential execution completed for tab ${data.tabId}`, data);
        // Pour MAIP, activer l'iframe après la séquence complète
        const tabState = useAttackStore.getState().tabStates[data.tabId];
        if (tabState?.selectedTool === 'maip') {
          console.log(`🌐 Global handler: MAIP sequential completed, activating iframe`);
          useAttackStore.getState().addPersistentOutput(data.tabId, `🖼️ MAIP services are ready! Switching to interface...`);
          useAttackStore.getState().updateTabState(data.tabId, {
            iframeReady: true,
            status: 'completed',
            isRunning: false,
            loading: false
          });
        } else {
          useAttackStore.getState().updateTabState(data.tabId, {
            status: 'completed',
            isRunning: false,
            loading: false
          });
        }
        break;

      case "step-completed":
        console.log(`🌐 Global handler: Step completed for tab ${data.tabId}:`, data.stepId, data.stepName);
        // Pas d'action spéciale nécessaire, juste un log
        break;

      case "completed":
        console.log(`🌐 Global handler: Execution completed for tab ${data.tabId}`);
        useAttackStore.getState().updateTabState(data.tabId, {
          status: 'completed',
          isRunning: false,
          loading: false,
          lockedForInteraction: false
        });
        break;

      case "stopped":
        console.log(`🌐 Global handler: Execution stopped for tab ${data.tabId}`);
        useAttackStore.getState().updateTabState(data.tabId, {
          status: 'stopped',
          isRunning: false,
          loading: false,
          lockedForInteraction: false
        });
        break;

      case "notification":
        // Les notifications sont gérées par le NotificationService
        break;

      default:
        console.log(`🌐 Global handler: Unknown event type ${data.type} for tab ${data.tabId}`);
    }
  };

  private isMultiOutputEnabled(tabState: any): boolean {
    if (!tabState.selectedTool) return false;
    
    try {
      const tools = getFilteredTools();
      const selectedTool = tools.find(tool => tool.id === tabState.selectedTool);
      
      return !!(selectedTool?.multiOutput?.enabled || selectedTool?.sequentialExecution?.enabled);
    } catch (error) {
      console.error('Error checking multi-output status:', error);
      return false;
    }
  }
}

export const globalWebSocketHandler = new GlobalWebSocketHandler();
