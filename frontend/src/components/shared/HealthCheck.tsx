import React, { useState, useEffect } from 'react';

interface HealthCheckProps {
  interval?: number;
}

export const HealthCheck: React.FC<HealthCheckProps> = ({ interval = 30000 }) => {
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await fetch('/api/health');
        setIsHealthy(true);
      } catch (error) {
        setIsHealthy(false);
      }
    };

    const timer = setInterval(checkHealth, interval);
    checkHealth();

    return () => clearInterval(timer);
  }, [interval]);

  if (!isHealthy) {
    return (
      <div className="health-check-warning">
        Server connection lost. Please check your connection.
      </div>
    );
  }

  return null;
};
