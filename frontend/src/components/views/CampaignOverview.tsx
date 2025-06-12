import React, { useState, useEffect } from 'react';
import { AttackWorkspace } from '../features/AttackPanel/AttackWorkspace';
import { useProjectStore } from '../../store/projectStore';
import { Project } from '../../types/project';
import { PlusIcon, FolderIcon } from '@heroicons/react/24/outline';

export const CampaignOverview: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [tabs, setTabs] = useState<Array<{id: string; name: string}>>([]);
  const projectStore = useProjectStore();
  const projects = projectStore.projects;
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  useEffect(() => {
    if (tabs.length === 0) {
      handleNewTab();
    }
  }, [tabs.length]);
  
  const handleNewTab = () => {
    const newTabId = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id: newTabId, name: `Scénario ${prev.length + 1}` }]);
    setActiveTabId(newTabId);
  };
  
  const handleTabClose = (tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId(tabs[0]?.id || '');
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Sélection du projet */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <FolderIcon className="w-6 h-6 text-gray-400" />
            <select
              value={selectedProject?._id || ''}
              onChange={(e) => {
                const project = projects.find((p: Project) => p._id === e.target.value);
                setSelectedProject(project || null);
              }}
              className="block w-64 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sélectionner un projet</option>
              {projects.map((project: Project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Onglets des scénarios */}
      <div className="px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex-1 flex items-center space-x-2 overflow-x-auto py-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTabId === tab.id
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.name}
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabClose(tab.id);
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleNewTab}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Zone de travail */}
      <div className="flex-1 overflow-hidden">
        {activeTabId && <AttackWorkspace tabId={activeTabId} />}
      </div>
    </div>
  );
};
