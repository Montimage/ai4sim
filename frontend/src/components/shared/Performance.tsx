import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { ChartBarIcon, CpuChipIcon, CircleStackIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  latency: number;
  details: {
    memoryTotal: number;
    memoryUsed: number;
    cpuCores: number;
    loadAverage: string;
  };
}

// Initial state with realistic default values
const initialMetrics: PerformanceMetrics = {
  cpu: 0,
  memory: 0,
  latency: 0,
  details: {
    memoryTotal: 32, // Default value in GB
    memoryUsed: 0,
    cpuCores: navigator.hardwareConcurrency || 4, // Use the actual number of system cores
    loadAverage: '0.00'
  }
};

export const Performance: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(initialMetrics);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useThemeStore(state => state.theme);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/metrics`);
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const data = await response.json();
        
        if (isMounted) {
          // Smoothing values to avoid sudden changes
          setMetrics(prev => ({
            cpu: Number(((prev.cpu * 0.3) + (data.cpu * 0.7)).toFixed(1)),
            memory: Number(((prev.memory * 0.3) + (data.memory * 0.7)).toFixed(1)),
            latency: data.latency,
            details: {
              ...data.details,
              memoryTotal: data.details.memoryTotal || prev.details.memoryTotal,
              cpuCores: data.details.cpuCores || prev.details.cpuCores,
            }
          }));
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setError('Failed to fetch system metrics');
      }
    };

    fetchMetrics(); // Initial call immediately
    const interval = setInterval(fetchMetrics, 2000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getColorClass = (value: number, threshold: number = 80) => {
    if (value > threshold) return 'text-red-500';
    if (value > threshold * 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (isCollapsed) {
    return (
      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} cursor-pointer`}
           onClick={() => setIsCollapsed(false)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            <span className="text-xs font-medium">
              {metrics.details.memoryUsed}/{metrics.details.memoryTotal}GB | CPU: {metrics.cpu}%
            </span>
          </div>
          <ChevronDownIcon className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="flex items-center justify-between mb-2 cursor-pointer"
           onClick={() => setIsCollapsed(true)}>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4" />
          Performance
        </h3>
        <ChevronUpIcon className="w-4 h-4" />
      </div>
      
      {error ? (
        <div className="text-xs text-red-500 pb-1">{error}</div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CpuChipIcon className="w-3 h-3" />
              <span className="text-xs">CPU ({metrics.details.cpuCores} cores)</span>
            </div>
            <span className={`text-xs font-medium ${getColorClass(metrics.cpu)}`}>
              {metrics.cpu}% (LA: {metrics.details.loadAverage})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleStackIcon className="w-3 h-3" />
              <span className="text-xs">Memory</span>
            </div>
            <span className={`text-xs font-medium ${getColorClass(metrics.memory)}`}>
              {metrics.details.memoryUsed}/{metrics.details.memoryTotal}GB ({metrics.memory}%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3">⚡</span>
              <span className="text-xs">Latency</span>
            </div>
            <span className={`text-xs font-medium ${getColorClass(metrics.latency, 200)}`}>
              {metrics.latency}ms
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 mt-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${metrics.cpu}%` }}
              />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full">
              <div 
                className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
