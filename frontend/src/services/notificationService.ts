import { useNotificationStore, createNotification, NotificationCategory } from '../store/notificationStore';

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Méthodes de base
  success(title: string, message: string, options?: { 
    category?: NotificationCategory; 
    actionUrl?: string; 
    persistent?: boolean;
    metadata?: Record<string, any>;
  }) {
    useNotificationStore.getState().addNotification(
      createNotification.success(title, message, {
        category: options?.category || 'system',
        actionUrl: options?.actionUrl,
        persistent: options?.persistent,
        metadata: options?.metadata,
        actionable: !!options?.actionUrl,
      })
    );
  }

  error(title: string, message: string, options?: { 
    category?: NotificationCategory; 
    actionUrl?: string; 
    persistent?: boolean;
    metadata?: Record<string, any>;
  }) {
    useNotificationStore.getState().addNotification(
      createNotification.error(title, message, {
        category: options?.category || 'system',
        actionUrl: options?.actionUrl,
        persistent: options?.persistent ?? true, // Erreurs persistantes par défaut
        metadata: options?.metadata,
        actionable: !!options?.actionUrl,
      })
    );
  }

  warning(title: string, message: string, options?: { 
    category?: NotificationCategory; 
    actionUrl?: string; 
    persistent?: boolean;
    metadata?: Record<string, any>;
  }) {
    useNotificationStore.getState().addNotification(
      createNotification.warning(title, message, {
        category: options?.category || 'system',
        actionUrl: options?.actionUrl,
        persistent: options?.persistent,
        metadata: options?.metadata,
        actionable: !!options?.actionUrl,
      })
    );
  }

  info(title: string, message: string, options?: { 
    category?: NotificationCategory; 
    actionUrl?: string; 
    persistent?: boolean;
    metadata?: Record<string, any>;
  }) {
    useNotificationStore.getState().addNotification(
      createNotification.info(title, message, {
        category: options?.category || 'system',
        actionUrl: options?.actionUrl,
        persistent: options?.persistent,
        metadata: options?.metadata,
        actionable: !!options?.actionUrl,
      })
    );
  }

  // Méthodes spécialisées par catégorie avec routing amélioré
  attack = {
    started: (attackName: string, scenarioId: string, attackId?: string, tabId?: string) => {
      let actionUrl = `/scenarios/${scenarioId}?tab=attacks`;
      if (attackId) actionUrl += `&attackId=${attackId}`;
      if (tabId) actionUrl += `&tabId=${tabId}`;
      
      this.info(
        'Attack Started',
        `Attack ${attackName} has been started`,
        {
          category: 'attack',
          actionUrl,
          metadata: { attackName, scenarioId, attackId, tabId }
        }
      );
    },

    completed: (attackName: string, scenarioId: string, attackId?: string, tabId?: string) => {
      let actionUrl = `/scenarios/${scenarioId}?tab=attacks`;
      if (attackId) actionUrl += `&attackId=${attackId}`;
      if (tabId) actionUrl += `&tabId=${tabId}`;
      
      this.success(
        'Attack Completed',
        `Attack ${attackName} completed successfully`,
        {
          category: 'attack',
          actionUrl,
          metadata: { attackName, scenarioId, attackId, tabId }
        }
      );
    },

    failed: (attackName: string, error: string, scenarioId: string, attackId?: string, tabId?: string) => {
      let actionUrl = `/scenarios/${scenarioId}?tab=attacks`;
      if (attackId) actionUrl += `&attackId=${attackId}`;
      if (tabId) actionUrl += `&tabId=${tabId}`;
      
      this.error(
        'Attack Failed',
        `Attack ${attackName} failed: ${error}`,
        {
          category: 'attack',
          actionUrl,
          persistent: true,
          metadata: { attackName, error, scenarioId, attackId, tabId }
        }
      );
    }
  };

  scenario = {
    created: (scenarioName: string, projectId: string, campaignId: string, scenarioId?: string) => {
      const actionUrl = scenarioId 
        ? `/scenarios/${scenarioId}?tab=settings`
        : `/projects/${projectId}?tab=campaigns&campaignId=${campaignId}`;
      
      this.success(
        'Scenario Created',
        `Scenario "${scenarioName}" has been created successfully`,
        {
          category: 'scenario',
          actionUrl,
          metadata: { scenarioName, projectId, campaignId, scenarioId }
        }
      );
    },

    started: (scenarioName: string, scenarioId: string) => {
      this.info(
        'Scenario Started',
        `Execution of scenario "${scenarioName}" has begun`,
        {
          category: 'scenario',
          actionUrl: `/scenarios/${scenarioId}?tab=execution`,
          metadata: { scenarioName, scenarioId }
        }
      );
    },

    completed: (scenarioName: string, scenarioId: string) => {
      this.success(
        'Scenario Completed',
        `Scenario "${scenarioName}" completed successfully`,
        {
          category: 'scenario',
          actionUrl: `/scenarios/${scenarioId}?tab=history`,
          metadata: { scenarioName, scenarioId }
        }
      );
    },

    failed: (scenarioName: string, error: string, scenarioId: string) => {
      this.error(
        'Scenario Failed',
        `Scenario "${scenarioName}" failed: ${error}`,
        {
          category: 'scenario',
          actionUrl: `/scenarios/${scenarioId}?tab=execution`,
          persistent: true,
          metadata: { scenarioName, error, scenarioId }
        }
      );
    }
  };

  project = {
    created: (projectName: string, projectId: string) => {
      this.success(
        'Project Created',
        `Project "${projectName}" has been created successfully`,
        {
          category: 'project',
          actionUrl: `/projects/${projectId}?tab=overview`,
          metadata: { projectName, projectId }
        }
      );
    },

    shared: (projectName: string, username: string, projectId: string) => {
      this.info(
        'Project Shared',
        `Project "${projectName}" has been shared with ${username}`,
        {
          category: 'project',
          actionUrl: `/projects/${projectId}?tab=settings`,
          metadata: { projectName, username, projectId }
        }
      );
    }
  };

  campaign = {
    created: (campaignName: string, projectId: string, campaignId: string) => {
      this.success(
        'Campaign Created',
        `Campaign "${campaignName}" has been created successfully`,
        {
          category: 'campaign',
          actionUrl: `/projects/${projectId}?tab=campaigns&campaignId=${campaignId}`,
          metadata: { campaignName, projectId, campaignId }
        }
      );
    }
  };

  security = {
    alert: (title: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical', scenarioId?: string) => {
      const actionUrl = scenarioId ? `/scenarios/${scenarioId}?tab=security` : undefined;
      
      this.warning(
        title,
        message,
        {
          category: 'security',
          actionUrl,
          persistent: severity === 'high' || severity === 'critical',
          metadata: { severity, scenarioId }
        }
      );
    },

    breach: (description: string, scenarioId?: string) => {
      const actionUrl = scenarioId ? `/scenarios/${scenarioId}?tab=security` : undefined;
      
      this.error(
        'Security Alert',
        description,
        {
          category: 'security',
          actionUrl,
          persistent: true,
          metadata: { type: 'breach', scenarioId }
        }
      );
    }
  };

  performance = {
    slowQuery: (queryName: string, duration: number) => {
      this.warning(
        'Slow Query Detected',
        `Query "${queryName}" took ${duration}ms to execute`,
        {
          category: 'performance',
          metadata: { queryName, duration }
        }
      );
    },

    highMemory: (usage: number) => {
      this.warning(
        'High Memory Usage',
        `Memory usage has reached ${usage}%`,
        {
          category: 'performance',
          metadata: { usage }
        }
      );
    }
  };

  system = {
    connected: () => {
      this.success(
        'Connection Established',
        'Connection to server restored',
        { category: 'system' }
      );
    },

    disconnected: () => {
      this.error(
        'Connection Lost',
        'Connection to server has been interrupted',
        { 
          category: 'system',
          persistent: true
        }
      );
    },

    updateAvailable: (version: string) => {
      this.info(
        'Update Available',
        `A new version (${version}) is available`,
        {
          category: 'system',
          persistent: true,
          actionUrl: '/settings',
          metadata: { version }
        }
      );
    }
  };
}

// Export de l'instance singleton
export const notificationService = NotificationService.getInstance();

// Export des types pour faciliter l'utilisation
export type { NotificationCategory } from '../store/notificationStore'; 