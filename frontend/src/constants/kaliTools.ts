// Outils Kali Linux organisés par catégorie
export interface KaliTool {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  dockerImage?: string;
  command: (params: Record<string, any>) => string;
  parameters: Record<string, {
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    default?: any;
    required?: boolean;
    description?: string;
    options?: string[];
  }>;
  estimatedDuration: string;
  tags: string[];
}

export const KALI_TOOLS: KaliTool[] = [
  // Network Discovery & Scanning
  {
    id: 'nmap',
    name: 'nmap',
    displayName: 'Network Mapper (Nmap)',
    description: 'Network discovery and security auditing tool',
    category: 'network',
    difficulty: 'beginner',
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
        label: 'Target IP/Host',
        type: 'string',
        required: true,
        description: 'Target IP address or hostname'
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
    difficulty: 'intermediate',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const target = params.target || '127.0.0.1';
      const ports = params.ports || '80,443';
      const rate = params.rate || '1000';
      
      return `docker run --rm kalilinux/kali-rolling masscan ${target} -p${ports} --rate=${rate}`;
    },
    parameters: {
      target: {
        label: 'Target Range',
        type: 'string',
        required: true,
        description: 'IP range (e.g., 192.168.1.0/24)'
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

  {
    id: 'zmap',
    name: 'zmap',
    displayName: 'ZMap Internet Scanner',
    description: 'Fast single-port network scanner',
    category: 'network',
    difficulty: 'advanced',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const port = params.port || '80';
      const target = params.target || '0.0.0.0/0';
      
      return `docker run --rm --privileged kalilinux/kali-rolling zmap -p ${port} ${target}`;
    },
    parameters: {
      port: {
        label: 'Target Port',
        type: 'number',
        default: 80,
        required: true,
        description: 'Port to scan'
      },
      target: {
        label: 'Target Range',
        type: 'string',
        default: '192.168.1.0/24',
        description: 'CIDR notation target range'
      }
    },
    estimatedDuration: '5-30 minutes',
    tags: ['internet-scan', 'fast-scan', 'single-port']
  },

  // Web Application Testing
  {
    id: 'sqlmap',
    name: 'sqlmap',
    displayName: 'SQL Injection Tool',
    description: 'Automatic SQL injection and database takeover tool',
    category: 'web',
    difficulty: 'intermediate',
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
    difficulty: 'beginner',
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
        label: 'Target Host',
        type: 'string',
        required: true,
        description: 'Target hostname or IP'
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
    difficulty: 'beginner',
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
    difficulty: 'beginner',
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

  {
    id: 'wpscan',
    name: 'wpscan',
    displayName: 'WordPress Security Scanner',
    description: 'WordPress vulnerability scanner',
    category: 'web',
    difficulty: 'intermediate',
    dockerImage: 'wpscanteam/wpscan',
    command: (params) => {
      const url = params.url || 'http://example.com';
      
      let cmd = `docker run --rm wpscanteam/wpscan --url ${url}`;
      if (params.enumerate) cmd += ` --enumerate ${params.enumerate}`;
      if (params.plugins) cmd += ' --plugins-detection aggressive';
      if (params.themes) cmd += ' --themes-detection aggressive';
      return cmd;
    },
    parameters: {
      url: {
        label: 'WordPress URL',
        type: 'string',
        required: true,
        description: 'Target WordPress site URL'
      },
      enumerate: {
        label: 'Enumerate',
        type: 'select',
        options: ['p', 't', 'u', 'vp', 'ap', 'at', 'cb', 'dbe'],
        description: 'What to enumerate (p=plugins, t=themes, u=users)'
      },
      plugins: {
        label: 'Aggressive Plugin Detection',
        type: 'boolean',
        default: false
      },
      themes: {
        label: 'Aggressive Theme Detection',
        type: 'boolean',
        default: false
      }
    },
    estimatedDuration: '10-30 minutes',
    tags: ['wordpress', 'cms', 'vulnerability', 'web']
  },

  // Wireless Testing
  {
    id: 'aircrack-ng',
    name: 'aircrack-ng',
    displayName: 'WiFi Security Auditing Suite',
    description: 'Complete suite for WiFi network security assessment',
    category: 'wireless',
    difficulty: 'advanced',
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

  {
    id: 'reaver',
    name: 'reaver',
    displayName: 'Reaver WPS Cracker',
    description: 'Brute force attack against WiFi Protected Setup',
    category: 'wireless',
    difficulty: 'advanced',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const interface_name = params['interface'] || 'wlan0mon';
      const bssid = params.bssid || '00:00:00:00:00:00';
      
      let cmd = `docker run --rm --privileged --net=host kalilinux/kali-rolling reaver -i ${interface_name} -b ${bssid}`;
      if (params.delay) cmd += ` -d ${params.delay}`;
      if (params.verbose) cmd += ' -vv';
      return cmd;
    },
    parameters: {
      'interface': {
        label: 'Monitor Interface',
        type: 'string',
        default: 'wlan0mon',
        required: true,
        description: 'Monitor mode interface'
      },
      bssid: {
        label: 'Target BSSID',
        type: 'string',
        required: true,
        description: 'Target access point BSSID'
      },
      delay: {
        label: 'Delay (seconds)',
        type: 'number',
        default: 1,
        description: 'Delay between pin attempts'
      },
      verbose: {
        label: 'Verbose Output',
        type: 'boolean',
        default: false
      }
    },
    estimatedDuration: '30-240 minutes',
    tags: ['wps', 'brute-force', 'wireless', 'wifi']
  },

  // Exploitation Tools
  {
    id: 'metasploit',
    name: 'metasploit',
    displayName: 'Metasploit Framework',
    description: 'Advanced penetration testing platform',
    category: 'exploitation',
    difficulty: 'advanced',
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

  {
    id: 'searchsploit',
    name: 'searchsploit',
    displayName: 'Exploit Database Search',
    description: 'Search tool for Exploit Database',
    category: 'exploitation',
    difficulty: 'beginner',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const search_term = params.search_term || 'apache';
      
      let cmd = `docker run --rm kalilinux/kali-rolling searchsploit "${search_term}"`;
      if (params.exact) cmd += ' --exact';
      if (params.json) cmd += ' --json';
      return cmd;
    },
    parameters: {
      search_term: {
        label: 'Search Term',
        type: 'string',
        required: true,
        description: 'Software/service to search exploits for'
      },
      exact: {
        label: 'Exact Match',
        type: 'boolean',
        default: false,
        description: 'Perform exact match search'
      },
      json: {
        label: 'JSON Output',
        type: 'boolean',
        default: false,
        description: 'Output results in JSON format'
      }
    },
    estimatedDuration: '1-5 minutes',
    tags: ['exploit-db', 'search', 'vulnerability']
  },

  // Password Attacks
  {
    id: 'hydra',
    name: 'hydra',
    displayName: 'THC Hydra',
    description: 'Fast network logon cracker',
    category: 'password',
    difficulty: 'intermediate',
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
        type: 'string',
        required: true,
        description: 'Target IP or hostname'
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
    difficulty: 'intermediate',
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

  {
    id: 'hashcat',
    name: 'hashcat',
    displayName: 'Hashcat Advanced Password Recovery',
    description: 'Advanced password recovery tool using GPU acceleration',
    category: 'password',
    difficulty: 'advanced',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const hashfile = params.hashfile || 'hashes.txt';
      const wordlist = params.wordlist || '/usr/share/wordlists/rockyou.txt';
      const attack_mode = params.attack_mode || '0';
      const hash_type = params.hash_type || '0';
      
      return `docker run --rm --gpus all kalilinux/kali-rolling hashcat -m ${hash_type} -a ${attack_mode} ${hashfile} ${wordlist}`;
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
      attack_mode: {
        label: 'Attack Mode',
        type: 'select',
        options: ['0', '1', '3', '6', '7'],
        default: '0',
        description: '0=Straight, 1=Combination, 3=Brute-force'
      },
      hash_type: {
        label: 'Hash Type',
        type: 'select',
        options: ['0', '100', '1000', '1400', '1700', '2500'],
        default: '0',
        description: 'Hash algorithm type'
      }
    },
    estimatedDuration: '30-480 minutes',
    tags: ['password', 'hash', 'gpu', 'advanced']
  },

  // Social Engineering
  {
    id: 'setoolkit',
    name: 'setoolkit',
    displayName: 'Social Engineering Toolkit',
    description: 'Framework for social engineering attacks',
    category: 'social',
    difficulty: 'advanced',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const attack = params.attack || 'phishing';
      
      if (attack === 'phishing') {
        return `docker run --rm -it kalilinux/kali-rolling setoolkit`;
      }
      return `docker run --rm -it kalilinux/kali-rolling setoolkit`;
    },
    parameters: {
      attack: {
        label: 'Attack Type',
        type: 'select',
        options: ['phishing', 'website-attack', 'infectious-media', 'create-payload'],
        default: 'phishing'
      }
    },
    estimatedDuration: '15-60 minutes',
    tags: ['social-engineering', 'phishing', 'payload']
  },

  {
    id: 'gophish',
    name: 'gophish',
    displayName: 'Gophish Phishing Framework',
    description: 'Open-source phishing toolkit',
    category: 'social',
    difficulty: 'intermediate',
    dockerImage: 'gophish/gophish',
    command: (params) => {
      const admin_port = params.admin_port || '3333';
      const phish_port = params.phish_port || '8080';
      
      return `docker run --rm -p ${admin_port}:3333 -p ${phish_port}:80 gophish/gophish`;
    },
    parameters: {
      admin_port: {
        label: 'Admin Port',
        type: 'number',
        default: 3333,
        description: 'Port for admin interface'
      },
      phish_port: {
        label: 'Phishing Port',
        type: 'number',
        default: 8080,
        description: 'Port for phishing pages'
      }
    },
    estimatedDuration: '30-120 minutes',
    tags: ['phishing', 'email', 'campaign']
  },

  // Forensics
  {
    id: 'volatility',
    name: 'volatility',
    displayName: 'Volatility Framework',
    description: 'Memory forensics framework',
    category: 'forensics',
    difficulty: 'advanced',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const dumpfile = params.dumpfile || 'memory.dump';
      const profile = params.profile || 'Win7SP1x64';
      const plugin = params.plugin || 'pslist';
      
      return `docker run --rm kalilinux/kali-rolling volatility -f ${dumpfile} --profile=${profile} ${plugin}`;
    },
    parameters: {
      dumpfile: {
        label: 'Memory Dump',
        type: 'string',
        required: true,
        description: 'Memory dump file to analyze'
      },
      profile: {
        label: 'OS Profile',
        type: 'select',
        options: ['Win7SP1x64', 'Win10x64', 'LinuxUbuntu1604x64'],
        default: 'Win7SP1x64'
      },
      plugin: {
        label: 'Plugin',
        type: 'select',
        options: ['pslist', 'pstree', 'cmdline', 'netscan', 'malfind', 'hivelist'],
        default: 'pslist'
      }
    },
    estimatedDuration: '5-30 minutes',
    tags: ['forensics', 'memory', 'analysis']
  },

  {
    id: 'autopsy',
    name: 'autopsy',
    displayName: 'Autopsy Digital Forensics',
    description: 'Digital forensics platform',
    category: 'forensics',
    difficulty: 'intermediate',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const case_dir = params.case_dir || '/cases';
      
      return `docker run --rm -p 9999:9999 -v ${case_dir}:/cases kalilinux/kali-rolling autopsy`;
    },
    parameters: {
      case_dir: {
        label: 'Case Directory',
        type: 'string',
        default: '/cases',
        description: 'Directory to store case files'
      }
    },
    estimatedDuration: '60-240 minutes',
    tags: ['forensics', 'disk-analysis', 'gui']
  },

  // Sniffing & Spoofing
  {
    id: 'ettercap',
    name: 'ettercap',
    displayName: 'Ettercap',
    description: 'Network sniffer/interceptor/logger for LANs',
    category: 'sniffing',
    difficulty: 'intermediate',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const interface_name = params['interface'] || 'eth0';
      const target1 = params.target1;
      const target2 = params.target2;
      
      let cmd = `docker run --rm --privileged --net=host kalilinux/kali-rolling ettercap -T -i ${interface_name}`;
      if (target1 && target2) {
        cmd += ` -M arp:remote /${target1}// /${target2}//`;
      }
      return cmd;
    },
    parameters: {
      'interface': {
        label: 'Interface',
        type: 'string',
        default: 'eth0',
        required: true
      },
      target1: {
        label: 'Target 1 IP',
        type: 'string',
        description: 'First target IP (gateway)'
      },
      target2: {
        label: 'Target 2 IP',
        type: 'string',
        description: 'Second target IP (victim)'
      }
    },
    estimatedDuration: '10-60 minutes',
    tags: ['mitm', 'arp-spoofing', 'sniffing']
  },

  {
    id: 'wireshark',
    name: 'wireshark',
    displayName: 'Wireshark Network Analyzer',
    description: 'Network protocol analyzer',
    category: 'sniffing',
    difficulty: 'beginner',
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
  },

  {
    id: 'tcpdump',
    name: 'tcpdump',
    displayName: 'TCPDump Packet Analyzer',
    description: 'Command-line packet analyzer',
    category: 'sniffing',
    difficulty: 'beginner',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const interface_name = params['interface'] || 'eth0';
      const filter = params.filter || '';
      const count = params.count || '100';
      
      let cmd = `docker run --rm --privileged --net=host kalilinux/kali-rolling tcpdump -i ${interface_name} -c ${count}`;
      if (filter) cmd += ` ${filter}`;
      return cmd;
    },
    parameters: {
      'interface': {
        label: 'Network Interface',
        type: 'string',
        default: 'eth0',
        required: true
      },
      filter: {
        label: 'Capture Filter',
        type: 'string',
        description: 'BPF filter expression (e.g., "port 80")'
      },
      count: {
        label: 'Packet Count',
        type: 'number',
        default: 100,
        description: 'Number of packets to capture'
      }
    },
    estimatedDuration: '1-30 minutes',
    tags: ['packet-capture', 'command-line', 'network']
  },

  // Reverse Engineering
  {
    id: 'radare2',
    name: 'radare2',
    displayName: 'Radare2 Reverse Engineering',
    description: 'Portable reversing framework',
    category: 'reverse',
    difficulty: 'expert',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const binary = params.binary || 'binary';
      const analysis = params.analysis || 'aa';
      
      return `docker run --rm -it -v /tmp:/tmp kalilinux/kali-rolling r2 -A -c "${analysis}" ${binary}`;
    },
    parameters: {
      binary: {
        label: 'Binary File',
        type: 'string',
        required: true,
        description: 'Path to binary file to analyze'
      },
      analysis: {
        label: 'Analysis Command',
        type: 'select',
        options: ['aa', 'aaa', 'aaaa'],
        default: 'aa',
        description: 'Level of analysis to perform'
      }
    },
    estimatedDuration: '30-180 minutes',
    tags: ['reverse-engineering', 'binary-analysis', 'disassembly']
  },

  // Post Exploitation
  {
    id: 'empire',
    name: 'empire',
    displayName: 'PowerShell Empire',
    description: 'Post-exploitation framework',
    category: 'post-exploitation',
    difficulty: 'advanced',
    dockerImage: 'kalilinux/kali-rolling',
    command: (params) => {
      const listener_port = params.listener_port || '8080';
      
      return `docker run --rm -it -p ${listener_port}:8080 kalilinux/kali-rolling empire`;
    },
    parameters: {
      listener_port: {
        label: 'Listener Port',
        type: 'number',
        default: 8080,
        description: 'Port for Empire listener'
      }
    },
    estimatedDuration: '30-120 minutes',
    tags: ['post-exploitation', 'powershell', 'persistence']
  }
];

