import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AttackPanel } from './components/features/AttackPanel';
import DashboardView from './components/views/DashboardView';
import { useThemeStore } from './store/themeStore';
import SettingsView from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';
import { CreateProjectView } from './components/views/CreateProjectView';
import ProjectDetailView from './components/views/ProjectDetailView';
import { CampaignDetailView } from './components/views/CampaignDetailView';
import { ReportsView } from './components/views/ReportsView';
import { useAuthStore } from './store/authStore';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { ScenarioConfiguration } from './components/views/ScenarioConfiguration';
import ScenarioManager from './components/views/ScenarioManager';

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const init = useAuthStore(state => state.init);
  const theme = useThemeStore(state => state.theme);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await init();
      } finally {
        setIsInitializing(false);
      }
    };
    initializeAuth();
  }, [init]);

  useEffect(() => {
    // Appliquer le thème au document
    const root = document.documentElement;
    const body = document.body;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
    }
    
    // Forcer la mise à jour des variables CSS
    root.style.setProperty('--theme-mode', theme);
  }, [theme]);

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Route de connexion accessible uniquement si non authentifié */}
      <Route 
        path="/login" 
        element={
          isAuthenticated 
            ? <Navigate to="/dashboard" replace /> 
            : <LoginView />
        } 
      />

      {/* Routes protégées nécessitant l'authentification */}
      <Route 
        path="/*" 
        element={
          isAuthenticated 
            ? <MainLayout><Outlet /></MainLayout> 
            : <Navigate to="/login" replace />
        }
      >
        <Route path="dashboard" element={<DashboardView />} />
        <Route path="attacks" element={<AttackPanel />} />
        <Route path="projects" element={<CreateProjectView />} />
        <Route path="projects/:projectId" element={<ProjectDetailView />} />
        <Route path="projects/:projectId/campaigns/:campaignId" element={<CampaignDetailView />} />
        
        {/* Route principale pour la configuration de scénario */}
        <Route path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/configure" element={<ScenarioConfiguration />} />
        
        {/* Routes de redirection pour les anciennes sous-pages vers configure */}
        <Route 
          path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets" 
          element={<Navigate to="../configure" replace />} 
        />
        <Route 
          path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks" 
          element={<Navigate to="../configure" replace />} 
        />
        <Route 
          path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/execution" 
          element={<Navigate to="../configure" replace />} 
        />
        <Route 
          path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history" 
          element={<Navigate to="../configure" replace />} 
        />
        <Route 
          path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings" 
          element={<Navigate to="../configure" replace />} 
        />
        
        {/* Route par défaut pour un scénario sans sous-page */}
        <Route 
          path="projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId" 
          element={<Navigate to="configure" replace />} 
        />
        
        <Route path="scenarios" element={<ScenarioManager />} />
        <Route path="reports" element={<ReportsView />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
