import React from "react";
import { useAttackStore } from "../../../store/attackStore";

export const AttackList: React.FC = () => {
  const openTabs = useAttackStore(state => state.openTabs);
  const activeTabId = useAttackStore(state => state.activeTabId);
  const setActiveTab = useAttackStore(state => state.setActiveTab);
  const tabStates = useAttackStore(state => state.tabStates);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Attack List</h2>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {openTabs.length === 0 ? (
          <p className="text-center text-gray-500">No attacks yet</p>
        ) : (
          <ul className="space-y-2">
            {openTabs.map((tab) => {
              const tabState = tabStates[tab.id];
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left p-3 rounded-md hover:bg-gray-50 ${
                      activeTabId === tab.id ? "bg-indigo-50 border border-indigo-200" : ""
                    }`}
                  >
                    <p className="font-medium">{tab.name}</p>
                    <p className="text-sm text-gray-500">{tabState?.status || 'idle'}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
