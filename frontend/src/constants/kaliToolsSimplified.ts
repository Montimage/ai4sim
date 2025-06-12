// Outils Kali Linux simplifiés basés sur la liste fournie
export interface KaliToolSimplified {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  dockerImage?: string;
  command: (params: Record<string, any>) => string;
  parameters: Record<string, {
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'target';
    default?: any;
    required?: boolean;
    description?: string;
    options?: string[];
  }>;
  estimatedDuration: string;
  tags: string[];
}

export const KALI_TOOLS_SIMPLIFIED: KaliToolSimplified[] = [
  // Network Discovery & Scanning
  {
    id: 'nmap',
    name: 'nmap',
    displayName: 'Network Mapper (Nmap)',
    description: 'Network discovery and security auditing tool',
    category: 'network',
    dockerImage: 'instrumentisto/nmap',
    command: (params) => {
      const target = params.target || '127.0.0.1';
      const scanType = params['scan-type'] || 'syn';
      const ports = params.ports || '1-1000';
      const timing = params.timing || 'T3';
      
      let cmd = `docker run --rm instrumentisto/nmap -${scanType === 'syn' ? 'sS' : scanType === 'tcp' ? 'sT' : 'sU'} -p ${ports} -${timing}`;
      if (params.verbose) cmd += ' -v';
      if (params['os-detection']) cmd += ' -O';
      if (params['service-detection']) cmd += ' -sV';
      cmd += ` ${target}`;
      return cmd;
    },
    parameters: {
      target: {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'Target from scenario targets'
      },
      'scan-type': {
        label: 'Scan Type',
        type: 'select',
        options: ['syn', 'tcp', 'udp'],
        default: 'syn',
        description: 'Type of port scan'
      },
      ports: {
        label: 'Port Range',
        type: 'string',
        default: '1-1000',
        description: 'Port range to scan (e.g., 1-1000, 80,443)'
      },
      timing: {
        label: 'Timing Template',
        type: 'select',
        options: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'],
        default: 'T3',
        description: 'Scan timing (T0=paranoid, T5=insane)'
      },
      verbose: {
        label: 'Verbose Output',
        type: 'boolean',
        default: false
      },
      'os-detection': {
        label: 'OS Detection',
        type: 'boolean',
        default: false
      },
      'service-detection': {
        label: 'Service Detection',
        type: 'boolean',
        default: false
      }
    },
    estimatedDuration: '2-10 minutes',
    tags: ['port-scan', 'discovery', 'reconnaissance']
  },

  {
    id: 'masscan',
    name: 'masscan',
    displayName: 'Mass IP Port Scanner',
    description: 'High-speed port scanner',
    category: 'network',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const target = params.target || '127.0.0.1';
      const ports = params.ports || '80,443';
      const rate = params.rate || '1000';
      return `docker run --rm kalilinux/kali-rolling masscan ${target} -p${ports} --rate=${rate}`;
    },
    parameters: {
      target: {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'Target from scenario targets'
      },
      ports: {
        label: 'Ports',
        type: 'string',
        default: '80,443',
        description: 'Ports to scan'
      },
      rate: {
        label: 'Scan Rate',
        type: 'number',
        default: 1000,
        description: 'Packets per second'
      }
    },
    estimatedDuration: '1-5 minutes',
    tags: ['port-scan', 'fast-scan', 'reconnaissance']
  },

  // Web Application Testing
  {
    id: 'sqlmap',
    name: 'sqlmap',
    displayName: 'SQL Injection Tool',
    description: 'Automatic SQL injection and database takeover tool',
    category: 'web',
    dockerImage: 'paoloo/sqlmap',
    command: (params) => {
      const url = params.url || 'http://example.com';
      const level = params.level || '1';
      const risk = params.risk || '1';
      
      let cmd = `docker run --rm paoloo/sqlmap -u "${url}" --level=${level} --risk=${risk}`;
      if (params.dbs) cmd += ' --dbs';
      if (params.tables) cmd += ' --tables';
      if (params.dump) cmd += ' --dump';
      if (params.batch) cmd += ' --batch';
      return cmd;
    },
    parameters: {
      url: {
        label: 'Target URL',
        type: 'string',
        required: true,
        description: 'Target URL with parameter'
      },
      level: {
        label: 'Test Level',
        type: 'select',
        options: ['1', '2', '3', '4', '5'],
        default: '1',
        description: 'Level of tests (1-5)'
      },
      risk: {
        label: 'Risk Level',
        type: 'select',
        options: ['1', '2', '3'],
        default: '1',
        description: 'Risk of tests (1-3)'
      },
      dbs: {
        label: 'Enumerate Databases',
        type: 'boolean',
        default: false
      },
      tables: {
        label: 'Enumerate Tables',
        type: 'boolean',
        default: false
      },
      dump: {
        label: 'Dump Data',
        type: 'boolean',
        default: false
      },
      batch: {
        label: 'Batch Mode',
        type: 'boolean',
        default: true,
        description: 'Never ask for user input'
      }
    },
    estimatedDuration: '10-60 minutes',
    tags: ['sql-injection', 'web-security', 'database']
  },

  {
    id: 'nikto',
    name: 'nikto',
    displayName: 'Web Vulnerability Scanner',
    description: 'Web server scanner for vulnerabilities',
    category: 'web',
    dockerImage: 'frapsoft/nikto',
    command: (params) => {
      const host = params.host || 'http://example.com';
      const port = params.port || '80';
      
      let cmd = `docker run --rm frapsoft/nikto -h ${host}`;
      if (port !== '80') cmd += ` -p ${port}`;
      if (params.ssl) cmd += ' -ssl';
      if (params.evasion) cmd += ` -evasion ${params.evasion}`;
      return cmd;
    },
    parameters: {
      host: {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'Target from scenario targets'
      },
      port: {
        label: 'Port',
        type: 'number',
        default: 80,
        description: 'Target port'
      },
      ssl: {
        label: 'Use SSL',
        type: 'boolean',
        default: false
      },
      evasion: {
        label: 'Evasion Technique',
        type: 'select',
        options: ['1', '2', '3', '4', '5', '6', '7', '8'],
        description: 'IDS evasion technique'
      }
    },
    estimatedDuration: '5-15 minutes',
    tags: ['web-scan', 'vulnerability', 'cgi']
  },

  {
    id: 'dirb',
    name: 'dirb',
    displayName: 'Directory Brute Forcer',
    description: 'Web content scanner for hidden directories',
    category: 'web',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const url = params.url || 'http://example.com';
      const wordlist = params.wordlist || '/usr/share/dirb/wordlists/common.txt';
      
      let cmd = `docker run --rm kalilinux/kali-rolling dirb ${url}`;
      if (params.wordlist) cmd += ` ${wordlist}`;
      if (params.extensions) cmd += ` -X ${params.extensions}`;
      return cmd;
    },
    parameters: {
      url: {
        label: 'Target URL',
        type: 'string',
        required: true,
        description: 'Target URL to scan'
      },
      wordlist: {
        label: 'Wordlist',
        type: 'select',
        options: [
          '/usr/share/dirb/wordlists/common.txt',
          '/usr/share/dirb/wordlists/big.txt',
          '/usr/share/dirb/wordlists/small.txt'
        ],
        default: '/usr/share/dirb/wordlists/common.txt'
      },
      extensions: {
        label: 'File Extensions',
        type: 'string',
        description: 'Extensions to append (e.g., .php,.html)'
      }
    },
    estimatedDuration: '5-30 minutes',
    tags: ['directory-scan', 'brute-force', 'web']
  },

  {
    id: 'gobuster',
    name: 'gobuster',
    displayName: 'Gobuster Directory Scanner',
    description: 'Fast directory/file brute forcer written in Go',
    category: 'web',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const url = params.url || 'http://example.com';
      const wordlist = params.wordlist || '/usr/share/wordlists/dirb/common.txt';
      const threads = params.threads || '10';
      
      let cmd = `docker run --rm kalilinux/kali-rolling gobuster dir -u ${url} -w ${wordlist} -t ${threads}`;
      if (params.extensions) cmd += ` -x ${params.extensions}`;
      return cmd;
    },
    parameters: {
      url: {
        label: 'Target URL',
        type: 'string',
        required: true,
        description: 'Target URL to scan'
      },
      wordlist: {
        label: 'Wordlist',
        type: 'select',
        options: [
          '/usr/share/wordlists/dirb/common.txt',
          '/usr/share/wordlists/dirb/big.txt',
          '/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt'
        ],
        default: '/usr/share/wordlists/dirb/common.txt'
      },
      threads: {
        label: 'Threads',
        type: 'number',
        default: 10,
        description: 'Number of concurrent threads'
      },
      extensions: {
        label: 'File Extensions',
        type: 'string',
        description: 'Extensions to search for (e.g., php,html,txt)'
      }
    },
    estimatedDuration: '5-20 minutes',
    tags: ['directory-scan', 'brute-force', 'web', 'fast']
  },

  // Password Attacks
  {
    id: 'hydra',
    name: 'hydra',
    displayName: 'THC Hydra',
    description: 'Fast network logon cracker',
    category: 'password',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const target = params.target || '127.0.0.1';
      const service = params.service || 'ssh';
      const username = params.username || 'admin';
      const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
      
      let cmd = `docker run --rm kalilinux/kali-rolling hydra -l ${username} -P ${wordlist}`;
      if (params.threads) cmd += ` -t ${params.threads}`;
      cmd += ` ${target} ${service}`;
      return cmd;
    },
    parameters: {
      target: {
        label: 'Target',
        type: 'target',
        required: true,
        description: 'Target from scenario targets'
      },
      service: {
        label: 'Service',
        type: 'select',
        options: ['ssh', 'ftp', 'telnet', 'http-get', 'http-post-form', 'mysql', 'postgres'],
        default: 'ssh',
        required: true
      },
      username: {
        label: 'Username',
        type: 'string',
        default: 'admin',
        required: true
      },
      wordlist: {
        label: 'Password Wordlist',
        type: 'string',
        default: '/usr/share/wordlists/rockyou.txt'
      },
      threads: {
        label: 'Threads',
        type: 'number',
        default: 16,
        description: 'Number of parallel connections'
      }
    },
    estimatedDuration: '10-120 minutes',
    tags: ['brute-force', 'password', 'login']
  },

  {
    id: 'john',
    name: 'john',
    displayName: 'John the Ripper',
    description: 'Password cracking tool',
    category: 'password',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const hashfile = params.hashfile || 'hashes.txt';
      const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
      const format = params.format;
      
      let cmd = `docker run --rm kalilinux/kali-rolling john`;
      if (wordlist) cmd += ` --wordlist=${wordlist}`;
      if (format) cmd += ` --format=${format}`;
      cmd += ` ${hashfile}`;
      return cmd;
    },
    parameters: {
      hashfile: {
        label: 'Hash File',
        type: 'string',
        required: true,
        description: 'File containing password hashes'
      },
      wordlist: {
        label: 'Wordlist',
        type: 'string',
        default: '/usr/share/wordlists/rockyou.txt'
      },
      format: {
        label: 'Hash Format',
        type: 'select',
        options: ['md5', 'sha1', 'sha256', 'sha512', 'ntlm', 'lm'],
        description: 'Hash format (auto-detect if not specified)'
      }
    },
    estimatedDuration: '30-240 minutes',
    tags: ['password', 'hash', 'crack']
  },

  // Wireless Testing
  {
    id: 'aircrack-ng',
    name: 'aircrack-ng',
    displayName: 'WiFi Security Auditing Suite',
    description: 'Complete suite for WiFi network security assessment',
    category: 'wireless',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const mode = params.mode || 'monitor';
      const interface_name = params['interface'] || 'wlan0';
      
      if (mode === 'monitor') {
        return `docker run --rm --privileged --net=host kalilinux/kali-rolling airmon-ng start ${interface_name}`;
      } else if (mode === 'scan') {
        return `docker run --rm --privileged --net=host kalilinux/kali-rolling airodump-ng ${interface_name}`;
      } else if (mode === 'crack') {
        const capfile = params.capfile || 'capture.cap';
        const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
        return `docker run --rm --privileged kalilinux/kali-rolling aircrack-ng -w ${wordlist} ${capfile}`;
      }
      return `docker run --rm --privileged --net=host kalilinux/kali-rolling aircrack-ng --help`;
    },
    parameters: {
      mode: {
        label: 'Mode',
        type: 'select',
        options: ['monitor', 'scan', 'crack'],
        default: 'monitor',
        required: true
      },
      'interface': {
        label: 'Interface',
        type: 'string',
        default: 'wlan0',
        description: 'Wireless interface'
      },
      capfile: {
        label: 'Capture File',
        type: 'string',
        description: 'Capture file for cracking mode'
      },
      wordlist: {
        label: 'Wordlist',
        type: 'string',
        default: '/usr/share/wordlists/rockyou.txt',
        description: 'Wordlist for password cracking'
      }
    },
    estimatedDuration: '15-120 minutes',
    tags: ['wifi', 'wireless', 'wpa', 'wep', 'monitor']
  },

  // Exploitation Tools
  {
    id: 'metasploit',
    name: 'metasploit',
    displayName: 'Metasploit Framework',
    description: 'Advanced penetration testing platform',
    category: 'exploitation',
    dockerImage: 'metasploitframework/metasploit-framework',
    command: (params) => {
      const module = params.module || 'exploit/multi/handler';
      const payload = params.payload || 'windows/meterpreter/reverse_tcp';
      const lhost = params.lhost || '127.0.0.1';
      const lport = params.lport || '4444';
      
      return `docker run --rm -it metasploitframework/metasploit-framework msfconsole -x "use ${module}; set PAYLOAD ${payload}; set LHOST ${lhost}; set LPORT ${lport}; exploit"`;
    },
    parameters: {
      module: {
        label: 'Module',
        type: 'string',
        default: 'exploit/multi/handler',
        required: true,
        description: 'Metasploit module to use'
      },
      payload: {
        label: 'Payload',
        type: 'string',
        default: 'windows/meterpreter/reverse_tcp',
        description: 'Payload to use'
      },
      lhost: {
        label: 'Local Host',
        type: 'string',
        default: '127.0.0.1',
        description: 'Local IP for reverse connection'
      },
      lport: {
        label: 'Local Port',
        type: 'number',
        default: 4444,
        description: 'Local port for reverse connection'
      }
    },
    estimatedDuration: '5-30 minutes',
    tags: ['exploitation', 'payload', 'post-exploitation']
  },

  // Network Analysis
  {
    id: 'wireshark',
    name: 'wireshark',
    displayName: 'Wireshark Network Analyzer',
    description: 'Network protocol analyzer',
    category: 'network',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const interface_name = params['interface'] || 'eth0';
      const capture_file = params.capture_file;
      
      if (capture_file) {
        return `docker run --rm -v /tmp:/tmp kalilinux/kali-rolling tshark -r ${capture_file}`;
      } else {
        return `docker run --rm --privileged --net=host kalilinux/kali-rolling tshark -i ${interface_name}`;
      }
    },
    parameters: {
      'interface': {
        label: 'Network Interface',
        type: 'string',
        default: 'eth0',
        description: 'Network interface to capture from'
      },
      capture_file: {
        label: 'Capture File',
        type: 'string',
        description: 'Existing capture file to analyze'
      }
    },
    estimatedDuration: '5-60 minutes',
    tags: ['packet-analysis', 'network', 'protocol']
  }
];

