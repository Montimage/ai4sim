import React, { useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { 
  PlusIcon, 
  ShareIcon, 
  FolderIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  UserPlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { observer } from 'mobx-react-lite';

interface ProjectsListProps {
  onProjectSelect?: (projectId: string) => void;
}

interface ProjectUser {
  _id: string;
  username: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

interface ProjectSettings {
  _id: string;
  name: string;
  description: string;
  users: ProjectUser[];
}

export const ProjectsList: React.FC<ProjectsListProps> = observer(({ onProjectSelect }) => {
  const { projects, createProject, selectProject, isLoading, error } = useProjectStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectSettings | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await createProject({ 
      name, 
      description,
      owner: {
        _id: '', // This will be set by the backend
        username: localStorage.getItem('username') || '' // Get the current user's username
      },
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setName('');
    setDescription('');
    setShowCreateForm(false);
  };

  const handleSelectProject = (projectId: string) => {
    console.log('👆 ProjectsList: Project clicked:', projectId);
    selectProject(projectId);
    console.log('✅ ProjectsList: Project selection triggered');
    onProjectSelect?.(projectId);
  };

  const handleOpenSettings = (project: any) => {
    console.log('🔧 Opening settings for project:', project);
    
    // Transform project data to include users with roles
    // Handle case where owner might be just an ID string
    const ownerUser = typeof project.owner === 'string' 
      ? { _id: project.owner, username: 'Owner', role: 'owner' }
      : { _id: project.owner._id, username: project.owner.username, role: 'owner' };
    
    const projectSettings: ProjectSettings = {
      _id: project._id,
      name: project.name,
      description: project.description || '',
      users: [
        ownerUser,
        ...(project.sharedWith || []).map((user: any) => ({
          _id: typeof user === 'string' ? user : user._id,
          username: typeof user === 'string' ? 'User' : user.username,
          role: typeof user === 'string' ? 'viewer' : (user.role || 'viewer')
        }))
      ]
    };
    
    console.log('🔧 Project settings prepared:', projectSettings);
    setSelectedProject(projectSettings);
    setShowSettingsModal(true);
  };

  const handleAddUser = () => {
    if (!newUserEmail.trim() || !selectedProject) return;
    
    const newUser: ProjectUser = {
      _id: Date.now().toString(), // Temporary ID
      username: newUserEmail,
      role: newUserRole
    };
    
    setSelectedProject({
      ...selectedProject,
      users: [...selectedProject.users, newUser]
    });
    
    setNewUserEmail('');
    setNewUserRole('viewer');
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedProject) return;
    
    setSelectedProject({
      ...selectedProject,
      users: selectedProject.users.filter(user => user._id !== userId)
    });
  };

  const handleChangeUserRole = (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!selectedProject) return;
    
    setSelectedProject({
      ...selectedProject,
      users: selectedProject.users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      )
    });
  };

  const handleSaveSettings = async () => {
    if (!selectedProject) return;
    
    // TODO: Implement API call to save project settings
    console.log('Saving project settings:', selectedProject);
    
    setShowSettingsModal(false);
    setSelectedProject(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  console.log('📋 ProjectsList: Current projects:', projects);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Projects</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          New Project
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateProject} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className="mb-3">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100 transition ease-in-out duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No projects found. Create your first project to get started.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {projects.map((project) => {
            console.log('🎯 Rendering project:', project);
            return (
            <li key={project._id} className="py-3">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => handleSelectProject(project._id)}
                  className="flex items-center text-left focus:outline-none w-full"
                >
                  <FolderIcon className="w-5 h-5 text-indigo-500 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    {project.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{project.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                <div className="flex space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔧 Settings button clicked for project:', project.name);
                      handleOpenSettings(project);
                    }}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 focus:bg-gray-100 dark:hover:text-gray-300 dark:focus:bg-gray-700"
                    title="Project settings"
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 focus:bg-gray-100 dark:hover:text-gray-300 dark:focus:bg-gray-700"
                    title="Share project"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {/* Project Settings Modal */}
      {showSettingsModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Project Settings: {selectedProject.name}
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Project Info */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Project Information</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      type="text"
                      value={selectedProject.name}
                      onChange={(e) => setSelectedProject({ ...selectedProject, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={selectedProject.description}
                      onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* User Management */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">User Access Management</h4>
                
                {/* Add User */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add User</h5>
                  <div className="flex space-x-3">
                    <input
                      type="email"
                      placeholder="User email or username"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                      className="border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={handleAddUser}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                  {selectedProject.users.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.role !== 'owner' && (
                          <>
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeUserRole(user._id, e.target.value as 'admin' | 'editor' | 'viewer')}
                              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveUser(user._id)}
                              className="text-red-400 hover:text-red-500 dark:hover:text-red-300"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Role Descriptions */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h6 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Role Permissions:</h6>
                  <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <li><strong>Owner:</strong> Full control, can delete project</li>
                    <li><strong>Admin:</strong> Can manage users and edit all content</li>
                    <li><strong>Editor:</strong> Can create and edit campaigns/scenarios</li>
                    <li><strong>Viewer:</strong> Read-only access to project content</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-100 transition ease-in-out duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
