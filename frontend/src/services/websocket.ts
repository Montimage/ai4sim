class WebSocketService {
    private ws: WebSocket | null = null;
    private maxReconnectAttempts: number = 10;
    private reconnectAttempts: number = 0;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private messageQueue: any[] = [];
    private isConnecting: boolean = false;
    private autoConnected: boolean = false;
    private connectionTimeout: number | null = null;
    private pingInterval: number | null = null;
    private lastPingTime: number = 0;
    private healthCheckInterval: number | null = null;
    private isServerAvailable: boolean = true;
    private lastHealthCheck: number = 0;
    private adaptiveReconnectDelay: number = 1000;
    
    // Système de debouncing pour éviter les subscribe/unsubscribe en boucle
    private subscriptionDebounce: Map<string, number> = new Map();
    private activeSubscriptions: Set<string> = new Set();
    private readonly DEBOUNCE_DELAY = 500; // 500ms de délai
    
    constructor(private readonly url: string) {
        // Augmenter le délai de démarrage automatique pour éviter les problèmes de performance
        setTimeout(() => {
            if (!this.autoConnected) {
                this.connect();
                this.autoConnected = true;
            }
        }, 500); // Augmenté à 500ms
        
        // Réduire la fréquence de surveillance de santé du serveur
        this.startHealthMonitoring();
    }

    private getAuthToken(): string | null {
        return localStorage.getItem('token');
    }

    private getWebSocketUrl(): string {
        const token = this.getAuthToken();
        const wsUrl = new URL(this.url);
        if (token) {
            wsUrl.searchParams.append('token', token);
        }
        return wsUrl.toString();
    }

    /**
     * Démarre la surveillance périodique de la santé du serveur
     */
    private startHealthMonitoring() {
        // Réduire la fréquence : vérifier la santé du serveur toutes les 60 secondes au lieu de 30
        this.healthCheckInterval = window.setInterval(() => {
            this.performHealthCheck();
        }, 60000);
    }

    /**
     * Effectue une vérification de santé du serveur
     */
    private async performHealthCheck() {
        const now = Date.now();
        
        // Augmenter l'intervalle minimum entre les vérifications à 30 secondes
        if (now - this.lastHealthCheck < 30000) {
            return;
        }
        
        this.lastHealthCheck = now;
        
        try {
            const isAvailable = await this.checkServerAvailability();
            
            if (isAvailable !== this.isServerAvailable) {
                this.isServerAvailable = isAvailable;
                
                if (isAvailable) {
                    console.log('✅ Serveur WebSocket de nouveau disponible');
                    // Réinitialiser les tentatives de reconnexion
                    this.reconnectAttempts = 0;
                    this.adaptiveReconnectDelay = 1000;
                    
                    // Tenter une reconnexion si pas connecté
                    if (!this.isConnected() && !this.isConnecting) {
                        this.connect();
                    }
                } else {
                    console.warn('⚠️ Serveur WebSocket indisponible');
                }
            }
        } catch (error) {
            console.warn('Erreur lors de la vérification de santé:', error);
        }
    }

    /**
     * Établit une connexion WebSocket et configure les gestionnaires d'événements
     */
    connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }
        
        this.isConnecting = true;
        this.clearConnectionTimeout();
        
        // Timeout adaptatif basé sur les tentatives précédentes
        const timeoutDuration = Math.min(5000 + (this.reconnectAttempts * 2000), 15000);
        
        this.connectionTimeout = window.setTimeout(() => {
            console.warn(`WebSocket connection timeout après ${timeoutDuration}ms`);
            this.handleConnectionFailure();
        }, timeoutDuration);
        
        try {
            this.ws = new WebSocket(this.getWebSocketUrl());
            
            this.ws.onopen = () => {
                this.clearConnectionTimeout();
                this.reconnectAttempts = 0;
                this.adaptiveReconnectDelay = 1000;
                this.isConnecting = false;
                this.isServerAvailable = true;
                
                console.log('✅ WebSocket connecté avec succès');
                
                // Authentification immédiate
                const token = this.getAuthToken();
                if (token && this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ 
                        type: 'authenticate',
                        token: token 
                    }));
                }
                
                // Émettre un événement de connexion réussie
                this.emit("connected", { type: "connected" });
                
                // Configurer des pings réguliers pour maintenir la connexion active
                this.setupPingInterval();
                
                // Traiter la file de messages en attente
                this.processMessageQueue();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    if (typeof event.data === 'string') {
                        if (event.data === 'ping') {
                            if (this.ws?.readyState === WebSocket.OPEN) {
                                this.ws.send('pong');
                            }
                            return;
                        } else if (event.data === 'pong') {
                            this.lastPingTime = Date.now();
                            return;
                        }
                        
                        // Add detailed tracing for raw WebSocket messages
                        console.log(`🌐 [WebSocket-RAW] Received raw message:`, {
                            timestamp: Date.now(),
                            messageLength: event.data.length,
                            messagePreview: event.data.substring(0, 200)
                        });
                        
                        try {
                            const data = JSON.parse(event.data);
                            
                            // Add detailed tracing for parsed messages
                            console.log(`📦 [WebSocket-PARSED] Parsed message:`, {
                                type: data.type,
                                scenarioId: data.scenarioId || (data.data && data.data.scenarioId),
                                attackId: data.data?.attackId || data.data?.data?.attackId,
                                hasOutput: !!(data.data?.output || data.data?.data?.output),
                                outputLength: (data.data?.output || data.data?.data?.output)?.length || 0,
                                timestamp: data.timestamp || data.data?.timestamp,
                                messageId: data.messageId || data.id,
                                parseTimestamp: Date.now()
                            });
                            
                            this.handleMessage(data);
                        } catch (error) {
                            console.error("Failed to parse WebSocket message as JSON:", error);
                            console.error("Raw message was:", event.data);
                        }
                    } else {
                        console.warn("Received non-string WebSocket message:", event.data);
                    }
                } catch (error) {
                    console.error("Failed to process WebSocket message:", error);
                    this.emit("error", {
                        type: "error",
                        payload: "Failed to process WebSocket message"
                    });
                }
            };
            
            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.isConnecting = false;
                this.clearConnectionTimeout();
                this.emit("error", {
                    type: "error",
                    payload: "WebSocket connection error"
                });
                
                if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                    this.ws.close();
                }
                
                this.scheduleReconnect();
            };
            
            this.ws.onclose = (event) => {
                this.isConnecting = false;
                this.clearConnectionTimeout();
                this.clearPingInterval();
                
                console.log(`WebSocket fermé avec le code ${event.code}: ${event.reason}`);
                this.emit("disconnected", { 
                    type: "disconnected", 
                    code: event.code, 
                    reason: event.reason 
                });
                
                // Planifier une reconnexion intelligente
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            this.isConnecting = false;
            this.clearConnectionTimeout();
            this.handleConnectionFailure();
        }
    }
    
    /**
     * Gère l'échec de connexion et planifie une reconnexion si possible
     */
    private handleConnectionFailure() {
        this.isConnecting = false;
        this.emit("connection_failed", { 
            type: "connection_failed", 
            attempt: this.reconnectAttempts 
        });
        
        this.scheduleReconnect();
    }
    
    /**
     * Planifie une tentative de reconnexion avec backoff exponentiel adaptatif
     */
    private scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            // Détecter si un processus lourd est en cours
            const isHeavyProcess = this.isHeavyProcessRunning();
            
            // Backoff adaptatif plus intelligent
            if (this.isServerAvailable) {
                // Si le serveur est disponible, reconnexion rapide
                this.adaptiveReconnectDelay = Math.min(1000 * Math.pow(1.2, this.reconnectAttempts - 1), 5000);
            } else {
                // Si le serveur n'est pas disponible, délai plus long
                this.adaptiveReconnectDelay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts - 1), 60000);
            }
            
            // Délai plus long si un processus lourd est en cours
            if (isHeavyProcess) {
                this.adaptiveReconnectDelay = Math.max(this.adaptiveReconnectDelay * 2, 10000);
            }
            
            console.log(`🔄 Reconnexion WebSocket programmée dans ${this.adaptiveReconnectDelay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})${isHeavyProcess ? ' (processus lourd détecté)' : ''}`);
            
            // Vérifier la disponibilité du serveur avant de tenter une reconnexion
            this.checkServerAvailability()
                .then(isAvailable => {
                    this.isServerAvailable = isAvailable;
                    
                    if (isAvailable) {
                        setTimeout(() => this.connect(), this.adaptiveReconnectDelay);
                    } else {
                        console.warn('⚠️ Serveur inaccessible, report de la reconnexion');
                        // Programmer une nouvelle vérification avec un délai plus long
                        setTimeout(() => this.scheduleReconnect(), this.adaptiveReconnectDelay * 2);
                    }
                })
                .catch(() => {
                    // En cas d'erreur lors de la vérification, tenter quand même une reconnexion
                    setTimeout(() => this.connect(), this.adaptiveReconnectDelay);
                });
        } else {
            console.error(`❌ Échec de reconnexion après ${this.maxReconnectAttempts} tentatives`);
            this.emit("connection_failed", {
                type: "connection_failed",
                final: true,
                attempts: this.maxReconnectAttempts
            });
            
            // Notification utilisateur avec possibilité de retry manuel
            if (typeof window !== 'undefined') {
                try {
                    const notificationEvent = new CustomEvent('websocket-connection-failed', {
                        detail: {
                            message: 'Connexion au serveur perdue. Vérifiez votre connexion réseau.',
                            canRetry: true,
                            retryCallback: () => {
                                this.reconnectAttempts = 0;
                                this.adaptiveReconnectDelay = 1000;
                                this.connect();
                            }
                        }
                    });
                    window.dispatchEvent(notificationEvent);
                } catch (e) {
                    console.error('Failed to dispatch connection failure event', e);
                }
            }
            
            // Programmer une vérification périodique pour reprendre automatiquement
            setTimeout(() => {
                this.reconnectAttempts = 0;
                this.adaptiveReconnectDelay = 1000;
                this.performHealthCheck();
            }, 60000); // Réessayer après 1 minute
        }
    }
    
    /**
     * Vérifie si le serveur est accessible avant de tenter une reconnexion
     * @returns Promise<boolean> True si le serveur est accessible
     */
    private async checkServerAvailability(): Promise<boolean> {
        try {
            const baseUrl = this.getBaseUrl();
            const controller = new AbortController();
            
            // Timeout pour la vérification de santé
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${baseUrl}/api/health`, { 
                method: 'HEAD',
                cache: 'no-cache',
                headers: { 
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn('Health check timeout');
            } else {
                console.warn('Server availability check failed:', error);
            }
            return false;
        }
    }
    
    /**
     * Extrait l'URL de base (protocole, hôte, port) à partir de l'URL WebSocket
     */
    private getBaseUrl(): string {
        try {
            const wsUrl = new URL(this.url);
            // Convertir ws:// vers http:// et wss:// vers https://
            const protocol = wsUrl.protocol === 'wss:' ? 'https:' : 'http:';
            return `${protocol}//${wsUrl.host}`;
        } catch (error) {
            console.error('Erreur lors de la construction de l\'URL de base:', error);
            // Fallback vers localhost
            return 'http://localhost:3001';
        }
    }
    
    /**
     * Supprime le timeout de connexion
     */
    private clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
    
    /**
     * Détecte si un processus lourd est en cours d'exécution
     */
    private isHeavyProcessRunning(): boolean {
        // Vérifier les messages récents pour détecter les processus lourds
        const heavyProcesses = ['maip', 'caldera', 'shennina', 'start_maip.sh'];
        const recentMessages = this.getRecentMessages();
        
        return recentMessages.some(msg => {
            if (typeof msg === 'string') {
                return heavyProcesses.some(process => msg.toLowerCase().includes(process));
            }
            if (msg && typeof msg === 'object' && msg.payload) {
                return heavyProcesses.some(process => msg.payload.toLowerCase().includes(process));
            }
            return false;
        });
    }
    
    /**
     * Récupère les messages récents pour détecter les processus lourds
     */
    private getRecentMessages(): any[] {
        // Cette méthode pourrait être implémentée pour stocker les messages récents
        // Pour l'instant, on retourne un tableau vide
        return [];
    }
    
    /**
     * Configure un intervalle de ping pour maintenir la connexion active
     */
    private setupPingInterval() {
        this.clearPingInterval();
        
        // Détecter si un processus lourd est en cours
        const isHeavyProcess = this.isHeavyProcessRunning();
        
        // Ping adaptatif : plus fréquent si le serveur répond bien
        const pingFrequency = this.isServerAvailable ? 30000 : 60000; // Augmenté de 15s à 30s
        
        this.pingInterval = window.setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
                
                // Vérifier si nous n'avons pas reçu de pong depuis trop longtemps
                const now = Date.now();
                // Timeout plus long pour les processus lourds (MAIP, Caldera, Shennina)
                const pongTimeout = isHeavyProcess ? 300000 : (this.isServerAvailable ? 120000 : 180000); // 5 minutes pour les processus lourds
                
                if (this.lastPingTime && (now - this.lastPingTime) > pongTimeout) {
                    console.warn(`⚠️ Aucun pong reçu depuis ${pongTimeout/1000} secondes, reconnexion...`);
                    this.reconnect();
                }
            } else if (this.ws?.readyState === WebSocket.CLOSED && !this.isConnecting) {
                // Tenter une reconnexion si la connexion est fermée
                console.log('🔄 Connexion fermée détectée, tentative de reconnexion...');
                this.connect();
            }
        }, pingFrequency);
        
        console.log(`📡 Ping configuré toutes les ${pingFrequency/1000} secondes${isHeavyProcess ? ' (processus lourd détecté)' : ''}`);
    }
    
    /**
     * Supprime l'intervalle de ping
     */
    private clearPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Supprime l'intervalle de surveillance de santé
     */
    private clearHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    
    /**
     * Force une reconnexion immédiate
     */
    reconnect() {
        console.log('🔄 Reconnexion forcée demandée');
        
        if (this.ws) {
            try {
                this.ws.close(1000, "Manual reconnect");
            } catch (error) {
                console.error("Error closing WebSocket:", error);
            }
            this.ws = null;
        }
        
        // Réinitialiser les compteurs pour une reconnexion immédiate
        this.reconnectAttempts = 0;
        this.adaptiveReconnectDelay = 1000;
        this.isConnecting = false;
        
        // Tenter une reconnexion immédiate
        this.connect();
    }
    
    /**
     * Reconnexion manuelle avec réinitialisation complète
     */
    manualReconnect() {
        console.log('🔄 Reconnexion manuelle initiée');
        
        // Réinitialiser tous les états
        this.reconnectAttempts = 0;
        this.adaptiveReconnectDelay = 1000;
        this.isServerAvailable = true;
        this.isConnecting = false;
        
        // Nettoyer les timers
        this.clearConnectionTimeout();
        this.clearPingInterval();
        
        // Fermer la connexion existante
        if (this.ws) {
            try {
                this.ws.close(1000, "Manual reconnect");
            } catch (error) {
                console.error("Error closing WebSocket:", error);
            }
            this.ws = null;
        }
        
        // Vérifier la santé du serveur puis se connecter
        this.checkServerAvailability()
            .then(isAvailable => {
                this.isServerAvailable = isAvailable;
                if (isAvailable) {
                    console.log('✅ Serveur disponible, connexion...');
                    this.connect();
                } else {
                    console.warn('⚠️ Serveur indisponible, retry dans 5 secondes...');
                    setTimeout(() => this.connect(), 5000);
                }
            })
            .catch(() => {
                console.log('🔄 Erreur de vérification, tentative de connexion quand même...');
                this.connect();
            });
    }
    
    /**
     * Gère les messages entrants et les distribue aux listeners appropriés
     */
    private handleMessage(data: any) {
        if (typeof data === 'object') {
            // Add detailed tracing to understand message origins
            console.log(`🔍 [WebSocket-RAW] Incoming message:`, {
                type: data.type,
                scenarioId: data.scenarioId || (data.data && data.data.scenarioId),
                attackId: data.data?.attackId || data.data?.data?.attackId,
                hasOutput: !!(data.data?.output || data.data?.data?.output),
                outputLength: (data.data?.output || data.data?.data?.output)?.length || 0,
                timestamp: data.timestamp || data.data?.timestamp,
                messageId: data.messageId || data.id,
                fullData: data
            });
            
            // Émettre l'événement avec le type de message UNIQUEMENT
            console.log(`📤 [WebSocket] Emitting event: ${data.type}`);
            this.emit(data.type, data);
        }
    }
    
    /**
     * Traite la file d'attente des messages
     */
    private processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) this.send(message);
        }
    }
    
    /**
     * Vérifie si la connexion WebSocket est ouverte
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
    
    /**
     * Envoie un message via WebSocket, ou le met en file d'attente si la connexion n'est pas disponible
     */
    send(data: any) {
        if (!this.isConnected()) {
            // Mettre le message en file d'attente si la connexion n'est pas ouverte
            this.messageQueue.push(data);
            
            // Tenter de se connecter si ce n'est pas déjà en cours
            if (!this.isConnecting) {
                this.connect();
            }
            return;
        }
        
        try {
            const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws!.send(serializedData);
        } catch (error) {
            console.error("Failed to send WebSocket message:", error);
            
            // Ajouter le message à la file d'attente pour réessayer plus tard
            this.messageQueue.push(data);
            
            // Notifier les écouteurs de l'erreur
            this.emit("error", {
                type: "error",
                payload: "Failed to send message",
                error: error
            });
            
            // Tenter une reconnexion
            this.reconnect();
        }
    }
    
    /**
     * Ajoute un écouteur pour un type d'événement spécifique
     */
    on(event: string, callback: (data: any) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const currentCount = this.listeners.get(event)?.size || 0;
        this.listeners.get(event)?.add(callback);
        const newCount = this.listeners.get(event)?.size || 0;
        
        console.log(`➕ [WebSocket-LISTENER] Added listener for '${event}': ${currentCount} → ${newCount} listeners`);
    }
    
    /**
     * Supprime un écouteur pour un type d'événement spécifique
     */
    off(event: string, callback: (data: any) => void) {
        const currentCount = this.listeners.get(event)?.size || 0;
        const wasDeleted = this.listeners.get(event)?.delete(callback) || false;
        const newCount = this.listeners.get(event)?.size || 0;
        
        console.log(`➖ [WebSocket-LISTENER] Removed listener for '${event}': ${currentCount} → ${newCount} listeners (deleted: ${wasDeleted})`);
    }
    
    /**
     * Émet un événement à tous les écouteurs enregistrés pour ce type d'événement
     */
    private emit(event: string, data?: any) {
        const listeners = this.listeners.get(event);
        const listenerCount = listeners ? listeners.size : 0;
        
        // Add detailed tracing for event emission
        console.log(`📢 [WebSocket-EMIT] Emitting event '${event}' to ${listenerCount} listeners:`, {
            event,
            listenerCount,
            hasData: !!data,
            dataType: data?.type,
            scenarioId: data?.scenarioId || (data?.data && data?.data.scenarioId),
            timestamp: Date.now()
        });
        
        let callbackIndex = 0;
        listeners?.forEach((callback) => {
            try {
                callbackIndex++;
                console.log(`🎯 [WebSocket-EMIT] Calling listener ${callbackIndex}/${listenerCount} for event '${event}'`);
                callback(data);
            } catch (error) {
                console.error(`Error in WebSocket ${event} handler:`, error);
            }
        });
    }
    
    /**
     * Ferme proprement la connexion WebSocket
     */
    disconnect() {
        console.log('🔌 Déconnexion WebSocket demandée');
        
        this.clearConnectionTimeout();
        this.clearPingInterval();
        this.clearHealthMonitoring();
        
        // Nettoyer les abonnements avant de fermer
        this.cleanupSubscriptions();
        
        // Vider la file d'attente
        this.messageQueue = [];
        
        // Réinitialiser les états
        this.reconnectAttempts = 0;
        this.adaptiveReconnectDelay = 1000;
        this.isConnecting = false;
        
        if (this.ws) {
            try {
                this.ws.close(1000, "Intentional disconnect");
            } catch (error) {
                console.error("Error closing WebSocket:", error);
            }
            this.ws = null;
        }
        
        console.log('✅ WebSocket déconnecté proprement');
    }
    
    /**
     * Obtient l'état de connexion détaillé
     */
    getConnectionState(): {
        isConnected: boolean;
        isConnecting: boolean;
        reconnectAttempts: number;
        maxReconnectAttempts: number;
        isServerAvailable: boolean;
        queuedMessages: number;
        lastPingTime: number | null;
        adaptiveDelay: number;
    } {
        return {
            isConnected: this.isConnected(),
            isConnecting: this.isConnecting,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            isServerAvailable: this.isServerAvailable,
            queuedMessages: this.messageQueue.length,
            lastPingTime: this.lastPingTime || null,
            adaptiveDelay: this.adaptiveReconnectDelay
        };
    }
    
    /**
     * Configure les paramètres de reconnexion
     */
    configureReconnection(options: {
        maxAttempts?: number;
        baseDelay?: number;
        pingFrequency?: number;
    }) {
        if (options.maxAttempts !== undefined) {
            this.maxReconnectAttempts = Math.max(1, options.maxAttempts);
        }
        if (options.baseDelay !== undefined) {
            this.adaptiveReconnectDelay = Math.max(1000, options.baseDelay);
        }
        
        console.log('⚙️ Configuration WebSocket mise à jour:', {
            maxAttempts: this.maxReconnectAttempts,
            baseDelay: this.adaptiveReconnectDelay
        });
        
        // Reconfigurer le ping si connecté
        if (this.isConnected() && options.pingFrequency !== undefined) {
            this.setupPingInterval();
        }
    }
    
    /**
     * Vide la file d'attente des messages
     */
    clearMessageQueue() {
        const queueSize = this.messageQueue.length;
        this.messageQueue = [];
        console.log(`🗑️ File d'attente vidée (${queueSize} messages supprimés)`);
    }
    
    /**
     * Vérifie si un port spécifique est disponible
     */
    checkPort(port: number, tabId: string) {
        this.send({
            type: "checkPort",
            port,
            tabId
        });
    }

    /**
     * S'abonne aux mises à jour d'un scénario pour recevoir les messages de terminal
     * Avec système de debouncing pour éviter les subscribe/unsubscribe en boucle
     */
    subscribeToScenario(scenarioId: string) {
        if (!scenarioId) {
            console.warn('Cannot subscribe to scenario: scenarioId is required');
            return;
        }
        
        // Vérifier si on est déjà abonné
        if (this.activeSubscriptions.has(scenarioId)) {
            return;
        }
        
        // Annuler le timer de debounce existant s'il y en a un
        const existingTimer = this.subscriptionDebounce.get(scenarioId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        // Programmer l'abonnement avec un délai de debounce
        const timer = window.setTimeout(() => {
            if (!this.activeSubscriptions.has(scenarioId)) {
                console.log(`📡 Subscribing to scenario: ${scenarioId}`);
                this.activeSubscriptions.add(scenarioId);
                this.send({
                    type: 'subscribe-scenario',
                    scenarioId: scenarioId
                });
            }
            this.subscriptionDebounce.delete(scenarioId);
        }, this.DEBOUNCE_DELAY);
        
        this.subscriptionDebounce.set(scenarioId, timer);
    }

    /**
     * Se désabonne des mises à jour d'un scénario
     * Avec système de debouncing pour éviter les subscribe/unsubscribe en boucle
     */
    unsubscribeFromScenario(scenarioId: string) {
        if (!scenarioId) {
            console.warn('Cannot unsubscribe from scenario: scenarioId is required');
            return;
        }
        
        // Annuler tout timer de subscription en attente
        const existingTimer = this.subscriptionDebounce.get(scenarioId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.subscriptionDebounce.delete(scenarioId);
        }
        
        // Se désabonner seulement si on était abonné
        if (this.activeSubscriptions.has(scenarioId)) {
            console.log(`📡 Unsubscribing from scenario: ${scenarioId}`);
            this.activeSubscriptions.delete(scenarioId);
            this.send({
                type: 'unsubscribe-scenario',
                scenarioId: scenarioId
            });
        }
    }

    /**
     * Demande l'historique d'exécution d'un scénario
     */
    requestExecutionHistory(scenarioId: string) {
        if (!scenarioId) {
            console.warn('Cannot request execution history: scenarioId is required');
            return;
        }
        
        // Limiter les demandes d'historique - pas plus d'une par seconde par scénario
        const lastRequest = this.subscriptionDebounce.get(`history-${scenarioId}`);
        const now = Date.now();
        
        if (lastRequest && (now - lastRequest) < 1000) {
            return; // Ignorer si demandé trop récemment
        }
        
        this.subscriptionDebounce.set(`history-${scenarioId}`, now);
        console.log(`📡 Requesting execution history for scenario: ${scenarioId}`);
        this.send({
            type: 'request-execution-history',
            scenarioId: scenarioId
        });
    }
    
    /**
     * Nettoie tous les abonnements actifs lors de la déconnexion
     */
    private cleanupSubscriptions() {
        // Annuler tous les timers de debounce
        this.subscriptionDebounce.forEach((timer) => {
            if (typeof timer === 'number') {
                clearTimeout(timer);
            }
        });
        this.subscriptionDebounce.clear();
        this.activeSubscriptions.clear();
    }
}

export const websocket = new WebSocketService((import.meta as any).env.VITE_WS_URL);
