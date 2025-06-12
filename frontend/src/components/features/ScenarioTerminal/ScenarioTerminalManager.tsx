import React, { useEffect, useState } from 'react';
import { scenarioTerminalService, TerminalState } from '../../../services/scenarioTerminalService';
import ScenarioTerminal from './ScenarioTerminal';
import { ServerIcon } from '@heroicons/react/24/outline';

interface ScenarioTerminalManagerProps {
  className?: string;
}

export const ScenarioTerminalManager: React.FC<ScenarioTerminalManagerProps> = ({
  className = '',
}) => {
  const [terminals, setTerminals] = useState<TerminalState[]>([]);
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer tous les terminaux disponibles
    const updateTerminals = () => {
      const allTerminals = scenarioTerminalService.getAllTerminals();
      setTerminals(allTerminals);
      
      // Si aucun terminal actif n'est sélectionné, sélectionner le premier
      if (!activeTerminal && allTerminals.length > 0) {
        const firstTerminal = allTerminals[0];
        setActiveTerminal(`${firstTerminal.scenarioId}:${firstTerminal.terminalId}`);
        scenarioTerminalService.setActiveTerminal(firstTerminal.scenarioId, firstTerminal.terminalId);
      }
    };

    // Mettre à jour la liste initiale
    updateTerminals();

    // Mettre en place un intervalle pour actualiser la liste des terminaux
    const interval = setInterval(updateTerminals, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTerminal]);

  const handleTerminalSelect = (scenarioId: string, terminalId: string) => {
    const terminalKey = `${scenarioId}:${terminalId}`;
    setActiveTerminal(terminalKey);
    scenarioTerminalService.setActiveTerminal(scenarioId, terminalId);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Barre d'onglets des terminaux */}
      <div className="flex overflow-x-auto bg-gray-800 border-b border-gray-700">
        {terminals.map((terminal) => {
          const terminalKey = `${terminal.scenarioId}:${terminal.terminalId}`;
          const isActive = terminalKey === activeTerminal;
          
          return (
            <button
              key={terminalKey}
              className={`
                px-4 py-2 flex items-center space-x-2 focus:outline-none
                ${isActive 
                  ? 'bg-gray-700 text-white border-b-2 border-blue-500' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }
              `}
              onClick={() => handleTerminalSelect(terminal.scenarioId, terminal.terminalId)}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  terminal.status === 'running' ? 'bg-green-500' :
                  terminal.status === 'failed' ? 'bg-red-500' :
                  terminal.status === 'completed' ? 'bg-blue-500' :
                  terminal.status === 'paused' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}
              />
              <span>Terminal {terminal.terminalId}</span>
            </button>
          );
        })}
      </div>

      {/* Zone d'affichage du terminal actif */}
      <div className="flex-1 bg-gray-900">
        {activeTerminal && terminals.length > 0 ? (
          <ScenarioTerminal
            scenarioId={activeTerminal.split(':')[0]}
            terminalId={activeTerminal.split(':')[1]}
            height="100%"
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <ServerIcon className="h-12 w-12 mx-auto mb-4" />
              <p>Aucun terminal actif</p>
              <p className="text-sm">Les sorties des attaques apparaîtront ici</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};