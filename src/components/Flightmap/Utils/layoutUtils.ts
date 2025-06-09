/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/layoutUtils.ts
import * as d3 from 'd3';
import { MilestonePlacement } from './dataProcessing';
import { 
  WorkstreamPositions,
  MilestonePositions,
  NODE_RADIUS,
  WORKSTREAM_AREA_HEIGHT,
  WORKSTREAM_AREA_PADDING
} from './types';

/**
 * Calculates appropriate positions for nodes that share the same deadline in a workstream
 * with preserved draggability
 */
export function calculateNodeSpacing(
  placements: MilestonePlacement[],
  workstreamId: number,
  timelineX: number,
  xScale: d3.ScaleTime<number, number>,
  workstreamPositions: WorkstreamPositions,
  milestonePositions: MilestonePositions
) {
  // Filter placements to only those in this workstream and on this timeline
  const nodesOnTimeline = placements.filter(p => {
    const x = p.milestone.deadline ? xScale(new Date(p.milestone.deadline)) : 0;
    return Math.abs(x - timelineX) < 1 && // Same timeline position
      ((p.isDuplicate && p.placementWorkstreamId === workstreamId) || 
      (!p.isDuplicate && p.milestone.workstreamId === workstreamId));
  });

  if (nodesOnTimeline.length <= 1) {
    return []; // No spacing needed for single nodes
  }

  const wsPosition = workstreamPositions[workstreamId] || { y: 0 };
  const wsY = wsPosition.y;

  // Calculate vertical distribution within workstream area
  const totalNodes = nodesOnTimeline.length;
  const spacingHeight = WORKSTREAM_AREA_HEIGHT - (WORKSTREAM_AREA_PADDING * 2);
  const nodeSpacing = Math.min(spacingHeight / (totalNodes + 1), NODE_RADIUS * 1.5);

  // Calculate starting position
  const startY = wsY - ((totalNodes - 1) * nodeSpacing / 2);

  // Check if these nodes already have stored positions
  const nodesWithExistingPositions = nodesOnTimeline.filter(p => !!milestonePositions[p.id]);

  if (nodesWithExistingPositions.length === nodesOnTimeline.length) {
    // All nodes have existing positions - use those positions if significantly different from calculated
    return nodesOnTimeline.map((p, index) => {
      const existingPos = milestonePositions[p.id].y;
      const calculatedPos = startY + (index * nodeSpacing);

      // Determine if this position was likely user-adjusted based on distance from calculated position
      // This avoids overriding user-positioned nodes
      const significantDeviation = Math.abs(existingPos - calculatedPos) > (nodeSpacing / 2);

      return {
        id: p.id,
        y: significantDeviation ? existingPos : calculatedPos,
        userPlaced: significantDeviation
      };
    });
  } else {
    // First time layout or some nodes don't have positions - use calculated positions
    return nodesOnTimeline.map((p, index) => ({
      id: p.id,
      y: startY + (index * nodeSpacing),
      userPlaced: false
    }));
  }
}

/**
 * Ensures all nodes remain within their workstream's boundaries
 * after any workstream position change, while maintaining
 * consistent transform-based positioning
 */
export function enforceWorkstreamContainment(
  workstreamId: number,
  workstreamPositions: WorkstreamPositions,
  milestonePositions: MilestonePositions,
  milestonePlacements: MilestonePlacement[],
  milestonesGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  setMilestonePositions: React.Dispatch<React.SetStateAction<MilestonePositions>>,
  placementCoordinates?: Record<string, any>
) {
  // ✅ ADDED: Lines 80-83 - Early exit if workstream position hasn't changed
  const wsPosition = workstreamPositions[workstreamId];
  if (!wsPosition) return {}; // No position data, nothing to enforce
  
  // Only get THIS workstream's position
  const wsTopBoundary = wsPosition.y - WORKSTREAM_AREA_HEIGHT / 2 + WORKSTREAM_AREA_PADDING;
  const wsBottomBoundary = wsPosition.y + WORKSTREAM_AREA_HEIGHT / 2 - WORKSTREAM_AREA_PADDING;

  // Find ONLY nodes that belong to THIS workstream
  const relatedNodes = Object.entries(milestonePositions)
    .filter(([nodeId]) => {
      const placement = milestonePlacements.find(p => p.id === nodeId);
      if (!placement) return false;

      if (placement.isDuplicate) {
        return placement.placementWorkstreamId === workstreamId;
      } else {
        return placement.milestone.workstreamId === workstreamId;
      }
    });

    // ✅ ADDED: Lines 98-100 - Early exit if no nodes are out of bounds
  const nodesOutOfBounds = relatedNodes.filter(([, position]) => 
    position.y < wsTopBoundary || position.y > wsBottomBoundary
  );
  
  if (nodesOutOfBounds.length === 0) {
    return {}; // No nodes need adjustment
  }
  
  
  // Check if any nodes are outside boundaries and correct them
  const updatedPositions: Record<string, { y: number }> = {};
  relatedNodes.forEach(([nodeId, position]) => {
    if (position.y < wsTopBoundary || position.y > wsBottomBoundary) {
      // Constrain to boundaries
      const constrainedY = Math.max(wsTopBoundary, Math.min(wsBottomBoundary, position.y));
      updatedPositions[nodeId] = { y: constrainedY };
      
      // Also update placement coordinates if available
      if (placementCoordinates && placementCoordinates[nodeId]) {
        placementCoordinates[nodeId].y = constrainedY;
      }
    }
  });

  // Only update positions if needed
  if (Object.keys(updatedPositions).length > 0) {
    setMilestonePositions(prev => ({
      ...prev,
      ...updatedPositions
    }));

    // Force visual update for affected nodes using consistent transforms
    if (milestonesGroup.current) {
      Object.entries(updatedPositions).forEach(([nodeId, position]) => {
        milestonesGroup.current!.selectAll(".milestone")
          .filter((d: any) => d && d.id === nodeId)
          .each(function(d: any) {
            // Calculate proper transform based on difference from initial position
            const deltaY = position.y - d.initialY;
            
            // Apply transform directly based on the delta
            d3.select(this)
              .transition().duration(300)
              .attr("transform", `translate(0, ${deltaY})`);
          });
      });
    }
  }

  return updatedPositions;
}