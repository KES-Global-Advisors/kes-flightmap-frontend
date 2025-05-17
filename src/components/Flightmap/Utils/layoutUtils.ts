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
 * after any workstream position change
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
  const wsPosition = workstreamPositions[workstreamId] || { y: 0 };
  const wsTopBoundary = wsPosition.y - WORKSTREAM_AREA_HEIGHT / 2 + WORKSTREAM_AREA_PADDING;
  const wsBottomBoundary = wsPosition.y + WORKSTREAM_AREA_HEIGHT / 2 - WORKSTREAM_AREA_PADDING;

  // Find all milestone nodes for this workstream with explicit type checking
  const relatedNodes = Object.entries(milestonePositions)
    .filter(([nodeId]) => {
      const placement = milestonePlacements.find(p => p.id === nodeId);
      if (!placement) return false;

      if (placement.isDuplicate) {
        // For duplicates, check ONLY the placement workstream
        return placement.placementWorkstreamId === workstreamId;
      } else {
        // For originals, check ONLY the milestone's workstream
        return placement.milestone.workstreamId === workstreamId;
      }
    });
  
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

  // Update positions if needed
  if (Object.keys(updatedPositions).length > 0) {
    setMilestonePositions(prev => ({
      ...prev,
      ...updatedPositions
    }));

    // Force visual update for affected nodes
    if (milestonesGroup.current) {
      Object.entries(updatedPositions).forEach(([nodeId, position]) => {
        const nodeSelection = milestonesGroup.current!.selectAll(".milestone")
          .filter((d: any) => d && d.id === nodeId);
          
        nodeSelection.each(function(d: any) {
          // Get current transform to preserve x translation
          const currentTransform = d3.select(this).attr("transform") || "";
          let currentX = 0;
          
          const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (translateMatch) {
            currentX = parseFloat(translateMatch[1]);
          }
          
          // Reset transform first to avoid compounding
          d3.select(this)
            .attr("transform", "translate(0, 0)");
            
          // Then apply proper transform with constrained Y position
          d3.select(this)
            .attr("transform", `translate(${currentX}, ${position.y - d.initialY})`);

          // Update connection line
          d3.select(this).select("line.connection-line")
            .attr("y1", position.y)
            .attr("y2", wsPosition.y);
        });
      });
    }
  }

  return updatedPositions;
}