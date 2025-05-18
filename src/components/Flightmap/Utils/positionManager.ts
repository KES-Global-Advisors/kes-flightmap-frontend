/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/positionManager.ts
import * as d3 from 'd3';
import { 
  WORKSTREAM_AREA_HEIGHT, 
  WORKSTREAM_AREA_PADDING,
} from './types';

// Standard timeout for all debounced operations
export const DEBOUNCE_TIMEOUT = 250; // ms

/**
 * Updates node position across all state representations
 */
export function updateNodePosition(
  nodeId: string,
  newPosition: { x?: number, y?: number },
  options: {
    milestonesGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
    placementCoordinates: Record<string, any>,
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
  
  // 1. Update reference collection
  if (placementCoordinates[nodeId]) {
    if (newPosition.x !== undefined) placementCoordinates[nodeId].x = newPosition.x;
    if (newPosition.y !== undefined) placementCoordinates[nodeId].y = newPosition.y;
  }
  
  // 2. Update DOM if needed
  if (updateDOM && milestonesGroup.current) {
    milestonesGroup.current.selectAll(".milestone")
      .filter((d: any) => d && d.id === nodeId)
      .each(function(d: any) {
        // Get current transform 
        const currentTransform = d3.select(this).attr("transform") || "";
        let currentX = 0;
        let currentY = 0;
        
        const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
          currentX = parseFloat(translateMatch[1]);
          currentY = parseFloat(translateMatch[2]);
        }
        
        // Determine new transform coordinates
        const newX = newPosition.x !== undefined ? newPosition.x - d.initialX : currentX;
        const newY = newPosition.y !== undefined ? newPosition.y - d.initialY : currentY;
        
        // Reset transform first, then apply new one
        d3.select(this)
          .attr("transform", `translate(${newX}, ${newY})`);
          
        // Update connection line if y position changed
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
    const relY = (newPosition.y - margin.top) / contentHeight;
    debouncedUpsertPosition(
      dataId,
      'milestone',
      isDuplicate ? nodeId : Number(nodeId),
      relY,
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
    placementCoordinates: Record<string, any>,
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
    updateWorkstreamLines?: (
      workstreamGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
      workstreamPositions: Record<number, { y: number }>,
      changedWorkstreamId?: number
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
    updateWorkstreamLines,
    workstreamGroup,
  } = options;
  
  // 1. Update reference collection (placementCoordinates)
  const wsKey = `ws-${workstreamId}`;
  if (placementCoordinates[wsKey]) {
    placementCoordinates[wsKey].y = newY;
  } else {
    placementCoordinates[wsKey] = { x: 0, y: newY, workstreamId };
  }
  
  // 2. Update React state immediately - but include the changedWorkstreamId
  setWorkstreamPositions(prev => ({
    ...prev,
    [workstreamId]: { y: newY }
  }));
  
  // 3. If updateWorkstreamLines is provided, update the DOM directly only for this workstream
  if (updateWorkstreamLines && workstreamGroup) {
    const updatedPositions = {
      ...Object.fromEntries(
        Object.entries(placementCoordinates)
          .filter(([key]) => key.startsWith('ws-'))
          .map(([key, value]) => [key.substring(3), { y: value.y }])
      ),
      [workstreamId]: { y: newY }
    };
    
    // Only update the specific workstream that changed
    updateWorkstreamLines(workstreamGroup, updatedPositions, workstreamId);
  }
  
  // 4. Queue backend update (debounced)
  const relY = (newY - margin.top) / contentHeight;
  debouncedUpsertPosition(
    dataId,
    'workstream',
    workstreamId,
    relY,
    false,
    "",
    undefined
  );
  
  return { y: newY };
}