// Catégories Kali Linux simplifiées
export const KALI_CATEGORIES_SIMPLIFIED = [
  { 
    id: 'all', 
    name: 'ALL', 
    count: KALI_TOOLS_SIMPLIFIED.length,
    description: 'All Kali Linux tools'
  },
  { 
    id: 'network', 
    name: 'Network Analysis', 
    count: KALI_TOOLS_SIMPLIFIED.filter(t => t.category === 'network').length,
    description: 'Network discovery and analysis tools'
  },
  { 
    id: 'web', 
    name: 'Web Application', 
    count: KALI_TOOLS_SIMPLIFIED.filter(t => t.category === 'web').length,
    description: 'Web application security testing'
  },
  { 
    id: 'password', 
    name: 'Password Attacks', 
    count: KALI_TOOLS_SIMPLIFIED.filter(t => t.category === 'password').length,
    description: 'Password cracking and brute force'
  },
  { 
    id: 'wireless', 
    name: 'Wireless Attacks', 
    count: KALI_TOOLS_SIMPLIFIED.filter(t => t.category === 'wireless').length,
    description: 'Wireless network security testing'
  },
  { 
    id: 'exploitation', 
    name: 'Exploitation Tools', 
    count: KALI_TOOLS_SIMPLIFIED.filter(t => t.category === 'exploitation').length,
    description: 'Exploitation and payload tools'
  }
];

// Fonction pour obtenir les outils par catégorie
export const getKaliToolsSimplifiedByCategory = (category?: string): KaliToolSimplified[] => {
  if (!category || category === 'all') {
    return KALI_TOOLS_SIMPLIFIED;
  }
  return KALI_TOOLS_SIMPLIFIED.filter(tool => tool.category === category);
};

// Fonction pour obtenir un outil par ID
export const getKaliToolSimplifiedById = (id: string): KaliToolSimplified | undefined => {
  return KALI_TOOLS_SIMPLIFIED.find(tool => tool.id === id);
}; 