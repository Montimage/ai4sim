import { TOOLS } from './tools';
import type { AttackTool, AttackVariant, ToolParameter } from '../types/attackTool';

// Types pour les outils d'attaque 
export type { AttackTool, AttackVariant, ToolParameter };

// Filtrer les outils pour n'avoir que ceux qui peuvent être utilisés comme attaques
// (exclure les outils avec iframe qui sont des applications standalone)
export const ATTACK_TOOLS: AttackTool[] = TOOLS
  .filter(tool => !('iframe' in tool) || tool.id === 'shennina')
  .map(tool => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.type,
    parameters: tool.attacks?.[0]?.parameters || {},
    attacks: (tool.attacks || []) as AttackVariant[]
  }));
