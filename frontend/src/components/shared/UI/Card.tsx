import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'solid';
  onClick?: () => void;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

const variantClasses = {
  default: 'card',
  glass: 'glass',
  solid: 'bg-white/10 border border-white/20'
};

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = true,
  padding = 'md',
  variant = 'default',
  onClick 
}) => {
  const baseClasses = `
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${hover ? 'hover:transform hover:-translate-y-1 hover:shadow-2xl' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  if (onClick) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        whileHover={hover ? { y: -4, scale: 1.02 } : {}}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={baseClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`card-header ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={`card-body ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`card-footer ${className}`}>
    {children}
  </div>
); 