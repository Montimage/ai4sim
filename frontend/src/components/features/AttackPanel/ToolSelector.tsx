import React from "react";

interface Tool {
  id: string;
  name: string;
  type: "FUZZING" | "SIMULATION" | "FRAMEWORK";
  description: string;
}

const tools: Tool[] = [
  {
    id: "ganfuzzer",
    name: "GAN-Based Fuzzer",
    type: "FUZZING",
    description: "Advanced fuzzing using Generative Adversarial Networks"
  },
  {
    id: "maip",
    name: "MAIP",
    type: "SIMULATION",
    description: "Advanced simulation of AI-based adversarial attacks"
  },
  {
    id: "caldera",
    name: "Caldera",
    type: "FRAMEWORK",
    description: "Complete framework for configuring and executing advanced attacks"
  }
];

export const ToolSelector: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="p-4 border rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium">{tool.name}</h3>
            <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
              {tool.type}
            </span>
          </div>
          <p className="mt-2 text-gray-600">{tool.description}</p>
          <button className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Select Tool
          </button>
        </div>
      ))}
    </div>
  );
};
