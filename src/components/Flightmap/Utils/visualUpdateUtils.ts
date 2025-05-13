/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/flightmap/visualUpdateUtils.ts
import * as d3 from 'd3';
import { WorkstreamPositions } from './types';

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
    
    // Update the actual line y-coordinates 
    wsGroup.select("line")
      .attr("y1", y)
      .attr("y2", y);
      
    // Update workstream label y-coordinate
    wsGroup.select("text")
      .attr("y", y);
      
    // IMPORTANT: Reset the transform to prevent double transformations
    wsGroup.attr("transform", "translate(0, 0)");
  });
}