import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  success: 'btn-success',
  warning: 'btn-warning',
  error: 'btn-error',
  ghost: 'btn-ghost'
};

const sizeClasses = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg'
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  icon,
  iconPosition = 'left'
}) => {
  const baseClasses = `
    btn
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const LoadingSpinner = () => (
    <div className="loading-spinner w-4 h-4 mr-2" />
  );

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingSpinner />
          {children}
        </>
      );
    }

    if (icon) {
      return iconPosition === 'left' ? (
        <>
          <span className="mr-2">{icon}</span>
          {children}
        </>
      ) : (
        <>
          {children}
          <span className="ml-2">{icon}</span>
        </>
      );
    }

    return children;
  };

  return (
    <motion.button
      className={baseClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      type={type}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.1 }}
    >
      {renderContent()}
    </motion.button>
  );
}; 