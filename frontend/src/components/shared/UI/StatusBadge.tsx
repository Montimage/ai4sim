import React from 'react';
import { motion } from 'framer-motion';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'running' | 'completed' | 'failed' | 'stopped';
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  icon?: React.ReactNode;
}

const statusClasses = {
  success: 'status-success',
  warning: 'status-warning',
  error: 'status-error',
  info: 'status-info',
  neutral: 'status-neutral',
  running: 'status-info',
  completed: 'status-success',
  failed: 'status-error',
  stopped: 'status-warning'
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className = '',
  size = 'md',
  animated = false,
  icon
}) => {
  const baseClasses = `
    status-badge
    ${statusClasses[status]}
    ${sizeClasses[size]}
    ${className}
  `;

  const content = (
    <>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {status === 'running' && animated && (
        <div className="ml-2 w-2 h-2 bg-current rounded-full animate-pulse" />
      )}
    </>
  );

  if (animated) {
    return (
      <motion.span
        className={baseClasses}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {content}
      </motion.span>
    );
  }

  return (
    <span className={baseClasses}>
      {content}
    </span>
  );
}; 