// filepath: /home/hamdouni-mohamed/MMT/Dashboard/17.04/frontend/src/components/features/ScenarioTerminal/ScenarioTerminal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { scenarioTerminalService, TerminalState } from '../../../services/scenarioTerminalService';

interface ScenarioTerminalProps {
  scenarioId: string;
  terminalId: string;
  height?: string;
  className?: string;
}

const ScenarioTerminal: React.FC<ScenarioTerminalProps> = ({
  scenarioId,
  terminalId,
  height = '400px',
  className = ''
}) => {
  const [terminal, setTerminal] = useState<TerminalState | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  // Logs pour vérifier que le composant est bien chargé
  console.log(`%c🔍 ScenarioTerminal RENDU: ${scenarioId}-${terminalId}`, 
    'background: #000066; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;');

  useEffect(() => {
    console.log(`%c🔄 ScenarioTerminal EFFET: ${scenarioId}-${terminalId}`, 
      'background: #006600; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;');
      
    const unsubscribe = scenarioTerminalService.subscribeToTerminal(
      scenarioId,
      terminalId,
      (state) => {
        setTerminal(state);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [scenarioId, terminalId]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-500';
      case 'stopped':
        return 'text-red-500';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (!terminal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${getStatusColor(terminal.status)}`}></div>
          <span className="text-sm text-gray-300">Terminal {terminalId}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${getStatusColor(terminal.status)}`}>
            {terminal.status.charAt(0).toUpperCase() + terminal.status.slice(1)}
          </span>
          <button
            onClick={() => scenarioTerminalService.clearTerminal(scenarioId, terminalId)}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Effacer le terminal"
          >
            Effacer
          </button>
        </div>
      </div>
      
      <div
        ref={terminalRef}
        className="flex-1 p-4 bg-black overflow-y-auto font-mono text-sm"
        style={{ height, maxHeight: height }}
      >
        <div className="space-y-1">
          {terminal.outputBuffer.map((output, index) => {
            // Log tous les messages pour voir s'ils passent bien ici
            console.log(`%c📟 Message type=${output.type}: ${output.content}`, 
              output.type === 'error' 
                ? 'background: #660000; color: #ffaaaa;' 
                : 'background: #006600; color: #aaffaa;'
            );
            
            return (
              <div
                key={`${index}-${output.timestamp}`}
                className={`${
                  output.type === 'error' ? 'text-red-500' : 'text-green-400'
                } font-mono whitespace-pre-wrap`}
              >
                {output.content}
              </div>
            );
          })}
          {terminal.status === 'running' && (
            <div className="inline-block text-green-400">
              $ <span className="animate-pulse">▋</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioTerminal;
