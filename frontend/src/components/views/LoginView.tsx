import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';

export const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const theme = useThemeStore(state => state.theme);
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    // Si déjà authentifié, rediriger vers le dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login({ username, password });
      addNotification({
        message: 'Successfully logged in',
        type: 'success',
        category: 'system',
        title: 'Login Success'
      });
      // La redirection sera gérée par le useEffect ci-dessus
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid credentials';
      setError(errorMessage);
      addNotification({
        message: errorMessage,
        type: 'error',
        category: 'system',
        title: 'Login Error'
      });
    }
  };

  // Ne pas afficher la page de connexion si déjà authentifié
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
    }`}>
      <div className={`max-w-md w-full space-y-8 p-8 rounded-lg shadow-lg ${
        theme === 'light' ? 'bg-white' : 'bg-gray-800'
      }`}>
        <div>
          <h2 className={`text-center text-3xl font-extrabold ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Sign in to AI4SIM
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border 
                  border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md 
                  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  theme === 'light' 
                    ? 'bg-white text-gray-900' 
                    : 'bg-gray-700 text-white border-gray-600'
                }`}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border
                  border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md
                  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  theme === 'light'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-700 text-white border-gray-600'
                }`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent 
                text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
