import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FolderIcon, 
  DocumentTextIcon, 
  BoltIcon,
  ChartBarIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigationItems: NavItem[] = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: ChartBarIcon,
    description: 'Overview and statistics'
  },
  { 
    name: 'Attacks', 
    path: '/attacks', 
    icon: BoltIcon,
    description: 'Configure and launch attacks'
  },
  { 
    name: 'Projects', 
    path: '/projects', 
    icon: FolderIcon,
    description: 'Manage your security projects'
  },
  { 
    name: 'Reports', 
    path: '/reports', 
    icon: DocumentTextIcon,
    description: 'View execution reports'
  },
  { 
    name: 'Settings', 
    path: '/settings', 
    icon: Cog6ToothIcon,
    description: 'Application settings'
  }
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const closeSidebar = useThemeStore(state => state.closeSidebar);
  const theme = useThemeStore(state => state.theme);

  const handleNavigation = (path: string) => {
    try {
      navigate(path);
      // Close sidebar on mobile after navigation
      if (window.innerWidth < 1024) {
        closeSidebar();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      window.location.href = path;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="h-full flex flex-col sidebar-theme">
      {/* Header */}
      <motion.div 
        className={`p-6 border-b ${
          theme === 'light' 
            ? 'border-slate-200' 
            : 'border-white/10'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <BoltIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${
              theme === 'light' 
                ? 'text-slate-800' 
                : 'text-white'
            }`}>
              AI4SIM
            </h1>
            <p className={`text-xs ${
              theme === 'light' 
                ? 'text-slate-500' 
                : 'text-white/60'
            }`}>
              Security Platform
            </p>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navigationItems.map((item, index) => {
          const isActive = isActivePath(item.path);
          
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300
                ${isActive 
                  ? theme === 'light'
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                    : 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-white'
                  : theme === 'light'
                    ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
                    theme === 'light'
                      ? 'bg-gradient-to-b from-indigo-500 to-purple-600'
                      : 'bg-gradient-to-b from-indigo-400 to-purple-500'
                  }`}
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-lg transition-all duration-300
                  ${isActive 
                    ? theme === 'light'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-indigo-500/20 text-indigo-400'
                    : theme === 'light'
                      ? 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                      : 'bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white'
                  }
                `}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`
                    font-medium transition-colors duration-300
                    ${isActive 
                      ? theme === 'light' 
                        ? 'text-indigo-700' 
                        : 'text-white'
                      : theme === 'light'
                        ? 'text-slate-700 group-hover:text-slate-800'
                        : 'text-white/80 group-hover:text-white'
                    }
                  `}>
                    {item.name}
                  </p>
                  {item.description && (
                    <p className={`
                      text-xs mt-0.5 transition-colors duration-300
                      ${isActive 
                        ? theme === 'light' 
                          ? 'text-indigo-600/70' 
                          : 'text-white/70'
                        : theme === 'light'
                          ? 'text-slate-500 group-hover:text-slate-600'
                          : 'text-white/50 group-hover:text-white/70'
                      }
                    `}>
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Hover effect */}
              <div className={`
                absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl
                ${theme === 'light'
                  ? 'bg-gradient-to-r from-slate-100/50 to-slate-200/50'
                  : 'bg-gradient-to-r from-indigo-600/10 to-purple-600/10'
                }
              `} />
            </motion.button>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <motion.div 
        className={`p-4 border-t ${
          theme === 'light' 
            ? 'border-slate-200' 
            : 'border-white/10'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* User Info */}
        <div className={`
          flex items-center space-x-3 p-3 rounded-xl mb-3
          ${theme === 'light'
            ? 'bg-slate-50'
            : 'bg-white/5'
          }
        `}>
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              theme === 'light' 
                ? 'text-slate-800' 
                : 'text-white'
            }`}>
              {user?.username || 'User'}
            </p>
            <p className={`text-xs capitalize ${
              theme === 'light' 
                ? 'text-slate-500' 
                : 'text-white/60'
            }`}>
              {user?.role || 'admin'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <motion.button
          onClick={handleLogout}
          className={`
            w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group
            ${theme === 'light'
              ? 'text-slate-600 hover:text-red-600 hover:bg-red-50'
              : 'text-white/70 hover:text-white hover:bg-red-500/20'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className={`
            p-2 rounded-lg transition-all duration-300
            ${theme === 'light'
              ? 'bg-red-50 text-red-500 group-hover:bg-red-100'
              : 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30'
            }
          `}>
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </div>
          <span className="font-medium">Logout</span>
        </motion.button>
      </motion.div>
    </div>
  );
};
