import { logger } from './logger';

interface WebSocketStats {
    totalConnections: number;
    activeConnections: number;
    messagesPerSecond: number;
    errorsPerMinute: number;
    averageResponseTime: number;
}

export class WebSocketDiagnostics {
    private static instance: WebSocketDiagnostics;
    private stats: WebSocketStats = {
        totalConnections: 0,
        activeConnections: 0,
        messagesPerSecond: 0,
        errorsPerMinute: 0,
        averageResponseTime: 0
    };
    
    private messageCount = 0;
    private errorCount = 0;
    private responseTimes: number[] = [];
    private lastStatsReset = Date.now();
    
    public static getInstance(): WebSocketDiagnostics {
        if (!WebSocketDiagnostics.instance) {
            WebSocketDiagnostics.instance = new WebSocketDiagnostics();
        }
        return WebSocketDiagnostics.instance;
    }

    public recordConnection(): void {
        this.stats.totalConnections++;
        this.stats.activeConnections++;
    }

    public recordDisconnection(): void {
        this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
    }

    public recordMessage(): void {
        this.messageCount++;
    }

    public recordError(): void {
        this.errorCount++;
    }

    public recordResponseTime(time: number): void {
        this.responseTimes.push(time);
        
        // Garder seulement les 100 derniers temps de réponse
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift();
        }
    }

    public getStats(): WebSocketStats {
        this.updateStats();
        return { ...this.stats };
    }

    private updateStats(): void {
        const now = Date.now();
        const timeDiff = (now - this.lastStatsReset) / 1000; // en secondes
        
        if (timeDiff > 0) {
            this.stats.messagesPerSecond = this.messageCount / timeDiff;
            this.stats.errorsPerMinute = (this.errorCount / timeDiff) * 60;
        }
        
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            this.stats.averageResponseTime = sum / this.responseTimes.length;
        }
    }

    public resetStats(): void {
        this.messageCount = 0;
        this.errorCount = 0;
        this.responseTimes = [];
        this.lastStatsReset = Date.now();
    }

    public logDiagnostics(): void {
        const stats = this.getStats();
        
        logger.info('=== WebSocket Diagnostics ===', {
            totalConnections: stats.totalConnections,
            activeConnections: stats.activeConnections,
            messagesPerSecond: stats.messagesPerSecond.toFixed(2),
            errorsPerMinute: stats.errorsPerMinute.toFixed(2),
            averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`
        });

        // Alertes de performance
        if (stats.messagesPerSecond > 100) {
            logger.warn('⚠️ WebSocket: Charge élevée de messages détectée', {
                messagesPerSecond: stats.messagesPerSecond
            });
        }

        if (stats.errorsPerMinute > 10) {
            logger.error('🚨 WebSocket: Taux d\'erreur élevé détecté', {
                errorsPerMinute: stats.errorsPerMinute
            });
        }

        if (stats.averageResponseTime > 1000) {
            logger.warn('⚠️ WebSocket: Temps de réponse lent détecté', {
                averageResponseTime: stats.averageResponseTime
            });
        }
    }

    public startPeriodicLogging(intervalMs: number = 60000): void {
        setInterval(() => {
            this.logDiagnostics();
            this.resetStats(); // Reset pour la période suivante
        }, intervalMs);
    }
} 