// Fonction pour obtenir les outils par catégorie
export const getKaliToolsByCategory = (category?: string): KaliTool[] => {
  if (!category || category === 'all') {
    return KALI_TOOLS;
  }
  return KALI_TOOLS.filter(tool => tool.category === category);
};

// Fonction pour obtenir un outil par ID
export const getKaliToolById = (id: string): KaliTool | undefined => {
  return KALI_TOOLS.find(tool => tool.id === id);
};

// Catégories disponibles avec tous les outils Kali Linux
export const KALI_CATEGORIES = [
  { id: 'network', name: 'Network Analysis', count: KALI_TOOLS.filter(t => t.category === 'network').length },
  { id: 'web', name: 'Web Application', count: KALI_TOOLS.filter(t => t.category === 'web').length },
  { id: 'wireless', name: 'Wireless Attacks', count: KALI_TOOLS.filter(t => t.category === 'wireless').length },
  { id: 'exploitation', name: 'Exploitation Tools', count: KALI_TOOLS.filter(t => t.category === 'exploitation').length },
  { id: 'password', name: 'Password Attacks', count: KALI_TOOLS.filter(t => t.category === 'password').length },
  { id: 'social', name: 'Social Engineering', count: KALI_TOOLS.filter(t => t.category === 'social').length },
  { id: 'forensics', name: 'Digital Forensics', count: KALI_TOOLS.filter(t => t.category === 'forensics').length },
  { id: 'sniffing', name: 'Sniffing & Spoofing', count: KALI_TOOLS.filter(t => t.category === 'sniffing').length },
  { id: 'reverse', name: 'Reverse Engineering', count: KALI_TOOLS.filter(t => t.category === 'reverse').length },
  { id: 'post-exploitation', name: 'Post Exploitation', count: KALI_TOOLS.filter(t => t.category === 'post-exploitation').length }
]; 