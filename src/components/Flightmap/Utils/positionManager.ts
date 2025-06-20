/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/positionManager.ts
import * as d3 from 'd3';
import { 
  WORKSTREAM_AREA_HEIGHT, 
  WORKSTREAM_AREA_PADDING,
} from './types';
import { TrackedPosition } from './nodeTracking';

// Standard timeout for all debounced operations
export const DEBOUNCE_TIMEOUT = 250; // ms

/**
 * Coordinate precision management
 * Rounds coordinates to avoid floating-point drift
 */
const COORDINATE_PRECISION = 2; // 2 decimal places = 0.01 pixel precision
const RELATIVE_PRECISION = 6;   // 6 decimal places for 0-1 relative values

export function roundCoordinate(value: number): number {
  return Math.round(value * Math.pow(10, COORDINATE_PRECISION)) / Math.pow(10, COORDINATE_PRECISION);
}

export function roundRelative(value: number): number {
  return Math.round(value * Math.pow(10, RELATIVE_PRECISION)) / Math.pow(10, RELATIVE_PRECISION);
}

/**
 * Convert absolute Y to relative with precision control
 */
export function absoluteToRelative(absoluteY: number, marginTop: number, contentHeight: number): number {
  const relY = (absoluteY - marginTop) / contentHeight;
  return roundRelative(Math.max(0, Math.min(1, relY))); // Clamp to [0,1] and round
}

/**
 * Convert relative Y to absolute with precision control
 */
export function relativeToAbsolute(relativeY: number, marginTop: number, contentHeight: number): number {
  const absoluteY = marginTop + relativeY * contentHeight;
  return roundCoordinate(absoluteY);
}

/**
 * Updates node position across all state representations
 */
export function updateNodePosition(
  nodeId: string,
  newPosition: { x?: number, y?: number },
  options: {
    milestonesGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
    placementCoordinates: Record<string, TrackedPosition>,
    margin: { top: number },
    contentHeight: number,
    dataId: number,
    isDuplicate?: boolean,
    originalMilestoneId?: number,
    debouncedUpsertPosition: (
        flightmapId: number, 
        nodeType: 'milestone'|'workstream', 
        nodeId: number | string, 
        relY: number, 
        isDuplicate?: boolean, 
        duplicateKey?: string, 
        originalNodeId?: number
      ) => void,
    updateDOM?: boolean,
    updateConnections?: boolean,
    updateConnectionsFunction?: (nodeId: string | number) => void
  }
) {
  const { 
    milestonesGroup, 
    placementCoordinates, 
    margin, 
    contentHeight, 
    dataId,
    isDuplicate = false,
    originalMilestoneId,
    debouncedUpsertPosition,
    updateDOM = true,
    updateConnections = true,
    updateConnectionsFunction
  } = options;

    // ✅ NEW: Early exit if no meaningful change
  const current = placementCoordinates[nodeId];
  if (current) {
    const xChanged = newPosition.x !== undefined && Math.abs(current.x - newPosition.x) > 0.5;
    const yChanged = newPosition.y !== undefined && Math.abs(current.y - newPosition.y) > 0.5;
    
    if (!xChanged && !yChanged) {
      return current; // No significant change, skip expensive updates
    }
  }
  
  // 1. Update reference collection
  if (placementCoordinates[nodeId]) {
    if (newPosition.x !== undefined) placementCoordinates[nodeId].x = newPosition.x;
    if (newPosition.y !== undefined) placementCoordinates[nodeId].y = newPosition.y;
    // Add timestamp for tracking
    placementCoordinates[nodeId].lastUpdated = Date.now();
  } else {
    // Log warning if node not found
    console.warn(`Node ${nodeId} not found in placement coordinates`);
    return;
  }
  
  // 2. Update DOM if needed - CONSISTENTLY USING TRANSFORMS
  if (updateDOM && milestonesGroup.current) {
    milestonesGroup.current.selectAll(".milestone")
      .filter((d: any) => d && d.id === nodeId)
      .each(function(d: any) {
        // Calculate transform based on the difference from initial position
        // This ensures consistent transform application
        const newX = newPosition.x !== undefined ? newPosition.x - d.initialX : 0;
        const newY = newPosition.y !== undefined ? newPosition.y - d.initialY : 0;
        
        // Apply transform directly without resetting first
        // This is a key change - we're setting an absolute transform rather than
        // modifying an existing one, which prevents transform compounding
        d3.select(this)
          .attr("transform", `translate(${newX}, ${newY})`);
          
        // Update connection line position based on absolute coordinates
        if (newPosition.y !== undefined) {
          const workstreamId = d.isDuplicate ? d.placementWorkstreamId : d.milestone.workstreamId;
          const workstreamY = placementCoordinates[`ws-${workstreamId}`]?.y || d.workstreamY || 0;
          
          d3.select(this).select("line.connection-line")
            .attr("y1", newPosition.y)
            .attr("y2", workstreamY);
        }
      });
  }
  
  // 3. Update connections if needed
  if (updateConnections && updateConnectionsFunction) {
    updateConnectionsFunction(nodeId);
  }
  
  // 4. Queue backend update (debounced)
  if (newPosition.y !== undefined) {
    const relY = absoluteToRelative(newPosition.y, margin.top, contentHeight);

    debouncedUpsertPosition(
      dataId,
      'milestone',
      isDuplicate ? nodeId : Number(nodeId),
      relY, // Now using precision-controlled value
      isDuplicate,
      isDuplicate ? nodeId : "",
      originalMilestoneId
    );
  }
  
  return { ...newPosition };
}

