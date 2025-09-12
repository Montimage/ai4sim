interface PentestingTool {
  name: string;
  category: string;
  difficulty: string;
  status: string;
}

export const PENTESTING_TOOLS: { [key: string]: PentestingTool } = {
  // Network scanning tools
  nmap: { name: 'Nmap', category: 'network', difficulty: 'beginner', status: 'stable' },
  masscan: { name: 'Masscan', category: 'network', difficulty: 'intermediate', status: 'stable' },
  netcat: { name: 'Netcat', category: 'network', difficulty: 'beginner', status: 'stable' },
  telnet: { name: 'Telnet', category: 'network', difficulty: 'beginner', status: 'stable' },

  // Web application tools
  dirb: { name: 'DirB', category: 'web', difficulty: 'beginner', status: 'stable' },
  gobuster: { name: 'Gobuster', category: 'web', difficulty: 'intermediate', status: 'stable' },
  nikto: { name: 'Nikto', category: 'web', difficulty: 'beginner', status: 'stable' },
  burpsuite: { name: 'Burp Suite', category: 'web', difficulty: 'advanced', status: 'beta' },
  sqlmap: { name: 'SQLMap', category: 'web', difficulty: 'intermediate', status: 'stable' },
  owasp_zap: { name: 'OWASP ZAP', category: 'web', difficulty: 'intermediate', status: 'stable' },

  // Wireless security tools
  aircrack: { name: 'Aircrack-ng', category: 'wireless', difficulty: 'advanced', status: 'stable' },
  kismet: { name: 'Kismet', category: 'wireless', difficulty: 'advanced', status: 'beta' },

  // Exploitation tools
  metasploit: { name: 'Metasploit', category: 'exploitation', difficulty: 'advanced', status: 'stable' },
  searchsploit: { name: 'SearchSploit', category: 'exploitation', difficulty: 'intermediate', status: 'stable' },

  // Password cracking tools
  john: { name: 'John the Ripper', category: 'password', difficulty: 'intermediate', status: 'stable' },
  hashcat: { name: 'Hashcat', category: 'password', difficulty: 'advanced', status: 'stable' },
  hydra: { name: 'Hydra', category: 'password', difficulty: 'intermediate', status: 'stable' },

  // Social engineering tools
  setoolkit: { name: 'SET', category: 'social', difficulty: 'intermediate', status: 'stable' },

  // Digital forensics tools
  autopsy: { name: 'Autopsy', category: 'forensics', difficulty: 'advanced', status: 'stable' },
  volatility: { name: 'Volatility', category: 'forensics', difficulty: 'advanced', status: 'stable' },

  // Network sniffing tools
  wireshark: { name: 'Wireshark', category: 'sniffing', difficulty: 'intermediate', status: 'stable' },
  ettercap: { name: 'Ettercap', category: 'sniffing', difficulty: 'advanced', status: 'stable' },
  tcpdump: { name: 'TCPDump', category: 'sniffing', difficulty: 'intermediate', status: 'stable' },

  // Reverse engineering tools
  radare2: { name: 'Radare2', category: 'reverse', difficulty: 'advanced', status: 'stable' },
  ghidra: { name: 'Ghidra', category: 'reverse', difficulty: 'advanced', status: 'beta' },

  // Post-exploitation tools
  empire: { name: 'Empire', category: 'post_exploitation', difficulty: 'advanced', status: 'alpha' }
};

/**
 * Obtient le nom d'affichage d'un outil de pentesting
 */
export function getToolDisplayName(toolName: string): string {
  const tool = PENTESTING_TOOLS[toolName.toLowerCase()];
  return tool ? tool.name : toolName;
}

/**
 * Obtient le nom d'affichage d'une attaque basé sur ses paramètres
 */
export function getAttackDisplayNameFromParams(
  toolName: string
): string {
  // Short display names for known attacks/tools
  const shortNames: Record<string, string> = {
    shennina: 'Shennina Scan',
    gan_fuzzer: 'GAN Fuzzing',
    nmap: 'Nmap Scan',
    sqlmap: 'SQL Injection Test',
    burpsuite: 'Burp Suite Scan',
    masscan: 'Masscan Scan',
    dirb: 'DirB Scan',
    gobuster: 'Gobuster Scan',
    nikto: 'Nikto Scan',
    owasp_zap: 'OWASP ZAP Scan',
    aircrack: 'Aircrack-ng Test',
    metasploit: 'Metasploit Exploit',
    hydra: 'Hydra Crack',
    john: 'John Crack',
    hashcat: 'Hashcat Crack',
    empire: 'Empire Post-Exploitation',
    setoolkit: 'SET Social Engineering',
    autopsy: 'Autopsy Forensics',
    volatility: 'Volatility Forensics',
    wireshark: 'Wireshark Capture',
    ettercap: 'Ettercap Sniff',
    tcpdump: 'TCPDump Capture',
    radare2: 'Radare2 Reverse',
    ghidra: 'Ghidra Reverse',
    netcat: 'Netcat Test',
    telnet: 'Telnet Test',
    searchsploit: 'SearchSploit',
    kismet: 'Kismet Wireless',
  };

  // Accept both snake_case and kebab-case for tool names
  const normalizedKey = toolName.replace(/-/g, '_').toLowerCase();
  if (shortNames[normalizedKey]) {
    return shortNames[normalizedKey];
  }
  // Fallback: Capitalize tool name for display
  return getToolDisplayName(toolName.charAt(0).toUpperCase() + toolName.slice(1));
} 