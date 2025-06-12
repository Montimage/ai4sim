// filepath: /home/hamdouni-mohamed/MMT/Dashboard/17.04/frontend/src/services/scenarioTerminalService.ts
import { websocket } from './websocket';

export interface TerminalOutput {
  type: 'output' | 'error';
  content: string;
  timestamp: number;
}

export interface TerminalState {
  scenarioId: string;
  terminalId: string;
  status: 'running' | 'stopped' | 'paused' | 'completed' | 'failed';
  outputBuffer: TerminalOutput[];
  isActive: boolean;
  attackOutputs: Record<string, TerminalOutput[]>;
}

class ScenarioTerminalService {
  private static instance: ScenarioTerminalService;
  private terminals: Map<string, TerminalState> = new Map();
  private subscribers: Map<string, Set<(state: TerminalState) => void>> = new Map();

  private constructor() {
    this.initializeWebSocketListeners();
  }

  public static getInstance(): ScenarioTerminalService {
    if (!ScenarioTerminalService.instance) {
      ScenarioTerminalService.instance = new ScenarioTerminalService();
    }
    return ScenarioTerminalService.instance;
  }

  private initializeWebSocketListeners(): void {
    // CORRECTIF: Désactiver temporairement les listeners du ScenarioTerminalService
    // pour éviter les duplications avec useScenarioTerminal
    // Tous les messages sont maintenant traités uniquement dans useScenarioTerminal
    console.log('[SCENARIO-TERMINAL-SERVICE] WebSocket listeners disabled to prevent duplication');
    
    /* LISTENERS DÉSACTIVÉS POUR ÉVITER LA DUPLICATION
    websocket.on('terminal-output', (data: {
      scenarioId: string;
      terminalId: string;
      attackId?: string;
      output: string;
      timestamp: number;
    }) => {
      const terminalKey = `${data.scenarioId}:${data.terminalId}`;
      const terminal = this.getOrCreateTerminal(data.scenarioId, data.terminalId);

      terminal.outputBuffer.push({
        type: 'output',
        content: data.output,
        timestamp: data.timestamp || Date.now()
      });

      // Limiter la taille du buffer de sortie
      if (terminal.outputBuffer.length > 1000) {
        terminal.outputBuffer = terminal.outputBuffer.slice(-1000);
      }

      this.notifySubscribers(terminalKey, terminal);

      // Si un attackId est fourni, mettre également à jour le terminal spécifique à cette attaque
      if (data.attackId) {
        // Utiliser l'attackId comme terminalId pour le terminal spécifique
        const attackTerminalKey = `${data.scenarioId}:${data.attackId}`;
        const attackTerminal = this.getOrCreateTerminal(data.scenarioId, data.attackId);
        
        attackTerminal.outputBuffer.push({
          type: 'output',
          content: data.output,
          timestamp: data.timestamp || Date.now()
        });
        
        // Limiter la taille du buffer de sortie
        if (attackTerminal.outputBuffer.length > 1000) {
          attackTerminal.outputBuffer = attackTerminal.outputBuffer.slice(-1000);
        }
        
        this.notifySubscribers(attackTerminalKey, attackTerminal);
      }
    });

    websocket.on('terminal-error', (data: {
      scenarioId: string;
      terminalId: string;
      attackId?: string;
      error: string;
      timestamp: number;
    }) => {
      const terminalKey = `${data.scenarioId}:${data.terminalId}`;
      const terminal = this.getOrCreateTerminal(data.scenarioId, data.terminalId);

      terminal.outputBuffer.push({
        type: 'error',
        content: data.error,
        timestamp: data.timestamp || Date.now()
      });

      // Limiter la taille du buffer de sortie
      if (terminal.outputBuffer.length > 1000) {
        terminal.outputBuffer = terminal.outputBuffer.slice(-1000);
      }

      this.notifySubscribers(terminalKey, terminal);

      // Si un attackId est fourni, mettre également à jour le terminal spécifique à cette attaque
      if (data.attackId) {
        // Utiliser l'attackId comme terminalId pour le terminal spécifique
        const attackTerminalKey = `${data.scenarioId}:${data.attackId}`;
        const attackTerminal = this.getOrCreateTerminal(data.scenarioId, data.attackId);
        
        attackTerminal.outputBuffer.push({
          type: 'error',
          content: data.error,
          timestamp: data.timestamp || Date.now()
        });
        
        // Limiter la taille du buffer de sortie
        if (attackTerminal.outputBuffer.length > 1000) {
          attackTerminal.outputBuffer = attackTerminal.outputBuffer.slice(-1000);
        }
        
        this.notifySubscribers(attackTerminalKey, attackTerminal);
      }
    });

    websocket.on('terminal-status', (data: {
      scenarioId: string;
      terminalId: string;
      attackId?: string;
      status: 'running' | 'stopped' | 'paused' | 'completed' | 'failed';
      timestamp: number;
    }) => {
      const terminalKey = `${data.scenarioId}:${data.terminalId}`;
      const terminal = this.getOrCreateTerminal(data.scenarioId, data.terminalId);

      terminal.status = data.status;

      // Ajouter un message de statut au buffer
      terminal.outputBuffer.push({
        type: 'output',
        content: `[Système] Terminal ${data.status}`,
        timestamp: data.timestamp || Date.now()
      });

      this.notifySubscribers(terminalKey, terminal);

      // Si un attackId est fourni, mettre également à jour le terminal spécifique à cette attaque
      if (data.attackId) {
        // Utiliser l'attackId comme terminalId pour le terminal spécifique
        const attackTerminalKey = `${data.scenarioId}:${data.attackId}`;
        const attackTerminal = this.getOrCreateTerminal(data.scenarioId, data.attackId);
        
        attackTerminal.status = data.status;
        
        // Ajouter un message de statut au buffer du terminal de l'attaque
        attackTerminal.outputBuffer.push({
          type: 'output',
          content: `[Système] Terminal ${data.status}`,
          timestamp: data.timestamp || Date.now()
        });
        
        this.notifySubscribers(attackTerminalKey, attackTerminal);
      }
    });

    websocket.on('terminal-clear', (data: {
      scenarioId: string;
      terminalId: string;
    }) => {
      const terminalKey = `${data.scenarioId}:${data.terminalId}`;
      const terminal = this.getOrCreateTerminal(data.scenarioId, data.terminalId);

      terminal.outputBuffer = [];
      this.notifySubscribers(terminalKey, terminal);
    });

    // Gérer la reconnexion pour maintenir les abonnements
    websocket.on('reconnect', () => {
      // Réabonner à tous les scénarios actifs
      const scenarioIds = new Set<string>();
      this.terminals.forEach(terminal => {
        scenarioIds.add(terminal.scenarioId);
      });

      scenarioIds.forEach(scenarioId => {
        websocket.send({
          type: 'subscribe',
          scenarioId
        });
      });
    });
    */ // FIN DU COMMENTAIRE MULTI-LIGNE
  }

