import { useState, useEffect } from 'react';
import { websocket } from '../services/websocket';

export const useScenarioOutput = (scenarioId: string | undefined) => {
  const [output, setOutput] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!scenarioId) return;

    const handleOutput = (data: any) => {
      if (data.scenarioId === scenarioId) {
        setOutput(prev => [...prev, data.output]);
      }
    };

    // S'abonner aux mises à jour du scénario
    websocket.connect();
    websocket.send({
      type: 'subscribe',
      scenarioId
    });

    // Écouter les événements de sortie
    websocket.on('scenario_output', handleOutput);

    // Gérer la connexion/déconnexion
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    websocket.on('connected', handleConnect);
    websocket.on('disconnected', handleDisconnect);

    // Mettre à jour l'état de connexion initial
    setIsConnected(websocket.isConnected());

    return () => {
      // Se désabonner
      websocket.send({
        type: 'unsubscribe',
        scenarioId
      });
      // Retirer les écouteurs d'événements
      websocket.off('scenario_output', handleOutput);
      websocket.off('connected', handleConnect);
      websocket.off('disconnected', handleDisconnect);
    };
  }, [scenarioId]);

  const clearOutput = () => {
    setOutput([]);
  };

  return {
    output,
    isConnected,
    clearOutput
  };
};
