/******************************************************************************
 * FlowCreationModal.tsx - Phase 2 Enhanced Implementation
 * Location: src/components/Forms/Utils/FlowCreationModal.tsx
 * 
 * Interactive milestone dependency creation with timeline visualization
 * Leverages existing D3.js infrastructure from FlightmapVisualization.tsx
 *****************************************************************************/

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X, Save, SkipForward, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import * as d3 from 'd3';
import { MilestoneFormData } from '../MilestoneForm';

export interface MilestoneDependency {
  sourceId: number;
  targetId: number;
  tempId: string;
  isValid: boolean;
}

interface FlowCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: MilestoneFormData['milestones'];
  onSaveDependencies: (dependencies: MilestoneDependency[]) => Promise<void>;
  onSkip: () => void;
}

export const FlowCreationModal: React.FC<FlowCreationModalProps> = ({
  isOpen,
  onClose,
  milestones,
  onSaveDependencies,
  onSkip
}) => {
  // ─── State Management ─────────────────────────────────────────────────
  const [selectedSourceMilestone, setSelectedSourceMilestone] = useState<number | null>(null);
  const [connectionMode, setConnectionMode] = useState<'idle' | 'selecting_target'>('idle');
  const [pendingDependencies, setPendingDependencies] = useState<MilestoneDependency[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);

  // ─── SVG References (Reuse FlightmapVisualization Pattern) ─────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const timelineGroupRef = useRef<SVGGElement>(null);
  const milestonesGroupRef = useRef<SVGGElement>(null);
  const dependenciesGroupRef = useRef<SVGGElement>(null);

  // ─── Layout Constants (Simplified from FlightmapVisualization) ─────────
  const margin = { top: 80, right: 60, bottom: 80, left: 60 };
  const width = 1200;
  const height = 500;
  const contentWidth = width - margin.left - margin.right;
  const contentHeight = height - margin.top - margin.bottom;

  // ─── Timeline Scale (Reuse FlightmapVisualization Logic) ─────────────────
  const { xScale, timelineMarkers } = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      return { xScale: null, timelineMarkers: [] };
    }
    
    const deadlines = milestones.map(m => new Date(m.deadline));
    const extent = d3.extent(deadlines) as [Date, Date];
    
    // Handle same deadline edge case (from FlightmapVisualization)
    if (extent[0].getTime() === extent[1].getTime()) {
      const baseDate = extent[0];
      const startDate = new Date(baseDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks before
      const endDate = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks after
      extent[0] = startDate;
      extent[1] = endDate;
    }
    
    const scale = d3.scaleTime()
      .domain(extent)
      .range([0, contentWidth])
      .nice();

    // Generate timeline markers (reuse FlightmapVisualization pattern)
    const markers = scale.ticks(6);
    
    return { xScale: scale, timelineMarkers: markers };
  }, [milestones, contentWidth]);

  // ─── Milestone Positions (Simplified Layout) ─────────────────────────
  const milestonePositions = useMemo(() => {
    if (!xScale || !milestones) return [];
    
    // Group milestones by deadline to handle overlapping positions
    const groupedByDeadline = d3.groups(milestones, d => d.deadline);
    
    return milestones.map((milestone, index) => {
      const x = xScale(new Date(milestone.deadline));
      
      // Find how many milestones share this deadline
      const sameDeadlineGroup = groupedByDeadline.find(([deadline]) => deadline === milestone.deadline)?.[1] || [];
      const indexInGroup = sameDeadlineGroup.findIndex(m => m.id === milestone.id);
      
      // Vertical staggering for overlapping milestones (simplified from FlightmapVisualization)
      const baseY = contentHeight / 2;
      const staggerOffset = sameDeadlineGroup.length > 1 
        ? (indexInGroup - (sameDeadlineGroup.length - 1) / 2) * 60 
        : 0;
      
      return {
        ...milestone,
        x,
        y: baseY + staggerOffset,
        index
      };
    });
  }, [xScale, milestones, contentHeight]);

  // ─── Dependency Validation (Enhanced from MilestoneForm) ─────────────
  const validateDependencies = useCallback((deps: MilestoneDependency[]) => {
    const errors: string[] = [];
    
    // 1. Circular dependency detection (reuse MilestoneForm algorithm)
    const detectCycles = (startId: number, visited: Set<number>, recStack: Set<number>): boolean => {
      if (recStack.has(startId)) return true;
      if (visited.has(startId)) return false;
      
      visited.add(startId);
      recStack.add(startId);
      
      const dependents = deps.filter(d => d.sourceId === startId);
      for (const dep of dependents) {
        if (detectCycles(dep.targetId, visited, recStack)) {
          return true;
        }
      }
      
      recStack.delete(startId);
      return false;
    };

    // Check each milestone for cycles
    const allMilestoneIds = milestones?.map(m => m.id).filter((id): id is number => id !== undefined && id !== null) || [];
    for (const id of allMilestoneIds) {
      if (detectCycles(id, new Set(), new Set())) {
        errors.push(`Circular dependency detected involving milestones`);
        break;
      }
    }

    // 2. Timeline consistency validation (from MilestoneForm)
    deps.forEach(dep => {
      const source = milestones?.find(m => m.id === dep.sourceId);
      const target = milestones?.find(m => m.id === dep.targetId);
      
      if (source && target) {
        const sourceDeadline = new Date(source.deadline);
        const targetDeadline = new Date(target.deadline);
        
        if (sourceDeadline >= targetDeadline) {
          errors.push(`Timeline conflict: "${source.name}" must complete before "${target.name}"`);
        }
      }
    });

    // Update validation with individual dependency validity
    const updatedDeps = deps.map(dep => ({
      ...dep,
      isValid: !errors.some(error => 
        error.includes(milestones?.find(m => m.id === dep.sourceId)?.name || '') ||
        error.includes(milestones?.find(m => m.id === dep.targetId)?.name || '')
      )
    }));

    setValidationErrors(errors);
    setPendingDependencies(updatedDeps);
    return errors.length === 0;
  }, [milestones]);

  // ─── Interaction Handlers ─────────────────────────────────────────────
  const handleMilestoneClick = useCallback((milestoneId: number) => {
    if (connectionMode === 'idle') {
      setSelectedSourceMilestone(milestoneId);
      setConnectionMode('selecting_target');
      console.log('🎯 Selected source milestone:', milestoneId);
    } else if (selectedSourceMilestone !== null && selectedSourceMilestone !== milestoneId) {
      // Create new dependency
      const newDependency: MilestoneDependency = {
        sourceId: selectedSourceMilestone,
        targetId: milestoneId,
        tempId: `temp_${Date.now()}_${Math.random()}`,
        isValid: true
      };
      
      const updatedDeps = [...pendingDependencies, newDependency];
      console.log('🔗 Created dependency:', selectedSourceMilestone, '→', milestoneId);
      
      // Validate after adding
      validateDependencies(updatedDeps);
      
      // Reset selection
      setSelectedSourceMilestone(null);
      setConnectionMode('idle');
    } else if (selectedSourceMilestone === milestoneId) {
      // Clicking the same milestone cancels selection
      setSelectedSourceMilestone(null);
      setConnectionMode('idle');
    }
  }, [connectionMode, selectedSourceMilestone, pendingDependencies, validateDependencies]);

  const handleDependencyRemove = useCallback((tempId: string) => {
    const updatedDeps = pendingDependencies.filter(dep => dep.tempId !== tempId);
    validateDependencies(updatedDeps);
    console.log('🗑️ Removed dependency:', tempId);
  }, [pendingDependencies, validateDependencies]);

  const handleClearAll = useCallback(() => {
    setPendingDependencies([]);
    setValidationErrors([]);
    setSelectedSourceMilestone(null);
    setConnectionMode('idle');
  }, []);

  const handleSave = useCallback(async () => {
    if (validationErrors.length > 0) return;
    
    setIsSaving(true);
    try {
      await onSaveDependencies(pendingDependencies);
      onClose();
    } catch (error) {
      console.error('Error saving dependencies:', error);
    } finally {
      setIsSaving(false);
    }
  }, [pendingDependencies, validationErrors, onSaveDependencies, onClose]);

  // ─── D3 Rendering (Simplified from FlightmapVisualization) ─────────────
  useEffect(() => {
    if (!isOpen || !svgRef.current || !milestonePositions.length || !xScale) return;

    // const svg = d3.select(svgRef.current); // Removed - not used in current implementation
    const timelineGroup = d3.select(timelineGroupRef.current);
    const milestonesGroup = d3.select(milestonesGroupRef.current);
    const dependenciesGroup = d3.select(dependenciesGroupRef.current);

    // Clear previous renders
    timelineGroup.selectAll('*').remove();
    milestonesGroup.selectAll('*').remove();
    dependenciesGroup.selectAll('*').remove();

    // 1. Render timeline grid (reuse FlightmapVisualization pattern)
    timelineMarkers.forEach(marker => {
      const x = xScale(marker);
      
      // Vertical grid lines
      timelineGroup
        .append('line')
        .attr('x1', x)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', contentHeight)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1);
      
      // Timeline labels
      timelineGroup
        .append('text')
        .attr('x', x)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#6b7280')
        .text(marker.toLocaleDateString(undefined, { 
          month: 'short', 
          year: 'numeric' 
        }));
    });

    // 2. Render milestones
    const milestoneSelection = milestonesGroup
      .selectAll('.milestone-node')
      .data(milestonePositions)
      .enter()
      .append('g')
      .attr('class', 'milestone-node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    // Milestone circles
    milestoneSelection
      .append('circle')
      .attr('r', 25)
      .attr('class', (d) => {
        if (selectedSourceMilestone === d.id) return 'milestone-selected';
        if (connectionMode === 'selecting_target' && selectedSourceMilestone !== d.id) return 'milestone-target';
        if (hoveredMilestone === d.id) return 'milestone-hovered';
        return 'milestone-default';
      })
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => handleMilestoneClick(d.id || 0))
      .on('mouseenter', (_event, d) => setHoveredMilestone(d.id || null))
      .on('mouseleave', () => setHoveredMilestone(null));

    // Milestone labels
    milestoneSelection
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('class', 'milestone-text')
      .attr('font-size', '10px')
      .style('pointer-events', 'none')
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

    // Milestone deadlines
    milestoneSelection
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '40px')
      .attr('class', 'milestone-deadline')
      .attr('font-size', '8px')
      .attr('fill', '#6b7280')
      .style('pointer-events', 'none')
      .text(d => new Date(d.deadline).toLocaleDateString());

    // 3. Render dependency lines (reuse FlightmapVisualization pattern)
    pendingDependencies.forEach(dep => {
      const source = milestonePositions.find(m => m.id === dep.sourceId);
      const target = milestonePositions.find(m => m.id === dep.targetId);
      
      if (source && target) {
        // Create curved line (reuse d3.linkHorizontal from FlightmapVisualization)
        const line = d3.linkHorizontal()({
          source: [source.x, source.y],
          target: [target.x, target.y]
        });

        dependenciesGroup
          .append('path')
          .attr('d', line)
          .attr('class', dep.isValid ? 'dependency-line-valid' : 'dependency-line-invalid')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('click', () => handleDependencyRemove(dep.tempId));


        // Add arrow marker (simplified from FlightmapVisualization)
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowX = target.x - Math.cos(angle) * 30;
        const arrowY = target.y - Math.sin(angle) * 30;
        
        dependenciesGroup
          .append('polygon')
          .attr('points', '0,0 -8,-4 -8,4')
          .attr('class', 'dependency-arrow')
          .attr('transform', `translate(${arrowX}, ${arrowY}) rotate(${angle * 180 / Math.PI})`)
          .style('cursor', 'pointer')
          .on('click', () => handleDependencyRemove(dep.tempId));
      }
    });

  }, [isOpen, milestonePositions, pendingDependencies, selectedSourceMilestone, connectionMode, hoveredMilestone, xScale, timelineMarkers, handleMilestoneClick, handleDependencyRemove]);

  if (!isOpen) return null;

  // ─── Render Modal ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Flow Creation Mode</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click milestones to create dependencies. First click selects source, second click creates connection.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {validationErrors.length === 0 && pendingDependencies.length > 0 && (
              <Check className="w-5 h-5 text-green-500" />
            )}
            {validationErrors.length > 0 && (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 py-3 bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              {connectionMode === 'idle' ? (
                'Click a milestone to start creating a dependency'
              ) : (
                `Selected: ${milestones.find(m => m.id === selectedSourceMilestone)?.name}. Click target milestone to create dependency.`
              )}
            </div>
            {pendingDependencies.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-6 overflow-auto">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="border border-gray-200 rounded-lg bg-gray-50"
          >
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              <g ref={timelineGroupRef} className="timeline-layer" />
              <g ref={dependenciesGroupRef} className="dependencies-layer" />
              <g ref={milestonesGroupRef} className="milestones-layer" />
            </g>
          </svg>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-6 py-3 bg-red-50 border-t">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Validation Issues:</p>
                <ul className="text-sm text-red-700 mt-1 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Dependencies: {pendingDependencies.length}
              </span>
              {connectionMode === 'selecting_target' && (
                <button
                  onClick={() => {
                    setSelectedSourceMilestone(null);
                    setConnectionMode('idle');
                  }}
                  className="text-sm text-orange-600 hover:text-orange-800"
                >
                  Cancel Selection
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Skip to Activities
              </button>
              <button
                onClick={handleSave}
                disabled={validationErrors.length > 0 || isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : `Save Flow (${pendingDependencies.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* CSS Styles */}
        <style>{`
          .milestone-default {
            fill: #e5e7eb;
            stroke: #6b7280;
            transition: all 0.2s ease;
          }
          .milestone-hovered {
            fill: #ddd6fe;
            stroke: #8b5cf6;
          }
          .milestone-selected {
            fill: #3b82f6;
            stroke: #1d4ed8;
            stroke-width: 3px;
          }
          .milestone-target {
            fill: #fef3c7;
            stroke: #f59e0b;
            stroke-width: 2px;
            animation: pulse 1.5s infinite;
          }
          .milestone-text {
            font-weight: 500;
            fill: #374151;
            pointer-events: none;
          }
          .dependency-line-valid {
            fill: none;
            stroke: #10b981;
            stroke-width: 2;
            transition: stroke-width 0.2s ease;
          }
          .dependency-line-valid:hover {
            stroke-width: 3;            
          }
          .dependency-line-invalid {
            fill: none;
            stroke: #ef4444;
            stroke-width: 2;
            stroke-dasharray: 5,5;
          }
          .dependency-arrow {
            fill: #10b981;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    </div>
  );
};