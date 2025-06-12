import React, { useEffect, useRef } from "react";
import { useAttackStore } from "../../../store/attackStore";

interface OutputTabProps {
  tabId: string;
}

export const OutputTab: React.FC<OutputTabProps> = ({ tabId }) => {
  const tabState = useAttackStore((state) => state.tabStates[tabId]);
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tabState?.output]);

  if (!tabState?.output) {
    return null;
  }

  return (
    <div ref={outputRef} className="output-container">
      {tabState.output.map((line: string, index: number) => (
        <div key={index} className="output-line">
          {line}
        </div>
      ))}
    </div>
  );
};
