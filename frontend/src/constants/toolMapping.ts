// Mapping des IDs techniques vers les noms d'affichage
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Fuzzing tools existants
  '5greplay': 'GAN-Based Fuzzer',
  'gan-fuzzer': 'GAN-Based Fuzzer',
  'aiknxfuzzer': 'AI-Based KNX Fuzzer',
  'ai-knx-fuzzer': 'AI-Based KNX Fuzzer',
  
  // Kali Linux Network tools
  'nmap': 'Network Mapper (Nmap)',
  'masscan': 'Mass IP Port Scanner',
  'zmap': 'ZMap Internet Scanner',
  
  // Kali Linux Web tools
  'sqlmap': 'SQL Injection Tool',
  'nikto': 'Web Vulnerability Scanner',
  'dirb': 'Directory Brute Forcer',
  'gobuster': 'Gobuster Directory Scanner',
  'wpscan': 'WordPress Security Scanner',
  
  // Kali Linux Wireless tools
  'aircrack-ng': 'WiFi Security Auditing Suite',
  'reaver': 'Reaver WPS Cracker',
  
  // Kali Linux Exploitation tools
  'metasploit': 'Metasploit Framework',
  'searchsploit': 'Exploit Database Search',
  
  // Kali Linux Password tools
  'hydra': 'THC Hydra',
  'john': 'John the Ripper',
  'hashcat': 'Hashcat Advanced Password Recovery',
  
  // Kali Linux Social Engineering tools
  'setoolkit': 'Social Engineering Toolkit',
  'gophish': 'Gophish Phishing Framework',
  
  // Kali Linux Forensics tools
  'volatility': 'Volatility Framework',
  'autopsy': 'Autopsy Digital Forensics',
  
  // Kali Linux Sniffing tools
  'ettercap': 'Ettercap',
  'wireshark': 'Wireshark Network Analyzer',
  'tcpdump': 'TCPDump Packet Analyzer',
  
  // Kali Linux Reverse Engineering tools
  'radare2': 'Radare2 Reverse Engineering',
  
  // Kali Linux Post Exploitation tools
  'empire': 'PowerShell Empire',
  
  // Framework tools
  'maip': 'MAIP Framework',
  'caldera': 'Caldera Framework',
  'shennina': 'Shennina AI Pentest Framework',
  
  // Default fallback
  'unknown': 'Unknown Tool'
};

// Mapping des IDs d'attaques vers les noms d'affichage
export const ATTACK_DISPLAY_NAMES: Record<string, string> = {
  // GAN Fuzzer attacks
  'gan-fuzzer-default': 'Standard GAN Fuzzing',
  'gan-fuzzer-enhanced': 'Enhanced GAN Fuzzing',
  'gan-fuzzer-targeted': 'Protocol-Specific GAN Fuzzing',
  
  // KNX Fuzzer attacks
  'ai-knx-fuzzer-basic': 'Basic KNX Fuzzing',
  'ai-knx-fuzzer-advanced': 'Advanced KNX Fuzzing',
  
  // Network attacks
  'nmap': 'Network Port Scan',
  'masscan': 'High-Speed Port Scan',
  'zmap': 'Internet-Scale Port Scan',
  
  // Web attacks
  'sqlmap': 'SQL Injection Test',
  'nikto': 'Web Vulnerability Scan',
  'dirb': 'Directory Brute Force',
  'gobuster': 'Fast Directory Scan',
  'wpscan': 'WordPress Security Scan',
  
  // Wireless attacks
  'aircrack-ng': 'WiFi Security Assessment',
  'reaver': 'WPS PIN Attack',
  
  // Exploitation attacks
  'metasploit': 'Penetration Testing',
  'searchsploit': 'Exploit Database Search',
  
  // Password attacks
  'hydra': 'Network Login Brute Force',
  'john': 'Password Hash Cracking',
  'hashcat': 'Advanced Password Recovery',
  
  // Social Engineering attacks
  'setoolkit': 'Social Engineering Attack',
  'gophish': 'Phishing Campaign',
  
  // Forensics attacks
  'volatility': 'Memory Forensics Analysis',
  'autopsy': 'Digital Forensics Investigation',
  
  // Sniffing attacks
  'ettercap': 'Network Interception',
  'wireshark': 'Network Protocol Analysis',
  'tcpdump': 'Packet Capture',
  
  // Reverse Engineering attacks
  'radare2': 'Binary Analysis',
  
  // Post Exploitation attacks
  'empire': 'Post-Exploitation Framework',
  
  // Framework attacks
  'maip': 'MAIP Simulation',
  'caldera': 'Caldera Red Team Exercise',
  'shennina-full-assessment': 'Shennina Full AI Assessment',
  'shennina-training': 'Shennina AI Training Mode',
  'shennina-scan-only': 'Shennina Service Scan',
  
  // Default fallback
  'unknown': 'Unknown Attack'
};

// Fonction utilitaire pour obtenir le nom d'affichage d'un outil
export const getToolDisplayName = (toolId: string): string => {
  return TOOL_DISPLAY_NAMES[toolId] || toolId;
};

// Fonction utilitaire pour obtenir le nom d'affichage d'une attaque
export const getAttackDisplayName = (attackId: string): string => {
  return ATTACK_DISPLAY_NAMES[attackId] || attackId;
};

// Fonction pour obtenir le nom d'affichage basé sur les paramètres d'attaque
export const getAttackDisplayNameFromParams = (tool: string, attackId?: string, parameters?: Record<string, any>): string => {
  // Priorité 1: Utiliser l'attackId si disponible
  if (attackId && ATTACK_DISPLAY_NAMES[attackId]) {
    return ATTACK_DISPLAY_NAMES[attackId];
  }
  
  // Priorité 2: Déduire du tool et des paramètres
  if (tool === '5greplay' || tool === 'gan-fuzzer') {
    if (parameters?.['mutation-rate']) {
      return 'Enhanced GAN Fuzzing';
    } else if (parameters?.protocol) {
      return 'Protocol-Specific GAN Fuzzing';
    } else {
      return 'Standard GAN Fuzzing';
    }
  }
  
  if (tool === 'aiknxfuzzer' || tool === 'ai-knx-fuzzer') {
    if (parameters?.model && parameters?.iterations) {
      return 'Advanced KNX Fuzzing';
    } else {
      return 'Basic KNX Fuzzing';
    }
  }
  
  // Priorité 3: Utiliser le nom de l'outil
  return getToolDisplayName(tool);
}; 