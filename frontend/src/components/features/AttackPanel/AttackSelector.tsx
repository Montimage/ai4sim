import React from 'react';
import { useAttackStore } from '../../../store/attackStore';
import { TOOLS } from '../../../constants/tools';
import { useThemeStore } from '../../../store/themeStore';

interface AttackSelectorProps {
  tabId: string;
}

export const AttackSelector: React.FC<AttackSelectorProps> = ({ tabId }) => {
  const theme = useThemeStore(state => state.theme);
  const tabState = useAttackStore(state => state.getTabState(tabId));
  const updateTabState = useAttackStore(state => state.updateTabState);

  // Si aucun outil n'est sélectionné, on ne peut pas choisir d'attaque
  if (!tabState?.selectedTool) {
    return null;
  }

  const selectedTool = TOOLS.find(tool => tool.id === tabState.selectedTool);
  
  // Si l'outil n'a pas d'attaques définies ou une seule attaque, pas besoin du sélecteur
  if (!selectedTool?.attacks || selectedTool.attacks.length <= 1) {
    return null;
  }

  const handleAttackSelect = (attackId: string) => {
    // On vérifie que l'attaque existe bien
    const attack = selectedTool.attacks.find(a => a.id === attackId);
    if (!attack) return;

    // On récupère les paramètres par défaut de cette attaque
    const defaultParams: Record<string, any> = {};
    if (attack.parameters) {
      Object.entries(attack.parameters).forEach(([key, param]) => {
        defaultParams[key] = param.default !== undefined ? param.default : '';
      });
    }

    // On met à jour l'état avec la nouvelle attaque sélectionnée et ses paramètres par défaut
    updateTabState(tabId, {
      selectedAttack: attackId,
      parameters: defaultParams,
      customCommand: undefined // On réinitialise la commande personnalisée
    });
  };

  return (
    <div className={`mb-6 ${
      theme === 'light' 
        ? 'bg-white' 
        : 'bg-gray-900/40'
    }`}>
      <div className={`px-4 py-3 border-b ${
        theme === 'light' 
          ? 'border-gray-200 text-gray-800' 
          : 'border-gray-700/50 text-gray-200'
      }`}>
        <h3 className="font-medium">Types d'attaques disponibles</h3>
      </div>
      <div className={`divide-y ${
        theme === 'light' 
          ? 'divide-gray-200' 
          : 'divide-gray-700/50'
      }`}>
        {selectedTool.attacks.map((attack) => {
          const isSelected = tabState.selectedAttack === attack.id;
          
          return (
            <button
              key={attack.id}
              onClick={() => handleAttackSelect(attack.id)}
              className={`w-full text-left p-4 transition-colors ${
                isSelected 
                  ? theme === 'light'
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'bg-indigo-700/20 text-indigo-200'
                  : theme === 'light'
                    ? 'hover:bg-gray-50 text-gray-800'
                    : 'hover:bg-gray-800/30 text-gray-200'
              }`}
            >
              <div className="flex flex-col gap-1">
                <h4 className="font-medium">{attack.name}</h4>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                  {attack.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
