import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { ProcessManager } from '../services/ProcessManager';
import { logger } from '../utils/logger';
import { Project } from '../models/Project';
import { TerminalManager as ITerminalManager } from '../types/terminal';
import { AttackService } from '../services/AttackService';

interface WSClient {
    id: string;
    userId?: string;
    subscribedScenarios: Set<string>;
    lastActivity: Date;
    send: (data: any) => void;
}

// Interface pour les terminaux de scénario avec historique
interface ScenarioTerminal {
    id: string;
    activeTerminals: Set<string>;
    subscribers: Set<WebSocket>;
    lastUpdates: Map<string, {
        data: any;
        timestamp: number;
        version: number;
    }>;
    lastActivity: number;
    executionHistory: Array<{
        id: string;
        timestamp: Date;
        type: 'start' | 'output' | 'error' | 'complete' | 'abort';
        data: any;
    }>;
}

interface WSMessage {
    type: string;
    command?: string;
    parameters?: Record<string, any>;
    tabId?: string;
    port?: number;
    tool?: string;
    ports?: number[];
    containers?: string[];
    projectId?: string;
    campaignId?: string;
    scenarioId?: string;
    targets?: string[];
    attackId?: string;
    terminalId?: string;
    executionId?: string;
    outputId?: string;
    steps?: Array<{
        id: string;
        name: string;
        command: string;
        workingDirectory?: string;
        successMessage?: string;
        dependsOn?: string;
    }>;
}

export class WebSocketManager extends EventEmitter {
    private wss: WebSocket.Server;
    private clients: Map<WebSocket, WSClient>;
    private processManager: ProcessManager | null = null;
    private static instance: WebSocketManager | null = null;
    private terminalManager: ITerminalManager;
    private static initializationPromise: Promise<WebSocketManager> | null = null;
    private scenarioTerminals: Map<string, ScenarioTerminal>;
    private attackService: AttackService;
    
    // Configuration pour l'historique
    private readonly MAX_EXECUTION_HISTORY = 100;
    private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
    private readonly SCENARIO_CLEANUP_TIMEOUT = 24 * 60 * 60 * 1000; // 24 heures

    private constructor(server: any) {
        super();
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map();
        this.scenarioTerminals = new Map();
        // AttackService sera initialisé plus tard pour éviter la dépendance circulaire
        this.attackService = null as any;
        // ProcessManager sera initialisé plus tard
        this.initializeServer();

        // Démarrer le nettoyage périodique
        this.startCleanupInterval();

        process.on('SIGTERM', () => this.cleanup());
        process.on('SIGINT', () => this.cleanup());
    }

