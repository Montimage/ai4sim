import { ExecutionRecord } from './executionHistoryService';

interface WazuhAlert {
  id: string;
  timestamp: string;
  rule: {
    id: number;
    level: number;
    description: string;
    groups: string[];
  };
  agent: {
    id: string;
    name: string;
    ip: string;
  };
  data: {
    srcip?: string;
    dstip?: string;
    srcport?: string;
    dstport?: string;
    protocol?: string;
    action?: string;
  };
  full_log: string;
  decoder: {
    name: string;
  };
  location: string;
}

interface WazuhSecurityMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  topRules: Array<{
    ruleId: number;
    description: string;
    count: number;
    level: number;
  }>;
  attackPatterns: Array<{
    pattern: string;
    count: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;
  networkActivity: Array<{
    sourceIp: string;
    destinationIp: string;
    protocol: string;
    count: number;
    suspicious: boolean;
  }>;
  timelineData: Array<{
    timestamp: string;
    alertCount: number;
    criticalCount: number;
  }>;
  serviceAvailable: boolean;
  errorMessage?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'testing';
  lastUpdate?: Date;
}

interface WazuhConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

class WazuhService {
  private config: WazuhConfig;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;
  private connectionStatus: 'connected' | 'disconnected' | 'error' | 'testing' = 'disconnected';
  private lastConnectionAttempt: number = 0;
  private retryCount = 0;

  constructor() {
    // Load configuration from localStorage if available
    const savedConfig = this.loadConfigFromStorage();
    
    this.config = {
      baseUrl: savedConfig?.baseUrl || import.meta.env.VITE_WAZUH_API_URL || 'https://localhost:55000',
      username: savedConfig?.username || import.meta.env.VITE_WAZUH_USERNAME || 'wazuh',
      password: import.meta.env.VITE_WAZUH_PASSWORD || 'wazuh', // Don't load password from localStorage
      timeout: savedConfig?.timeout || 10000,
      retryAttempts: savedConfig?.retryAttempts || 3,
      retryDelay: 2000
    };

    console.log('Wazuh Service initialized with config:', {
      baseUrl: this.config.baseUrl,
      username: this.config.username,
      timeout: this.config.timeout
    });
  }

  // Load configuration from localStorage
  private loadConfigFromStorage(): Partial<WazuhConfig> | null {
    try {
      const saved = localStorage.getItem('wazuh-config');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load Wazuh config from storage:', error);
      return null;
    }
  }

