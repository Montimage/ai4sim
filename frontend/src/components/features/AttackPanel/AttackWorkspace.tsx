import React from "react";
import { CategorySelector } from "./CategorySelector";
import { ToolList } from "./ToolList";
import { AttackTabs } from "./AttackTabs";
import { ConfigPanel } from "./ConfigPanel";
import { OutputPanel } from "./OutputPanel";

interface AttackWorkspaceProps {
    tabId: string;
}

export const AttackWorkspace: React.FC<AttackWorkspaceProps> = ({ tabId }) => {
    if (!tabId) {
        return <div>No active tab</div>;
    }

    return (
        <div className="h-full flex flex-col">
            <AttackTabs />
            <div className="flex-1 flex">
                <div className="w-72 border-r">
                    <CategorySelector tabId={tabId} />
                </div>
                <div className="w-96 border-r">
                    <ToolList tabId={tabId} />
                </div>
                <div className="flex-1 flex flex-col">
                    <ConfigPanel tabId={tabId} />
                    <OutputPanel tabId={tabId} />
                </div>
            </div>
        </div>
    );
};
