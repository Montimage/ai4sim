import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { UserPlusIcon, UserIcon } from '@heroicons/react/24/outline';

export const LoginView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    inviteCode: ''
  });
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
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
      setLoginError(errorMessage);
      addNotification({
        message: errorMessage,
        type: 'error',
        category: 'system',
        title: 'Login Error'
      });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    
    // Validation
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }
    
    if (registerForm.password.length < 6) {
      setRegisterError('Password must be at least 6 characters long');
      return;
    }
    
    if (!registerForm.username.trim()) {
      setRegisterError('Username is required');
      return;
    }
    
    setIsRegistering(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: registerForm.username.trim(),
          password: registerForm.password,
          firstName: registerForm.firstName.trim(),
          lastName: registerForm.lastName.trim(),
          inviteCode: registerForm.inviteCode
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      await response.json(); // Juste pour consommer la réponse
      
      addNotification({
        message: 'User created successfully! You can now log in.',
        type: 'success',
        category: 'system',
        title: 'Registration Success'
      });
      
      // Reset form and switch to login
      setRegisterForm({
        inviteCode: '',
        username: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
      });
      setActiveTab('login');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setRegisterError(errorMessage);
      addNotification({
        message: errorMessage,
        type: 'error',
        category: 'system',
        title: 'Registration Error'
      });
    } finally {
      setIsRegistering(false);
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
            MMT-Pentester Dashboard
          </h2>
          <p className={`text-center text-sm mt-2 ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Security Testing Platform
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'login'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UserIcon className="w-4 h-4 mr-2" />
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'register'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Create Account
          </button>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
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

            {loginError && (
            <div className="text-red-500 text-sm text-center">
                {loginError}
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
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    className={`appearance-none relative block w-full px-3 py-2 border 
                      border-gray-300 placeholder-gray-500 text-gray-900 rounded-md
                      focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                      theme === 'light' 
                        ? 'bg-white text-gray-900' 
                        : 'bg-gray-700 text-white border-gray-600'
                    }`}
                    placeholder="First Name"
                    value={registerForm.firstName}
                    onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className={`appearance-none relative block w-full px-3 py-2 border 
                      border-gray-300 placeholder-gray-500 text-gray-900 rounded-md
                      focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                      theme === 'light' 
                        ? 'bg-white text-gray-900' 
                        : 'bg-gray-700 text-white border-gray-600'
                    }`}
                    placeholder="Last Name"
                    value={registerForm.lastName}
                    onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <input
                  type="text"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border 
                    border-gray-300 placeholder-gray-500 text-gray-900 rounded-md
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    theme === 'light' 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700 text-white border-gray-600'
                  }`}
                  placeholder="Username"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                />
              </div>
              
              <div>
                <input
                  type="password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border 
                    border-gray-300 placeholder-gray-500 text-gray-900 rounded-md
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    theme === 'light' 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700 text-white border-gray-600'
                  }`}
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
              </div>
              
              <div>
                <input
                  type="password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border 
                    border-gray-300 placeholder-gray-500 text-gray-900 rounded-md
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    theme === 'light' 
                      ? 'bg-white text-gray-900' 
                      : 'bg-gray-700 text-white border-gray-600'
                  }`}
                  placeholder="Confirm Password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                />
              </div>
              
              <div>
                <input
                  type="text"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border
                    border-gray-300 placeholder-gray-500 text-gray-900 rounded-md
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    theme === 'light'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-700 text-white border-gray-600'
                  }`}
                  placeholder="Invite Code"
                  value={registerForm.inviteCode}
                  onChange={(e) => setRegisterForm({ ...registerForm, inviteCode: e.target.value })}
                />
              </div>
            </div>

            {registerError && (
              <div className="text-red-500 text-sm text-center">
                {registerError}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isRegistering}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent 
                  text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegistering ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
