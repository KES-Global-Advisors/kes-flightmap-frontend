/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/visualUpdateUtils.ts
import * as d3 from 'd3';
import { WorkstreamPositions, WORKSTREAM_AREA_HEIGHT } from './types';

/**
 * Updates workstream line positions based on current workstream positions
 * using a consistent transform approach for workstream groups and
 * direct attributes for child elements
 * 
 * @param workstreamGroup The D3 selection for workstream groups
 * @param workstreamPositions Current positions of all workstreams
 * @param changedWorkstreamId Optional ID of only the workstream that changed (to avoid updating all)
 */
export function updateWorkstreamLines(
  workstreamGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  workstreamPositions: WorkstreamPositions,
  changedWorkstreamId?: number
) {
  if (!workstreamGroup.current) return;
  
  // If changedWorkstreamId is provided, only update that specific workstream
  // Otherwise, update all workstreams (for initial render or explicit "update all" cases)
  const workstreamsToUpdate = changedWorkstreamId !== undefined
    ? workstreamGroup.current.selectAll(".workstream")
        .filter((d: any) => d && d.id === changedWorkstreamId)
    : workstreamGroup.current.selectAll(".workstream");
  
  workstreamsToUpdate.each(function(d: any) {
    const workstreamId = d.id;
    const wsGroup = d3.select(this);
    
    // Get the current position from state - this is the single source of truth
    const y = workstreamPositions[workstreamId]?.y || d.initialY;
    
    // Calculate transform based on the difference from initial position
    const deltaY = y - d.initialY;
    
    // Apply consistent transform to the group
    wsGroup.attr("transform", `translate(0, ${deltaY})`);
    
    // Update absolute positions of child elements based on the true Y position
    // These elements use absolute coordinates, not relative positions with transforms
    wsGroup.select("text")
      .attr("y", y);
      
    wsGroup.select("line.workstream-guideline")
      .attr("y1", y)
      .attr("y2", y);
      
    wsGroup.select("rect.workstream-area")
      .attr("y", y - WORKSTREAM_AREA_HEIGHT / 2);
  });
}