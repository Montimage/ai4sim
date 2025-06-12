import { useEffect, useCallback, useState, useRef } from "react";
import { websocket } from "../services/websocket";

interface UseWebSocketOptions {
  // Si true, le hook se connectera automatiquement au WebSocket
  autoConnect?: boolean;
  // Événements à écouter avec leurs callbacks
  listeners?: Record<string, (data: any) => void>;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  // L'option autoConnect est maintenant false par défaut car le service gère sa propre connexion
  const { autoConnect = false, listeners = {} } = options;
  const [isConnected, setIsConnected] = useState(websocket.isConnected());
  const listenerRefs = useRef<Record<string, (data: any) => void>>(listeners);
  
  // Mettre à jour les références de listeners si elles changent
  useEffect(() => {
    listenerRefs.current = listeners;
  }, [listeners]);

  // Gérer la connexion et les listeners généraux
  useEffect(() => {
    // Établir une connexion WebSocket si autoConnect est true et si ce n'est pas déjà connecté
    if (autoConnect && !websocket.isConnected()) {
      websocket.connect();
    }

    // Handler pour mettre à jour l'état de connexion
    const onConnected = () => setIsConnected(true);
    const onDisconnected = () => setIsConnected(false);
    const onError = () => {}; // Handler vide pour capturer les erreurs

    // Ajouter les listeners de connexion/déconnexion
    websocket.on("connected", onConnected);
    websocket.on("connection_failed", onDisconnected);
    websocket.on("error", onError);

    // Si déjà connecté, mettre à jour l'état immédiatement
    if (websocket.isConnected()) {
      setIsConnected(true);
    }

    // Ajouter les listeners personnalisés
    const eventNames = Object.keys(listenerRefs.current);
    eventNames.forEach(eventName => {
      const handler = (data: any) => {
        // Utiliser la référence la plus récente du callback
        if (listenerRefs.current[eventName]) {
          listenerRefs.current[eventName](data);
        }
      };
      
      websocket.on(eventName, handler);
    });

    // Cleanup des listeners à la destruction du composant
    return () => {
      websocket.off("connected", onConnected);
      websocket.off("connection_failed", onDisconnected);
      websocket.off("error", onError);
      
      // Retirer les listeners personnalisés
      eventNames.forEach(eventName => {
        const handler = listenerRefs.current[eventName];
        if (handler) {
          websocket.off(eventName, handler);
        }
      });
      
      // Ne pas déconnecter le WebSocket à chaque démontage de composant
    };
  }, [autoConnect]);

  // Méthode pour envoyer un message
  const sendMessage = useCallback((data: any) => {
    websocket.send(data);
  }, []);

  // Méthode pour se connecter manuellement
  const connect = useCallback(() => {
    websocket.connect();
  }, []);

  // Méthode pour vérifier un port
  const checkPort = useCallback((port: number, tabId: string) => {
    websocket.checkPort(port, tabId);
  }, []);

  // Ajouter un listener dynamiquement
  const addListener = useCallback((event: string, callback: (data: any) => void) => {
    websocket.on(event, callback);
    return () => websocket.off(event, callback);
  }, []);

  return {
    isConnected,
    sendMessage,
    connect,
    checkPort,
    addListener
  };
};
