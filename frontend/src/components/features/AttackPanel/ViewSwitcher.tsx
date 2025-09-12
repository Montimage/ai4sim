import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getFilteredTools } from '../../../constants/tools';
import { useAttackStore } from '../../../store/attackStore';
import { useThemeStore } from '../../../store/themeStore';
import { 
  ComputerDesktopIcon, 
  CommandLineIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ViewSwitcherProps {
  tabId: string;
  children: React.ReactNode; // Le contenu des terminaux
}

type ViewMode = 'terminal' | 'iframe';

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ tabId, children }) => {
  // Récupérer la vue mémorisée pour ce tab, par défaut 'terminal'
  const getStoredViewMode = (): ViewMode => {
    try {
      const stored = localStorage.getItem(`viewSwitcher-${tabId}-lastView`);
      return (stored as ViewMode) || 'terminal';
    } catch {
      return 'terminal';
    }
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const tabState = useAttackStore(state => state.tabStates[tabId]);
  const theme = useThemeStore(state => state.theme);
  
  const selectedTool = getFilteredTools().find(tool => tool.id === tabState?.selectedTool);
  const isIframeReady = tabState?.iframeReady || false;
  const isRunning = tabState?.status === 'running' || tabState?.isRunning;
  
  // Debug logs
  console.log(`🔍 [ViewSwitcher] State - tabId: ${tabId}, tool: ${selectedTool?.name}, isIframeReady: ${isIframeReady}, isRunning: ${isRunning}, status: ${tabState?.status}`);
  
  // Déterminer le port de l'iframe à utiliser
  const getIframePort = () => {
    if (selectedTool?.sequentialExecution?.enabled && selectedTool.sequentialExecution.finalIframe) {
      return selectedTool.sequentialExecution.finalIframe.port;
    }
    return selectedTool?.iframe?.port || 3000;
  };

  // Vérifier si l'iframe est disponible
  // L'iframe est disponible si : l'outil en cours d'exécution ET iframe prêt, OU juste iframe prêt (après exécution)
  const isIframeAvailable = selectedTool?.iframe && ((isRunning && isIframeReady) || (isIframeReady && tabState?.status === 'completed'));
  
  // Pour l'exécution séquentielle, vérifier si toutes les étapes sont terminées
  const isSequentialComplete = selectedTool?.sequentialExecution?.enabled ? 
    isIframeReady : true;

  const showIframeOption = isIframeAvailable && isSequentialComplete;

  // Fonction pour forcer le refresh de l'iframe (seulement manuel maintenant)
  const refreshIframe = useCallback(() => {
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      // Forcer le rechargement en ajoutant un timestamp
      const separator = currentSrc.includes('?') ? '&' : '?';
      const newSrc = `${currentSrc}${separator}refresh=${Date.now()}`;
      iframeRef.current.src = newSrc;
      console.log(`🔄 Iframe refreshed for ${selectedTool?.name} - Manual refresh`);
    }
  }, [selectedTool?.name]);

  // Sauvegarder la vue sélectionnée dans le localStorage
  const saveViewMode = (mode: ViewMode) => {
    try {
      localStorage.setItem(`viewSwitcher-${tabId}-lastView`, mode);
    } catch (error) {
      console.warn('Failed to save view mode to localStorage:', error);
    }
  };

  // Basculer automatiquement vers l'iframe quand elle est vraiment prête - SEULEMENT LA PREMIÈRE FOIS
  useEffect(() => {
    console.log(`🔍 [ViewSwitcher] Effect triggered - showIframeOption: ${showIframeOption}, viewMode: ${viewMode}, isIframeReady: ${isIframeReady}`);
    
    if (showIframeOption && viewMode === 'terminal') {
      // Basculer automatiquement seulement si c'est la première fois que l'iframe devient disponible
      // et que l'utilisateur n'a pas encore interagi avec les boutons
      const hasUserInteracted = sessionStorage.getItem(`viewSwitcher-${tabId}-userInteracted`);
      console.log(`🔍 [ViewSwitcher] hasUserInteracted: ${hasUserInteracted}, tool: ${selectedTool?.name}`);
      
      if (!hasUserInteracted) {
        // Attendre 2 secondes avant de basculer automatiquement vers l'iframe
        // pour donner le temps aux services de s'initialiser correctement
        console.log(`⏳ Waiting 2 seconds before switching to interface for ${selectedTool?.name}`);
        const timer = setTimeout(() => {
          console.log(`🔄 AUTO-SWITCHING to interface for ${selectedTool?.name} after delay`);
          setViewMode('iframe');
          saveViewMode('iframe');
          sessionStorage.setItem(`viewSwitcher-${tabId}-userInteracted`, 'true');
        }, 2000);
        
        // Nettoyer le timer si le composant est démonté ou si l'état change
        return () => clearTimeout(timer);
      } else {
        console.log(`🔍 [ViewSwitcher] User already interacted, skipping auto-switch`);
      }
    }
  }, [showIframeOption, tabId, selectedTool?.name]);

  // Marquer l'interaction utilisateur quand il change de vue manuellement
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
    sessionStorage.setItem(`viewSwitcher-${tabId}-userInteracted`, 'true');
  };

  // Restaurer la vue mémorisée quand le tab devient actif
  useEffect(() => {
    const storedView = getStoredViewMode();
    // Seulement restaurer si l'iframe est disponible ou si la vue stockée est 'terminal'
    if (storedView === 'terminal' || (storedView === 'iframe' && showIframeOption)) {
      setViewMode(storedView);
    }
  }, [tabId, showIframeOption]);

  const handleFullscreen = useCallback(() => {
    if (!iframeRef.current) return;
    
    if (!isFullscreen) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Écouter les événements de plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Barre de navigation */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'
      }`}>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleViewModeChange('terminal')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'terminal'
                ? 'bg-blue-600 text-white shadow-sm'
                : theme === 'light'
                ? 'text-gray-600 hover:bg-gray-200'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <CommandLineIcon className="h-4 w-4" />
            <span>Terminal</span>
          </button>
          
          {showIframeOption && (
            <button
              onClick={() => handleViewModeChange('iframe')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'iframe'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : theme === 'light'
                  ? 'text-gray-600 hover:bg-gray-200'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              <span>Interface</span>
            </button>
          )}
        </div>

        {/* Indicateur de statut et contrôles */}
        {showIframeOption && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className={`text-xs ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Interface Ready
              </span>
            </div>
            
            {viewMode === 'iframe' && (
              <div className="flex items-center space-x-1">
                {/* Bouton refresh */}
                <button
                  onClick={refreshIframe}
                  className={`p-1.5 rounded border transition-all duration-200 ${
                    theme === 'light'
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                  }`}
                  title="Actualiser l'interface"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
                
                {/* Bouton plein écran */}
                <button
                  onClick={handleFullscreen}
                  className={`p-1.5 rounded border transition-all duration-200 ${
                    isFullscreen 
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-500' 
                      : theme === 'light'
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                  }`}
                  title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {isFullscreen ? (
                    <XMarkIcon className="h-4 w-4" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'terminal' ? (
          // Vue des terminaux
          <div className="h-full">
            {children}
          </div>
        ) : (
          // Vue de l'iframe
          showIframeOption && (
            <div className="w-full h-full">
              <iframe
                ref={iframeRef}
                src={`http://localhost:${getIframePort()}`}
                className="w-full h-full border-0"
                title={`${selectedTool?.name} Interface`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock"
                allow="fullscreen; microphone; camera; geolocation; autoplay"
                onLoad={() => {
                  console.log(`Iframe loaded for ${selectedTool?.name} on port ${getIframePort()}`);
                }}
                onError={(e) => {
                  console.error(`Iframe error for ${selectedTool?.name}:`, e);
                }}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};