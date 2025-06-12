class ToolMonitor {
  private activeChecks: Set<number> = new Set();
  
  public async isToolRunning(port: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/check-port/${port}`);
      const data = await response.json();
      return data.isInUse;
    } catch (error) {
      console.error('Error checking tool status:', error);
      return false;
    }
  }
  
  public startMonitoring(port: string | number, checkInterval: number = 5000): Promise<void> {
    const numericPort = typeof port === 'string' ? parseInt(port, 10) : port;
    if (this.activeChecks.has(numericPort)) return Promise.resolve();
    
    this.activeChecks.add(numericPort);
    
    return new Promise((resolve) => {
      const check = async () => {
        if (!this.activeChecks.has(numericPort)) return;
        
        const isRunning = await this.isToolRunning(numericPort);
        
        if (!isRunning) {
          this.stopMonitoring(numericPort);
        }
      };
      
      setInterval(check, checkInterval);
      resolve();
    });
  }
  
  public stopMonitoring(port: string | number): void {
    const numericPort = typeof port === 'string' ? parseInt(port, 10) : port;
    this.activeChecks.delete(numericPort);
  }
}

export const toolMonitor = new ToolMonitor();
