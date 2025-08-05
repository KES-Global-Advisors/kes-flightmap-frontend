/******************************************************************************
 * FlowCreationPopup.tsx - Phase 1 Minimal Implementation
 * Location: src/components/Forms/Utils/FlowCreationPopup.tsx
 * 
 * Simple decision popup shown after milestone creation to offer flow creation
 *****************************************************************************/

import React from 'react';
import { GitBranch, ArrowRight, SkipForward } from 'lucide-react';

interface FlowCreationPopupProps {
  isVisible: boolean;
  milestoneCount: number;
  onEnterFlowMode: () => void;
  onSkip: () => void;
}

export const FlowCreationPopup: React.FC<FlowCreationPopupProps> = ({
  isVisible,
  milestoneCount,
  onEnterFlowMode,
  onSkip
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-25 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Visualize Your Project Flow
          </h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          You've created {milestoneCount} milestones. Would you like to create connections 
          between them to show dependencies and visualize your project's flow?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onEnterFlowMode}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Create Flow
          </button>
          <button
            onClick={onSkip}
            className="flex-1 bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip for Now
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          You can always add dependencies later in the milestone editing view
        </p>
      </div>
    </div>
  );
};