import { useState, useEffect } from 'react';

const ProjectsView: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Check URL directly on mount
  useEffect(() => {
    const createParam = new URLSearchParams(window.location.search).get('create');
    
    if (createParam === 'true') {
      setShowCreateModal(true);
      
      // Clean URL immediately
      const url = new URL(window.location.href);
      url.searchParams.delete('create');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleModalClosed = () => {
    setShowCreateModal(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your security testing projects
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Welcome to MMT-Pentester
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create your first project to get started with security testing.
          </p>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This feature is coming soon. Please check back later.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleModalClosed}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
