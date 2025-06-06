// Create a new file: components/DraftBadge.tsx
import React from 'react';
import { FileText } from 'lucide-react';

interface DraftBadgeProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
}

export const DraftBadge: React.FC<DraftBadgeProps> = ({ 
  className = '', 
  size = 'xs',
  showIcon = true 
}) => {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-sm',
    md: 'px-3 py-1 text-base'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium bg-yellow-100 text-yellow-800 ${sizeClasses[size]} ${className}`}>
      {showIcon && <FileText className={`${iconSizes[size]} mr-1`} />}
      Draft
    </span>
  );
};