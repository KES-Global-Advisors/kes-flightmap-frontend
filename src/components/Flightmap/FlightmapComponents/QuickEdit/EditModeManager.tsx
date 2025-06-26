/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Flightmap/FlightmapComponents/QuickEdit/EditModeManager.tsx
import React from 'react';
import { EditModeState, EditMode } from '../../../../hooks/useQuickEditModes';
import { TrackedPosition } from '../../Utils/nodeTracking';
import * as d3 from 'd3';

// Import edit components (will be implemented in later weeks)
// import { MilestoneQuickEditor } from './MilestoneQuickEditor/MilestoneQuickEditor';
// import { DependencyCreator } from './DependencyCreator/DependencyCreator';
// import { ActivityConnectionBuilder } from './ActivityConnectionBuilder/ActivityBuilder';
// import { TimelineDeadlineAdjuster } from './TimelineDeadlineAdjuster/TimelineAdjuster';
// import { WorkstreamMilestoneCreator } from './WorkstreamMilestoneCreator/MilestoneCreator';

export interface VisualizationData {
  allMilestones: any[];
  activities: any[];
  dependencies: any[];
  workstreams: any[];
  placementCoordinates: Record<string, TrackedPosition>;
  timelineMarkers: Date[];
  xScale: d3.ScaleTime<number, number>;
  yScale: d3.ScalePoint<string>;
  margin: { top: number; right: number; bottom: number; left: number };
  contentHeight: number;
  contentWidth: number;
}

export interface EditModeManagerProps {
  editState: EditModeState;
  onDeactivate: () => void;
  onDataUpdate: (updateType: string, data: any) => Promise<void>;
  svgRef: React.RefObject<SVGSVGElement>;
  visualizationData: VisualizationData;
  
  // Additional callbacks for specific operations
  onMilestoneUpdate?: (milestoneId: string, updates: any) => Promise<void>;
  onDependencyCreate?: (source: number, target: number) => Promise<void>;
  onActivityCreate?: (sourceId: number, targetId: number, activityData: any) => Promise<void>;
  onMilestoneCreate?: (workstreamId: number, position: { x: number, y: number }, milestoneData: any) => Promise<void>;
  onTimelineUpdate?: (milestoneIds: string[], newDeadline: Date) => Promise<void>;
}

/**
 * Central manager for all quick edit modes
 * Renders the appropriate edit component based on current edit state
 */
