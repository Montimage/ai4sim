import WebSocket from 'ws';
import { execSync } from 'child_process';
import { logger } from '../utils/logger';

interface PingResult {
  host: string;
  latency?: number;
  status: 'success' | 'failed';
  timestamp: Date;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private agents: Map<string, WebSocket> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.agents = new Map();
    this.pingIntervals = new Map();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async checkTargetAvailability(host: string): Promise<PingResult> {
    try {
      const start = Date.now();
      execSync(`ping -c 1 -W 2 ${host}`, { stdio: 'ignore' });
      const latency = Date.now() - start;
      
      return {
        host,
        latency,
        status: 'success',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        host,
        status: 'failed',
        timestamp: new Date()
      };
    }
  }

  startMonitoring(host: string, interval: number = 60000): void {
    if (this.pingIntervals.has(host)) {
      return;
    }

    const intervalId = setInterval(async () => {
      const result = await this.checkTargetAvailability(host);
      this.notifyAgent(host, result);
    }, interval);

    this.pingIntervals.set(host, intervalId);
  }

  stopMonitoring(host: string): void {
    const intervalId = this.pingIntervals.get(host);
    if (intervalId) {
      clearInterval(intervalId);
      this.pingIntervals.delete(host);
    }
  }

  registerAgent(host: string, ws: WebSocket): void {
    this.agents.set(host, ws);

    ws.on('close', () => {
      this.agents.delete(host);
      this.stopMonitoring(host);
    });

    ws.on('error', (error) => {
      logger.error(`Agent WebSocket error for ${host}:`, error);
      this.agents.delete(host);
      this.stopMonitoring(host);
    });
  }

  private notifyAgent(host: string, data: any): void {
    const agent = this.agents.get(host);
    if (agent && agent.readyState === WebSocket.OPEN) {
      agent.send(JSON.stringify(data));
    }
  }

}