    public static async initialize(server: any): Promise<WebSocketManager> {
        if (!this.initializationPromise) {
            this.initializationPromise = new Promise((resolve) => {
                const instance = new WebSocketManager(server);
                this.instance = instance;
                // Initialiser ProcessManager et AttackService maintenant que WebSocketManager existe
                instance.processManager = ProcessManager.getInstance();
                instance.attackService = AttackService.getInstance();
                resolve(instance);
            });
        }
        return this.initializationPromise;
    }

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            throw new Error('WebSocket Manager not initialized. Call initialize() first.');
        }
        return WebSocketManager.instance;
    }

    public setTerminalManager(manager: ITerminalManager): void {
        this.terminalManager = manager;
    }

    private initializeServer(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            const client: WSClient = {
                id: Date.now().toString(),
                subscribedScenarios: new Set(),
                lastActivity: new Date(),
                send: (data: any) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        try {
                            const message = JSON.stringify(data);
                            ws.send(message);
                        } catch (error) {
                            console.error('Failed to send WebSocket message:', error);
                        }
                    }
                }
            };
            
            this.clients.set(ws, client);

            ws.on('message', async (message: string) => {
                const messageStr = message.toString();
                
                // Mettre à jour l'activité du client pour tous les messages
                if (client) {
                    client.lastActivity = new Date();
                }
                
                // Gestion des pings/pongs
                if (messageStr === 'ping') {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('pong');
                        // Mettre à jour l'activité du client
                        if (client) {
                            client.lastActivity = new Date();
                        }
                    }
                    return;
                }
                if (messageStr === 'pong') {
                    // Mettre à jour l'activité du client
                    if (client) {
                        client.lastActivity = new Date();
                    }
                    return;
                }

                let parsedData: WSMessage | null = null;
                try {
                    parsedData = JSON.parse(messageStr) as WSMessage;
                    
                    if (!parsedData) {
                        throw new Error('Invalid message format');
                    }

                    // Mettre à jour l'activité du client pour les messages JSON
                    if (client) {
                        client.lastActivity = new Date();
                    }

                    // Gérer les messages liés aux terminaux et à l'historique
                    switch (parsedData.type) {
                        case 'subscribe-scenario':
                            if (parsedData.scenarioId) {
                                this.subscribeToScenario(ws, parsedData.scenarioId);
                                this.addExecutionHistoryEntry(parsedData.scenarioId, {
                                    id: `subscribe-${Date.now()}`,
                                    type: 'start',
                                    data: { action: 'client_subscribed', clientId: client.id }
                                });
                            }
                            break;

                        case 'unsubscribe-scenario':
                            if (parsedData.scenarioId) {
                                this.unsubscribeFromScenario(ws, parsedData.scenarioId);
                            }
                            break;

                        case 'authenticate':
                            // Message d'authentification - pour l'instant on l'ignore
                            logger.info(`Authentication message received from client ${client.id}`);
                            break;

                        case 'get_scenario_info':
                            // Demande d'informations sur un scénario
                            if (parsedData.scenarioId) {
                                // Envoyer les informations du scénario si disponibles
                                this.sendScenarioInfo(ws, parsedData.scenarioId);
                            }
                            break;

                        case 'request-execution-history':
                            if (parsedData.scenarioId) {
                                this.sendExecutionHistory(ws, parsedData.scenarioId);
                            }
                            break;

                        case 'terminal-command':
                            const { scenarioId, attackId, command } = parsedData;
                            if (!scenarioId || !attackId || !command) {
                                throw new Error('Missing required terminal command parameters');
                            }

                            // Ajouter à l'historique d'exécution
                            this.addExecutionHistoryEntry(scenarioId, {
                                id: `command-${Date.now()}`,
                                type: 'start',
                                data: { command, attackId, clientId: client.id }
                            });

                            const terminal = this.terminalManager.createTerminal(scenarioId, attackId, 'custom');
                            this.terminalManager.appendOutput(terminal.id, `$ ${command}\n`);
                            
                            try {
                                await this.processManager?.startProcess(
                                    command,
                                    {},
                                    terminal.id,
                                    (output: string) => {
                                        this.terminalManager.appendOutput(terminal.id, output);
                                        // Ajouter la sortie à l'historique
                                        this.addExecutionHistoryEntry(scenarioId, {
                                            id: `output-${Date.now()}`,
                                            type: 'output',
                                            data: { output, terminalId: terminal.id, attackId }
                                        });
                                    },
                                    (error: string) => {
                                        this.terminalManager.appendError(terminal.id, error);
                                        // Ajouter l'erreur à l'historique
                                        this.addExecutionHistoryEntry(scenarioId, {
                                            id: `error-${Date.now()}`,
                                            type: 'error',
                                            data: { error, terminalId: terminal.id, attackId }
                                        });
                                    },
                                    (notification: { level: string, message: string }) => {
                                        client.send({
                                            type: 'notification',
                                            ...notification,
                                            terminalId: terminal.id
                                        });
                                    }
                                );
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                this.terminalManager.appendError(terminal.id, errorMessage);
                                
                                // Ajouter l'erreur à l'historique
                                this.addExecutionHistoryEntry(scenarioId, {
                                    id: `error-${Date.now()}`,
                                    type: 'error',
                                    data: { error: errorMessage, terminalId: terminal.id, attackId }
                                });
                            }
                            break;

                        case 'execute': {
                            const { command, parameters, tabId, projectId, campaignId, scenarioId, targets } = parsedData;
                            
                            if (!command || !tabId) {
                                throw new Error('Command and tabId are required');
                            }

                            let projectInfo;
                            if (projectId && campaignId && scenarioId && targets) {
                                const project = await Project.findById(projectId);
                                if (!project) {
                                    throw new Error('Project not found');
                                }
                                projectInfo = { projectId, campaignId, scenarioId, targets };
                                
                                // Ajouter à l'historique d'exécution pour les commandes de scénario
                                this.addExecutionHistoryEntry(scenarioId, {
                                    id: `execute-${Date.now()}`,
                                    type: 'start',
                                    data: { command, parameters, clientId: client.id }
                                });
                            }
                            
                            await this.processManager?.startProcess(
                                command,
                                parameters || {},
                                tabId,
                                (output: string) => {
                                    client.send({
                                        type: 'output',
                                        payload: output,
                                        tabId
                                    });
                                    
                                    // Ajouter à l'historique si c'est un scénario
                                    if (scenarioId) {
                                        this.addExecutionHistoryEntry(scenarioId, {
                                            id: `output-${Date.now()}`,
                                            type: 'output',
                                            data: { output, tabId }
                                        });
                                    }
                                },
                                (error: string) => {
                                    client.send({
                                        type: 'error',
                                        payload: error,
                                        tabId
                                    });
                                    
                                    // Ajouter à l'historique si c'est un scénario
                                    if (scenarioId) {
                                        this.addExecutionHistoryEntry(scenarioId, {
                                            id: `error-${Date.now()}`,
                                            type: 'error',
                                            data: { error, tabId }
                                        });
                                    }
                                },
                                (notification: { level: string, message: string }) => {
                                    client.send({
                                        type: 'notification',
                                        ...notification,
                                        tabId
                                    });
                                },
                                projectInfo
                            );
                            break;
                        }

                        case 'stop': {
                            const { tabId, port, scenarioId, tool, ports, containers } = parsedData;
                            if (!tabId) {
                                throw new Error('tabId is required for stop command');
                            }
                            
                            // Gérer l'arrêt spécifique pour MAIP et Caldera
                            if (tool === 'maip' && ports && containers) {
                                client.send({
                                    type: 'output',
                                    payload: '🛑 Stopping MAIP services...',
                                    tabId
                                });
                                
                                await this.processManager?.stopMAIPServices(tabId, ports, containers, (message: string) => {
                                    client.send({
                                        type: 'output',
                                        payload: message,
                                        tabId
                                    });
                                });
                                
                                // Envoyer confirmation d'arrêt
                                client.send({
                                    type: 'stopped',
                                    tool: 'maip',
                                    tabId
                                });
                            } else if (tool === 'caldera' && ports) {
                                client.send({
                                    type: 'output',
                                    payload: '🛑 Stopping Caldera service...',
                                    tabId
                                });
                                
                                await this.processManager?.stopCalderaService(tabId, ports[0], (message: string) => {
                                    client.send({
                                        type: 'output',
                                        payload: message,
                                        tabId
                                    });
                                });
                                
                                // Envoyer confirmation d'arrêt
                                client.send({
                                    type: 'stopped',
                                    tool: 'caldera',
                                    tabId
                                });
                            } else {
                                // Arrêt standard pour les autres outils
                                await this.processManager?.stopProcess(tabId, port);
                            }
                            
                            // Ajouter à l'historique si c'est un scénario
                            if (scenarioId) {
                                this.addExecutionHistoryEntry(scenarioId, {
                                    id: `stop-${Date.now()}`,
                                    type: 'complete',
                                    data: { action: 'process_stopped', tabId, tool: tool || 'unknown' }
                                });
                            }
                            break;
                        }

                        case 'stop-scenario': {
                            const { scenarioId } = parsedData;
                            if (!scenarioId) {
                                throw new Error('scenarioId is required for stop-scenario command');
                            }
                            
                            // Get all processes for this scenario
                            const scenarioProcesses = this.processManager?.getProcessesByScenario(scenarioId) || [];
                            
                            // Stop all processes for this scenario
                            for (const processInfo of scenarioProcesses) {
                                try {
                                    await this.processManager?.stopProcess(processInfo.tabId);
                                    client.send({
                                        type: 'output',
                                        payload: `Process ${processInfo.tabId} stopped`,
                                        scenarioId
                                    });
                                } catch (error) {
                                    console.error(`Error stopping process ${processInfo.tabId}:`, error);
                                    client.send({
                                        type: 'error',
                                        payload: `Error stopping process ${processInfo.tabId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                        scenarioId
                                    });
                                }
                            }
                            
                            // Add to execution history
                            this.addExecutionHistoryEntry(scenarioId, {
                                id: `stop-scenario-${Date.now()}`,
                                type: 'complete',
                                data: { action: 'scenario_stopped', processCount: scenarioProcesses.length }
                            });
                            
                            client.send({
                                type: 'output',
                                payload: `Scenario ${scenarioId} stopped - ${scenarioProcesses.length} processes terminated`,
                                scenarioId
                            });
                            
                            break;
                        }

                        case 'clear-terminal': {
                            const { scenarioId, terminalId } = parsedData;
                            if (scenarioId && terminalId) {
                                this.terminalManager.clearTerminal(`${scenarioId}-${terminalId}`);
                                
                                // Ajouter à l'historique
                                this.addExecutionHistoryEntry(scenarioId, {
                                    id: `clear-${Date.now()}`,
                                    type: 'output',
                                    data: { action: 'terminal_cleared', terminalId }
                                });
                            }
                            break;
                        }

                        case "execute-multi":
                          try {
                            const { command, outputId, parameters, tabId } = parsedData;
                            
                            if (!command || !outputId || !tabId) {
                              ws.send(JSON.stringify({
                                type: "error",
                                payload: "Missing required parameters for multi-output execution",
                                tabId
                              }));
                              return;
                            }

                            // Utiliser AttackService pour exécuter avec outputs multiples
                            await this.attackService.executeAttackWithMultiOutput(
                              'maip', // tool
                              outputId,
                              parameters || {},
                              tabId,
                              (output: string, outputId: string) => {
                                ws.send(JSON.stringify({
                                  type: "output",
                                  message: output,
                                  outputId,
                                  tabId
                                }));
                              },
                              (error: string, outputId: string) => {
                                ws.send(JSON.stringify({
                                  type: "error",
                                  payload: error,
                                  outputId,
                                  tabId
                                }));
                              }
                            );
                          } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error(`Multi-output execution error: ${errorMessage}`);
                            ws.send(JSON.stringify({
                              type: "error",
                              payload: errorMessage,
                              tabId: parsedData.tabId
                            }));
                          }
                          break;

                        case "execute-sequential":
                          try {
                            const { steps, tabId, parameters } = parsedData;
                            
                            if (!steps || !Array.isArray(steps) || !tabId) {
                              ws.send(JSON.stringify({
                                type: "error",
                                payload: "Missing required parameters for sequential execution",
                                tabId
                              }));
                              return;
                            }

                            // Exécuter les étapes séquentiellement
                            await this.executeSequentialSteps(steps, tabId, parameters || {}, client);
                          } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error(`Sequential execution error: ${errorMessage}`);
                            ws.send(JSON.stringify({
                              type: "error",
                              payload: errorMessage,
                              tabId: parsedData.tabId
                            }));
                          }
                          break;

                        default:
                            logger.warn(`Unknown message type: ${parsedData.type}`);
                    }
                } catch (error) {
                    if (messageStr !== 'ping' && messageStr !== 'pong') {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        client.send({
                            type: 'error',
                            payload: errorMessage,
                            tabId: parsedData?.tabId || ''
                        });
                        logger.error('WebSocket error:', errorMessage);
                    }
                }
            });

            ws.on('close', () => {
                const client = this.clients.get(ws);
                if (client) {
                    this.processManager?.cleanupClientProcesses(client.id);
                }
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket connection error:', error);
                ws.terminate();
            });
        });
    }

    private startCleanupInterval(): void {
        setInterval(() => {
            this.cleanupScenarios();
            this.cleanupInactiveClients();
        }, this.CLEANUP_INTERVAL);
    }

    private cleanupScenarios(): void {
        const now = Date.now();
        for (const [scenarioId, terminal] of this.scenarioTerminals.entries()) {
            if (now - terminal.lastActivity > this.SCENARIO_CLEANUP_TIMEOUT) {
                // Nettoyer les terminaux inactifs
                terminal.subscribers.clear();
                terminal.activeTerminals.clear();
                terminal.lastUpdates.clear();
                
                // Limiter l'historique
                if (terminal.executionHistory.length > this.MAX_EXECUTION_HISTORY) {
                    terminal.executionHistory = terminal.executionHistory.slice(-this.MAX_EXECUTION_HISTORY);
                }
                
                this.scenarioTerminals.delete(scenarioId);
                logger.info(`Cleaned up scenario terminal: ${scenarioId}`);
            }
        }
    }

    private cleanupInactiveClients(): void {
        const now = Date.now();
        for (const [ws, client] of this.clients.entries()) {
            if (now - client.lastActivity.getTime() > this.SCENARIO_CLEANUP_TIMEOUT || ws.readyState !== WebSocket.OPEN) {
                // Retirer le client des abonnements aux scénarios
                for (const scenarioId of client.subscribedScenarios) {
                    const scenarioTerminal = this.scenarioTerminals.get(scenarioId);
                    if (scenarioTerminal) {
                        scenarioTerminal.subscribers.delete(ws);
                    }
                }
                
                this.clients.delete(ws);
                logger.info(`Cleaned up inactive client: ${client.id}`);
            }
        }
    }

    // Méthodes pour gérer l'historique des scénarios
    public subscribeToScenario(ws: WebSocket, scenarioId: string): void {
        logger.info(`[DEBUG-WS-SUB] Client subscribing to scenario: ${scenarioId}`);
        
        const client = this.clients.get(ws);
        if (!client) {
            logger.error(`[DEBUG-WS-SUB] Client not found for subscription`);
            return;
        }

        logger.info(`[DEBUG-WS-SUB] Adding scenario to client ${client.id} subscriptions`);
        client.subscribedScenarios.add(scenarioId);
        
        // Créer ou récupérer le terminal de scénario
        let scenarioTerminal = this.scenarioTerminals.get(scenarioId);
        if (!scenarioTerminal) {
            logger.info(`[DEBUG-WS-SUB] Creating new scenario terminal for: ${scenarioId}`);
            scenarioTerminal = {
                id: scenarioId,
                activeTerminals: new Set(),
                subscribers: new Set(),
                lastUpdates: new Map(),
                lastActivity: Date.now(),
                executionHistory: []
            };
            this.scenarioTerminals.set(scenarioId, scenarioTerminal);
            logger.info(`[DEBUG-WS-SUB] Created scenario terminal successfully`);
        }
        
        scenarioTerminal.subscribers.add(ws);
        scenarioTerminal.lastActivity = Date.now();
        
        logger.info(`[DEBUG-WS-SUB] Scenario ${scenarioId} now has ${scenarioTerminal.subscribers.size} subscribers`);
        
        // Confirmer l'abonnement sans envoyer l'historique automatiquement
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'scenario-subscription-confirmed',
                scenarioId,
                timestamp: Date.now()
            }));
        }
    }

    public unsubscribeFromScenario(ws: WebSocket, scenarioId: string): void {
        const client = this.clients.get(ws);
        if (!client) return;

        client.subscribedScenarios.delete(scenarioId);
        
        const scenarioTerminal = this.scenarioTerminals.get(scenarioId);
        if (scenarioTerminal) {
            scenarioTerminal.subscribers.delete(ws);
        }
    }

    private sendExecutionHistory(ws: WebSocket, scenarioId: string): void {
        logger.info(`[DEBUG-WS-HISTORY] Explicit request for execution history for scenario: ${scenarioId}`);
        
        const scenarioTerminal = this.scenarioTerminals.get(scenarioId);
        if (!scenarioTerminal || ws.readyState !== WebSocket.OPEN) {
            logger.info(`[DEBUG-WS-HISTORY] Cannot send history - terminal not found or connection closed`);
            return;
        }

        // Send recent execution history
        const recentHistory = scenarioTerminal.executionHistory; // Removed slice(-10) to keep complete history
        
        logger.info(`[DEBUG-WS-HISTORY] Sending ${recentHistory.length} history entries`);
        
        ws.send(JSON.stringify({
            type: 'execution-history',
            scenarioId,
            history: recentHistory,
            timestamp: Date.now()
        }));
    }

    public addExecutionHistoryEntry(scenarioId: string, entry: {
        id: string;
        type: 'start' | 'output' | 'error' | 'complete' | 'abort';
        data: any;
    }): void {
        const scenarioTerminal = this.scenarioTerminals.get(scenarioId);
        if (!scenarioTerminal) return;

        const historyEntry = {
            ...entry,
            timestamp: new Date()
        };

        scenarioTerminal.executionHistory.push(historyEntry);
        scenarioTerminal.lastActivity = Date.now();

        // Limiter la taille de l'historique
        if (scenarioTerminal.executionHistory.length > this.MAX_EXECUTION_HISTORY) {
            scenarioTerminal.executionHistory = scenarioTerminal.executionHistory.slice(-this.MAX_EXECUTION_HISTORY);
        }

        // Diffuser l'entrée d'historique aux abonnés
        this.broadcastToScenarioSubscribers(scenarioId, {
            type: 'execution-history-update',
            scenarioId,
            entry: historyEntry,
            timestamp: Date.now()
        });
    }

    private broadcastToScenarioSubscribers(scenarioId: string, data: any): void {
        const scenarioTerminal = this.scenarioTerminals.get(scenarioId);
        if (!scenarioTerminal) {
            return;
        }

        const message = JSON.stringify(data);
        
        scenarioTerminal.subscribers.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(message);
                } catch (error) {
                    logger.error(`Error sending message to scenario subscriber: ${error}`);
                    scenarioTerminal.subscribers.delete(ws);
                }
            } else {
                scenarioTerminal.subscribers.delete(ws);
            }
        });
    }

    public broadcast(data: any): void {
        this.clients.forEach(client => {
            client.send(data);
        });
    }

    public broadcastScenarioUpdate(scenarioId: string, data: any): void {
        this.addExecutionHistoryEntry(scenarioId, {
            id: `update-${Date.now()}`,
            type: 'output',
            data
        });
        
        const message = {
            type: 'scenario-update',
            scenarioId,
            data,
            timestamp: Date.now()
        };
        
        this.broadcastToScenarioSubscribers(scenarioId, message);
    }

    public broadcastCampaignUpdate(campaignId: string, data: any): void {
        // Diffuser aux clients intéressés par cette campagne
        this.clients.forEach((_, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({
                        type: 'campaign-update',
                        campaignId,
                        data,
                        timestamp: Date.now()
                    }));
                } catch (error) {
                    logger.error(`Error sending campaign update: ${error}`);
                }
            }
        });
    }

    private async executeSequentialSteps(
        steps: Array<{
            id: string;
            name: string;
            command: string;
            workingDirectory?: string;
            successMessage?: string;
            dependsOn?: string;
        }>,
        tabId: string,
        parameters: Record<string, any>,
        client: WSClient
    ): Promise<void> {
        const completedSteps = new Set<string>();
        const stepOutputs = new Map<string, string[]>();
        
        // Vérifier si les services MAIP sont déjà en cours d'exécution
        const checkMAIPServices = async () => {
            const systemController = new (await import('../controllers/SystemController')).SystemController();
            
            // Vérifier le serveur MAIP (port 31057)
            const serverCheck = await systemController.checkPort(31057);
            if (serverCheck.isInUse) {
                client.send({
                    type: 'output',
                    payload: `🟢 MAIP Server is already running on port 31057`,
                    outputId: 'server',
                    tabId
                });
                completedSteps.add('server');
            }
            
            // Vérifier le client MAIP (port 3001)
            const clientCheck = await systemController.checkPort(3001);
            if (clientCheck.isInUse) {
                client.send({
                    type: 'output',
                    payload: `🟢 MAIP Client is already running on port 3001`,
                    outputId: 'client',
                    tabId
                });
                client.send({
                    type: 'output',
                    payload: `✅ Compiled successfully!`,
                    outputId: 'client',
                    tabId
                });
                completedSteps.add('client');
                
                // Si les deux services sont déjà actifs, basculer directement vers l'interface
                if (serverCheck.isInUse) {
                    setTimeout(() => {
                        client.send({
                            type: 'output',
                            payload: `🖼️ MAIP services already active, switching to interface...`,
                            outputId: 'client',
                            tabId
                        });
                        
                        setTimeout(() => {
                            client.send({
                                type: 'iframe-ready',
                                tabId,
                                port: 3001,
                                message: 'MAIP interface is ready!'
                            });
                        }, 1000);
                    }, 100);
                }
            }
        };
        
        // Vérifier les services MAIP au début si les étapes contiennent 'server' et 'client'
        const hasMAIPSteps = steps.some(step => step.id === 'server' || step.id === 'client');
        if (hasMAIPSteps) {
            await checkMAIPServices();
        }
        
        // Fonction pour vérifier si une étape peut être exécutée
        const canExecuteStep = (step: any) => {
            return !step.dependsOn || completedSteps.has(step.dependsOn);
        };
        
        // Fonction pour exécuter une étape
        const executeStep = async (step: any): Promise<boolean> => {
            return new Promise((resolve) => {
                const stepTabId = `${tabId}-${step.id}`;
                let stepOutput: string[] = [];
                stepOutputs.set(step.id, stepOutput);
                let stepCompleted = false;
                
                client.send({
                    type: 'output',
                    payload: `🚀 Starting ${step.name}...`,
                    outputId: step.id,
                    tabId
                });
                
                this.processManager?.startProcess(
                    step.command,
                    parameters,
                    stepTabId,
                    (output: string) => {
                        stepOutput.push(output);
                        client.send({
                            type: 'output',
                            payload: output,
                            outputId: step.id,
                            tabId
                        });
                        
                        // Vérifier si c'est le message de succès et si l'étape n'est pas déjà terminée
                        if (step.successMessage && output.includes(step.successMessage) && !stepCompleted) {
                            stepCompleted = true;
                            completedSteps.add(step.id);
                            client.send({
                                type: 'step-completed',
                                stepId: step.id,
                                stepName: step.name,
                                tabId
                            });
                            
                            // Pour MAIP client avec "Compiled successfully!", attendre 1 seconde puis basculer sur l'interface
                            if (step.id === 'client' && step.successMessage === 'Compiled successfully!') {
                                logger.debug(`[SEQUENTIAL] MAIP client detected with success message: "${step.successMessage}"`);
                                
                                client.send({
                                    type: 'output',
                                    payload: `✅ ${step.name} compilation completed successfully!`,
                                    outputId: step.id,
                                    tabId
                                });
                                
                                setTimeout(() => {
                                    logger.debug(`[SEQUENTIAL] Sending switching message for MAIP client`);
                                    client.send({
                                        type: 'output',
                                        payload: `🖼️ Switching to MAIP interface in 1 second...`,
                                        outputId: step.id,
                                        tabId
                                    });
                                    
                                    setTimeout(() => {
                                        if (stepCompleted) {
                                            logger.debug(`[SEQUENTIAL] Sending iframe-ready event for MAIP client on port 3001`);
                                            client.send({
                                                type: 'iframe-ready',
                                                tabId,
                                                port: 3001,
                                                message: 'MAIP interface is ready!'
                                            });
                                            resolve(true);
                                        } else {
                                            logger.debug(`[SEQUENTIAL] Step not completed, skipping iframe-ready`);
                                        }
                                    }, 1000); // Délai d'1 seconde avant de basculer sur l'interface
                                }, 100);
                            } else {
                                logger.debug(`[SEQUENTIAL] Regular step completion for ${step.id} with message: "${step.successMessage}"`);
                                // Pour les autres étapes, continuer normalement
                                setTimeout(() => {
                                    if (stepCompleted) {
                                        resolve(true);
                                    }
                                }, 1000); // Petit délai pour s'assurer que le message est bien traité
                            }
                        }
                    },
                    (error: string) => {
                        stepOutput.push(`ERROR: ${error}`);
                        client.send({
                            type: 'error',
                            payload: error,
                            outputId: step.id,
                            tabId
                        });
                        if (!stepCompleted) {
                            resolve(false);
                        }
                    },
                    (notification: { level: string, message: string }) => {
                        client.send({
                            type: 'notification',
                            ...notification,
                            outputId: step.id,
                            tabId
                        });
                    }
                ).catch((error) => {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    client.send({
                        type: 'error',
                        payload: errorMessage,
                        outputId: step.id,
                        tabId
                    });
                    if (!stepCompleted) {
                        resolve(false);
                    }
                });
                
                // Timeout de sécurité pour éviter d'attendre indéfiniment
                setTimeout(() => {
                    if (!stepCompleted) {
                        // Si aucun message de succès n'est défini, considérer l'étape comme réussie après un délai
                        if (!step.successMessage) {
                            completedSteps.add(step.id);
                            client.send({
                                type: 'step-completed',
                                stepId: step.id,
                                stepName: step.name,
                                tabId
                            });
                            resolve(true);
                        } else {
                            // Timeout pour les étapes avec message de succès
                            client.send({
                                type: 'error',
                                payload: `Timeout waiting for success message: "${step.successMessage}" for step ${step.name}`,
                                outputId: step.id,
                                tabId
                            });
                            resolve(false);
                        }
                    }
                }, 60000); // Timeout de 60 secondes
            });
        };
        
        // Exécuter les étapes dans l'ordre de dépendance
        const pendingSteps = [...steps.filter(step => !completedSteps.has(step.id))];
        
        while (pendingSteps.length > 0) {
            const readySteps = pendingSteps.filter(canExecuteStep);
            
            if (readySteps.length === 0) {
                // Aucune étape prête, vérifier les dépendances circulaires
                const remainingStepIds = pendingSteps.map(s => s.id);
                client.send({
                    type: 'error',
                    payload: `Circular dependency detected or missing dependencies for steps: ${remainingStepIds.join(', ')}`,
                    tabId
                });
                break;
            }
            
            // Exécuter la première étape prête
            const stepToExecute = readySteps[0];
            logger.debug(`[SEQUENTIAL] Executing step: ${stepToExecute.id} (${stepToExecute.name})`);
            const success = await executeStep(stepToExecute);
            
            // Retirer l'étape de la liste des étapes en attente
            const stepIndex = pendingSteps.findIndex(s => s.id === stepToExecute.id);
            if (stepIndex !== -1) {
                pendingSteps.splice(stepIndex, 1);
            }
            
            if (!success) {
                client.send({
                    type: 'error',
                    payload: `Step ${stepToExecute.name} failed, stopping sequential execution`,
                    tabId
                });
                break;
            }
        }
        
        // Notifier la fin de l'exécution séquentielle
        if (completedSteps.size === steps.length) {
            client.send({
                type: 'sequential-completed',
                completedSteps: Array.from(completedSteps),
                tabId
            });
        }
    }

    private cleanup(): void {
        this.processManager?.cleanup();
        // Nettoyer les terminaux associés
        if (this.terminalManager && this.terminalManager.terminals) {
            for (const [id] of this.terminalManager.terminals) {
                this.terminalManager.removeTerminal(id);
            }
        }
        this.clients.forEach((_, ws) => {
            try {
                ws.terminate();
            } catch (error) {
                logger.error('Error during WebSocket cleanup:', error);
            }
        });
        this.clients.clear();
    }

    // Ajout de la méthode sendScenarioInfo pour corriger l'erreur
    private async sendScenarioInfo(ws: WebSocket, scenarioId: string): Promise<void> {
        try {
            // Exemple de récupération d'informations sur le scénario
            // Remplacez ceci par la logique réelle pour obtenir les infos du scénario
            const scenarioInfo = {
                scenarioId,
                info: `Informations pour le scénario ${scenarioId}`
            };
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'scenario-info',
                    scenarioId,
                    info: scenarioInfo,
                    timestamp: Date.now()
                }));
            }
        } catch (error) {
            logger.error(`Error sending scenario info: ${error}`);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: 'Failed to fetch scenario info',
                    scenarioId,
                    timestamp: Date.now()
                }));
            }
        }
    }
}
