import { useAttackStore } from '../store/attackStore';
import { websocket } from './websocket';
import { getFilteredTools } from '../constants/tools';

class GlobalWebSocketHandler {
  private isInitialized = false;

  public initialize() {
    if (this.isInitialized) {
      return;
    }

    websocket.on('message', this.handleMessage);
    websocket.on('error', this.handleMessage);
    websocket.on('output', this.handleMessage);
    websocket.on('notification', this.handleMessage);
    this.isInitialized = true;
  }

  public destroy() {
    if (!this.isInitialized) return;

    websocket.off('message', this.handleMessage);
    websocket.off('error', this.handleMessage);
    websocket.off('output', this.handleMessage);
    websocket.off('notification', this.handleMessage);
    this.isInitialized = false;
  }

  private handleMessage = (data: any) => {
    if (!data.tabId) return;

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
            useAttackStore.getState().addMultiOutput(data.tabId, data.outputId, outputContent);
          } else {
            useAttackStore.getState().addPersistentOutput(data.tabId, outputContent);
          }
        } else {
          console.warn(`🌐 Global handler: Output event with no content for tab ${data.tabId}`, data);
        }
        break;
        
      case "error":
        if (data.payload || data.message) {
          const errorMessage = data.payload || data.message;
          useAttackStore.getState().addPersistentOutput(data.tabId, `ERROR: ${errorMessage}`);
        }
        break;

      case "status":
        const status = data.payload?.status || data.status;
        useAttackStore.getState().updateTabState(data.tabId, {
          status: status || 'idle',
          isRunning: status === 'running',
          loading: status === 'running'
        });
        break;

      case "iframe-ready":
        // Ajouter un message de confirmation pour l'utilisateur
        if (data.message) {
          useAttackStore.getState().addPersistentOutput(data.tabId, `🖼️ ${data.message}`);
        }
        useAttackStore.getState().updateTabState(data.tabId, {
          iframeReady: true,
          status: 'completed',
          isRunning: false,
          loading: false
        });
        break;

      case "sequential-completed":
        // Pour MAIP, activer l'iframe après la séquence complète
        const tabState = useAttackStore.getState().tabStates[data.tabId];
        if (tabState?.selectedTool === 'maip') {
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
        // Pas d'action spéciale nécessaire
        break;

      case "completed":
        useAttackStore.getState().updateTabState(data.tabId, {
          status: 'completed',
          isRunning: false,
          loading: false,
          lockedForInteraction: false
        });
        break;

      case "stopped":
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
        break;
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
