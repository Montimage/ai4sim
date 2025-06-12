import React, { useEffect } from "react";
import { useAttackStore } from "../../../store/attackStore";

export const AttackTabs: React.FC = () => {
  const { attacks, activeTabId, setActiveTab, closeTab } = useAttackStore();

  useEffect(() => {
    console.log("AttackTabs rendered");
  }, []);

  console.log("Number of tabs:", attacks.length);

  return (
    <div className="border-b border-gray-200">
      <div className="flex overflow-x-auto">
        {attacks.map((attack) => (
          <div
            key={attack.id}
            className={`group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-6 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 cursor-pointer ${
              activeTabId === attack.id ? "border-b-2 border-indigo-500" : ""
            }`}
            onClick={() => setActiveTab(attack.id)}
          >
            <span>{attack.name}</span>
            <button
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(attack.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
