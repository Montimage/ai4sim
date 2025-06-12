interface SecuritySettings {
  wazuhEnabled: boolean;
  securityReportsEnabled: boolean;
}

class SecuritySettingsService {
  private static instance: SecuritySettingsService;
  private readonly STORAGE_KEY = 'securitySettings';
  
  private defaultSettings: SecuritySettings = {
    wazuhEnabled: true,
    securityReportsEnabled: true
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

  public updateSetting(key: keyof SecuritySettings, value: boolean): void {
    const currentSettings = this.getSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    this.saveSettings(updatedSettings);
  }
}

export const securitySettingsService = SecuritySettingsService.getInstance();
export type { SecuritySettings }; 