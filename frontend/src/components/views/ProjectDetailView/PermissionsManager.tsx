import React, { useState } from 'react';
import { Project } from '../../../types/project';
import { toast } from 'react-toastify';
import {
  UserIcon,
  UserPlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';

interface PermissionsManagerProps {
  project: Project;
  onUpdatePermission: (userId: string, newRole: 'viewer' | 'editor' | 'owner') => Promise<void>;
  onRemoveUser: (userId: string, projectId: string) => Promise<void>;
  onAddUser: (username: string, projectId: string) => Promise<Project>;
  currentUsername: string;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  project,
  onUpdatePermission,
  onRemoveUser,
  onAddUser,
  currentUsername,
}) => {
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!newUsername.trim()) {
      setFormError('Username is required');
      return;
    }

    setLoading(true);
    try {
      await onAddUser(newUsername, project._id);
      setNewUsername('');
      setShowAddUserForm(false);
      toast.success('User added successfully');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newRole: 'viewer' | 'editor' | 'owner') => {
    try {
      await onUpdatePermission(userId, newRole);
      toast.success('Permissions updated successfully');
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleRemoveUser = async (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to remove ${username} from this project?`)) {
      try {
        await onRemoveUser(userId, project._id);
        toast.success('User removed successfully');
      } catch (error) {
        toast.error('Failed to remove user');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Access Control</h3>
        </div>
        <button
          onClick={() => setShowAddUserForm(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 group"
        >
          <UserPlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Add User</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Owner Section */}
        <div className="p-4 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/20 dark:to-transparent border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.owner.username}
                </span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400">
                  Owner
                </span>
                {project.owner.username === currentUsername && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">(You)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shared Users List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {project.sharedWith?.map((user) => (
            <div key={user.userId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdatePermission(user.userId, e.target.value as 'viewer' | 'editor' | 'owner')}
                    className="text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button
                    onClick={() => handleRemoveUser(user.userId, user.username)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      <Transition show={showAddUserForm} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setShowAddUserForm(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center space-x-2"
                  >
                    <UserPlusIcon className="w-5 h-5 text-indigo-500" />
                    <span>Add New User</span>
                  </Dialog.Title>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="p-1 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className={`block w-full px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 bg-white dark:bg-gray-700 rounded-lg border ${
                          formError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        } focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-transparent`}
                        placeholder="Enter username"
                      />
                      {formError && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    {formError && (
                      <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                        {formError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
                        loading ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Adding...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4 mr-1.5" />
                          Add User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};
