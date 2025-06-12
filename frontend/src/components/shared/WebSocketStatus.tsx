import React, { useState, useEffect } from 'react';
import { websocket } from '../../services/websocket';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  isServerAvailable: boolean;
  queuedMessages: number;
  lastPingTime: number | null;
  adaptiveDelay: number;
}

const WebSocketStatus: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    isServerAvailable: true,
    queuedMessages: 0,
    lastPingTime: null,
    adaptiveDelay: 1000
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);

  useEffect(() => {
    // Mettre à jour l'état de connexion toutes les 2 secondes
    const updateInterval = setInterval(() => {
      setConnectionState(websocket.getConnectionState());
    }, 2000);

    // Écouter les événements de connexion
    const handleConnected = () => {
      setConnectionState(websocket.getConnectionState());
      setIsManualReconnecting(false);
    };

    const handleDisconnected = () => {
      setConnectionState(websocket.getConnectionState());
    };

    const handleConnectionFailed = (data: any) => {
      setConnectionState(websocket.getConnectionState());
      setIsManualReconnecting(false);
      
      if (data.final) {
        // Afficher les détails en cas d'échec final
        setShowDetails(true);
      }
    };

    // Écouter l'événement personnalisé de perte de connexion
    const handleWebSocketFailure = () => {
      setShowDetails(true);
      setConnectionState(websocket.getConnectionState());
    };

    websocket.on('connected', handleConnected);
    websocket.on('disconnected', handleDisconnected);
    websocket.on('connection_failed', handleConnectionFailed);
    window.addEventListener('websocket-connection-failed', handleWebSocketFailure as EventListener);

    // État initial
    setConnectionState(websocket.getConnectionState());

    return () => {
      clearInterval(updateInterval);
      websocket.off('connected', handleConnected);
      websocket.off('disconnected', handleDisconnected);
      websocket.off('connection_failed', handleConnectionFailed);
      window.removeEventListener('websocket-connection-failed', handleWebSocketFailure as EventListener);
    };
  }, []);

  const handleManualReconnect = () => {
    setIsManualReconnecting(true);
    setShowDetails(false);
    websocket.manualReconnect();
  };

  const handleClearQueue = () => {
    websocket.clearMessageQueue();
    setConnectionState(websocket.getConnectionState());
  };

  const getStatusIcon = () => {
    if (isManualReconnecting || connectionState.isConnecting) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (connectionState.isConnected) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    if (!connectionState.isServerAvailable) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (isManualReconnecting) return 'Reconnexion...';
    if (connectionState.isConnecting) return 'Connexion...';
    if (connectionState.isConnected) return 'Connecté';
    if (!connectionState.isServerAvailable) return 'Serveur indisponible';
    if (connectionState.reconnectAttempts > 0) return `Reconnexion (${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts})`;
    return 'Déconnecté';
  };

  const getStatusColor = () => {
    if (connectionState.isConnected) return 'text-green-600';
    if (!connectionState.isServerAvailable) return 'text-red-600';
    if (connectionState.isConnecting || isManualReconnecting) return 'text-blue-600';
    return 'text-yellow-600';
  };

  // Ne pas afficher si tout va bien et qu'on n'est pas en mode détails
  if (connectionState.isConnected && !showDetails && connectionState.queuedMessages === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {!connectionState.isConnected && (
              <button
                onClick={handleManualReconnect}
                disabled={isManualReconnecting || connectionState.isConnecting}
                className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Reconnexion manuelle"
              >
                <RefreshCw className={`w-4 h-4 ${(isManualReconnecting || connectionState.isConnecting) ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-600 hover:text-gray-800"
              title="Afficher/masquer les détails"
            >
              <Wifi className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>État: {connectionState.isConnected ? 'Connecté' : 'Déconnecté'}</div>
              <div>Serveur: {connectionState.isServerAvailable ? 'OK' : 'Indisponible'}</div>
              <div>Tentatives: {connectionState.reconnectAttempts}/{connectionState.maxReconnectAttempts}</div>
              <div>File d'attente: {connectionState.queuedMessages}</div>
            </div>
            
            {connectionState.lastPingTime && (
              <div>
                Dernier ping: {new Date(connectionState.lastPingTime).toLocaleTimeString()}
              </div>
            )}
            
            {connectionState.queuedMessages > 0 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-yellow-600">
                  {connectionState.queuedMessages} message(s) en attente
                </span>
                <button
                  onClick={handleClearQueue}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Vider
                </button>
              </div>
            )}
            
            {!connectionState.isConnected && (
              <div className="pt-2">
                <button
                  onClick={handleManualReconnect}
                  disabled={isManualReconnecting || connectionState.isConnecting}
                  className="w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isManualReconnecting ? 'Reconnexion...' : 'Reconnexion manuelle'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketStatus; 