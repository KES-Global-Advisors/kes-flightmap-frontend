import React from 'react';

interface RequiredFieldIndicatorProps {
  show?: boolean;
}

export const RequiredFieldIndicator: React.FC<RequiredFieldIndicatorProps> = ({ show = true }) => {
  if (!show) return null;
  
  return (
    <span className="text-red-500 ml-1" aria-label="required field">
      *
    </span>
  );
};

// Helper component for form labels with required indicator
interface FormLabelProps {
  label: string;
  required?: boolean;
  className?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({ 
  label, 
  required = false, 
  className = "block text-sm font-medium text-gray-700" 
}) => {
  return (
    <label className={className}>
      {label}
      <RequiredFieldIndicator show={required} />
    </label>
  );
};