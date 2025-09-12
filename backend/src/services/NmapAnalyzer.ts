export interface NmapResult {
  target: string;
  openPorts: Array<{
    port: number;
    service: string;
    version?: string;
    state: string;
  }>;
  totalPortsScanned: number;
  hostUp: boolean;
  scanDuration: number;
}

export interface VulnerabilityFinding {
  id: string;
  vulnerability: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service: string;
  port: number;
  description: string;
  impact: string;
  evidence: string[];
  fix: string;
  cve?: string;
  cwe?: string;
  references?: string[];
  latestSolutions?: string[];
}

export class NmapAnalyzer {
  static parseNmapOutput(output: string): NmapResult {
    const lines = output.split('\n');
    const result: NmapResult = {
      target: '',
      openPorts: [],
      totalPortsScanned: 0,
      hostUp: false,
      scanDuration: 0
    };

    for (const line of lines) {
      // Extraire la cible
      if (line.includes('Nmap scan report for')) {
        const match = line.match(/Nmap scan report for (.+)/);
        if (match) result.target = match[1];
      }

      // Vérifier si l'hôte est up
      if (line.includes('Host is up')) {
        result.hostUp = true;
      }

      // Extraire les ports ouverts
      if (line.includes('/tcp open')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const portMatch = parts[0].match(/(\d+)\/tcp/);
          if (portMatch) {
            result.openPorts.push({
              port: parseInt(portMatch[1]),
              service: parts[2],
              version: parts[3] || undefined,
              state: 'open'
            });
          }
        }
      }

      // Extraire la durée du scan
      if (line.includes('scanned in')) {
        const match = line.match(/scanned in ([\d.]+) seconds/);
        if (match) {
          result.scanDuration = parseFloat(match[1]);
        }
      }

      // Extraire le nombre de ports scannés
      if (line.includes('filtered tcp ports')) {
        const match = line.match(/Not shown: (\d+) filtered tcp ports/);
        if (match) {
          result.totalPortsScanned = parseInt(match[1]) + result.openPorts.length;
        }
      }
    }

