import { useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { observer } from 'mobx-react-lite';
import { ProjectsList } from '../features/Projects/ProjectsList';

// Composant ProjectsView original restauré
const ProjectsView = () => {
  const { fetchProjects, isInitialized, init } = useProjectStore();

  // Optimisation pour éviter les appels API redondants
  useEffect(() => {
    const loadProjects = async () => {
      if (!isInitialized) {
        // Initialisation du store sans chargement automatique d'un projet
        await init();
      }
      
      // Charger uniquement la liste des projets
      await fetchProjects();
    };
    
    loadProjects();
    
    // La dépendance isInitialized est retirée pour éviter les rechargements multiples
  }, [init, fetchProjects]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Conteneur simple pour la liste des projets */}
      <div className="container mx-auto px-4 py-8">
        <ProjectsList onProjectSelect={(projectId) => {
          // Naviguer vers la page du projet
          window.location.href = `/projects/${projectId}`;
        }} />
      </div>
    </div>
  );
};

export default observer(ProjectsView);
