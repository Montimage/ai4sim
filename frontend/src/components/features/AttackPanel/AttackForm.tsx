import React from "react";
import { Attack } from "../../../types/attack";
import { useAttackStore } from "../../../store/attackStore";
import { useWebSocket } from "../../../hooks/useWebSocket";

interface AttackFormProps {
  attack: Attack;
}

export const AttackForm: React.FC<AttackFormProps> = ({ attack }) => {
  const updateTabState = useAttackStore(state => state.updateTabState);
  const { sendMessage } = useWebSocket();

  const handleExecute = () => {
    updateTabState(attack.id, { status: "running" });
    sendMessage({
      type: "execute",
      command: attack.command,
      parameters: attack.parameters,
      tabId: attack.id
    });
  };

  const handleStop = () => {
    updateTabState(attack.id, { status: "stopped" });
    sendMessage({
      type: "stop",
      tabId: attack.id
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">{attack.name}</h2>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Status</h3>
          <p className="mt-1">{attack.status}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700">Command</h3>
          <pre className="mt-1 p-2 bg-gray-50 rounded">
            {typeof attack.command === 'function' 
              ? attack.command(attack.parameters || {}) 
              : attack.command}
          </pre>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700">Parameters</h3>
          <pre className="mt-1 p-2 bg-gray-50 rounded">
            {JSON.stringify(attack.parameters, null, 2)}
          </pre>
        </div>
      </div>
      <div className="p-4 border-t">
        <div className="flex gap-4">
          <button
            onClick={handleExecute}
            disabled={attack.status === "running"}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Execute
          </button>
          <button
            onClick={handleStop}
            disabled={attack.status !== "running"}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};
