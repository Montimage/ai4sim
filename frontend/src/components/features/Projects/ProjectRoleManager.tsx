import React from 'react';
import { UserPlusIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { ProjectUser, SystemRole } from '../../../types/project';

interface ProjectRoleManagerProps {
  users: ProjectUser[];
  onAddUser: (username: string, role: SystemRole) => void;
  onRemoveUser: (userId: string) => void;
  onChangeUserRole: (userId: string, newRole: SystemRole) => void;
  newUsername: string;
  setNewUsername: (username: string) => void;
  newUserRole: SystemRole;
  setNewUserRole: (role: SystemRole) => void;
  isCheckingUser: boolean;
  userValidation: {
    isValid: boolean | null;
    message: string;
    isChecking: boolean;
  };
}

export const ProjectRoleManager: React.FC<ProjectRoleManagerProps> = ({
  users,
  onAddUser,
  onRemoveUser,
  onChangeUserRole,
  newUsername,
  setNewUsername,
  newUserRole,
  setNewUserRole,
  isCheckingUser,
  userValidation
}) => {
  const getRoleColor = (role: SystemRole) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'project_manager': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'security_analyst': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'user': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRoleDescription = (role: SystemRole) => {
    switch (role) {
      case 'super_admin': return 'Accès complet à toutes les fonctionnalités';
      case 'admin': return 'Gestion des utilisateurs et configuration';
      case 'project_manager': return 'Gestion complète des projets et équipes';
      case 'security_analyst': return 'Analyse de sécurité et exécution de tests';
      case 'user': return 'Utilisateur standard avec accès limité';
      case 'viewer': return 'Accès en lecture seule';
      default: return '';
    }
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        <ShieldCheckIcon className="w-4 h-4 inline mr-2" />
        Gestion des Rôles Système
      </h4>
      
      {/* Add User */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Ajouter un utilisateur</h5>
        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm ${
                userValidation.isValid === false 
                  ? 'border-red-300 dark:border-red-600' 
                  : userValidation.isValid === true 
                  ? 'border-green-300 dark:border-green-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {newUsername.trim() && (
              <div className="mt-1 flex items-center space-x-1">
                {userValidation.isChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                    <span className="text-xs text-gray-500">Vérification...</span>
                  </>
                ) : (
                  <>
                    {userValidation.isValid === true && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓ {userValidation.message}</span>
                    )}
                    {userValidation.isValid === false && (
                      <span className="text-xs text-red-600 dark:text-red-400">✗ {userValidation.message}</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as SystemRole)}
            className="border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white sm:text-sm"
          >
            <option value="user">Utilisateur</option>
            <option value="viewer">Lecteur</option>
            <option value="security_analyst">Analyste Sécurité</option>
            <option value="project_manager">Gestionnaire Projet</option>
            <option value="admin">Administrateur</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button
            onClick={() => onAddUser(newUsername, newUserRole)}
            disabled={isCheckingUser || userValidation.isValid !== true}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {getRoleDescription(user.role)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user.role !== 'super_admin' && user.role !== 'admin' && (
                <>
                  <select
                    value={user.role}
                    onChange={(e) => onChangeUserRole(user._id, e.target.value as SystemRole)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="viewer">Lecteur</option>
                    <option value="security_analyst">Analyste Sécurité</option>
                    <option value="project_manager">Gestionnaire Projet</option>
                    <option value="admin">Administrateur</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <button
                    onClick={() => onRemoveUser(user._id)}
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
        <h6 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Description des Rôles :</h6>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li><strong>Super Admin :</strong> Contrôle total, peut supprimer le projet</li>
          <li><strong>Admin :</strong> Peut gérer les utilisateurs et éditer tout le contenu</li>
          <li><strong>Gestionnaire Projet :</strong> Peut créer et gérer des campagnes/scénarios</li>
          <li><strong>Analyste Sécurité :</strong> Peut exécuter des tests de sécurité</li>
          <li><strong>Utilisateur :</strong> Accès limité avec exécution de scénarios</li>
          <li><strong>Lecteur :</strong> Accès en lecture seule au contenu du projet</li>
        </ul>
      </div>
    </div>
  );
}; 