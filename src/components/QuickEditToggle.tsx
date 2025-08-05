// components/QuickEditToggle.tsx
import React from 'react';
import { Edit3, PenOff } from 'lucide-react';
import { useQuickEdit } from './QuickEditProvider';

interface QuickEditToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'minimal';
}

export const QuickEditToggle: React.FC<QuickEditToggleProps> = ({
  className = '',
  size = 'md',
  variant = 'default'
}) => {
  const { isQuickEditEnabled, toggleQuickEdit, pendingUpdates } = useQuickEdit();
  
  const hasPendingUpdates = pendingUpdates.size > 0;

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Variant classes
  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (isQuickEditEnabled) {
      switch (variant) {
        case 'outline':
          return `${baseClasses} border-2 border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500`;
        case 'minimal':
          return `${baseClasses} text-blue-600 hover:bg-blue-50 focus:ring-blue-500`;
        default:
          return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm`;
      }
    } else {
      switch (variant) {
        case 'outline':
          return `${baseClasses} border-2 border-gray-300 text-gray-600 bg-white hover:bg-gray-50 focus:ring-gray-500`;
        case 'minimal':
          return `${baseClasses} text-gray-600 hover:bg-gray-100 focus:ring-gray-500`;
        default:
          return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm`;
      }
    }
  };

  return (
    <button
      onClick={toggleQuickEdit}
      disabled={hasPendingUpdates}
      className={`
        ${getVariantClasses()}
        ${sizeClasses[size]}
        ${hasPendingUpdates ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={
        hasPendingUpdates 
          ? 'Please wait for pending updates to complete'
          : isQuickEditEnabled 
            ? 'Disable quick edit mode' 
            : 'Enable quick edit mode'
      }
    >
      {isQuickEditEnabled ? (
        <PenOff className={`${iconSizes[size]} mr-2`} />
      ) : (
        <Edit3 className={`${iconSizes[size]} mr-2`} />
      )}
      
      <span>
        {isQuickEditEnabled ? 'Quick Edit: ON' : 'Quick Edit: OFF'}
      </span>

      {/* Pending updates indicator */}
      {hasPendingUpdates && (
        <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
          {pendingUpdates.size}
        </span>
      )}
    </button>
  );
};