export interface ScenarioUpdate {
    status: string;
    progress?: number;
    output?: string;
    error?: string;
}

export type MessageType = 'authenticate' | 'authenticated' | 'execute' | 'stop' | 'status' | 'output' | 'error' | 'notification' | 'ping' | 'pong';

export interface WSMessage {
    type: MessageType;
    token?: string;
    command?: string;
    parameters?: Record<string, any>;
    tabId?: string;
    payload?: any;
    port?: number;
    projectId?: string;
    campaignId?: string;
    scenarioId?: string;
    targets?: string[];
    level?: string;
    message?: string;
}

export interface WSClient {
    id: string;
    isAuthenticated: boolean;
    userId?: string;
    send: (data: WSMessage) => void;
}

export interface ProjectInfo {
    projectId: string;
    campaignId: string;
    scenarioId: string;
    targets: string[];
}

export interface NotificationMessage {
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    tabId?: string;
}