/**
 * Calculates a constrained Y position that keeps the node within its workstream
 */
export function calculateConstrainedY(
  currentY: number,
  workstreamId: number,
  workstreamPositions: Record<number, { y: number }>
) {
  const wsPosition = workstreamPositions[workstreamId] || { y: 0 };
  const wsTopBoundary = wsPosition.y - WORKSTREAM_AREA_HEIGHT / 2 + WORKSTREAM_AREA_PADDING;
  const wsBottomBoundary = wsPosition.y + WORKSTREAM_AREA_HEIGHT / 2 - WORKSTREAM_AREA_PADDING;
  
  return Math.max(wsTopBoundary, Math.min(wsBottomBoundary, currentY));
}

/**
 * Updates workstream position across all state representations
 */
export function updateWorkstreamPosition(
  workstreamId: number,
  newY: number,
  options: {
    placementCoordinates: Record<string, TrackedPosition>,
    margin: { top: number },
    contentHeight: number,
    dataId: number,
    setWorkstreamPositions: React.Dispatch<React.SetStateAction<Record<number, { y: number }>>>,
    debouncedUpsertPosition: (
      flightmapId: number, 
      nodeType: 'milestone'|'workstream', 
      nodeId: number | string, 
      relY: number, 
      isDuplicate?: boolean, 
      duplicateKey?: string, 
      originalNodeId?: number
    ) => void,
    workstreamGroup?: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  }
) {
  const { 
    placementCoordinates, 
    margin, 
    contentHeight, 
    dataId,
    setWorkstreamPositions,
    debouncedUpsertPosition,
    workstreamGroup,
  } = options;
  
  // Update reference collection for THIS workstream only
  const wsKey = `ws-${workstreamId}`;
  if (placementCoordinates[wsKey]) {
    placementCoordinates[wsKey].y = newY;
    placementCoordinates[wsKey].lastUpdated = Date.now(); // Add timestamp
  } else {
    // Create new entry if doesn't exist
    placementCoordinates[wsKey] = { 
      x: 0, 
      y: newY, 
      workstreamId,
      isDuplicate: false,
      nodeType: 'original',
      lastUpdated: Date.now()
    } as TrackedPosition;
  }
  
  // Update React state for THIS workstream only
  setWorkstreamPositions(prev => ({
    ...prev,
    [workstreamId]: { y: newY }
  }));
  
  // Update the DOM directly using transforms for THIS workstream
  if (workstreamGroup && workstreamGroup.current) {
    workstreamGroup.current.selectAll(".workstream")
      .filter((d: any) => d && d.id === workstreamId)
      .each(function(d: any) {
        // Calculate delta from initial position for a consistent transform
        const deltaY = newY - d.initialY;
        
        // Apply transform directly based on delta from initial position
        d3.select(this)
          .attr("transform", `translate(0, ${deltaY})`);
        
        // Update internal elements that need direct positioning
        // (these use absolute coordinates, not transforms)
        const wsGroup = d3.select(this);
        
        // Adjust text vertical position relative to workstream center
        wsGroup.select("text")
          .attr("y", newY);
        
        // Adjust guideline position
        wsGroup.select("line.workstream-guideline")
          .attr("y1", newY)
          .attr("y2", newY);
        
        // Adjust workstream area rectangle position, centered on workstream
        wsGroup.select("rect.workstream-area")
          .attr("y", newY - WORKSTREAM_AREA_HEIGHT / 2);
      });
  }
  
  // Queue backend update (debounced) - UPDATED with precision control
  const relY = absoluteToRelative(newY, margin.top, contentHeight);
  debouncedUpsertPosition(
    dataId,
    'workstream',
    workstreamId,
    relY, // Now using precision-controlled value
    false,
    "",
    undefined
  );
  
  return { y: newY };
}