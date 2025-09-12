interface SecuritySettings {
  wazuhEnabled: boolean;
  securityReportsEnabled: boolean;
  whitelistEnabled: boolean;
  whitelistedIPs: string[];
  whitelistedDomains: string[];
}

class SecuritySettingsService {
  private static instance: SecuritySettingsService;
  private readonly STORAGE_KEY = 'securitySettings';
  
  private defaultSettings: SecuritySettings = {
    wazuhEnabled: true,
    securityReportsEnabled: true,
    whitelistEnabled: false, // Désactivé par défaut pour les tests
    whitelistedIPs: [
      '192.168.1.1',
      '192.168.1.10',
      '192.168.1.100',
      '10.0.0.1',
      '10.0.0.10',
      '172.16.0.1',
      '172.16.0.10'
    ],
    whitelistedDomains: [
      'testphp.vulnweb.com',
      'demo.testfire.net',
      'dvwa.local',
      'metasploitable.local',
      'vulnweb.com',
      'hackthebox.eu',
      'tryhackme.com'
    ]
  };

  private constructor() {}

  public static getInstance(): SecuritySettingsService {
    if (!SecuritySettingsService.instance) {
      SecuritySettingsService.instance = new SecuritySettingsService();
    }
    return SecuritySettingsService.instance;
  }

  public getSettings(): SecuritySettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return { ...this.defaultSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
    return this.defaultSettings;
  }

  public saveSettings(settings: SecuritySettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  }

  public isWazuhEnabled(): boolean {
    return this.getSettings().wazuhEnabled;
  }

  public areSecurityReportsEnabled(): boolean {
    return this.getSettings().securityReportsEnabled;
  }

  public isWhitelistEnabled(): boolean {
    return this.getSettings().whitelistEnabled;
  }

  public getWhitelistedIPs(): string[] {
    return this.getSettings().whitelistedIPs;
  }

  public getWhitelistedDomains(): string[] {
    return this.getSettings().whitelistedDomains;
  }

  public addWhitelistedIP(ip: string): void {
    const settings = this.getSettings();
    if (!settings.whitelistedIPs.includes(ip)) {
      settings.whitelistedIPs.push(ip);
      this.saveSettings(settings);
    }
  }

  public removeWhitelistedIP(ip: string): void {
    const settings = this.getSettings();
    settings.whitelistedIPs = settings.whitelistedIPs.filter(ipAddr => ipAddr !== ip);
    this.saveSettings(settings);
  }

  public addWhitelistedDomain(domain: string): void {
    const settings = this.getSettings();
    if (!settings.whitelistedDomains.includes(domain)) {
      settings.whitelistedDomains.push(domain);
      this.saveSettings(settings);
    }
  }

  public removeWhitelistedDomain(domain: string): void {
    const settings = this.getSettings();
    settings.whitelistedDomains = settings.whitelistedDomains.filter(dom => dom !== domain);
    this.saveSettings(settings);
  }

  public updateSetting(key: keyof SecuritySettings, value: boolean | string[]): void {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    this.saveSettings(updatedSettings);
  }

  // Validation d'une cible selon les paramètres de whitelist
  public isTargetAllowed(target: string): boolean {
    const settings = this.getSettings();
    
    // Si la whitelist est désactivée, tout est autorisé
    if (!settings.whitelistEnabled) {
      return true;
    }

    // Vérifier si c'est une IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipRegex.test(target)) {
      return settings.whitelistedIPs.includes(target);
    }

    // Vérifier si c'est un domaine
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (domainRegex.test(target)) {
      return settings.whitelistedDomains.some(domain => 
        target.toLowerCase().includes(domain.toLowerCase())
      );
    }

    // Vérifier les plages d'IP privées par défaut
    const privateRanges = [
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^169\.254\./, // Lien local
      /^fc00:/, // IPv6 Unique Local
      /^fd[0-9a-f]{2}:/ // IPv6 Unique Local
    ];

    return privateRanges.some(range => range.test(target));
  }
}

export const securitySettingsService = SecuritySettingsService.getInstance();
export type { SecuritySettings }; 