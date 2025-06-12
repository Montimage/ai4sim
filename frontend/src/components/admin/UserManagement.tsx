import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Search,
  Eye
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  securitySettings: {
    failedLoginAttempts: number;
    lockedUntil?: string;
  };
}

interface UserStats {
  total: number;
  active: number;
  locked: number;
  byRole: { [role: string]: number };
  byDepartment: { [department: string]: number };
  recentLogins: number;
}

export const UserManagement: React.FC = () => {
  const { theme } = useThemeStore();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Charger les utilisateurs
  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Verrouiller/déverrouiller un utilisateur
  const toggleUserLock = async (userId: string, lock: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/toggle-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ lock })
      });

      if (response.ok) {
        await loadUsers();
        await loadStats();
      }
    } catch (error) {
      console.error('Error toggling user lock:', error);
    }
  };

  // Réinitialiser le mot de passe
  const resetPassword = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Temporary password: ${data.tempPassword}`);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  // Supprimer un utilisateur
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadUsers();
        await loadStats();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [currentPage, searchTerm, roleFilter, departmentFilter, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-800',
      admin: 'bg-orange-100 text-orange-800',
      project_manager: 'bg-blue-100 text-blue-800',
      analyst: 'bg-green-100 text-green-800',
      user: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (user: User) => {
    if (!user.isActive) return 'bg-gray-100 text-gray-800';
    if (user.securitySettings.lockedUntil && new Date(user.securitySettings.lockedUntil) > new Date()) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (user: User) => {
    if (!user.isActive) return 'Inactive';
    if (user.securitySettings.lockedUntil && new Date(user.securitySettings.lockedUntil) > new Date()) {
      return 'Locked';
    }
    return 'Active';
  };

  return (
    <div className={`min-h-full ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                User Management
              </h1>
              <p className={`mt-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                User account and permissions administration
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New User
            </button>
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`p-6 rounded-lg ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
              <div className="flex items-center">
                <Users className={`w-8 h-8 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Total Users
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
              <div className="flex items-center">
                <Shield className={`w-8 h-8 ${theme === 'light' ? 'text-green-600' : 'text-green-400'}`} />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Active Users
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {stats.active}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
              <div className="flex items-center">
                <Lock className={`w-8 h-8 ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`} />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Locked Accounts
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {stats.locked}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
              <div className="flex items-center">
                <Users className={`w-8 h-8 ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`} />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    24h Logins
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {stats.recentLogins}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className={`p-6 rounded-lg mb-6 ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  theme === 'light' 
                    ? 'bg-white border-gray-300 text-gray-900' 
                    : 'bg-gray-700 border-gray-600 text-white'
                }`}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border ${
                theme === 'light' 
                  ? 'border-gray-300 bg-white text-gray-900' 
                  : 'border-gray-600 bg-gray-700 text-white'
              }`}
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="analyst">Analyst</option>
              <option value="user">User</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border ${
                theme === 'light' 
                  ? 'border-gray-300 bg-white text-gray-900' 
                  : 'border-gray-600 bg-gray-700 text-white'
              }`}
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setDepartmentFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors ${
                theme === 'light' 
                  ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' 
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table des utilisateurs */}
        <div className={`rounded-lg overflow-hidden ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
                    User
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
                    Role
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
                    Last Login
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-gray-600'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`px-6 py-4 text-center ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className={theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                            }`}>
                              <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                                {user.firstName?.[0] || user.username[0].toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                            </div>
                            <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user)}`}>
                          {getStatusText(user)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Jamais'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className={`p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => toggleUserLock(user._id, !user.securitySettings.lockedUntil)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.securitySettings.lockedUntil 
                                ? 'text-green-600 hover:bg-green-100' 
                                : 'text-orange-600 hover:bg-orange-100'
                            }`}
                            title={user.securitySettings.lockedUntil ? 'Unlock' : 'Lock'}
                          >
                            {user.securitySettings.lockedUntil ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          
                          <button
                            onClick={() => resetPassword(user._id)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Reset Password"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                } ${
                  theme === 'light' 
                    ? 'bg-white border-gray-300 text-gray-700' 
                    : 'bg-gray-800 border-gray-600 text-gray-300'
                }`}
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                } ${
                  theme === 'light' 
                    ? 'bg-white border-gray-300 text-gray-700' 
                    : 'bg-gray-800 border-gray-600 text-gray-300'
                }`}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création d'utilisateur */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              Create User
            </h2>
            
            {/* Formulaire de création */}
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-6 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal de détails utilisateur */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              User Details
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Username
                </label>
                <p className={`mt-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {selectedUser.username}
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Role
                </label>
                <p className={`mt-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {selectedUser.role}
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Created
                </label>
                <p className={`mt-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {formatDate(selectedUser.createdAt)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowUserModal(false)}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 