  // Save configuration to localStorage
  private saveConfigToStorage(): void {
    try {
      const configToSave = {
        baseUrl: this.config.baseUrl,
        username: this.config.username,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts
        // Don't save password for security
      };
      localStorage.setItem('wazuh-config', JSON.stringify(configToSave));
    } catch (error) {
      console.warn('Failed to save Wazuh config to storage:', error);
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<WazuhConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.resetConnection();
    this.saveConfigToStorage();
    console.log('Wazuh configuration updated:', {
      baseUrl: this.config.baseUrl,
      username: this.config.username,
      timeout: this.config.timeout
    });
  }

  // Reset connection state
  private resetConnection(): void {
    this.authToken = null;
    this.tokenExpiry = 0;
    this.connectionStatus = 'disconnected';
    this.retryCount = 0;
  }

  // Get current connection status
  getConnectionStatus(): { status: string; lastAttempt?: Date; config: WazuhConfig } {
    return {
      status: this.connectionStatus,
      lastAttempt: this.lastConnectionAttempt ? new Date(this.lastConnectionAttempt) : undefined,
      config: { ...this.config, password: '***' } // Hide password
    };
  }

  // Test connection with detailed feedback
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    this.connectionStatus = 'testing';
    console.log('Testing Wazuh connection...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // First, test basic connectivity to the root endpoint
      const response = await fetch(`${this.config.baseUrl}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Try authentication if basic connectivity works
      const authResult = await this.authenticate();
      
      this.connectionStatus = 'connected';
      return {
        success: true,
        message: 'Successfully connected to Wazuh API',
        details: {
          url: this.config.baseUrl,
          status: response.status,
          token: authResult ? 'Valid' : 'Invalid',
          headers: Object.fromEntries(response.headers.entries())
        }
      };

    } catch (error) {
      this.connectionStatus = 'error';
      let message = 'Connection failed';
      let details: any = { 
        url: this.config.baseUrl,
        timeout: this.config.timeout,
        timestamp: new Date().toISOString()
      };

      if (error instanceof Error) {
        details.errorName = error.name;
        details.errorMessage = error.message;

        if (error.name === 'AbortError') {
          message = `Connection timeout after ${this.config.timeout}ms`;
          details.suggestion = 'Try increasing the timeout value or check if Wazuh is responding slowly';
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
          message = 'Connection refused - Wazuh service is not running';
          details.suggestion = 'Ensure Wazuh is installed and running on the specified URL';
          details.troubleshooting = [
            'Check if Wazuh manager is running: systemctl status wazuh-manager',
            'Verify the API is enabled: systemctl status wazuh-api',
            'Check if the port 55000 is open and accessible',
            'Verify firewall settings'
          ];
        } else if (error.message.includes('ERR_CERT_AUTHORITY_INVALID') || error.message.includes('ERR_CERT_COMMON_NAME_INVALID')) {
          message = 'SSL certificate error - Invalid or self-signed certificate';
          details.suggestion = 'Accept the SSL certificate in your browser or configure Wazuh with a valid certificate';
          details.troubleshooting = [
            `Visit ${this.config.baseUrl} in your browser and accept the certificate`,
            'Configure Wazuh with a valid SSL certificate',
            'Use HTTP instead of HTTPS for testing (not recommended for production)'
          ];
        } else if (error.message.includes('ERR_NETWORK_ACCESS_DENIED') || error.message.includes('CORS')) {
          message = 'CORS or network access denied';
          details.suggestion = 'Configure CORS settings in Wazuh API or use a proxy';
          details.troubleshooting = [
            'Configure Wazuh API CORS settings in /var/ossec/api/configuration/api.yaml',
            'Add your domain to the allowed origins',
            'Restart Wazuh API after configuration changes'
          ];
        } else if (error.message.includes('Failed to fetch')) {
          message = 'Network error - Unable to reach Wazuh server';
          details.suggestion = 'Check network connectivity and URL configuration';
          details.troubleshooting = [
            'Verify the Wazuh URL is correct',
            'Check network connectivity to the Wazuh server',
            'Ensure no proxy or firewall is blocking the connection',
            'Try accessing the URL directly in your browser'
          ];
        } else {
          message = `Unexpected error: ${error.message}`;
        }
      }

      console.error('Wazuh connection test failed:', error);
      return { success: false, message, details };
    }
  }

  // Authenticate with retry logic
  private async authenticate(): Promise<string | null> {
    this.lastConnectionAttempt = Date.now();

    // Check if we have a valid token
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`Wazuh authentication attempt ${attempt}/${this.config.retryAttempts}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/security/user/authenticate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            user: this.config.username,
            password: this.config.password,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Authentication failed: HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.data?.token) {
          throw new Error('No authentication token received');
        }

        this.authToken = data.data.token;
        this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
        this.connectionStatus = 'connected';
        this.retryCount = 0;

        console.log('Wazuh authentication successful');
        return this.authToken;

      } catch (error) {
        console.error(`Wazuh authentication attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retryAttempts) {
          console.log(`Retrying in ${this.config.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    this.connectionStatus = 'error';
    this.retryCount++;
    return null;
  }

  // Get alerts for a specific time range
  async getAlertsForExecution(execution: ExecutionRecord): Promise<WazuhAlert[]> {
    try {
      console.log('Fetching Wazuh alerts for execution:', execution.id);
      
      const token = await this.authenticate();
      if (!token) {
        console.warn('Cannot fetch alerts: authentication failed');
        return [];
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(`${this.config.baseUrl}/security/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch alerts: HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const alerts = data.data?.affected_items || [];
      
      console.log(`Fetched ${alerts.length} alerts from Wazuh for execution ${execution.id}`);
      return alerts;
      
    } catch (error) {
      console.error('Failed to fetch Wazuh alerts:', error);
      return [];
    }
  }

  // Generate security metrics from alerts
  async getSecurityMetrics(execution: ExecutionRecord): Promise<WazuhSecurityMetrics> {
    const startTime = Date.now();
    
    try {
      // Test connection first
      if (this.connectionStatus !== 'connected') {
        const testResult = await this.testConnection();
        if (!testResult.success) {
          return this.createEmptyMetrics(testResult.message);
        }
      }

      const alerts = await this.getAlertsForExecution(execution);
      
      if (alerts.length === 0) {
        return {
          totalAlerts: 0,
          criticalAlerts: 0,
          highAlerts: 0,
          mediumAlerts: 0,
          lowAlerts: 0,
          topRules: [],
          attackPatterns: [],
          networkActivity: [],
          timelineData: [],
          serviceAvailable: true,
          connectionStatus: this.connectionStatus,
          lastUpdate: new Date()
        };
      }

      // Process alerts to generate metrics
      const totalAlerts = alerts.length;
      const criticalAlerts = alerts.filter(alert => alert.rule.level >= 12).length;
      const highAlerts = alerts.filter(alert => alert.rule.level >= 8 && alert.rule.level < 12).length;
      const mediumAlerts = alerts.filter(alert => alert.rule.level >= 5 && alert.rule.level < 8).length;
      const lowAlerts = alerts.filter(alert => alert.rule.level < 5).length;

      const processingTime = Date.now() - startTime;
      console.log(`Processed ${totalAlerts} Wazuh alerts in ${processingTime}ms`);

      return {
        totalAlerts,
        criticalAlerts,
        highAlerts,
        mediumAlerts,
        lowAlerts,
        topRules: this.getTopRules(alerts),
        attackPatterns: this.getAttackPatterns(alerts),
        networkActivity: this.getNetworkActivity(alerts),
        timelineData: this.getTimelineData(alerts),
        serviceAvailable: true,
        connectionStatus: this.connectionStatus,
        lastUpdate: new Date()
      };
      
    } catch (error) {
      console.error('Failed to generate Wazuh security metrics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createEmptyMetrics(errorMessage);
    }
  }

  // Create empty metrics with error information
  private createEmptyMetrics(errorMessage: string): WazuhSecurityMetrics {
    return {
      totalAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0,
      topRules: [],
      attackPatterns: [],
      networkActivity: [],
      timelineData: [],
      serviceAvailable: false,
      connectionStatus: this.connectionStatus,
      errorMessage,
      lastUpdate: new Date()
    };
  }

  // Get system information
  async getSystemInfo(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const token = await this.authenticate();
      if (!token) {
        return { success: false, error: 'Authentication failed' };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // Get agents information
  async getAgents(): Promise<{ success: boolean; agents?: any[]; error?: string }> {
    try {
      const token = await this.authenticate();
      if (!token) {
        return { success: false, error: 'Authentication failed' };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/agents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, agents: data.data?.affected_items || [] };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private getTopRules(alerts: WazuhAlert[]): Array<{ruleId: number, description: string, count: number, level: number}> {
    const ruleMap = new Map();
    
    alerts.forEach(alert => {
      const key = alert.rule.id;
      if (ruleMap.has(key)) {
        ruleMap.get(key).count++;
      } else {
        ruleMap.set(key, {
          ruleId: alert.rule.id,
          description: alert.rule.description,
          count: 1,
          level: alert.rule.level
        });
      }
    });

    return Array.from(ruleMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getAttackPatterns(alerts: WazuhAlert[]): Array<{pattern: string, count: number, severity: 'critical' | 'high' | 'medium' | 'low'}> {
    const patternMap = new Map();
    
    alerts.forEach(alert => {
      const pattern = alert.rule.groups.join(', ') || 'Unknown';
      const severity = this.getSeverityFromLevel(alert.rule.level);
      
      if (patternMap.has(pattern)) {
        patternMap.get(pattern).count++;
      } else {
        patternMap.set(pattern, {
          pattern,
          count: 1,
          severity
        });
      }
    });

    return Array.from(patternMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getNetworkActivity(alerts: WazuhAlert[]): Array<{sourceIp: string, destinationIp: string, protocol: string, count: number, suspicious: boolean}> {
    const activityMap = new Map();
    
    alerts.forEach(alert => {
      const key = `${alert.data.srcip || 'unknown'}-${alert.data.dstip || 'unknown'}-${alert.data.protocol || 'unknown'}`;
      const suspicious = alert.rule.level >= 8;
      
      if (activityMap.has(key)) {
        activityMap.get(key).count++;
        activityMap.get(key).suspicious = activityMap.get(key).suspicious || suspicious;
      } else {
        activityMap.set(key, {
          sourceIp: alert.data.srcip || 'unknown',
          destinationIp: alert.data.dstip || 'unknown',
          protocol: alert.data.protocol || 'unknown',
          count: 1,
          suspicious
        });
      }
    });

    return Array.from(activityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private getTimelineData(alerts: WazuhAlert[]): Array<{timestamp: string, alertCount: number, criticalCount: number}> {
    const timelineMap = new Map();
    
    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      const isCritical = alert.rule.level >= 12;
      
      if (timelineMap.has(hour)) {
        timelineMap.get(hour).alertCount++;
        if (isCritical) timelineMap.get(hour).criticalCount++;
      } else {
        timelineMap.set(hour, {
          timestamp: hour,
          alertCount: 1,
          criticalCount: isCritical ? 1 : 0
        });
      }
    });

    return Array.from(timelineMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private getSeverityFromLevel(level: number): 'critical' | 'high' | 'medium' | 'low' {
    if (level >= 12) return 'critical';
    if (level >= 8) return 'high';
    if (level >= 5) return 'medium';
    return 'low';
  }
}

export const wazuhService = new WazuhService();
export type { WazuhAlert, WazuhSecurityMetrics }; 