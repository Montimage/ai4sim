import { useEffect } from 'react';
import { useAttackStore } from '../store/attackStore';

/**
 * Hook personnalisé pour gérer la persistance des outputs d'un onglet
 * Ce hook s'assure que les outputs sont automatiquement restaurés
 * lors du changement d'onglet.
 */
export const useTabOutputPersistence = (tabId: string) => {
  const { restoreOutputFromCache, tabStates } = useAttackStore();

  useEffect(() => {
    // S'assurer que les outputs sont restaurés lorsque l'onglet devient actif
    const tabState = tabStates[tabId];
    if (tabState) {
      const hasOutput = tabState.output && tabState.output.length > 0;
      const hasCache = tabState.outputCache && tabState.outputCache.length > 0;
      const hasPersistent = tabState.persistentOutput && tabState.persistentOutput.length > 0;

      // Si l'onglet n'a pas d'output mais a du cache ou des données persistantes, restaurer
      if (!hasOutput && (hasCache || hasPersistent)) {
        console.log(`[TabOutputPersistence] Restoring outputs for tab ${tabId}:`, {
          hasOutput,
          hasCache,
          hasPersistent,
          cacheLength: tabState.outputCache?.length || 0,
          persistentLength: tabState.persistentOutput?.length || 0,
          outputLength: tabState.output?.length || 0
        });
        restoreOutputFromCache(tabId);
      } else {
        console.log(`[TabOutputPersistence] No restoration needed for tab ${tabId}:`, {
          hasOutput,
          hasCache,
          hasPersistent,
          outputLength: tabState.output?.length || 0
        });
      }
    }
  }, [tabId, restoreOutputFromCache, tabStates]);

  // Retourner les méthodes utiles pour ce tab
  return {
    restore: () => restoreOutputFromCache(tabId),
    tabState: tabStates[tabId]
  };
};
