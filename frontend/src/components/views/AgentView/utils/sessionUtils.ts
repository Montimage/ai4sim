import { PentestConfig } from '../types';

// Configuration des outils avec filtrage selon les paramètres
export const getBasePentestConfigs = (): PentestConfig[] => [
  { toolName: 'nmap', enabled: true, parameters: { scanType: 'syn', ports: '1-1000', timing: 'T4' } },
  { toolName: 'masscan', enabled: true, parameters: { ports: '80,443,22,21,25,53', rate: '1000' } },
  { toolName: 'nikto', enabled: true, parameters: { port: 80, ssl: false } },
  { toolName: 'gobuster', enabled: true, parameters: { wordlist: '/usr/share/wordlists/dirb/common.txt', extensions: 'php,html,txt', threads: 10 } },
  { toolName: 'sqlmap', enabled: true, parameters: { level: 1, risk: 1 } },
  { toolName: 'shennina', enabled: true, parameters: { mode: 'scan-only', target: '' } }, // AI4SIM
  { toolName: 'gan-fuzzer', enabled: true, parameters: { mode: 'web', threads: 10 } } // AI4SIM
];

// Fonction pour adapter les outils selon le type de cible
export const getAdaptedTools = (target: string, baseConfigs: PentestConfig[]): PentestConfig[] => {
  const isWebTarget = target.includes('http') || target.includes('www') || 
                     target.includes('.com') || target.includes('.org') || 
                     target.includes('.net') || target.includes('.io');
  
  return baseConfigs.map(config => {
    let adaptedConfig = { ...config };
    
    // Adapter les paramètres selon le type de cible
    if (config.toolName === 'shennina') {
      adaptedConfig.parameters = {
        ...config.parameters,
        target: target,
        mode: isWebTarget ? 'web' : 'network'
      };
    }
    
    if (config.toolName === 'gan-fuzzer') {
      adaptedConfig.parameters = {
        ...config.parameters,
        target: target,
        mode: isWebTarget ? 'web' : 'api',
        threads: isWebTarget ? 15 : 10
      };
    }
    
    if (config.toolName === 'nikto') {
      adaptedConfig.parameters = {
        ...config.parameters,
        port: isWebTarget ? 443 : 80,
        ssl: isWebTarget
      };
    }
    
    if (config.toolName === 'gobuster') {
      adaptedConfig.parameters = {
        ...config.parameters,
        url: isWebTarget ? `https://${target}` : `http://${target}`
      };
    }
    
    return adaptedConfig;
  });
};

export const getToolDescription = (tool: string): string => {
  const descriptions: Record<string, string> = {
    nmap: 'Scan de ports et découverte de services',
    masscan: 'Scan rapide de ports',
    nikto: 'Scanner de vulnérabilités web',
    gobuster: 'Bruteforce de répertoires web',
    sqlmap: 'Test d\'intrusion SQL',
    shennina: 'IA de pentest automatisé (AI4SIM)',
    'gan-fuzzer': 'Fuzzing IA de vulnérabilités (AI4SIM)'
  };
  return descriptions[tool] || 'Outil de pentesting';
};