export const EditModeManager: React.FC<EditModeManagerProps> = ({
  editState,
  onDeactivate,
//   onDataUpdate,
  svgRef,
  visualizationData,
//   onMilestoneUpdate,
//   onDependencyCreate,
//   onActivityCreate,
//   onMilestoneCreate,
//   onTimelineUpdate
}) => {
  // Don't render anything if no edit mode is active
  if (!editState.isActive || editState.mode === 'none') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Global edit mode indicator */}
      <EditModeIndicator 
        mode={editState.mode}
        selectedCount={editState.selectedNodes.length}
        step={editState.step}
        onDeactivate={onDeactivate}
      />

      {/* Render specific edit component based on mode */}
      {editState.mode === 'milestone-editor' && (
        <div className="pointer-events-none">
          {/* Placeholder for MilestoneQuickEditor */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 pointer-events-auto">
            <span className="text-blue-800 text-sm">
              🚧 Milestone Editor - Coming in Week 2
            </span>
          </div>
        </div>
      )}

      {editState.mode === 'dependency-creator' && (
        <div className="pointer-events-none">
          {/* Placeholder for DependencyCreator */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 pointer-events-auto">
            <span className="text-green-800 text-sm">
              🚧 Dependency Creator - Coming in Week 2
            </span>
          </div>
        </div>
      )}

      {editState.mode === 'activity-builder' && (
        <div className="pointer-events-none">
          {/* Placeholder for ActivityConnectionBuilder */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 pointer-events-auto">
            <span className="text-teal-800 text-sm">
              🚧 Activity Builder - Coming in Week 3
            </span>
          </div>
        </div>
      )}

      {editState.mode === 'timeline-adjuster' && (
        <div className="pointer-events-none">
          {/* Placeholder for TimelineDeadlineAdjuster */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 pointer-events-auto">
            <span className="text-purple-800 text-sm">
              🚧 Timeline Adjuster - Coming in Week 4
            </span>
          </div>
        </div>
      )}

      {editState.mode === 'milestone-creator' && (
        <div className="pointer-events-none">
          {/* Placeholder for WorkstreamMilestoneCreator */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 pointer-events-auto">
            <span className="text-red-800 text-sm">
              🚧 Milestone Creator - Coming in Week 3
            </span>
          </div>
        </div>
      )}

      {/* Selection overlay for visual feedback */}
      <SelectionOverlay 
        editState={editState}
        svgRef={svgRef}
        visualizationData={visualizationData}
      />
    </div>
  );
};

/**
 * Visual indicator showing current edit mode and instructions
 */
interface EditModeIndicatorProps {
  mode: EditMode;
  selectedCount: number;
  step: number;
  onDeactivate: () => void;
}

const EditModeIndicator: React.FC<EditModeIndicatorProps> = ({
  mode,
  selectedCount,
  step,
  onDeactivate
}) => {
  const getModeConfig = (mode: EditMode) => {
    switch (mode) {
      case 'milestone-editor':
        return {
          icon: '✏️',
          title: 'Milestone Editor',
          instruction: 'Click any milestone to edit its details',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-800'
        };
      case 'dependency-creator':
        return {
          icon: '🔗',
          title: 'Dependency Creator',
          instruction: step === 0 ? 'Click source milestone' : step === 1 ? 'Click target milestone' : 'Confirm dependency',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          textColor: 'text-green-800'
        };
      case 'activity-builder':
        return {
          icon: '➡️',
          title: 'Activity Builder',
          instruction: step === 0 ? 'Click source milestone' : step === 1 ? 'Click target milestone' : 'Configure activity',
          bgColor: 'bg-teal-100',
          borderColor: 'border-teal-300',
          textColor: 'text-teal-800'
        };
      case 'timeline-adjuster':
        return {
          icon: '📅',
          title: 'Timeline Adjuster',
          instruction: selectedCount === 0 ? 'Select milestones to reschedule' : `${selectedCount} milestone(s) selected`,
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-300',
          textColor: 'text-purple-800'
        };
      case 'milestone-creator':
        return {
          icon: '➕',
          title: 'Milestone Creator',
          instruction: 'Click in any workstream area to create a milestone',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          textColor: 'text-red-800'
        };
      default:
        return {
          icon: '🔧',
          title: 'Edit Mode',
          instruction: 'Select items to edit',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-800'
        };
    }
  };

  const config = getModeConfig(mode);

  return (
    <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 ${config.bgColor} ${config.borderColor} border rounded-lg px-4 py-2 pointer-events-auto shadow-md`}>
      <div className="flex items-center gap-3">
        <span className={`${config.textColor} font-medium text-sm`}>
          {config.icon} {config.title}
        </span>
        <span className={`${config.textColor} text-sm`}>
          - {config.instruction}
        </span>
        <button 
          onClick={onDeactivate}
          className={`${config.textColor} hover:opacity-70 transition-opacity`}
          title="Exit edit mode"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/**
 * Visual overlay for showing selected items and providing visual feedback
 */
interface SelectionOverlayProps {
  editState: EditModeState;
  svgRef: React.RefObject<SVGSVGElement>;
  visualizationData: VisualizationData;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  editState,
  svgRef,
  visualizationData
}) => {
  React.useEffect(() => {
    if (!svgRef.current || !editState.isActive) return;

    const svg = d3.select(svgRef.current);
    
    // Remove existing selection overlays
    svg.selectAll('.selection-overlay').remove();
    
    // Add visual feedback for selected nodes
    if (editState.selectedNodes.length > 0) {
      const overlayGroup = svg.append('g').attr('class', 'selection-overlay');
      
      editState.selectedNodes.forEach((nodeId, index) => {
        const nodePosition = visualizationData.placementCoordinates[nodeId];
        if (!nodePosition) return;
        
        // Add pulsing circle around selected milestone
        const pulseCircle = overlayGroup
          .append('circle')
          .attr('cx', nodePosition.x)
          .attr('cy', nodePosition.y)
          .attr('r', 20)
          .attr('fill', 'none')
          .attr('stroke', getSelectionColor(editState.mode, index))
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4 4')
          .attr('opacity', 0.8);
        
        // Add pulsing animation
        pulseCircle
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '20;25;20')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
          
        pulseCircle
          .append('animate')
          .attr('attributeName', 'opacity')
          .attr('values', '0.8;0.4;0.8')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
      });
    }
    
    // Cleanup on unmount or mode change
    return () => {
      svg.selectAll('.selection-overlay').remove();
    };
  }, [editState, svgRef, visualizationData]);

  return null; // This component only adds SVG overlays
};

/**
 * Get appropriate selection color based on edit mode and selection order
 */
function getSelectionColor(mode: EditMode, index: number): string {
  switch (mode) {
    case 'dependency-creator':
      return index === 0 ? '#10b981' : '#3b82f6'; // Green for source, blue for target
    case 'activity-builder':
      return index === 0 ? '#0d9488' : '#6366f1'; // Teal for source, indigo for target
    case 'milestone-editor':
      return '#1f2937'; // Gray for single selection
    case 'timeline-adjuster':
      return '#7c3aed'; // Purple for multiple selection
    case 'milestone-creator':
      return '#dc2626'; // Red for creation
    default:
      return '#6b7280'; // Default gray
  }
}

export default EditModeManager;