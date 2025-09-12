// Fonction pour détecter l'IP locale
export const getLocalIP = (): string => {
  // Fallback vers une IP locale commune
  return '192.168.1.176';
};

// Fonction pour extraire la cible avec détection automatique d'IP locale
export const extractTarget = (prompt: string): string => {
  const lowerPrompt = prompt.toLowerCase();
  
  // Détecter les demandes de test sur soi-même
  if (lowerPrompt.includes('attaque moi') || 
      lowerPrompt.includes('test moi') || 
      lowerPrompt.includes('test de m\'attaquer') ||
      lowerPrompt.includes('test moi même') ||
      lowerPrompt.includes('attaque moi même')) {
    return getLocalIP();
  }
  
  // Extraction d'IP existante
  const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?\b/g;
  const ips = prompt.match(ipPattern);
  if (ips && ips.length > 0) {
    return ips[0];
  }
  
  // Extraction de domaine
  const domainPattern = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
  const domains = prompt.match(domainPattern);
  if (domains && domains.length > 0) {
    return domains[0];
  }
  
  return '';
};