  private getOrCreateTerminal(scenarioId: string, terminalId: string): TerminalState {
    const terminalKey = `${scenarioId}:${terminalId}`;
    
    if (!this.terminals.has(terminalKey)) {
      // Essayer de restaurer l'état persisté depuis localStorage
      const persistedState = this.loadPersistedState(scenarioId, terminalId);
      
      this.terminals.set(terminalKey, persistedState || {
        scenarioId,
        terminalId,
        status: 'running',
        outputBuffer: [],
        isActive: false,
        attackOutputs: {}
      });
    }
    
    return this.terminals.get(terminalKey)!;
  }

  // Méthodes de persistance d'état
  private loadPersistedState(scenarioId: string, terminalId: string): TerminalState | null {
    try {
      const key = `terminal_state_${scenarioId}_${terminalId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Vérifier que l'état n'est pas trop ancien (max 1 heure)
        if (parsed.lastSaved && Date.now() - parsed.lastSaved < 3600000) {
          console.log(`[PERSISTENCE] Restored terminal state for ${scenarioId}:${terminalId}`, parsed.state);
          return parsed.state;
        }
      }
    } catch (error) {
      console.warn('[PERSISTENCE] Failed to load persisted state:', error);
    }
    return null;
  }

  private notifySubscribers(terminalKey: string, state: TerminalState): void {
    const subscribers = this.subscribers.get(terminalKey);
    if (subscribers) {
      subscribers.forEach(callback => callback({ ...state }));
    }
  }

  // Méthodes publiques
  public getAllTerminals(): TerminalState[] {
    return Array.from(this.terminals.values());
  }

  public getTerminalsByScenario(scenarioId: string): TerminalState[] {
    return this.getAllTerminals().filter(t => t.scenarioId === scenarioId);
  }

  public clearTerminal(scenarioId: string, terminalId: string): void {
    const terminalKey = `${scenarioId}:${terminalId}`;
    const terminal = this.terminals.get(terminalKey);
    
    if (terminal) {
      terminal.outputBuffer = [];
      this.notifySubscribers(terminalKey, terminal);
      
      // Envoyer la commande de nettoyage au serveur
      websocket.send({
        type: 'clear-terminal',
        scenarioId,
        terminalId
      });
    }
  }

  public setActiveTerminal(scenarioId: string, terminalId: string): void {
    // Désactiver tous les terminaux actuellement actifs
    this.terminals.forEach((terminal, key) => {
      if (terminal.isActive) {
        terminal.isActive = false;
        this.notifySubscribers(key, terminal);
      }
    });

    // Activer le terminal demandé
    const terminalKey = `${scenarioId}:${terminalId}`;
    const terminal = this.getOrCreateTerminal(scenarioId, terminalId);
    terminal.isActive = true;
    this.notifySubscribers(terminalKey, terminal);
  }

  public subscribeToTerminal(
    scenarioId: string,
    terminalId: string,
    callback: (state: TerminalState) => void
  ): () => void {
    const terminalKey = `${scenarioId}:${terminalId}`;
    
    if (!this.subscribers.has(terminalKey)) {
      this.subscribers.set(terminalKey, new Set());
    }
    
    const subscriberSet = this.subscribers.get(terminalKey)!;
    subscriberSet.add(callback);
    
    // Transmettre l'état actuel
    const terminal = this.getOrCreateTerminal(scenarioId, terminalId);
    callback({ ...terminal });
    
    // Retourner la fonction de désabonnement
    return () => {
      const subscribers = this.subscribers.get(terminalKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(terminalKey);
        }
      }
    };
  }

  public removeTerminal(scenarioId: string, terminalId: string): void {
    const terminalKey = `${scenarioId}:${terminalId}`;
    this.terminals.delete(terminalKey);
    this.subscribers.delete(terminalKey);
  }

  addOutput(terminalId: string, content: string, type: 'output' | 'error' = 'output'): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      const outputEntry = {
        content,
        type,
        timestamp: Date.now()
      };
      
      terminal.outputBuffer.push(outputEntry);
      // Removed buffer size limitation to keep complete output history
      
      this.notifySubscribers(terminalId, terminal);
    }
  }

  addAttackOutput(terminalId: string, attackId: string, content: string, type: 'output' | 'error' = 'output'): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      if (!terminal.attackOutputs[attackId]) {
        terminal.attackOutputs[attackId] = [];
      }
      
      const outputEntry = {
        content,
        type,
        timestamp: Date.now()
      };
      
      terminal.attackOutputs[attackId].push(outputEntry);
      // Removed buffer size limitation to keep complete attack output history
      
      this.notifySubscribers(terminalId, terminal);
    }
  }

  updateTerminalOutput(terminalId: string, content: string, type: 'output' | 'error' = 'output'): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      const outputEntry = {
        content,
        type,
        timestamp: Date.now()
      };
      
      terminal.outputBuffer.push(outputEntry);
      // Removed buffer size limitation to keep complete output history
      
      this.notifySubscribers(terminalId, terminal);
    }
  }

  updateAttackTerminalOutput(terminalId: string, attackId: string, content: string, type: 'output' | 'error' = 'output'): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      if (!terminal.attackOutputs[attackId]) {
        terminal.attackOutputs[attackId] = [];
      }
      
      const outputEntry = {
        content,
        type,
        timestamp: Date.now()
      };
      
      terminal.attackOutputs[attackId].push(outputEntry);
      // Removed buffer size limitation to keep complete attack output history
      
      this.notifySubscribers(terminalId, terminal);
    }
  }
}

// Singleton export
export const scenarioTerminalService = ScenarioTerminalService.getInstance();