    return result;
  }

  static analyzeVulnerabilities(nmapResult: NmapResult): VulnerabilityFinding[] {
    const findings: VulnerabilityFinding[] = [];

    for (const port of nmapResult.openPorts) {
      // Analyser chaque port ouvert
      const finding = this.analyzePort(port);
      if (finding) {
        findings.push(finding);
      }
    }

    return findings;
  }

  private static analyzePort(port: { port: number; service: string; version?: string; state: string }): VulnerabilityFinding | null {
    const { port: portNum, service, version } = port;

    // Analyser HTTP/HTTPS
    if (service.toLowerCase() === 'http' || service.toLowerCase() === 'https') {
      return {
        id: `http-${portNum}`,
        vulnerability: 'Serveur web exposé',
        severity: 'medium',
        service: service.toUpperCase(),
        port: portNum,
        description: `Serveur web ${service} exposé sur le port ${portNum}${version ? ` (${version})` : ''}. Ce service est accessible publiquement et peut être ciblé par des attaques.`,
        impact: 'Exposition d\'application web, risque d\'attaque par injection, XSS, ou autres vulnérabilités web',
        evidence: [`Port ${portNum}/tcp ouvert`, `Service: ${service}${version ? ` ${version}` : ''}`],
        fix: `1. Configurer un firewall pour restreindre l'accès\n2. Implémenter HTTPS avec certificat SSL/TLS\n3. Configurer un WAF (Web Application Firewall)\n4. Mettre à jour ${service} vers la dernière version\n5. Commandes iptables: iptables -A INPUT -p tcp --dport ${portNum} -s trusted_ips -j ACCEPT`,
        cve: version ? this.getCVEForService(service, version) : undefined,
        cwe: 'CWE-200', // Information Exposure
        references: [
          'https://owasp.org/www-project-top-ten/',
          'https://nginx.org/en/security_advisories.html'
        ],
        latestSolutions: [
          'Utiliser un reverse proxy avec authentification',
          'Implémenter une authentification multi-facteurs',
          'Configurer des règles de sécurité strictes'
        ]
      };
    }

    // Analyser SSH
    if (service.toLowerCase() === 'ssh') {
      return {
        id: `ssh-${portNum}`,
        vulnerability: 'Service SSH exposé',
        severity: 'high',
        service: 'SSH',
        port: portNum,
        description: `Service SSH exposé sur le port ${portNum}${version ? ` (${version})` : ''}. SSH peut être ciblé par des attaques par force brute.`,
        impact: 'Accès non autorisé au système, compromission des comptes utilisateurs',
        evidence: [`Port ${portNum}/tcp ouvert`, `Service: SSH${version ? ` ${version}` : ''}`],
        fix: `1. Changer le port SSH par défaut (22)\n2. Désactiver l'authentification par mot de passe\n3. Utiliser uniquement des clés SSH\n4. Configurer fail2ban\n5. Commande: iptables -A INPUT -p tcp --dport ${portNum} -s trusted_ips -j ACCEPT`,
        cve: version ? this.getCVEForService('ssh', version) : undefined,
        cwe: 'CWE-287', // Improper Authentication
        references: [
          'https://www.openssh.com/security.html',
          'https://fail2ban.org/'
        ],
        latestSolutions: [
          'Utiliser des clés SSH avec passphrase',
          'Configurer une authentification à deux facteurs',
          'Limiter les tentatives de connexion'
        ]
      };
    }

    // Analyser FTP
    if (service.toLowerCase() === 'ftp') {
      return {
        id: `ftp-${portNum}`,
        vulnerability: 'Service FTP non sécurisé',
        severity: 'high',
        service: 'FTP',
        port: portNum,
        description: `Service FTP exposé sur le port ${portNum}${version ? ` (${version})` : ''}. FTP transmet les données en clair.`,
        impact: 'Interception des données, vol d\'informations sensibles',
        evidence: [`Port ${portNum}/tcp ouvert`, `Service: FTP${version ? ` ${version}` : ''}`],
        fix: `1. Remplacer FTP par SFTP ou FTPS\n2. Configurer un VPN pour l'accès distant\n3. Restreindre l'accès par IP\n4. Commande: iptables -A INPUT -p tcp --dport ${portNum} -j DROP`,
        cve: version ? this.getCVEForService('ftp', version) : undefined,
        cwe: 'CWE-319', // Cleartext Transmission of Sensitive Information
        references: [
          'https://tools.ietf.org/html/rfc2228',
          'https://www.openssh.com/'
        ],
        latestSolutions: [
          'Migrer vers SFTP avec OpenSSH',
          'Utiliser FTPS avec certificats SSL',
          'Implémenter un tunnel VPN'
        ]
      };
    }

    // Analyser MySQL
    if (service.toLowerCase() === 'mysql') {
      return {
        id: `mysql-${portNum}`,
        vulnerability: 'Base de données MySQL exposée',
        severity: 'critical',
        service: 'MySQL',
        port: portNum,
        description: `Base de données MySQL exposée sur le port ${portNum}${version ? ` (${version})` : ''}. Accès direct à la base de données.`,
        impact: 'Accès non autorisé aux données, exfiltration de données sensibles',
        evidence: [`Port ${portNum}/tcp ouvert`, `Service: MySQL${version ? ` ${version}` : ''}`],
        fix: `1. Restreindre l'accès par IP\n2. Configurer l'authentification forte\n3. Utiliser un tunnel SSH\n4. Commande: iptables -A INPUT -p tcp --dport ${portNum} -s db_servers -j ACCEPT`,
        cve: version ? this.getCVEForService('mysql', version) : undefined,
        cwe: 'CWE-200', // Information Exposure
        references: [
          'https://dev.mysql.com/doc/refman/8.0/en/security.html',
          'https://owasp.org/www-project-top-ten/'
        ],
        latestSolutions: [
          'Utiliser un tunnel SSH pour l\'accès distant',
          'Configurer une authentification à deux facteurs',
          'Implémenter un proxy de base de données'
        ]
      };
    }

    // Port générique ouvert
    return {
      id: `port-${portNum}`,
      vulnerability: `Port ${portNum} ouvert`,
      severity: 'medium',
      service: service.toUpperCase(),
      port: portNum,
      description: `Port ${portNum} ouvert avec le service ${service}${version ? ` (${version})` : ''}. Service potentiellement exposé.`,
      impact: 'Exposition de service, risque d\'attaque selon le service',
      evidence: [`Port ${portNum}/tcp ouvert`, `Service: ${service}${version ? ` ${version}` : ''}`],
      fix: `1. Vérifier si le service est nécessaire\n2. Restreindre l'accès par IP\n3. Configurer un firewall\n4. Commande: iptables -A INPUT -p tcp --dport ${portNum} -s trusted_ips -j ACCEPT`,
      cve: version ? this.getCVEForService(service, version) : undefined,
      cwe: 'CWE-200', // Information Exposure
      references: [
        'https://nmap.org/',
        'https://cve.mitre.org/'
      ],
      latestSolutions: [
        'Auditer la nécessité du service',
        'Implémenter un monitoring de sécurité',
        'Configurer des alertes de sécurité'
      ]
    };
  }

  private static getCVEForService(service: string, version: string): string | undefined {
    // Mapping simplifié des CVE connus
    const cveMap: Record<string, Record<string, string>> = {
      'nginx': {
        '1.19.0': 'CVE-2021-23017',
        '1.18.0': 'CVE-2021-23017'
      },
      'ssh': {
        '8.2p1': 'CVE-2021-28041',
        '8.1p1': 'CVE-2020-15778'
      },
      'mysql': {
        '8.0.26': 'CVE-2021-2154',
        '5.7.34': 'CVE-2021-2154'
      }
    };

    return cveMap[service.toLowerCase()]?.[version];
  }
} 