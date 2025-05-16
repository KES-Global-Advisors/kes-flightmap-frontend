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
    
    // PRINCIPLE: First reset the transform to avoid double transformation
    wsGroup.attr("transform", "translate(0, 0)");
    
    // PRINCIPLE: Then update all element positions based on state
    wsGroup.select("line.workstream-guideline")
      .attr("y1", y)
      .attr("y2", y);
      
    wsGroup.select("text")
      .attr("y", y);
      
    wsGroup.select("rect.workstream-area")
      .attr("y", y - WORKSTREAM_AREA_HEIGHT / 2);
  });
}