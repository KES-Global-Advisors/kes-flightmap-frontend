/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/visualUpdateUtils.ts
import * as d3 from 'd3';
import { WorkstreamPositions, WORKSTREAM_AREA_HEIGHT } from './types';

/**
 * Updates workstream line positions based on current workstream positions
 */
export function updateWorkstreamLines(
  workstreamGroup: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>,
  workstreamPositions: WorkstreamPositions
) {
  if (!workstreamGroup.current) return;
  
  workstreamGroup.current.selectAll(".workstream").each(function(d: any) {
    const workstreamId = d.id;
    const wsGroup = d3.select(this);
    
    // Get the current position from state - this is the source of truth
    const y = workstreamPositions[workstreamId]?.y || d.initialY;
    
    // Update the line y-coordinates 
    wsGroup.select("line.workstream-guideline")
      .attr("y1", y)
      .attr("y2", y);
      
    // Update workstream label y-coordinate
    wsGroup.select("text")
      .attr("y", y);
      
    // Update the workstream area
    wsGroup.select("rect.workstream-area")
      .attr("y", y - WORKSTREAM_AREA_HEIGHT / 2);
      
    // IMPORTANT: Reset the transform to prevent double transformations
    wsGroup.attr("transform", "translate(0, 0)");
  });
}