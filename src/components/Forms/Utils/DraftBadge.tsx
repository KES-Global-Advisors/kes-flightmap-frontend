// Create a new file: components/DraftBadge.tsx
import React from 'react';
import { FileText } from 'lucide-react';

interface DraftBadgeProps {
  className?: string;
}

export const DraftBadge: React.FC<DraftBadgeProps> = ({ className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ${className}`}>
      <FileText className="w-3 h-3 mr-1" />
      Draft
    </span>
  );
};

// Usage in flightmap listing:
// <DraftBadge /> next to flightmap names that are drafts